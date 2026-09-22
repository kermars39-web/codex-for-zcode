import type { CodexRow } from "@zcode/services";

export interface TranscriptGroup {
  key: string;
  work: boolean;
  rows: CodexRow[];
}
/** 同轮过程说明进入原版工作折叠区，最后回复常显；保持原对象、顺序和轮次边界。 */
export function groupTranscriptRows(rows: CodexRow[]): TranscriptGroup[] {
  const groups: TranscriptGroup[] = [];
  const lastAssistant = new Map<string, number>();
  rows.forEach((row, index) => {
    if (row.kind === "assistant") lastAssistant.set(row.turnId, index);
  });
  for (const [index, row] of rows.entries()) {
    const work =
      ["reasoning", "tool", "diff"].includes(row.kind) ||
      (row.kind === "assistant" && lastAssistant.get(row.turnId) !== index);
    const prior = groups.at(-1);
    if (work && prior?.work && prior.rows[0]?.turnId === row.turnId) prior.rows.push(row);
    else groups.push({ key: `${row.turnId}:${row.id}`, work, rows: [row] });
  }
  return groups;
}

export function workGroupLabel(rows: CodexRow[]): string {
  if (rows.some((row) => row.status === "inProgress")) return "正在工作";
  // 工具中途失败可能已被后续步骤修复，不能据此把整个已完成轮次判为失败。
  if (rows.some((row) => row.status === "failed")) return "已工作 · 有失败记录";
  if (rows.some((row) => row.status === "declined")) return "已工作 · 有拒绝记录";
  if (rows.some((row) => row.status === "interrupted")) return "已停止";
  return "已工作";
}
