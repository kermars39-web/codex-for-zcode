import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CodexRow } from "@zcode/services";
import type { MessageFileLinkTarget } from "@/components/ai-elements/message.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.js";
import { Button } from "@/components/ui/button.js";
import { ChevronRight, ArrowDown } from "lucide-react";
import { cn } from "@/components/lib/utils.js";
import { getConversationContentWidthClassName } from "@/v4/conversationLayout.js";
import { groupTranscriptRows, workGroupLabel } from "./transcriptGroups.js";
import { CodexRowView } from "./CodexRowView.js";

export function CodexTranscript({
  rows,
  activeTurnId,
  workspacePath,
  loadOlder,
  onSuggestion,
  onOpenFileLink,
}: {
  rows: CodexRow[];
  activeTurnId?: string;
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
        className="h-full min-h-0 overflow-x-hidden overflow-y-auto pb-6 [scrollbar-gutter:stable]"
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
                  <Collapsible
                    defaultOpen={groups[item.index]!.rows[0]?.turnId === activeTurnId}
                    className="group/work pt-5 text-ui-base text-foreground-subtle"
                  >
                    <div className="border-b border-border/50 pb-2">
                      <CollapsibleTrigger
                        className="inline-flex max-w-full cursor-pointer items-center gap-2 text-left"
                        title={`执行过程 · ${groups[item.index]!.rows.length} 条记录`}
                      >
                        <span>{workGroupLabel(groups[item.index]!.rows)}</span>
                        <ChevronRight
                          aria-hidden
                          className="size-4 shrink-0 text-foreground-subtlest opacity-70 transition-transform group-data-[state=open]/work:rotate-90"
                        />
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="flex flex-col gap-4 pt-5">
                        {groups[item.index]!.rows.map((row) => (
                          <CodexRowView
                            key={`${row.turnId}:${row.id}`}
                            row={row}
                            compact
                            active={row.turnId === activeTurnId}
                            workspacePath={workspacePath}
                            onOpenFileLink={onOpenFileLink}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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
