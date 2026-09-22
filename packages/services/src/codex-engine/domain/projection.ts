import type { CodexRecord, CodexRow } from "../contract.js";
import { visibleToolOutput } from "./toolOutput.js";

export function record(value: unknown): CodexRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as CodexRecord)
    : {};
}
export function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
export function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(contentText).filter(Boolean).join("\n");
  const data = record(value);
  return text(data.text) || text(data.input_text) || text(data.output_text);
}
export function readableJson(value: unknown): string {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
export function projectItem(raw: unknown, turnId: string, timestamp?: string): CodexRow | null {
  const item = record(raw);
  const id = text(item.id);
  if (!id) return null;
  const base = { id, turnId, timestamp };
  const type = text(item.type);
  if (type === "userMessage") {
    const content = Array.isArray(item.content) ? item.content : [];
    const images = content.flatMap((x) => {
      const c = record(x);
      const path = text(c.url) || text(c.path);
      return ["image", "localImage"].includes(text(c.type)) && path ? [path] : [];
    });
    return { ...base, kind: "user", text: contentText(content), images };
  }
  if (type === "agentMessage" || type === "plan")
    return { ...base, kind: "assistant", text: text(item.text) };
  if (type === "reasoning") return { ...base, kind: "reasoning", text: contentText(item.summary) };
  if (type === "commandExecution")
    return {
      ...base,
      kind: "tool",
      title: "命令",
      text: text(item.command),
      output:
        text(item.aggregatedOutput) +
        (typeof item.exitCode === "number" && item.exitCode !== 0
          ? `\n退出码：${item.exitCode}`
          : ""),
      status: text(item.status),
    };
  if (type === "fileChange") {
    const changes = Array.isArray(item.changes) ? item.changes : [];
    return {
      ...base,
      kind: "diff",
      title: "文件修改",
      status: text(item.status),
      text: changes
        .map((c) => {
          const change = record(c);
          return `${text(change.path)}\n${text(change.diff)}`;
        })
        .join("\n\n"),
    };
  }
  if (type === "mcpToolCall" || type === "dynamicToolCall")
    return {
      ...base,
      kind: "tool",
      title: [item.server, item.tool].filter(Boolean).join(" / "),
      text: readableJson(item.arguments),
      ...visibleToolOutput(item.result ?? item.error ?? item.contentItems),
      status: text(item.status),
    };
  if (type === "functionCallOutput")
    return {
      ...base,
      kind: "tool",
      title: text(item.name),
      text: "",
      ...visibleToolOutput(item.output),
      status: "completed",
    };
  if (type === "contextCompaction") return { ...base, kind: "notice", text: "上下文已整理" };
  if (type === "imageView" || type === "imageGeneration") {
    const path = text(item.savedPath) || text(item.path);
    const result = text(item.result);
    return {
      ...base,
      kind: "tool",
      title: type === "imageView" ? "查看图片" : "生成图片",
      text: text(item.revisedPrompt),
      images: path
        ? [path]
        : result
          ? [result.startsWith("data:") ? result : `data:image/png;base64,${result}`]
          : [],
      output: item.failure ? readableJson(item.failure) : undefined,
      status: text(item.status) || undefined,
    };
  }
  if (type === "webSearch")
    return {
      ...base,
      kind: "tool",
      title: "网页查询",
      text: text(item.query),
      output: readableJson(item.results ?? item.action),
    };
  if (type === "collabAgentToolCall")
    return {
      ...base,
      kind: "tool",
      title: text(item.tool),
      text: text(item.prompt),
      output: readableJson(item.agentsStates),
      status: text(item.status),
    };
  if (type === "enteredReviewMode" || type === "exitedReviewMode")
    return { ...base, kind: "notice", text: text(item.review) };
  // 未识别的事件保留可见类型，不能误报为成功，也不能展示加密推理或宿主隐藏指令。
  if (["hookPrompt", "internal"].includes(type)) return null;
  return {
    ...base,
    kind: "tool",
    title: type,
    text: text(item.text) || text(item.prompt) || text(item.query),
    output: readableJson(item.result),
    status: text(item.status) || undefined,
  };
}
export function mergeRow(rows: CodexRow[], row: CodexRow): void {
  const index = rows.findIndex((x) => x.id === row.id && x.turnId === row.turnId);
  if (index < 0) rows.push(row);
  else rows[index] = row;
}
export function projectCompletedTurns(turns: unknown[]): CodexRow[] {
  return turns.flatMap((raw) => {
    const turn = record(raw);
    if (!["completed", "interrupted", "failed"].includes(text(turn.status))) return [];
    return (Array.isArray(turn.items) ? turn.items : [])
      .map((x) =>
        projectItem(
          x,
          text(turn.id),
          typeof turn.startedAt === "number"
            ? new Date(turn.startedAt * 1000).toISOString()
            : undefined,
        ),
      )
      .filter((x): x is CodexRow => x !== null);
  });
}
export function aliasKey(engine: string, provider: string, modelId: string): string {
  return JSON.stringify([engine, provider, modelId]);
}
