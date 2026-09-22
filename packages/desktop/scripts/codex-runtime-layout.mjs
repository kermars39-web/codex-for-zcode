import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

export const CODEX_VERSION = "0.155.1";

export function runtimeLayout(platform, arch) {
  const target = { "darwin-arm64": "aarch64-apple-darwin", "win32-x64": "x86_64-pc-windows-msvc" }[
    `${platform}-${arch}`
  ];
  if (!target) throw new Error(`Unsupported Codex distribution target: ${platform}-${arch}`);
  const ext = platform === "win32" ? ".exe" : "";
  return {
    target,
    packageName: `@openai/codex-${platform}-${arch}`,
    entrypoint: `bin/codex${ext}`,
    files: [
      `bin/codex${ext}`,
      `bin/codex-code-mode-host${ext}`,
      `codex-path/rg${ext}`,
      ...(platform === "win32"
        ? [
            "codex-resources/codex-command-runner.exe",
            "codex-resources/codex-windows-sandbox-setup.exe",
          ]
        : ["codex-resources/zsh/bin/zsh"]),
    ],
  };
}

export async function stageCodexRuntime({ source, destination, platform, arch }) {
  const layout = runtimeLayout(platform, arch);
  const metadata = JSON.parse(await readFile(resolve(source, "codex-package.json"), "utf8"));
  if (
    metadata.layoutVersion !== 1 ||
    metadata.version !== CODEX_VERSION ||
    metadata.target !== layout.target ||
    metadata.entrypoint !== layout.entrypoint ||
    metadata.resourcesDir !== "codex-resources" ||
    metadata.pathDir !== "codex-path"
  ) {
    throw new Error("Codex package metadata does not match the requested runtime");
  }
  // Windows 沙箱依赖同级 codex-resources；只复制主 EXE 会在执行命令时才失败。
  // 先核验完整布局，再替换本脚本拥有的构建目录，不从用户 Codex 数据目录复制任何内容。
  const sourceHashes = {};
  for (const file of layout.files) {
    await access(resolve(source, file));
    sourceHashes[file] = createHash("sha256")
      .update(await readFile(resolve(source, file)))
      .digest("hex");
  }
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const file of ["bin", "codex-resources", "codex-path", "codex-package.json"]) {
    await cp(resolve(source, file), resolve(destination, file), { recursive: true });
  }
  await writeFile(
    resolve(destination, "runtime.json"),
    JSON.stringify(
      { version: CODEX_VERSION, platform, arch, entrypoint: layout.entrypoint, sourceHashes },
      null,
      2,
    ),
  );
  return layout;
}
