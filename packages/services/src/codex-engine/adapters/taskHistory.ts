import { mergeRow, projectItem, record, text } from "../domain/projection.js";
import { CodexRpcError, type CodexTransport } from "./transport.js";
import type { LiveTask } from "./liveEvents.js";

export async function hydrateTask(rpc: CodexTransport, state: LiveTask): Promise<void> {
  if (state.hydrated || !state.task.engineSessionId) return;
  const turns: unknown[] = [];
  try {
    let cursor: string | undefined;
    const seen = new Set<string>();
    do {
      const page = await rpc.call("thread/turns/list", {
        threadId: state.task.engineSessionId,
        cursor,
        limit: 50,
        sortDirection: "asc",
        itemsView: "full",
      });
      turns.push(...(Array.isArray(page.data) ? page.data : []));
      cursor = text(page.nextCursor) || undefined;
      if (cursor && seen.has(cursor)) throw new Error("历史分页重复，请重新打开任务");
      if (cursor) seen.add(cursor);
    } while (cursor);
  } catch (error) {
    if (!(error instanceof CodexRpcError) || error.code !== -32601) throw error;
    const result = await rpc.call("thread/read", {
      threadId: state.task.engineSessionId,
      includeTurns: true,
    });
    turns.splice(
      0,
      turns.length,
      ...(Array.isArray(record(result.thread).turns)
        ? (record(result.thread).turns as unknown[])
        : []),
    );
  }
  const rows = turns.flatMap((raw) => {
    const turn = record(raw);
    return (Array.isArray(turn.items) ? turn.items : [])
      .map((item) => projectItem(item, text(turn.id)))
      .filter((x) => x !== null);
  });
  // Live events received during the read remain authoritative for the same item.
  for (const row of state.rows) mergeRow(rows, row);
  state.rows = rows;
  state.hydrated = true;
  const last = record(turns.at(-1));
  if (
    !state.task.activeTurnId &&
    ["completed", "failed", "interrupted"].includes(text(last.status))
  ) {
    state.lastCompletedTurnId = text(last.id);
    state.task.status =
      last.status === "completed" ? "idle" : last.status === "failed" ? "error" : "interrupted";
    state.task.error = text(record(last.error).message) || undefined;
  }
}
