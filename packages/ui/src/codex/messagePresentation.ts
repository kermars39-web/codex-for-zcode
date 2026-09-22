import {
  extractAssistantDirectives,
  findMarkdownCodeRanges,
  overlapsAssistantTextRanges,
} from "../lib/assistantDirectiveParser.js";

export type MessagePart =
  | { kind: "markdown"; text: string }
  | { kind: "suggestion"; text: string; prompt: string };
/** 将完整 Desktop 文件引用交给原生渲染器，保留路径参数、代码示例与原始存储。 */
function adaptFileCitations(text: string): string {
  const codeRanges = findMarkdownCodeRanges(text);
  const citations = extractAssistantDirectives(text, "codex-file-citation", {
    allowSingleColon: true,
    allowTripleColon: true,
    allowSmartQuotes: true,
  });
  let result = "",
    cursor = 0;
  for (const citation of citations) {
    if (
      !citation.parameters?.path?.trim() ||
      overlapsAssistantTextRanges(citation.start, citation.end, codeRanges)
    )
      continue;
    result +=
      text.slice(cursor, citation.start) +
      citation.raw.replace("codex-file-citation", "zcode-file-citation");
    cursor = citation.end;
  }
  return result + text.slice(cursor);
}

/** 只解释正文中的完整 Desktop 标记，代码块与原始存储保持不变。 */
export function messagePresentation(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let buffer: string[] = [],
    fence: string | undefined;
  const flush = () => {
    if (buffer.length)
      parts.push({ kind: "markdown", text: adaptFileCitations(buffer.join("\n")) });
    buffer = [];
  };
  for (const line of text.split("\n")) {
    const matchFence = line.trim().match(/^(`{3,}|~{3,})/);
    if (matchFence)
      fence = fence ? (matchFence[1]!.startsWith(fence) ? undefined : fence) : matchFence[1];
    const match =
      !fence && line.match(/^\s*-\s+:codex-followup\[([^\]]+)\]\{prompt="((?:\\.|[^"\\])*)"\}\s*$/);
    if (match) {
      try {
        const prompt = JSON.parse(`"${match[2]}"`) as string;
        flush();
        parts.push({ kind: "suggestion", text: match[1]!, prompt });
      } catch {
        buffer.push(line);
      }
    } else buffer.push(line);
  }
  flush();
  return parts;
}
