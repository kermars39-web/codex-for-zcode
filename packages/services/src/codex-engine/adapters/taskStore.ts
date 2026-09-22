import { mkdir, readFile, writeFile, rename, readdir, open, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { CodexRow, CodexTask } from "../contract.js";

const PAGE_SIZE = 100;
export class CodexTaskStore {
  private leases = new Map<string, string>();
  private writes = new Map<string, Promise<void>>();
  constructor(readonly root: string) {}
  path(id: string, suffix: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("无效任务标识");
    return join(this.root, id + suffix);
  }
  private async atomic(path: string, value: unknown): Promise<void> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const temp = `${path}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(value), { mode: 0o600 });
    await rename(temp, path);
  }
  async save(task: CodexTask): Promise<void> {
    const snapshot = structuredClone(task);
    const prior = this.writes.get(task.id) ?? Promise.resolve();
    const next = prior
      .catch(() => {})
      .then(() => this.atomic(this.path(task.id, ".json"), snapshot));
    this.writes.set(task.id, next);
    try {
      await next;
    } finally {
      if (this.writes.get(task.id) === next) this.writes.delete(task.id);
    }
  }
  async read(id: string): Promise<CodexTask> {
    await this.writes.get(id);
    const task = JSON.parse(await readFile(this.path(id, ".json"), "utf8")) as CodexTask;
    if (task.id !== id || task.engineKind !== "codex") throw new Error("任务索引格式错误");
    return task;
  }
  async list(): Promise<CodexTask[]> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const names = await readdir(this.root);
    const tasks = await Promise.all(
      names
        .filter((n) => /^[a-zA-Z0-9_-]+\.json$/.test(n))
        .map(async (n) => {
          try {
            return await this.read(n.slice(0, -5));
          } catch {
            return null;
          }
        }),
    );
    return tasks
      .filter((t): t is CodexTask => t !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async writePrefix(id: string, rows: CodexRow[]): Promise<void> {
    for (let offset = 0; offset < rows.length; offset += PAGE_SIZE)
      await this.atomic(
        this.path(id, `.prefix-${offset / PAGE_SIZE}.json`),
        rows.slice(offset, offset + PAGE_SIZE),
      );
    const history = rows
      .map(
        (r) =>
          `## ${r.kind}${r.title ? ` / ${r.title}` : ""}\n${r.text}${r.output ? `\n${r.output}` : ""}${r.images?.length ? `\nAttachments: ${r.images.join(", ")}` : ""}`,
      )
      .join("\n\n");
    await writeFile(this.path(id, ".history.md"), history, { mode: 0o600 });
  }
  async prefixPage(id: string, offset: number, count: number): Promise<CodexRow[]> {
    if (count <= 0) return [];
    const rows: CodexRow[] = [];
    const first = Math.floor(offset / PAGE_SIZE),
      last = Math.floor((offset + count - 1) / PAGE_SIZE);
    for (let page = first; page <= last; page++) {
      const data = JSON.parse(
        await readFile(this.path(id, `.prefix-${page}.json`), "utf8"),
      ) as CodexRow[];
      rows.push(...data);
    }
    return rows.slice(offset % PAGE_SIZE, (offset % PAGE_SIZE) + count);
  }
  async acquire(id: string): Promise<void> {
    if (this.leases.has(id)) return;
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const lock = this.path(id, ".lock");
    const token = randomUUID();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const file = await open(lock, "wx", 0o600);
        try {
          await file.writeFile(JSON.stringify({ pid: process.pid, token }));
        } finally {
          await file.close();
        }
        this.leases.set(id, token);
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        let prior: { pid?: number; token?: string };
        try {
          prior = JSON.parse(await readFile(lock, "utf8"));
        } catch {
          throw new Error("任务正在由另一个窗口接管，请稍后重试");
        }
        if (typeof prior.pid !== "number") throw new Error("任务锁无效，请重启应用后检查");
        try {
          process.kill(prior.pid, 0);
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code === "ESRCH") {
            // 只删除确认已经退出的进程所持有、且 token 仍一致的锁。
            const current = JSON.parse(await readFile(lock, "utf8"));
            if (current.token === prior.token) await unlink(lock);
            continue;
          }
        }
        throw new Error("此任务已在另一个窗口中打开，请在原窗口继续");
      }
    }
    throw new Error("无法获得任务执行权");
  }
  async releaseAll(): Promise<void> {
    await Promise.allSettled(this.writes.values());
    for (const [id, token] of this.leases) {
      try {
        const current = JSON.parse(await readFile(this.path(id, ".lock"), "utf8"));
        if (current.token === token) await unlink(this.path(id, ".lock"));
      } catch {
        /* 已释放或进程退出，保留其他所有者的锁。 */
      }
    }
    this.leases.clear();
  }
}
