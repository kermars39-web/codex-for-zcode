import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

// Settings and the original agent have home paths separate from the data directory.
// Set all ZCode-specific roots before evaluating any Main/Host service imports.
// HOME and CODEX_HOME stay untouched so Codex can reuse the user's own login.
const personalHome =
  process.env.ZCODE_DESKTOP_HOME_DIR?.trim() || join(homedir(), ".codex-for-zcode");
process.env.ZCODE_DESKTOP_HOME_DIR = personalHome;
process.env.ZCODE_DESKTOP_URL_SCHEME = "codex-for-zcode";
process.env.ZCODE_DATA_BASE_DIR ||= personalHome;
process.env.ZCODE_HOME = join(personalHome, ".zcode");
process.env.ZCODE_STORAGE_DIR = process.env.ZCODE_HOME;
process.env.ZCODE_SESSION_DB_PATH = join(process.env.ZCODE_HOME, "cli", "db", "db.sqlite");
await mkdir(personalHome, { recursive: true, mode: 0o700 });

// Keep import failures observable even before the normal logger is initialized.
try {
  await import("./index.js");
} catch (error) {
  const { mkdir, appendFile } = await import("node:fs/promises");
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const directory = join(homedir(), ".codex-for-zcode");
  const detail = error instanceof Error ? error.stack || error.message : String(error);
  console.error(detail);
  await mkdir(directory, { recursive: true });
  await appendFile(
    join(directory, "startup-errors.log"),
    `${new Date().toISOString()} ${detail}\n`,
  );
  const { app, dialog } = await import("electron");
  await app.whenReady();
  dialog.showErrorBox(
    "Codex for ZCode 启动失败",
    `${detail}\n\n启动日志：${directory}/startup-errors.log`,
  );
  app.exit(1);
}
export {};
