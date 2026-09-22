import { useState } from "react";
import { MoreHorizontal, Download, Settings2 } from "lucide-react";
import { formatTaskRelativeTime } from "@/lib/taskListItemPresentation.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import type { CodexTask } from "@zcode/services";
import { useTabStoreApi } from "@/store/TabStoreProvider.js";
import { useCodexUiStore } from "@/store/codexUiStore.js";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import { CodexSettings } from "./CodexSettings.js";
import { CodexImportDialog } from "./CodexImportDialog.js";

export function CodexSidebarTasks({
  workspaceKey,
  tasks,
  error,
  menuOnly = false,
}: {
  workspaceKey: string;
  tasks: CodexTask[];
  error?: string;
  menuOnly?: boolean;
}) {
  const select = useCodexUiStore((s) => s.select);
  const [settings, setSettings] = useState(false),
    [importing, setImporting] = useState(false);

  return (
    <section className={menuOnly ? "contents" : "px-2"} data-testid="codex-task-list">
      <div className={menuOnly ? "contents" : "flex items-center justify-between px-2"}>
        {!menuOnly && (
          <span className="text-ui-caption font-medium text-foreground-subtle">任务</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="任务菜单">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setImporting(true)}>
              <Download className="mr-2 size-4" />
              导入历史 · Codex Desktop
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSettings(true)}>
              <Settings2 className="mr-2 size-4" />
              引擎与模型设置
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!menuOnly && <CodexTaskRows tasks={tasks} />}
      {error && <p className="px-2 text-ui-xs text-destructive">{error}</p>}
      <CodexSettings open={settings} onOpenChange={setSettings} />
      <CodexImportDialog
        open={importing}
        onOpenChange={setImporting}
        onImported={(id) => select(workspaceKey, id)}
      />
    </section>
  );
}

export function CodexTaskRows({ tasks, nested = false }: { tasks: CodexTask[]; nested?: boolean }) {
  const { intl } = useZCodeIntl();
  const tabs = useTabStoreApi();
  const selection = useCodexUiStore((s) => s.selection);
  const select = useCodexUiStore((s) => s.select);
  const [limit, setLimit] = useState(5);
  return (
    <div data-testid="codex-project-tasks" className="space-y-0.5">
      {tasks.slice(0, limit).map((task) => {
        const key = task.workspaceIdentity || task.workspacePath;
        const active =
          tabs.getState().activeWorkspaceIdentity || tabs.getState().activeWorkspacePath;
        return (
          <button
            key={task.id}
            title={task.title}
            aria-current={active === key && selection[key] === task.id ? "page" : undefined}
            onClick={() => {
              if (
                !tabs.getState().activateTabByPath(task.workspacePath, {
                  workspaceIdentity: task.workspaceIdentity,
                })
              )
                tabs.getState().addTab(task.workspacePath);
              select(key, task.id, task.workspacePath);
            }}
            className={`group flex w-full min-w-0 items-center gap-2 rounded-lg py-2 pr-3 text-left text-ui-base hover:bg-surface-hover ${nested ? "pl-8" : "pl-3"} ${active === key && selection[key] === task.id ? "bg-selected" : ""}`}
          >
            <span className="min-w-0 flex-1 truncate">{task.title}</span>
            {["running", "waiting"].includes(task.status) ? (
              <span
                className="size-1.5 rounded-full bg-brand"
                aria-label={task.status === "waiting" ? "等待审批" : "运行中"}
              />
            ) : (
              <time className="shrink-0 text-ui-xs text-foreground-subtlest">
                {formatTaskRelativeTime(task.updatedAt, intl)}
              </time>
            )}
          </button>
        );
      })}
      {tasks.length > limit && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-foreground-subtle"
          onClick={() => setLimit((n) => n + 20)}
        >
          显示更多（{tasks.length - limit}）
        </Button>
      )}
    </div>
  );
}
