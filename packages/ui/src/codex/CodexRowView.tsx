import { useState } from "react";
import { Check, ChevronRight, Copy, FileIcon, Terminal, Wrench } from "lucide-react";
import type { CodexRow } from "@zcode/services";
import type { MessageFileLinkTarget } from "@/components/ai-elements/message.js";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.js";
import { Button } from "@/components/ui/button.js";
import { cn } from "@/components/lib/utils.js";
import { ConversationUserInputBody } from "@/v4/ConversationUserInputBody.js";
import { ConversationUserInputContent } from "@/v4/ConversationUserInputContent.js";
import { CodexMessageText } from "./CodexMessageText.js";
import { CodexHistoryImage } from "./CodexHistoryImage.js";
import { userMessagePresentation } from "./userMessagePresentation.js";

export function CodexRowView({
  row,
  workspacePath,
  onSuggestion,
  onOpenFileLink,
  compact = false,
  active = false,
}: {
  row: CodexRow;
  compact?: boolean;
  active?: boolean;
  workspacePath?: string;
  onSuggestion?: (prompt: string) => void;
  onOpenFileLink?: (target: MessageFileLinkTarget) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const images = row.images?.map((source, index) => (
    <CodexHistoryImage key={index} source={source} />
  ));
  if (row.kind === "reasoning")
    return (
      <Reasoning
        className="w-full"
        isStreaming={active && row.status === "inProgress"}
        autoCollapseKey={active ? null : row.status}
      >
        {/* 历史未记录耗时，不使用原组件“几秒”的缺省文案来推测。 */}
        <ReasoningTrigger
          streamingText={row.text}
          getThinkingMessage={(streaming) => (
            <span className="font-medium text-foreground-subtlest">
              {streaming ? "正在思考" : "思考"}
            </span>
          )}
        />
        <div data-conversation-selectable="true">
          <ReasoningContent>{row.text || "这条记录未提供可显示的思考摘要。"}</ReasoningContent>
        </div>
        {images}
      </Reasoning>
    );
  if (row.kind === "tool" || row.kind === "diff") {
    const Icon =
      row.kind === "diff"
        ? FileIcon
        : /command|exec|shell|命令/i.test(row.title || "")
          ? Terminal
          : Wrench;
    return (
      <Collapsible className="group/codex-tool w-full min-w-0 text-ui-base">
        <CollapsibleTrigger className="inline-flex max-w-full items-center gap-2 text-left text-foreground-subtle">
          <Icon className="size-4 shrink-0 text-foreground-subtlest" />
          <span className="min-w-0 truncate">
            {row.title || (row.kind === "diff" ? "文件修改" : "执行记录")}
          </span>
          {row.status && (
            <span
              className={cn(
                "shrink-0 text-ui-caption text-foreground-subtlest",
                row.status === "failed" && "text-destructive",
              )}
            >
              {(
                {
                  completed: "完成",
                  failed: "失败",
                  declined: "已拒绝",
                  inProgress: "执行中",
                  interrupted: "已停止",
                } as Record<string, string>
              )[row.status] || row.status}
            </span>
          )}
          <ChevronRight className="size-4 shrink-0 text-foreground-subtlest transition-transform group-data-[state=open]/codex-tool:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-3">
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface p-3 font-mono text-ui-caption">
              {row.text}
              {row.output && `\n${row.output}`}
            </pre>
            {images}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  if (row.kind === "notice")
    return <p className="py-2 text-center text-ui-xs text-foreground-subtlest">{row.text}</p>;
  const user = row.kind === "user";
  const presentation = userMessagePresentation(row.text);
  return (
    <div
      className={cn(
        "group/codex-message flex w-full min-w-0 flex-col",
        user ? "items-end pt-14" : compact ? "" : "pt-5 pb-5",
      )}
      title={row.timestamp ? new Date(row.timestamp).toLocaleString() : undefined}
      data-testid={`codex-message-${row.kind}`}
    >
      {user ? (
        <>
          {presentation.files.length > 0 && (
            <div className="mb-2 flex max-w-full flex-wrap justify-end gap-2">
              {presentation.files.map((file, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="max-w-full gap-2"
                  title={file.path}
                  disabled={!onOpenFileLink}
                  onClick={() =>
                    onOpenFileLink?.({ path: file.path, label: file.name, workspacePath })
                  }
                >
                  <FileIcon className="size-4 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </Button>
              ))}
            </div>
          )}
          {images && (
            <div className="mb-2 flex max-w-full flex-wrap justify-end gap-2">{images}</div>
          )}
          <div
            data-v4-user-input-bubble="true"
            className="flex max-w-full flex-col gap-2 rounded-xl rounded-tr-xs border border-border bg-surface px-4 py-3 text-ui-base text-foreground @min-[624px]/conversation:max-w-xl"
          >
            <ConversationUserInputBody
              rowId={`${row.turnId}:${row.id}`}
              contentText={presentation.text}
            >
              <ConversationUserInputContent text={presentation.text} />
            </ConversationUserInputBody>
          </div>
        </>
      ) : (
        <>
          <CodexMessageText
            text={row.text}
            workspacePath={workspacePath}
            onSuggestion={onSuggestion}
            onOpenFileLink={onOpenFileLink}
          />
          {images}
        </>
      )}
      {!compact && (
        <div className="mt-1 flex h-6 items-center opacity-0 transition-opacity group-hover/codex-message:opacity-100 focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={user ? "复制原始消息" : "复制回复"}
            title={copyError ? "复制失败，请重试" : copied ? "已复制" : "复制"}
            onClick={() => {
              void navigator.clipboard.writeText(row.text).then(
                () => {
                  setCopied(true);
                  setCopyError(false);
                },
                () => setCopyError(true),
              );
            }}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
          {copyError && (
            <span role="alert" className="text-ui-caption text-destructive">
              复制失败，请重试
            </span>
          )}
        </div>
      )}
    </div>
  );
}
