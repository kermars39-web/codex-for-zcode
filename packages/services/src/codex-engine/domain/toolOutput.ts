import type { CodexRecord } from "../contract.js";

export function visibleToolOutput(value: unknown): { output: string; images: string[] } {
  const images: string[] = [],
    parts: string[] = [];
  const object = (v: unknown): CodexRecord =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as CodexRecord) : {};
  const visit = (raw: unknown) => {
    if (typeof raw === "string") {
      parts.push(raw);
      return;
    }
    if (Array.isArray(raw)) {
      raw.forEach(visit);
      return;
    }
    const item = object(raw),
      type = String(item.type || "");
    if (type === "encrypted_content") return;
    if (["image", "input_image", "inputImage"].includes(type)) {
      const src =
        item.image_url ||
        item.imageUrl ||
        item.url ||
        (item.data && item.mimeType ? `data:${item.mimeType};base64,${item.data}` : undefined);
      if (typeof src === "string") images.push(src);
      return;
    }
    if (type.includes("audio") || type.includes("Audio")) {
      parts.push("[音频附件]");
      return;
    }
    if (typeof item.text === "string") {
      parts.push(item.text);
      return;
    }
    if (Array.isArray(item.content)) {
      visit(item.content);
      if (item.structuredContent) parts.push(JSON.stringify(item.structuredContent, null, 2));
      return;
    }
    if (raw !== null && raw !== undefined) parts.push(JSON.stringify(raw, null, 2));
  };
  visit(value);
  return { output: parts.join("\n"), images };
}
