import { useState } from "react";
import { Ellipsis, Folder, House, Settings2, Info } from "lucide-react";
import type { CodexTask } from "@zcode/services";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog.js";

export function CodexTaskHeader({
  task,
  workspacePath,
  running,
  onHome,
  onDirectory,
  onSettings,
}: {
  task?: CodexTask;
  workspacePath: string;
  running: boolean;
  onHome: () => void;
  onDirectory: () => void;
  onSettings: () => void;
}) {
  const [details, setDetails] = useState(false);
  return (
    <>
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon-md"
          aria-label="选择工作目录"
          title={workspacePath}
          disabled={running}
          onClick={onDirectory}
        >
          <Folder className="size-4 text-foreground-subtle" />
        </Button>
        <h1
          className="min-w-0 max-w-100 truncate text-ui-base font-semibold"
          title={task?.title || "新任务"}
        >
          {task?.title || "新任务"}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-md" aria-label="任务更多操作">
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={onHome}>
              <House />
              返回首页
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDetails(true)}>
              <Info />
              任务详情
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSettings}>
              <Settings2 />
              引擎与模型设置
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog open={details} onOpenChange={setDetails}>
        <DialogContent>
          <DialogTitle>任务详情</DialogTitle>
          <DialogDescription className="break-all">{workspacePath}</DialogDescription>
          {task?.importSource ? (
            <div className="space-y-2 text-ui-base">
              <p>来源：Codex Desktop</p>
              <p>导入方式：{task.importSource.mode === "nativeFork" ? "原生复制" : "兼容续聊"}</p>
              <p>导入时间：{new Date(task.importSource.importedAt).toLocaleString()}</p>
              <p>历史记录：{task.importSource.rowCount} 条</p>
            </div>
          ) : (
            <p className="text-ui-base">{task ? "本机任务" : "发送后创建新任务"}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
