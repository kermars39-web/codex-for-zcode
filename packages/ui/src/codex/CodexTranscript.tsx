import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CodexRow } from "@zcode/services";
import {
  Message,
  MessageContent,
  MessageResponse,
  type MessageFileLinkTarget,
} from "@/components/ai-elements/message.js";
import { Button } from "@/components/ui/button.js";
import { ChevronRight, ArrowDown } from "lucide-react";
import { cn } from "@/components/lib/utils.js";
import { getConversationContentWidthClassName } from "@/v4/conversationLayout.js";
import { groupTranscriptRows, workGroupLabel } from "./transcriptGroups.js";
import { CodexMessageText } from "./CodexMessageText.js";
import { CodexHistoryImage } from "./CodexHistoryImage.js";

export function CodexRowView({
  row,
  workspacePath,
  onSuggestion,
  onOpenFileLink,
  compact = false,
}: {
  row: CodexRow;
  compact?: boolean;
  workspacePath?: string;
  onSuggestion?: (prompt: string) => void;
  onOpenFileLink?: (target: MessageFileLinkTarget) => void;
}) {
  if (row.kind === "reasoning" || row.kind === "tool" || row.kind === "diff")
    return (
      <details className="my-1 px-2 py-1 text-ui-caption">
        <summary className="cursor-pointer text-foreground-subtle">
          {row.title || (row.kind === "reasoning" ? "思考摘要" : "执行记录")}{" "}
          {row.status && (
            <span className="ml-2 text-ui-xs">
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
        </summary>
        {row.kind === "reasoning" ? (
          <MessageResponse workspacePath={workspacePath} onOpenFileLink={onOpenFileLink}>
            {row.text}
          </MessageResponse>
        ) : (
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-ui-caption">
            {row.text}
            {row.output && `\n${row.output}`}
          </pre>
        )}
        {row.images?.map((src, i) => (
          <CodexHistoryImage key={i} source={src} />
        ))}
      </details>
    );
  if (row.kind === "notice")
    return <p className="py-2 text-center text-ui-xs text-foreground-subtlest">{row.text}</p>;
  return (
    <Message
      from={row.kind === "user" ? "user" : "assistant"}
      className={compact ? "py-2" : row.kind === "user" ? "pt-14 pb-5" : "py-5"}
      title={row.timestamp ? new Date(row.timestamp).toLocaleString() : undefined}
      data-testid={`codex-message-${row.kind}`}
    >
      <MessageContent>
        {row.kind === "assistant" ? (
          <CodexMessageText
            text={row.text}
            workspacePath={workspacePath}
            onSuggestion={onSuggestion}
            onOpenFileLink={onOpenFileLink}
          />
        ) : (
          <MessageResponse workspacePath={workspacePath} onOpenFileLink={onOpenFileLink}>
            {row.text}
          </MessageResponse>
        )}
        {row.images?.map((src, i) => (
          <CodexHistoryImage key={`${src.slice(0, 100)}-${i}`} source={src} />
        ))}
      </MessageContent>
    </Message>
  );
}
export function CodexTranscript({
  rows,
  workspacePath,
  loadOlder,
  onSuggestion,
  onOpenFileLink,
}: {
  rows: CodexRow[];
  workspacePath?: string;
  loadOlder?: () => void;
  onSuggestion?: (prompt: string) => void;
  onOpenFileLink?: (target: MessageFileLinkTarget) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const groups = useMemo(() => groupTranscriptRows(rows), [rows]);
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);
  const followLatest = useRef(true);
  const virtual = useVirtualizer({
    count: groups.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 140,
    overscan: 8,
    getItemKey: (index) => groups[index]!.key,
  });
  useEffect(() => {
    if (followLatest.current && rows.length)
      virtual.scrollToIndex(groups.length - 1, { align: "end" });
  }, [groups, virtual]);
  useLayoutEffect(() => {
    const anchor = prependAnchor.current;
    if (anchor && ref.current) {
      ref.current.scrollTop = anchor.top + ref.current.scrollHeight - anchor.height;
      prependAnchor.current = null;
    }
  }, [groups]);
  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={ref}
        className="h-full min-h-0 overflow-y-auto pb-6"
        data-testid="codex-transcript"
        onScroll={() => {
          const el = ref.current;
          if (el) {
            followLatest.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            setAwayFromBottom(!followLatest.current);
          }
        }}
      >
        <div
          className={cn(
            "mx-auto w-full",
            getConversationContentWidthClassName({
              centeredEmptyLayout: false,
              statusPanelLayout: "none",
            }),
          )}
        >
          {loadOlder && (
            <Button
              variant="ghost"
              className="my-2 w-full"
              onClick={() => {
                if (ref.current)
                  prependAnchor.current = {
                    height: ref.current.scrollHeight,
                    top: ref.current.scrollTop,
                  };
                followLatest.current = false;
                loadOlder();
              }}
            >
              加载更早的消息
            </Button>
          )}
          <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
            {virtual.getVirtualItems().map((item) => (
              <div
                key={item.key}
                ref={virtual.measureElement}
                data-index={item.index}
                className="px-4 @md/conversation:px-6"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${item.start}px)`,
                }}
              >
                {groups[item.index]!.work ? (
                  <details className="group/work my-5 text-ui-base text-foreground-subtle">
                    <summary
                      className="flex w-full cursor-pointer list-none items-center gap-2 border-b border-border/50 pb-2 [&::-webkit-details-marker]:hidden"
                      title={`执行过程 · ${groups[item.index]!.rows.length} 条记录`}
                    >
                      <span>{workGroupLabel(groups[item.index]!.rows)}</span>
                      <ChevronRight
                        aria-hidden
                        className="size-4 shrink-0 text-foreground-subtlest opacity-70 transition-transform group-open/work:rotate-90"
                      />
                    </summary>
                    <div className="mt-2 border-l border-border pl-3">
                      {groups[item.index]!.rows.map((row) => (
                        <CodexRowView
                          key={`${row.turnId}:${row.id}`}
                          row={row}
                          compact
                          workspacePath={workspacePath}
                          onOpenFileLink={onOpenFileLink}
                        />
                      ))}
                    </div>
                  </details>
                ) : (
                  <CodexRowView
                    row={groups[item.index]!.rows[0]!}
                    workspacePath={workspacePath}
                    onSuggestion={onSuggestion}
                    onOpenFileLink={onOpenFileLink}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {awayFromBottom && (
        <Button
          variant="outline"
          size="icon-md"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background shadow-sm"
          aria-label="回到最新消息"
          onClick={() => {
            followLatest.current = true;
            setAwayFromBottom(false);
            virtual.scrollToIndex(Math.max(0, groups.length - 1), { align: "end" });
          }}
        >
          <ArrowDown className="size-4" />
        </Button>
      )}
    </div>
  );
}
