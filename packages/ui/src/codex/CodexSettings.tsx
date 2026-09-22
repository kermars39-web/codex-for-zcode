import { useEffect, useState } from "react";
import type { CodexStatus } from "@zcode/services";
import { useCodexService } from "@/hooks/useCodexService.js";
import { usePlatform } from "@/hooks/usePlatform.js";
import { modelAliasKey, useCodexUiStore } from "@/store/codexUiStore.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { availableCodexModels, resolveCodexModel } from "@/lib/codexModelPreferences.js";
import { CodexQuota } from "./CodexQuota.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.js";

export function CodexSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const service = useCodexService(),
    platform = usePlatform();
  const [status, setStatus] = useState<CodexStatus>();
  const [error, setError] = useState("");
  const [loginId, setLoginId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const aliases = useCodexUiStore((s) => s.modelAliases),
    setAlias = useCodexUiStore((s) => s.setAlias),
    engine = useCodexUiStore((s) => s.preferredEngine),
    setEngine = useCodexUiStore((s) => s.setEngine);
  const defaultEffort = useCodexUiStore((s) => s.defaultEffort);
  const defaultModel = useCodexUiStore((s) => s.defaultModel);
  const setModelPreference = useCodexUiStore((s) => s.setModelPreference);
  const models = availableCodexModels(status?.models);
  const chosen = resolveCodexModel(models, defaultModel, status?.defaults?.model);
  async function refresh() {
    if (!service) return;
    setBusy(true);
    try {
      setStatus(await service.status());
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!open || !service) return;
    void refresh();
    const sub = service.onDidChange((event) => {
      if (event.type === "account") void refresh();
    });
    return () => sub.dispose();
  }, [open, service]);
  async function login() {
    if (!service) return;
    try {
      const result = await service.login({ action: "start" });
      setLoginId(result.loginId);
      if (result.authUrl) platform.openExternal(result.authUrl);
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>引擎与模型设置</DialogTitle>
          <DialogDescription>
            使用本机 Codex 登录与配置，模型别名只改变选择器中的显示。
          </DialogDescription>
        </DialogHeader>
        <label className="text-ui-caption">
          新任务默认引擎
          <select
            aria-label="默认引擎"
            className="ml-3 rounded-md border border-border bg-input px-3 py-2 text-ui-caption"
            value={engine}
            onChange={(e) => setEngine(e.target.value as "codex" | "zcode")}
          >
            <option value="codex">Codex</option>
            <option value="zcode">ZCode</option>
          </select>
        </label>
        <div className="grid gap-3 rounded-xl border border-border p-3 text-ui-base">
          <label className="flex items-center justify-between gap-3">
            新任务模型
            <select
              aria-label="新任务默认模型"
              className="rounded-lg border border-border bg-input px-3 py-2"
              value={defaultModel}
              onChange={(e) => setModelPreference(e.target.value, "")}
            >
              <option value="">跟随 Codex 配置</option>
              {defaultModel && !chosen && <option value={defaultModel}>所选模型暂不可用</option>}
              {models.map((m) => (
                <option key={m.id} value={m.model}>
                  {aliases[modelAliasKey("codex", "openai", m.model)] || m.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3">
            默认思考强度
            <select
              aria-label="默认思考强度"
              className="rounded-lg border border-border bg-input px-3 py-2"
              value={defaultEffort}
              onChange={(e) => setModelPreference(defaultModel, e.target.value)}
            >
              <option value="">跟随 Codex 配置</option>
              {chosen?.supportedReasoningEfforts.map((e) => (
                <option key={e.reasoningEffort} value={e.reasoningEffort}>
                  {e.reasoningEffort}
                </option>
              ))}
            </select>
          </label>
          <p className="text-ui-caption text-foreground-subtle">
            复用本机规则、Skills 和
            MCP。新建、项目首页与快捷键使用同一默认引擎；已有任务保持原引擎。草稿自动保存，审批在实际执行时确认。
          </p>
        </div>
        <div className="rounded-lg border border-border p-3 text-ui-caption">
          <p>
            {status?.account
              ? `${status.account.type} · ${status.account.planType ?? ""} · ${status.account.email ?? ""}`
              : busy
                ? "正在读取登录状态…"
                : "尚未登录"}
          </p>
          <p className="mt-1 break-all text-ui-xs text-foreground-subtle">{status?.runtime}</p>
          {status?.warning && <p>{status.warning}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void login()}>
              登录 ChatGPT
            </Button>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
              刷新状态
            </Button>
            {loginId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void service
                    ?.login({ action: "cancel", loginId })
                    .then(() => setLoginId(undefined))
                    .catch((e) => setError(String(e)));
                }}
              >
                取消登录
              </Button>
            )}
          </div>
          {status?.rateLimits && <CodexQuota limits={status.rateLimits} />}
        </div>
        <h3 className="text-ui-base font-medium">模型显示名称</h3>
        {models.map((model) => {
          const key = modelAliasKey("codex", "openai", model.model);
          return (
            <div key={model.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
              <label htmlFor={`alias-${model.id}`} className="text-ui-caption">
                {model.displayName || model.model}
              </label>
              <Input
                id={`alias-${model.id}`}
                aria-label={`${model.model} 显示名称`}
                value={aliases[key] ?? ""}
                placeholder={model.displayName || model.model}
                onChange={(e) => setAlias(key, e.target.value)}
              />
              <Button variant="ghost" size="sm" onClick={() => setAlias(key, "")}>
                恢复默认
              </Button>
            </div>
          );
        })}
        {error && (
          <p role="alert" className="text-ui-caption text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
