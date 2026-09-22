import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useZCodeSessionStore } from "./zcodeSessionStore.js";
import { migrateCodexModelPreferences } from "@/lib/codexModelPreferences.js";
export { modelAliasKey } from "@/lib/codexModelPreferences.js";

export const CODEX_DRAFT = "__codex_draft__";
interface CodexUiState {
  preferredEngine: "codex" | "zcode";
  modelAliases: Record<string, string>;
  defaultModel: string;
  defaultEffort: string;
  drafts: Record<string, string>;
  setDraft: (key: string, text: string) => void;
  setModelPreference: (model: string, effort: string) => void;
  selection: Record<string, string | null>;
  select: (
    workspace: string,
    taskId: string | null,
    workspacePath?: string,
    replay?: boolean,
  ) => void;
  setEngine: (engine: "codex" | "zcode") => void;
  setAlias: (key: string, alias: string) => void;
}
export const useCodexUiStore = create<CodexUiState>()(
  persist(
    (set) => ({
      preferredEngine: "codex",
      modelAliases: migrateCodexModelPreferences({}).modelAliases,
      defaultModel: "",
      defaultEffort: "",
      drafts: {},
      setDraft: (key, text) => set((state) => ({ drafts: { ...state.drafts, [key]: text } })),
      setModelPreference: (defaultModel, defaultEffort) => set({ defaultModel, defaultEffort }),
      selection: {},
      select: (workspace, taskId, workspacePath = workspace, replay = false) => {
        set((state) => ({ selection: { ...state.selection, [workspace]: taskId } }));
        if (
          taskId &&
          !replay &&
          taskId !== CODEX_DRAFT &&
          useZCodeSessionStore.getState().taskNavHistory.entries.length === 0
        ) {
          useZCodeSessionStore
            .getState()
            .taskNavPushCodex(
              workspacePath,
              CODEX_DRAFT,
              workspace === workspacePath ? undefined : workspace,
            );
        }
        if (taskId && !replay)
          useZCodeSessionStore
            .getState()
            .taskNavPushCodex(
              workspacePath,
              taskId,
              workspace === workspacePath ? undefined : workspace,
            );
      },
      setEngine: (preferredEngine) => set({ preferredEngine }),
      setAlias: (key, alias) =>
        set((state) => {
          const modelAliases = { ...state.modelAliases };
          if (alias) modelAliases[key] = alias.slice(0, 100);
          else delete modelAliases[key];
          return { modelAliases };
        }),
    }),
    {
      name: "codex-for-zcode-ui-v1",
      version: 1,
      migrate: (persisted) => migrateCodexModelPreferences(persisted) as unknown as CodexUiState,
      partialize: (state) => ({
        preferredEngine: state.preferredEngine,
        modelAliases: state.modelAliases,
        selection: state.selection,
        defaultModel: state.defaultModel,
        defaultEffort: state.defaultEffort,
        drafts: state.drafts,
      }),
    },
  ),
);
