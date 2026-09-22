import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/lib/utils.js";
import { getConversationContentWidthClassName } from "@/v4/conversationLayout.js";
import { CodexTaskHeader } from "./CodexTaskHeader.js";
import { CodexComposer } from "./CodexComposer.js";
import type { CodexStatus } from "@zcode/services";
import { useCodexService, useCodexTask } from "@/hooks/useCodexService.js";
import { usePlatform } from "@/hooks/usePlatform.js";
import { CODEX_DRAFT, modelAliasKey, useCodexUiStore } from "@/store/codexUiStore.js";
import { Button } from "@/components/ui/button.js";
import type { MessageFileLinkTarget } from "@/components/ai-elements/message.js";
import { availableCodexModels, resolveCodexModel } from "@/lib/codexModelPreferences.js";
import { CodexTranscript } from "./CodexTranscript.js";
import { CodexApprovalCard } from "./CodexApprovalCard.js";
import { CodexSettings } from "./CodexSettings.js";

export function CodexChatPane({
  titleHost,
  workspacePath,
  workspaceIdentity,
  taskId,
  onUseOriginalEngine,
  onOpenFileLink,
}: {
  titleHost?: HTMLElement | null;
  workspacePath: string;
  workspaceIdentity?: string;
  taskId?: string;
  onUseOriginalEngine: () => void;
  onOpenFileLink?: (target: MessageFileLinkTarget) => void;
}) {
  const service = useCodexService(),
    platform = usePlatform();
  const { page, error, loadOlder } = useCodexTask(taskId);
  const [images, setImages] = useState<string[]>([]),
    [status, setStatus] = useState<CodexStatus>(),
    [model, setModel] = useState(""),
    [effort, setEffort] = useState(""),
    [busy, setBusy] = useState(false),
    [localError, setLocalError] = useState(""),
    [settings, setSettings] = useState(false),
    [newDirectory, setNewDirectory] = useState<string>();
  const createdTask = useRef<string | undefined>(undefined);
  const aliases = useCodexUiStore((s) => s.modelAliases),
    select = useCodexUiStore((s) => s.select);
  const workspaceKey = workspaceIdentity?.trim() || workspacePath;
  const draftKey = `${workspaceKey}:${taskId || CODEX_DRAFT}`;
  const draft = useCodexUiStore((s) => s.drafts[draftKey] ?? "");
  const setDraft = (text: string) => useCodexUiStore.getState().setDraft(draftKey, text);
  const defaultEffort = useCodexUiStore((s) => s.defaultEffort);
  const defaultModel = useCodexUiStore((s) => s.defaultModel);
  const models = availableCodexModels(status?.models);
  useEffect(() => {
    setImages([]);
    setLocalError("");
    setNewDirectory(undefined);
    createdTask.current = undefined;
  }, [taskId, workspaceKey]);
  useEffect(() => {
    if (!service) return;
    let active = true;
    const refresh = () =>
      service
        .status()
        .then((s) => {
          if (active) {
            setStatus(s);
          }
        })
        .catch((e) => {
          if (active) setLocalError(String(e));
        });
    void refresh();
    const sub = service.onDidChange((event) => {
      if (event.type === "account") void refresh();
    });
    return () => {
      active = false;
      sub.dispose();
    };
  }, [service]);
  useEffect(() => {
    const chosen = resolveCodexModel(
      availableCodexModels(status?.models),
      page?.task.model || defaultModel,
      status?.defaults?.model,
    );
    setModel(chosen?.model || "");
    const desiredEffort = page?.task.effort || defaultEffort || status?.defaults?.effort || "";
    setEffort(
      chosen?.supportedReasoningEfforts.some((e) => e.reasoningEffort === desiredEffort)
        ? desiredEffort
        : chosen?.defaultReasoningEffort || "",
    );
  }, [taskId, page?.task.model, page?.task.effort, status, defaultEffort, defaultModel]);
  const chosenModel = models.find((m) => m.model === model);
  const running = page?.task.status === "running" || page?.task.status === "waiting";
  async function send(text = draft) {
    if (!service || busy || (!text.trim() && !images.length)) return;
    if (!chosenModel) {
      setLocalError("当前账号暂时无法使用所选模型，请在引擎设置中刷新状态。");
      return;
    }
    setBusy(true);
    setLocalError("");
    try {
      const currentId = taskId || createdTask.current;
      const task = currentId
        ? { id: currentId }
        : await service.createTask({
            workspacePath: newDirectory || workspacePath,
            workspaceIdentity,
            model: model || undefined,
            effort: effort || undefined,
          });
      createdTask.current = task.id;
      await service.send({
        taskId: task.id,
        text,
        images,
        model: model || undefined,
        effort: effort || undefined,
        workspacePath: newDirectory,
      });
      // 接收期间可能继续打字，只有仍对应本次提交的草稿才清空。
      if (useCodexUiStore.getState().drafts[draftKey] === text) setDraft("");
      setImages([]);
      if (!taskId) select(workspaceKey, task.id);
    } catch (e) {
      setLocalError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function addFiles(files: FileList | null) {
    if (!files) return;
    try {
      const added = await Promise.all(
        [...files].map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
                reject(new Error("请选择 10 MB 以内的图片"));
                return;
              }
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error("图片读取失败"));
              reader.readAsDataURL(file);
            }),
        ),
      );
      setImages((old) => [...old, ...added]);
    } catch (e) {
      setLocalError(String(e));
    }
  }
  return (
    <div
      className="@container/conversation flex h-full min-h-0 flex-col bg-background"
      data-testid="codex-chat-pane"
    >
      {titleHost &&
        createPortal(
          <CodexTaskHeader
            task={page?.task}
            workspacePath={newDirectory || page?.task.workspacePath || workspacePath}
            running={running}
            onHome={() => select(workspaceKey, CODEX_DRAFT, workspacePath)}
            onDirectory={() => {
              void platform.selectDirectory().then((path) => {
                if (path) setNewDirectory(path);
              });
            }}
            onSettings={() => setSettings(true)}
          />,
          titleHost,
        )}
      {!taskId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-foreground-subtle">
          <h2 className="text-ui-xl font-medium text-foreground">有什么需要一起完成？</h2>
          <p className="text-ui-caption">描述任务，或从侧栏导入已有对话</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              select(workspaceKey, null);
              onUseOriginalEngine();
            }}
          >
            使用 ZCode 原有引擎新建
          </Button>
        </div>
      ) : (
        <CodexTranscript
          rows={page?.rows ?? []}
          onSuggestion={setDraft}
          onOpenFileLink={onOpenFileLink}
          workspacePath={page?.task.workspacePath || workspacePath}
          loadOlder={
            page?.nextCursor
              ? () => {
                  void loadOlder().catch((e) => setLocalError(String(e)));
                }
              : undefined
          }
        />
      )}
      <div
        className={cn(
          "relative mx-auto flex w-full shrink-0 flex-col gap-2 px-4 pb-4",
          getConversationContentWidthClassName({
            centeredEmptyLayout: !taskId,
            statusPanelLayout: "none",
          }),
        )}
      >
        {page?.approvals.map((approval) => (
          <CodexApprovalCard key={approval.id} approval={approval} />
        ))}
        {(error || localError || page?.task.error) && (
          <p role="alert" className="rounded-md bg-surface p-2 text-ui-caption text-destructive">
            {localError || error || page?.task.error}
          </p>
        )}
        <CodexComposer
          key={draftKey}
          text={draft}
          taskId={taskId}
          workspacePath={newDirectory || page?.task.workspacePath || workspacePath}
          workspaceIdentity={workspaceIdentity}
          images={images}
          model={chosenModel}
          models={models}
          labelForModel={(item) =>
            aliases[modelAliasKey("codex", "openai", item.model)] || item.displayName || item.model
          }
          onModel={(value) => {
            const next = models.find((item) => item.model === value);
            if (!next) return;
            setModel(next.model);
            setEffort(next.defaultReasoningEffort || "");
            if (!taskId)
              useCodexUiStore
                .getState()
                .setModelPreference(next.model, next.defaultReasoningEffort || "");
          }}
          modelLabel={
            chosenModel
              ? aliases[modelAliasKey("codex", "openai", chosenModel.model)] ||
                chosenModel.displayName ||
                chosenModel.model
              : "模型暂不可用"
          }
          effort={effort}
          running={running}
          busy={busy}
          onChange={setDraft}
          onSend={(text) => {
            void send(text);
          }}
          onStop={() => {
            if (taskId) void service?.interrupt({ taskId }).catch((e) => setLocalError(String(e)));
          }}
          onEffort={(value) => {
            setEffort(value);
            if (!taskId) useCodexUiStore.getState().setModelPreference(model, value);
          }}
          onFiles={(files) => {
            void addFiles(files);
          }}
          onRemoveImage={(index) => setImages((old) => old.filter((_, i) => i !== index))}
        />
      </div>
      <CodexSettings open={settings} onOpenChange={setSettings} />
    </div>
  );
}
