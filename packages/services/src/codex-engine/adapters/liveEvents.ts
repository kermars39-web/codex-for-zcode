import type { CodexApproval, CodexRecord, CodexRow, CodexTask } from "../contract.js";
import { mergeRow, projectItem, record, text } from "../domain/projection.js";

export interface LiveTask {
  task: CodexTask;
  rows: CodexRow[];
  approvals: Map<string, CodexApproval>;
  hydrated: boolean;
  resumed: boolean;
  lastCompletedTurnId?: string;
}
export function applyNotification(state: LiveTask, method: string, params: CodexRecord): boolean {
  const turnId =
    text(params.turnId) || text(record(params.turn).id) || state.task.activeTurnId || "";
  if (method === "turn/started") {
    if (state.task.activeTurnId !== turnId) state.approvals.clear();
    state.task.status = "running";
    state.task.activeTurnId = turnId;
    state.task.error = undefined;
    return true;
  }
  if (method === "turn/completed") {
    if (state.task.activeTurnId && turnId !== state.task.activeTurnId) return false;
    const turn = record(params.turn);
    state.lastCompletedTurnId = turnId;
    state.task.status =
      turn.status === "failed" ? "error" : turn.status === "interrupted" ? "interrupted" : "idle";
    state.task.error = text(record(turn.error).message) || undefined;
    state.task.activeTurnId = undefined;
    state.approvals.clear();
    return true;
  }
  if (params.turnId && state.task.activeTurnId && turnId !== state.task.activeTurnId) return false;
  if (method === "item/started" || method === "item/completed") {
    const row = projectItem(params.item, turnId);
    if (row) {
      mergeRow(state.rows, row);
      return true;
    }
  }
  if (
    [
      "item/agentMessage/delta",
      "item/reasoning/summaryTextDelta",
      "item/commandExecution/outputDelta",
      "item/fileChange/outputDelta",
    ].includes(method)
  ) {
    const id = text(params.itemId),
      delta = text(params.delta);
    let row = state.rows.find((r) => r.id === id && r.turnId === turnId);
    if (!row) {
      row = {
        id,
        turnId,
        kind: method.includes("reasoning")
          ? "reasoning"
          : method.includes("Execution") || method.includes("fileChange")
            ? "tool"
            : "assistant",
        text: "",
      };
      state.rows.push(row);
    }
    if (method.includes("outputDelta")) row.output = (row.output ?? "") + delta;
    else row.text += delta;
    return true;
  }
  if (method === "turn/diff/updated") {
    mergeRow(state.rows, {
      id: `diff-${turnId}`,
      turnId,
      kind: "diff",
      title: "本轮修改",
      text: text(params.diff),
    });
    return true;
  }
  if (method === "serverRequest/resolved") {
    for (const [id] of state.approvals)
      if (id.endsWith(`:${String(params.requestId)}`)) state.approvals.delete(id);
    if (!state.approvals.size && state.task.activeTurnId) state.task.status = "running";
    return true;
  }
  if (method === "error") {
    state.task.error = text(record(params.error).message) || "执行发生错误";
    if (params.willRetry !== true) state.task.status = "error";
    return true;
  }
  return false;
}
