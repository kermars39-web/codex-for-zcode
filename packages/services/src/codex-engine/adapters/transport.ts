import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { record, text } from "../domain/projection.js";
import type { CodexRecord } from "../contract.js";

export class CodexRpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
  }
}
export interface TransportOptions {
  binary: string;
  args?: string[];
  requestTimeoutMs?: number;
  onNotification: (method: string, params: CodexRecord) => void;
  onRequest: (id: string, method: string, params: CodexRecord) => void;
  onDisconnect: (message: string) => void;
}
export class CodexTransport {
  private child?: ChildProcessWithoutNullStreams;
  private starting?: Promise<void>;
  private requestNumber = 0;
  private pending = new Map<
    number,
    {
      resolve: (v: unknown) => void;
      reject: (e: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  private inbound = new Map<string, string | number>();
  private generation = "";
  private intentionalClose = false;
  private stopping: Promise<void> = Promise.resolve();
  private disposed = false;
  runtime = "";
  codexHome?: string;
  constructor(private readonly options: TransportOptions) {}
  get connected(): boolean {
    return Boolean(this.child && !this.child.killed && this.runtime);
  }
  async start(): Promise<void> {
    if (this.disposed) throw new Error("Codex 连接已关闭");
    if (this.connected) return;
    if (this.starting) return this.starting;
    this.starting = this.initialize().finally(() => {
      this.starting = undefined;
    });
    return this.starting;
  }
  private async initialize(): Promise<void> {
    await this.stopping;
    if (this.disposed) throw new Error("Codex 连接已关闭");
    this.intentionalClose = false;
    const generation = randomUUID();
    this.generation = generation;
    const child = spawn(this.options.binary, this.options.args ?? ["app-server", "--stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.child = child;
    // stderr 可能含用户路径或工具正文；只消费以免阻塞，不保存原始内容。
    child.stderr.on("data", () => {});
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on("line", (line) => {
      if (this.generation !== generation) return;
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch {
        this.fail("Codex 返回了无效协议数据", generation);
        return;
      }
      const message = record(value);
      if (typeof message.method === "string") {
        if (typeof message.id === "number" || typeof message.id === "string") {
          const id = `${generation}:${String(message.id)}`;
          if (this.inbound.has(id)) return;
          this.inbound.set(id, message.id);
          this.options.onRequest(id, message.method, record(message.params));
        } else this.options.onNotification(message.method, record(message.params));
        return;
      }
      if (typeof message.id !== "number") return;
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.error) {
        const error = record(message.error);
        request.reject(
          new CodexRpcError(
            text(error.message) || "Codex 请求失败",
            typeof error.code === "number" ? error.code : undefined,
          ),
        );
      } else request.resolve(message.result);
    });
    child.once("error", () => this.fail("无法启动 Codex；请检查本机安装与执行权限", generation));
    child.once("exit", () => {
      lines.close();
      this.fail("Codex 连接已断开；未重发任何执行指令", generation);
    });
    try {
      const init = record(
        await this.request("initialize", {
          clientInfo: { name: "codex_for_zcode", title: "Codex for ZCode", version: "0.1.0" },
          capabilities: { experimentalApi: true },
        }),
      );
      this.write({ method: "initialized" });
      this.runtime = text(init.userAgent);
      this.codexHome = text(init.codexHome) || undefined;
    } catch (error) {
      this.fail(error instanceof Error ? error.message : "Codex 初始化失败", generation);
      throw error;
    }
  }
  async call<T = CodexRecord>(method: string, params: CodexRecord = {}): Promise<T> {
    await this.start();
    return this.request(method, params) as Promise<T>;
  }
  private request(method: string, params: CodexRecord): Promise<unknown> {
    const id = ++this.requestNumber;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        // 超时的写请求可能已执行；断开本实例并强制下次读回，绝不能自动重试。
        reject(new Error(`Codex 请求超时（${method}），执行结果需重新核对`));
        this.fail("Codex 响应超时；请重新打开任务核对结果", this.generation);
      }, this.options.requestTimeoutMs ?? 90000);
      this.pending.set(id, { resolve, reject, timeout });
      try {
        this.write({ id, method, params });
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(error);
      }
    });
  }
  respond(id: string, response: CodexRecord): void {
    const wireId = this.inbound.get(id);
    if (wireId === undefined || !this.connected) throw new Error("审批已过期，请重新读取当前任务");
    this.write({ id: wireId, result: response });
    this.inbound.delete(id);
  }
  rejectRequest(id: string, message: string): void {
    const wireId = this.inbound.get(id);
    if (wireId === undefined) return;
    this.write({ id: wireId, error: { code: -32601, message } });
    this.inbound.delete(id);
  }
  private write(message: CodexRecord): void {
    if (!this.child || this.child.killed || !this.child.stdin.writable)
      throw new Error("Codex 未连接");
    this.child.stdin.write(JSON.stringify(message) + "\n");
  }
  private fail(message: string, generation: string): void {
    if (generation !== this.generation) return;
    this.generation = "";
    this.runtime = "";
    const child = this.child;
    this.child = undefined;
    for (const p of this.pending.values()) {
      clearTimeout(p.timeout);
      p.reject(new Error(message));
    }
    this.pending.clear();
    this.inbound.clear();
    if (child && child.exitCode === null && child.signalCode === null) {
      this.stopping = new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
        }, 1500);
        child.once("close", () => {
          clearTimeout(timer);
          resolve();
        });
        child.kill("SIGTERM");
      });
    }
    if (!this.intentionalClose) this.options.onDisconnect(message);
  }
  async dispose(): Promise<void> {
    this.disposed = true;
    this.intentionalClose = true;
    this.fail("连接已关闭", this.generation);
    await this.stopping;
  }
}
