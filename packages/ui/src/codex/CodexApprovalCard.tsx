import { useState } from "react";
import type { CodexApproval, CodexRecord } from "@zcode/services";
import { useCodexService } from "@/hooks/useCodexService.js";
import { usePlatform } from "@/hooks/usePlatform.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
const object = (value: unknown): CodexRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as CodexRecord) : {};

export function CodexApprovalCard({ approval }: { approval: CodexApproval }) {
  const service = useCodexService(),
    platform = usePlatform();
  const [values, setValues] = useState<CodexRecord>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [scope, setScope] = useState("turn");
  const params = approval.params,
    method = approval.method;
  const questions = Array.isArray(params.questions) ? params.questions.map(object) : [];
  const form = object(params.requestedSchema);
  const properties = object(form.properties),
    required = Array.isArray(form.required) ? form.required : [];
  const set = (key: string, value: unknown) => setValues((old) => ({ ...old, [key]: value }));
  async function respond(response: CodexRecord) {
    if (!service || busy) return;
    setBusy(true);
    try {
      await service.respond({ taskId: approval.taskId, requestId: approval.id, response });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  function submitForm() {
    for (const key of required)
      if (typeof key === "string" && (values[key] === undefined || values[key] === "")) {
        setError(`请填写：${key}`);
        return;
      }
    void respond({ action: "accept", content: values });
  }
  return (
    <section
      className="rounded-lg border border-border bg-card p-3 text-ui-caption"
      data-testid="codex-approval"
    >
      <h3 className="mb-2 font-medium">
        {method.includes("requestUserInput")
          ? "需要你的回答"
          : method.includes("elicitation")
            ? "工具需要补充信息"
            : "需要你的授权"}
      </h3>
      {Boolean(params.reason) && <p className="mb-2">{String(params.reason)}</p>}
      {Boolean(params.grantRoot) && (
        <p className="mb-2 break-all">申请写入目录：{String(params.grantRoot)}</p>
      )}
      {Boolean(params.command || params.changes || params.permissions) && (
        <pre className="mb-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-ui-xs">
          {typeof params.command === "string"
            ? params.command
            : JSON.stringify(params.command ?? params.changes ?? params.permissions, null, 2)}
        </pre>
      )}
      {method === "item/tool/requestUserInput" ? (
        <>
          {questions.map((q) => (
            <label key={String(q.id)} className="mb-3 block">
              {String(q.question ?? q.header ?? "")}
              {Array.isArray(q.options) && (
                <div className="my-2 flex flex-wrap gap-1">
                  {q.options.map((raw) => {
                    const opt = object(raw);
                    return (
                      <Button
                        key={String(opt.label)}
                        variant={values[String(q.id)] === opt.label ? "default" : "outline"}
                        size="sm"
                        onClick={() => set(String(q.id), opt.label)}
                      >
                        {String(opt.label)}
                      </Button>
                    );
                  })}
                </div>
              )}
              <Input
                aria-label={String(q.question ?? q.id)}
                type={q.isSecret ? "password" : "text"}
                value={String(values[String(q.id)] ?? "")}
                onChange={(e) => set(String(q.id), e.target.value)}
              />
            </label>
          ))}
          <Button
            disabled={busy}
            size="sm"
            onClick={() => {
              const answers = Object.fromEntries(
                questions.map((q) => [
                  String(q.id),
                  { answers: [String(values[String(q.id)] ?? "")] },
                ]),
              );
              void respond({ answers });
            }}
          >
            提交回答
          </Button>
        </>
      ) : method === "mcpServer/elicitation/request" ? (
        <>
          {Boolean(params.message) && <p className="mb-2">{String(params.message)}</p>}
          {typeof params.url === "string" && /^https?:\/\//.test(params.url) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => platform.openExternal(String(params.url))}
            >
              打开验证页面
            </Button>
          )}
          {Object.entries(properties).map(([key, raw]) => {
            const schema = object(raw);
            return (
              <label key={key} className="my-2 block">
                {String(schema.title ?? key)}
                {required.includes(key) ? " *" : ""}
                {Array.isArray(schema.enum) ? (
                  <select
                    className="ml-2 rounded border border-border bg-input p-1"
                    value={String(values[key] ?? "")}
                    onChange={(e) => set(key, e.target.value)}
                  >
                    <option value="">请选择</option>
                    {schema.enum.map((v) => (
                      <option key={String(v)} value={String(v)}>
                        {String(v)}
                      </option>
                    ))}
                  </select>
                ) : schema.type === "boolean" ? (
                  <input
                    className="ml-2"
                    type="checkbox"
                    checked={Boolean(values[key])}
                    onChange={(e) => set(key, e.target.checked)}
                  />
                ) : (
                  <Input
                    type={schema.type === "number" || schema.type === "integer" ? "number" : "text"}
                    value={String(values[key] ?? "")}
                    onChange={(e) =>
                      set(
                        key,
                        schema.type === "number" || schema.type === "integer"
                          ? Number(e.target.value)
                          : e.target.value,
                      )
                    }
                  />
                )}
              </label>
            );
          })}
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={busy} onClick={submitForm}>
              提交
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void respond({ action: "decline" })}
            >
              拒绝
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void respond({ action: "cancel" })}
            >
              取消
            </Button>
          </div>
        </>
      ) : method === "item/permissions/requestApproval" ? (
        <>
          <label>
            有效范围
            <select
              className="ml-2 rounded border border-border bg-input p-1"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="turn">本轮任务</option>
              <option value="session">当前会话</option>
            </select>
          </label>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void respond({ permissions: params.permissions ?? {}, scope })}
            >
              允许请求的权限
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void respond({ permissions: {}, scope: "turn" })}
            >
              拒绝
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {[
            ["accept", "允许一次"],
            ["acceptForSession", "本会话允许"],
            ["decline", "拒绝"],
            ["cancel", "取消本轮"],
          ]
            .filter(
              ([decision]) =>
                !Array.isArray(params.availableDecisions) ||
                params.availableDecisions.includes(decision),
            )
            .map(([decision, label]) => (
              <Button
                key={decision}
                variant={decision === "accept" ? "default" : "outline"}
                size="sm"
                disabled={busy}
                onClick={() => void respond({ decision })}
              >
                {label}
              </Button>
            ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
