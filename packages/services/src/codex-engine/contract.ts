import type { Event } from "@zcode/rpc";

export type CodexRecord = Record<string, unknown>;
export type CodexImportMode = "nativeFork" | "contextRebuild";
export interface CodexRow {
  id: string;
  turnId: string;
  kind: "user" | "assistant" | "reasoning" | "tool" | "diff" | "notice";
  text: string;
  title?: string;
  output?: string;
  status?: string;
  timestamp?: string;
  images?: string[];
}
export interface CodexModel {
  id: string;
  model: string;
  displayName: string;
  isDefault: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: Array<{ reasoningEffort: string; description: string }>;
  inputModalities?: string[];
}
export interface CodexTask {
  id: string;
  engineKind: "codex";
  engineSessionId?: string;
  title: string;
  workspacePath: string;
  workspaceIdentity: string;
  model?: string;
  effort?: string;
  createdAt: number;
  updatedAt: number;
  status: "idle" | "running" | "waiting" | "interrupted" | "error";
  activeTurnId?: string;
  error?: string;
  archived?: boolean;
  importSource?: {
    sourceThreadId: string;
    mode: CodexImportMode;
    importedAt: number;
    lastTurnId?: string;
    rowCount: number;
  };
}
export interface CodexApproval {
  id: string;
  taskId: string;
  turnId?: string;
  method: string;
  params: CodexRecord;
}
export interface CodexTaskPage {
  task: CodexTask;
  rows: CodexRow[];
  nextCursor?: string;
  approvals: CodexApproval[];
  sequence: number;
}
export type CodexServiceEvent =
  | { type: "changed"; taskId?: string; sequence: number }
  | { type: "account"; sequence: number }
  | { type: "disconnected"; message: string; sequence: number };
export interface CodexStatus {
  connected: boolean;
  runtime: string;
  account: { type: string; email?: string; planType?: string } | null;
  models: CodexModel[];
  rateLimits?: CodexRecord;
  warning?: string;
  defaults?: { model?: string; effort?: string };
}
export interface CodexImportCandidate {
  id: string;
  title: string;
  cwd: string;
  updatedAt: number;
  source: string;
  archived?: boolean;
  alreadyImported: boolean;
}
export interface CodexImportPreview {
  candidate: CodexImportCandidate;
  mode: CodexImportMode;
  rows: CodexRow[];
  rowCount: number;
  lastTurnId?: string;
  warnings: string[];
}
export interface ICodexService {
  onDidChange: Event<CodexServiceEvent>;
  status(): Promise<CodexStatus>;
  login(params: {
    action: "start" | "cancel";
    loginId?: string;
  }): Promise<{ loginId?: string; authUrl?: string }>;
  listTasks(params: {
    workspaceIdentity?: string;
    includeArchived?: boolean;
  }): Promise<CodexTask[]>;
  readTask(params: { taskId: string; cursor?: string; limit?: number }): Promise<CodexTaskPage>;
  createTask(params: {
    workspacePath: string;
    workspaceIdentity?: string;
    model?: string;
    effort?: string;
  }): Promise<CodexTask>;
  send(params: {
    taskId: string;
    text: string;
    model?: string;
    effort?: string;
    images?: string[];
    workspacePath?: string;
  }): Promise<CodexTask>;
  interrupt(params: { taskId: string }): Promise<void>;
  respond(params: { taskId: string; requestId: string; response: CodexRecord }): Promise<void>;
  listImports(params: {
    cursor?: string;
    search?: string;
    cwd?: string;
    archived?: boolean;
  }): Promise<{ data: CodexImportCandidate[]; nextCursor?: string }>;
  previewImport(params: { sourceThreadId: string }): Promise<CodexImportPreview>;
  importSessions(params: { sourceThreadIds: string[] }): Promise<
    Array<{
      sourceThreadId: string;
      status: "imported" | "skipped" | "failed";
      taskId?: string;
      mode?: CodexImportMode;
      reason?: string;
    }>
  >;
  updateTask(params: { taskId: string; title?: string; archived?: boolean }): Promise<CodexTask>;
}
export const ICodexService: { readonly channelName: string; readonly _brand?: ICodexService } = {
  channelName: "codex-engine",
};
