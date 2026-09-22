import { useEffect, useRef, type ReactNode } from "react";
import { ArrowUp, Square } from "lucide-react";
import type { CodexModel } from "@zcode/services";
import { ChatPromptEditor } from "@/prompt-editor/ChatPromptEditor.js";
import type { LexicalChatInputHandle } from "@/LexicalChatInput.js";
import { cn } from "@/components/lib/utils.js";
import { Button } from "@/components/ui/button.js";
import { CodexComposerOptions, CodexPermissionStatus } from "./CodexComposerOptions.js";

export function CodexComposer({
  text,
  taskId,
  workspacePath,
  workspaceIdentity,
  images,
  model,
  models,
  modelLabel,
  labelForModel,
  effort,
  running,
  busy,
  onChange,
  onSend,
  onStop,
  onEffort,
  onModel,
  onFiles,
  onRemoveImage,
  contextHeader,
  onSettings,
  onUseOriginalEngine,
}: {
  contextHeader?: ReactNode;
  onSettings: () => void;
  onUseOriginalEngine?: () => void;
  text: string;
  taskId?: string;
  workspacePath: string;
  workspaceIdentity?: string;
  images: string[];
  model?: CodexModel;
  models: CodexModel[];
  labelForModel: (model: CodexModel) => string;
  onModel: (model: string) => void;
  modelLabel: string;
  effort: string;
  running: boolean;
  busy: boolean;
  onChange: (text: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onEffort: (effort: string) => void;
  onFiles: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
}) {
  const input = useRef<LexicalChatInputHandle | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // 原生编辑器只在挂载时读 initialValue；建议填入、接收后清空仍由唯一草稿状态驱动。
  useEffect(() => {
    if (input.current && input.current.getMarkdown() !== text) input.current.setText(text);
  }, [text]);
  const hasInput = Boolean(text.trim() || images.length);
  const submitDisabled = busy || !model || !hasInput;
  const sendLabel = running ? "追加指令" : "发送任务";
  return (
    <div className="chat-composer-region w-full @container/composer">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <div
        className={cn(
          "chat-composer-input-surface w-full",
          contextHeader && "rounded-2xl bg-surface shadow-xl/5",
        )}
      >
        {contextHeader && (
          <div className="p-1.5 flex min-w-0 flex-wrap items-center gap-0">{contextHeader}</div>
        )}
        <ChatPromptEditor
          workspacePath={workspacePath}
          workspaceIdentity={workspaceIdentity}
          taskId={taskId ?? null}
          initialValue={text}
          inputApiRef={input}
          inputTestId="codex-composer"
          enableMentionPanel={false}
          enableSlashPanel={false}
          placeholder={
            running ? "补充指令，或等待任务完成…" : taskId ? "提出后续修改要求" : "向 ZCode 提问"
          }
          onChange={onChange}
          onSubmit={(value) => {
            onSend(value);
            return false;
          }}
          submitLabel={sendLabel}
          submitting={busy}
          submitDisabled={submitDisabled}
          allowSubmitWhenEmpty={images.length > 0}
          attachmentAction={{ label: "添加图片", onSelect: () => fileInput.current?.click() }}
          leadingActions={<CodexPermissionStatus />}
          topContent={
            images.length ? (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((source, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => onRemoveImage(index)}
                    title="移除图片"
                  >
                    <img alt={`附件 ${index + 1}`} src={source} className="h-16 rounded-md" />
                  </button>
                ))}
              </div>
            ) : undefined
          }
          betweenCancelAndSubmitAction={
            <CodexComposerOptions
              onSettings={onSettings}
              onUseOriginalEngine={onUseOriginalEngine}
              model={model}
              models={models}
              modelLabel={labelForModel}
              onModel={onModel}
              label={modelLabel}
              effort={effort}
              running={running}
              onEffort={onEffort}
            />
          }
          submitControl={
            <>
              {running && (
                <Button
                  type="button"
                  size="icon-md"
                  aria-label="停止任务"
                  className="rounded-lg"
                  onClick={onStop}
                >
                  <Square className="size-4" />
                </Button>
              )}
              {(!running || hasInput) && (
                <Button
                  type="submit"
                  size="icon-md"
                  aria-label={sendLabel}
                  disabled={submitDisabled}
                  className="rounded-lg bg-brand text-foreground-inverse hover:bg-brand/80"
                >
                  <ArrowUp className="size-4" />
                </Button>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}
