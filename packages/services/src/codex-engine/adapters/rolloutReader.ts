import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { CodexRow } from "../contract.js";
import { contentText, readableJson, record, text } from "../domain/projection.js";

/** 只读 Desktop legacy/分页日志；只提交明确完成的轮次，尾部半行不会误记为完成。 */
export async function readRollout(
  path: string,
): Promise<{ rows: CodexRow[]; lastTurnId?: string; warnings: string[] }> {
  const stream = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  const rows: CodexRow[] = [],
    pending: CodexRow[] = [];
  let turnId = "",
    lastTurnId: string | undefined,
    index = 0,
    malformed = false;
  const completed = new Set<string>();
  try {
    for await (const line of lines) {
      index++;
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch {
        malformed = true;
        continue;
      }
      const message = record(value),
        payload = record(message.payload),
        type = text(payload.type);
      if (message.type === "event_msg") {
        if (type === "task_started") {
          pending.length = 0;
          turnId = text(payload.turn_id) || `turn-${index}`;
        }
        if (["task_complete", "task_completed", "turn_aborted"].includes(type)) {
          const ended = text(payload.turn_id) || turnId;
          if (ended === turnId && !completed.has(ended)) {
            rows.push(...pending);
            lastTurnId = ended;
            completed.add(ended);
          }
          pending.length = 0;
          turnId = "";
        }
        continue;
      }
      if (message.type === "turn_context" && !turnId)
        turnId = text(payload.turn_id) || `turn-${index}`;
      if (message.type !== "response_item" || !turnId) continue;
      const base = {
        id: text(payload.id) || `rollout-${index}`,
        turnId,
        timestamp: text(message.timestamp) || undefined,
      };
      if (type === "message" && ["user", "assistant"].includes(text(payload.role))) {
        const content = Array.isArray(payload.content) ? payload.content : [];
        const images = content.flatMap((c) => {
          const part = record(c);
          return part.type === "input_image" && typeof part.image_url === "string"
            ? [part.image_url]
            : [];
        });
        pending.push({
          ...base,
          kind: payload.role as "user" | "assistant",
          text: contentText(content),
          images,
        });
      } else if (type === "reasoning") {
        const summary = contentText(payload.summary);
        if (summary) pending.push({ ...base, kind: "reasoning", text: summary });
      } else if (["function_call", "custom_tool_call"].includes(type)) {
        pending.push({
          ...base,
          id: text(payload.call_id) || base.id,
          kind: "tool",
          title: text(payload.name),
          text: text(payload.arguments) || text(payload.input),
          status: "historical",
        });
      } else if (["function_call_output", "custom_tool_call_output"].includes(type)) {
        const id = text(payload.call_id);
        const row = pending.find((r) => r.id === id && r.kind === "tool");
        if (row) {
          row.output = readableJson(payload.output);
          row.status = "completed";
        } else
          pending.push({
            ...base,
            kind: "tool",
            title: "工具结果",
            text: "",
            output: readableJson(payload.output),
            status: "completed",
          });
      }
    }
  } finally {
    lines.close();
    stream.destroy();
  }
  const warnings: string[] = [];
  if (pending.length) warnings.push("仅导入已完成轮次，正在执行的内容未纳入");
  if (malformed) warnings.push("日志包含未写完或无法解析的行；已保留可验证的完成轮次");
  return { rows, lastTurnId, warnings };
}
