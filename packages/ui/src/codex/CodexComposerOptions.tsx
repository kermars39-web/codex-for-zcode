import { Brain, ChevronDown, ShieldCheck } from "lucide-react";
import type { CodexModel } from "@zcode/services";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";

export function CodexPermissionStatus() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="gap-1 px-1"
          aria-label="执行权限：自动编辑"
        >
          <ShieldCheck className="size-4" />
          自动编辑
          <ChevronDown className="size-3 text-foreground-subtlest" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-72">
        <DropdownMenuItem disabled>工作区内自动编辑，额外权限按需审批</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CodexComposerOptions({
  model,
  models,
  modelLabel,
  label,
  effort,
  running,
  onEffort,
  onModel,
  onSettings,
  onUseOriginalEngine,
}: {
  onSettings: () => void;
  onUseOriginalEngine?: () => void;
  model?: CodexModel;
  models: CodexModel[];
  modelLabel: (model: CodexModel) => string;
  onModel: (value: string) => void;
  label: string;
  effort: string;
  running: boolean;
  onEffort: (value: string) => void;
}) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="min-w-0 gap-1 px-1"
            aria-label="选择模型"
            disabled={running}
          >
            <span className="max-w-40 truncate">{label}</span>
            <ChevronDown className="size-3 text-foreground-subtlest" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={model?.model} onValueChange={onModel}>
            {models.map((item) => (
              <DropdownMenuRadioItem key={item.model} value={item.model}>
                {modelLabel(item)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSettings}>引擎与模型设置</DropdownMenuItem>
          {onUseOriginalEngine && (
            <DropdownMenuItem onSelect={onUseOriginalEngine}>
              使用 ZCode 原有引擎新建
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="gap-1 px-1"
            aria-label="思考强度"
            disabled={running || !model}
          >
            <Brain className="size-4" />
            <span>{effort || "思考"}</span>
            <ChevronDown className="size-3 text-foreground-subtlest" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={effort} onValueChange={onEffort}>
            {model?.supportedReasoningEfforts.map((item) => (
              <DropdownMenuRadioItem key={item.reasoningEffort} value={item.reasoningEffort}>
                {item.reasoningEffort}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
