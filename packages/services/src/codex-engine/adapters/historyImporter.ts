import { access, realpath } from "node:fs/promises";
import { relative, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  CodexImportCandidate,
  CodexImportPreview,
  CodexRow,
  CodexTask,
  ICodexService,
} from "../contract.js";
import { projectCompletedTurns, record, text } from "../domain/projection.js";
import { CodexTransport, CodexRpcError } from "./transport.js";
import { CodexTaskStore } from "./taskStore.js";
import { readRollout } from "./rolloutReader.js";

export interface LoadedHistory {
  preview: CodexImportPreview;
  rows: CodexRow[];
}
export class CodexHistoryImporter {
  private importChain: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly rpc: CodexTransport,
    private readonly store: CodexTaskStore,
    private readonly changed: () => void,
  ) {}
  private candidate(thread: Record<string, unknown>, imported: Set<string>): CodexImportCandidate {
    return {
      id: text(thread.id),
      title: text(thread.name) || text(thread.preview).slice(0, 100) || "未命名会话",
      cwd: text(thread.cwd),
      updatedAt: Number(thread.updatedAt) * 1000,
      source: text(thread.source) || "Desktop",
      alreadyImported: imported.has(text(thread.id)),
      archived: thread.archived === true,
    };
  }
  async list(
    params: Parameters<ICodexService["listImports"]>[0],
  ): ReturnType<ICodexService["listImports"]> {
    const imported = new Set(
      (await this.store.list())
        .map((t) => t.importSource?.sourceThreadId)
        .filter((x): x is string => Boolean(x)),
    );
    const result = await this.rpc.call("thread/list", {
      limit: 40,
      cursor: params.cursor,
      searchTerm: params.search || undefined,
      cwd: params.cwd || undefined,
      archived: params.archived ?? false,
      sourceKinds: ["vscode", "appServer", "cli"],
      sortKey: "updated_at",
      useStateDbOnly: true,
    });
    return {
      data: (Array.isArray(result.data) ? result.data : []).map((t) =>
        this.candidate(record(t), imported),
      ),
      nextCursor: text(result.nextCursor) || undefined,
    };
  }
  async load(sourceThreadId: string): Promise<LoadedHistory> {
    const summary = await this.rpc.call("thread/read", {
      threadId: sourceThreadId,
      includeTurns: false,
    });
    const thread = record(summary.thread);
    const imported = new Set(
      (await this.store.list()).flatMap((t) =>
        t.importSource ? [t.importSource.sourceThreadId] : [],
      ),
    );
    const candidate = this.candidate(thread, imported);
    let rows: CodexRow[] = [],
      lastTurnId: string | undefined,
      mode: CodexImportPreview["mode"] = "nativeFork";
    const warnings: string[] = [];
    try {
      // 分页接口优先，避免一次性跨 RPC 传输整段长历史。
      let cursor: string | undefined;
      const seen = new Set<string>();
      do {
        const page = await this.rpc.call("thread/turns/list", {
          threadId: sourceThreadId,
          cursor,
          limit: 50,
          sortDirection: "asc",
          itemsView: "full",
        });
        const turns = Array.isArray(page.data) ? page.data : [];
        rows.push(...projectCompletedTurns(turns));
        for (const raw of turns) {
          const t = record(raw);
          if (["completed", "interrupted", "failed"].includes(text(t.status)))
            lastTurnId = text(t.id);
          else warnings.push("仅导入已完成轮次");
        }
        cursor = text(page.nextCursor) || undefined;
        if (cursor && seen.has(cursor)) throw new Error("历史分页游标重复，已停止导入");
        if (cursor) seen.add(cursor);
      } while (cursor);
    } catch (error) {
      if (!(error instanceof CodexRpcError)) throw error;
      try {
        const full = await this.rpc.call("thread/read", {
          threadId: sourceThreadId,
          includeTurns: true,
        });
        const turns = record(full.thread).turns;
        rows = projectCompletedTurns(Array.isArray(turns) ? turns : []);
        lastTurnId = rows.at(-1)?.turnId;
      } catch (readError) {
        if (!(readError instanceof CodexRpcError)) throw readError;
        const path = text(thread.path);
        const home = this.rpc.codexHome;
        if (!path || !home) throw new Error("引擎无法读取此历史，且未提供可读取的本地日志");
        const real = await realpath(path),
          root = await realpath(home);
        const rel = relative(root, real);
        if (
          isAbsolute(rel) ||
          rel.startsWith("..") ||
          !["sessions", "archived_sessions"].includes(rel.split(/[\\/]/)[0] ?? "")
        )
          throw new Error("源日志不在 Codex 会话目录中");
        const fallback = await readRollout(real);
        rows = fallback.rows;
        lastTurnId = fallback.lastTurnId;
        warnings.push(...fallback.warnings);
        mode = "contextRebuild";
      }
    }
    if (!rows.length || !lastTurnId) throw new Error("此会话没有可导入的已完成消息");
    try {
      await access(candidate.cwd);
    } catch {
      warnings.push("原项目目录不存在；可阅读历史，续聊前需要选择工作目录");
      mode = "contextRebuild";
    }
    for (const row of rows)
      for (const image of row.images ?? [])
        if (isAbsolute(image)) {
          try {
            await access(image);
          } catch {
            warnings.push(`附件已不可用：${image}`);
          }
        }
    return {
      rows,
      preview: {
        candidate,
        mode,
        rows: rows.slice(-100),
        rowCount: rows.length,
        lastTurnId,
        warnings: [...new Set(warnings)],
      },
    };
  }
  async import(sourceThreadIds: string[]): ReturnType<ICodexService["importSessions"]> {
    const result = this.importChain.catch(() => {}).then(() => this.importBatch(sourceThreadIds));
    this.importChain = result;
    return result;
  }
  private async importBatch(
    sourceThreadIds: string[],
  ): ReturnType<ICodexService["importSessions"]> {
    const results: Awaited<ReturnType<ICodexService["importSessions"]>> = [];
    for (const sourceThreadId of new Set(sourceThreadIds)) {
      try {
        // 来源级锁覆盖检查与提交，避免多个窗口重复导入；锁由当前 Host 持有到退出。
        const existing = (await this.store.list()).find(
          (t) => t.importSource?.sourceThreadId === sourceThreadId,
        );
        if (existing) {
          results.push({
            sourceThreadId,
            status: "skipped",
            taskId: existing.id,
            reason: "已导入",
          });
          continue;
        }
        await this.store.acquire(`import-${sourceThreadId}`);
        const { preview, rows } = await this.load(sourceThreadId);
        let mode = preview.mode,
          engineSessionId: string | undefined;
        if (mode === "nativeFork") {
          try {
            const fork = await this.rpc.call("thread/fork", {
              threadId: sourceThreadId,
              lastTurnId: preview.lastTurnId,
              excludeTurns: true,
              deferGoalContinuation: true,
              approvalPolicy: "on-request",
              approvalsReviewer: "user",
              sandbox: "workspace-write",
              config: { "features.goals": false },
            });
            engineSessionId = text(record(fork.thread).id);
            if (!engineSessionId || engineSessionId === sourceThreadId)
              throw new Error("引擎没有返回独立会话，导入未提交");
          } catch (error) {
            // 只有明确的协议不兼容才走上下文重建；超时可能已复制，不能自动制造第二份。
            if (
              !(error instanceof CodexRpcError) ||
              ![-32601, -32602, -32000].includes(error.code ?? 0)
            )
              throw error;
            mode = "contextRebuild";
          }
        }
        const now = Date.now();
        const id = randomUUID();
        const task: CodexTask = {
          id,
          engineKind: "codex",
          engineSessionId,
          title: preview.candidate.title,
          workspacePath: preview.candidate.cwd,
          workspaceIdentity: preview.candidate.cwd,
          createdAt: now,
          updatedAt: preview.candidate.updatedAt || now,
          status: "idle",
          importSource: {
            sourceThreadId,
            mode,
            importedAt: now,
            lastTurnId: preview.lastTurnId,
            rowCount: rows.length,
          },
        };
        // 不向 Codex 注入重放的工具记录。快照只读；兼容续聊引用这份本地资料。
        await this.store.writePrefix(id, rows);
        await this.store.save(task);
        this.changed();
        results.push({ sourceThreadId, status: "imported", taskId: id, mode });
      } catch (error) {
        results.push({
          sourceThreadId,
          status: "failed",
          reason: error instanceof Error ? error.message : "导入失败",
        });
      }
    }
    return results;
  }
}
