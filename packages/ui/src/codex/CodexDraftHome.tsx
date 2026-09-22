import type { ReactNode } from "react";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { ConversationDraftEmptyState } from "@/v4/ConversationDraftEmptyState.js";
import {
  ConversationDraftSuggestedPrompts,
  type DraftSuggestedPromptItem,
} from "@/v4/ConversationDraftSuggestedPrompts.js";
import { resolveDraftSuggestedPromptText } from "@/v4/draftSuggestedPromptItems.js";

const suggestions: DraftSuggestedPromptItem[] = [
  {
    id: "weekly",
    iconName: "AlarmClockCheck",
    label: { cn: "周报总结", en: "Weekly summary" },
    prompt: {
      cn: "请根据我提供的工作记录整理本周工作总结。先确认材料范围和汇报对象。",
      en: "Help summarize my weekly work. First confirm the source material and intended audience.",
    },
  },
  {
    id: "debug",
    iconName: "Bug",
    label: { cn: "报错修复", en: "Fix an error" },
    prompt: {
      cn: "帮我定位并修复报错。先核对错误信息、复现步骤和相关代码，再提出修改。",
      en: "Help diagnose and fix an error. First review the error, reproduction steps and relevant code.",
    },
  },
  {
    id: "slides",
    iconName: "Presentation",
    label: { cn: "PPT 制作", en: "Create slides" },
    prompt: {
      cn: "帮我制作一份 PPT。先确认用途、听众、素材和页数，再组织内容。",
      en: "Help create a presentation. First confirm its purpose, audience, materials and length.",
    },
  },
  { id: "offpeak", iconName: "Moon", label: { cn: "闲时任务", en: "Off-peak tasks" }, prompt: {} },
];

export function CodexDraftHome({
  children,
  onSuggestion,
  onOpenAutomations,
}: {
  children: ReactNode;
  onSuggestion: (text: string) => void;
  onOpenAutomations?: () => void;
}) {
  const { locale } = useZCodeIntl();
  return (
    <div
      className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]"
      data-testid="codex-draft-home"
    >
      {/* 与 ConversationTimeline 的空态使用同一布局，问候语和输入框作为整体随窗口高度排布。 */}
      <div className="flex min-h-full flex-col items-center px-4 before:block before:min-h-[52px] before:w-full before:shrink before:basis-[29dvh] before:content-[''] after:block after:min-h-4 after:w-full after:flex-1 after:content-['']">
        <div className="flex w-full max-w-2xl shrink-0 items-center justify-center">
          <ConversationDraftEmptyState />
        </div>
        <div className="mt-3 flex w-full max-w-2xl shrink-0 flex-col items-center">{children}</div>
        <ConversationDraftSuggestedPrompts
          className="mt-6 w-full max-w-2xl shrink-0"
          items={onOpenAutomations ? suggestions : suggestions.slice(0, 3)}
          onSelect={(item) => {
            if (item.id === "offpeak") onOpenAutomations?.();
            else onSuggestion(resolveDraftSuggestedPromptText(item.prompt, locale));
          }}
        />
      </div>
    </div>
  );
}
