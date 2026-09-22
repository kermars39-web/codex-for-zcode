import { useEffect, useState } from "react";
import type { CodexImportCandidate, CodexImportPreview, ICodexService } from "@zcode/services";
import { useCodexService } from "@/hooks/useCodexService.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.js";
import { CodexRowView } from "./CodexRowView.js";

export function CodexImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: (taskId: string) => void;
}) {
  const service = useCodexService();
  const [items, setItems] = useState<CodexImportCandidate[]>([]),
    [cursor, setCursor] = useState<string>(),
    [search, setSearch] = useState(""),
    [cwd, setCwd] = useState(""),
    [archived, setArchived] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [preview, setPreview] = useState<CodexImportPreview>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [results, setResults] = useState<Awaited<ReturnType<ICodexService["importSessions"]>>>([]);
  async function load(append = false) {
    if (!service) return;
    setBusy(true);
    try {
      const result = await service.listImports({
        cursor: append ? cursor : undefined,
        search,
        cwd,
        archived,
      });
      setItems((old) => (append ? [...old, ...result.data] : result.data));
      setCursor(result.nextCursor);
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (open) {
      setSelected([]);
      setResults([]);
      void load();
    }
  }, [open]);
  async function showPreview(id: string) {
    if (!service || busy) return;
    setBusy(true);
    try {
      setPreview(await service.previewImport({ sourceThreadId: id }));
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function importSelected() {
    if (!service) return;
    setBusy(true);
    try {
      const result = await service.importSessions({ sourceThreadIds: selected });
      setResults(result);
      setSelected([]);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入历史 · Codex Desktop</DialogTitle>
          <DialogDescription>建立独立副本，保留原会话。支持原生复制与兼容续聊。</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <Input
            className="flex-1"
            placeholder="搜索标题"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            className="flex-1"
            placeholder="项目目录（可选）"
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
          />
          <label className="flex items-center gap-1 text-ui-caption">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            已归档
          </label>
          <Button variant="outline" disabled={busy}>
            筛选
          </Button>
        </form>
        <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="max-h-[48vh] overflow-y-auto rounded-lg border border-border">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 border-b border-border px-3 py-2 text-ui-caption"
              >
                <input
                  aria-label={`选择 ${item.title}`}
                  className="mt-1"
                  type="checkbox"
                  disabled={item.alreadyImported || busy}
                  checked={selected.includes(item.id)}
                  onChange={(e) =>
                    setSelected((old) =>
                      e.target.checked ? [...old, item.id] : old.filter((id) => id !== item.id),
                    )
                  }
                />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void showPreview(item.id)}
                >
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="truncate text-ui-xs text-foreground-subtlest">{item.cwd}</p>
                  <p className="text-ui-xs text-foreground-subtle">
                    {item.alreadyImported ? "已导入" : new Date(item.updatedAt).toLocaleString()}
                  </p>
                </button>
              </div>
            ))}
            {cursor && (
              <Button
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={() => void load(true)}
              >
                加载更多
              </Button>
            )}
            {!items.length && !busy && (
              <p className="p-4 text-ui-caption">没有找到匹配的历史会话</p>
            )}
          </div>
          <div className="max-h-[48vh] overflow-y-auto rounded-lg border border-border p-3">
            {preview ? (
              <>
                <p className="mb-2 text-ui-caption font-medium">
                  {preview.candidate.title} · {preview.rowCount} 条记录
                </p>
                <p className="text-ui-xs text-foreground-subtle">
                  {preview.mode === "nativeFork"
                    ? "优先原生复制；若引擎明确不支持，则使用兼容续聊"
                    : "兼容续聊：保留原文，并在新任务中引用历史资料"}
                </p>
                {preview.warnings.map((w) => (
                  <p key={w} className="my-1 text-ui-xs">
                    {w}
                  </p>
                ))}
                {preview.rows.map((row) => (
                  <CodexRowView
                    key={`${row.turnId}:${row.id}`}
                    row={row}
                    workspacePath={preview.candidate.cwd}
                  />
                ))}
              </>
            ) : (
              <p className="text-ui-caption text-foreground-subtle">
                点击会话标题预览最近消息及导入方式
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ui-caption">
            已选择 {selected.length} 个会话{busy ? " · 正在处理…" : ""}
          </span>
          <Button disabled={busy || !selected.length} onClick={() => void importSelected()}>
            导入所选会话
          </Button>
        </div>
        {results.map((result) => (
          <div
            key={result.sourceThreadId}
            className="flex items-center justify-between gap-2 rounded border border-border p-2 text-ui-caption"
          >
            <span>
              {result.status === "imported"
                ? `已导入 · ${result.mode === "nativeFork" ? "原生复制" : "兼容续聊"}`
                : result.status === "skipped"
                  ? "已跳过"
                  : "导入失败"}
              {result.reason && `：${result.reason}`}
            </span>
            {result.taskId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onImported(result.taskId!);
                  onOpenChange(false);
                }}
              >
                打开会话
              </Button>
            )}
          </div>
        ))}
        {error && (
          <p role="alert" className="text-ui-caption text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
