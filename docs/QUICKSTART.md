# 构建与使用 / Build and use

本说明针对社区派生版 **Codex for ZCode**，不适用于原版 ZCode 安装包。

## 直接安装

到 [v0.1.0-alpha.3 发行页](https://github.com/kermars39-web/codex-for-zcode/releases/tag/v0.1.0-alpha.3) 选择对应平台文件：

- **macOS Apple Silicon**：下载 ZIP，解压，将 `.app` 拖到应用程序目录后打开。Intel Mac 不支持此包。
- **Windows x64**：下载 EXE，安装到用户目录后打开。Windows ARM、WSL 内的 Codex 配置与历史不在本次自动适配范围。
- 首次打开可退出原版引导，再从输入框“模型菜单 → 引擎与模型设置”登录自己的 ChatGPT。客户端不附带账号，不要求先安装 Node 或独立 Codex CLI。

Mac 仅临时签名、未 Apple 公证；Windows 未发行商签名。先核对仓库和 `SHA256SUMS.txt`，遵守系统及组织安全策略，不关闭安全保护。

校验下载文件：Mac 在安装包所在目录运行 `shasum -a 256 Codex-for-ZCode-0.1.0-alpha.3-macos-arm64.zip`；Windows 在 PowerShell 运行 `Get-FileHash .\Codex-for-ZCode-0.1.0-alpha.3-windows-x64.exe -Algorithm SHA256`。将结果与同一发行页的 `SHA256SUMS.txt` 对照，必须完全一致（字母大小写不影响比较）。

以下为开发者从源码构建步骤。

## 1. 前置条件

- Git、Node 24.14.0、pnpm 10.33.2；版本见 `mise.toml`。
- macOS：Xcode Command Line Tools（包括 clang 与 swiftc）。Windows x64：PowerShell 与原生模块所需的 C++ 构建工具。
- 自己可登录的 Codex / ChatGPT 账号，以及可用的官方服务访问条件。
- 正常的 npm、Electron 与构建资源下载条件；首次构建会下载依赖并编译原生组件。

## 2. 安装运行时和源码

```bash
npm install -g @openai/codex@0.155.1
codex --version
codex login

git clone https://github.com/kermars39-web/codex-for-zcode.git
cd codex-for-zcode
pnpm install --frozen-lockfile
node scripts/build-codex-desktop.mjs
```

运行时固定为 0.155.1，以降低 Desktop 历史格式差异。脚本从 `npm root -g` 定位原生可执行文件，保留官方 `bin`、`codex-path` 与 `codex-resources` 布局，包含配套 code-mode-host 和 Windows 沙箱程序；失败时会明确退出。非 npm 安装可通过 `ZCODE_CODEX_NATIVE_BINARY=/absolute/path/to/native/codex` 指定原生文件，不能指向 JavaScript 启动包装器。

默认跳过原版远程资源构建。已有完整本地资源时可使用 `node scripts/build-codex-desktop.mjs --reuse-assets`；第一次不能跳过准备。

## 3. 打开并开始

构建成功后，安装包在 `release-assets/`。Mac 可在 Finder 打开 `packages/desktop/dist/mac-arm64/Codex for ZCode.app`，Windows 可运行生成的 EXE 安装器。先在测试目录验证。

1. 顶部选择工作目录，底部选择账号实际提供的模型。
2. 如果没有登录，从输入框模型菜单 → “引擎与模型设置”发起 ChatGPT 登录；已有任务也可从顶部“…”进入。
3. 输入小任务。Enter 发送，Shift+Enter 换行。额外权限请求按范围确认。
4. 模型别名可在设置中填写与恢复默认；仅改变显示，不改变真实请求。
5. 侧栏“任务”菜单可导入历史；在项目视图中它位于项目列表下方。

## 4. 历史导入

预览显示原生复制或兼容续聊，以及附件/工作目录异常。导入后有独立任务与后续上下文，不修改原 Desktop 会话；重复导入默认跳过。兼容方式的历史快照供展示与按需读取，不恢复 Desktop 隐藏状态，也不会重放历史命令或审批。

## 5. 数据位置

| 数据 | 默认位置 |
|---|---|
| 本应用任务与导入副本 | `~/.codex-for-zcode/codex` |
| 本应用原引擎设置与数据库 | `~/.codex-for-zcode/.zcode` |
| 界面偏好 | `~/Library/Application Support/Codex for ZCode` |
| Codex 登录、配置和会话 | 当前 `CODEX_HOME` 或 `~/.codex`，由 Codex 管理 |

不复制原版 ZCode 账号凭据。使用原引擎须完成其自身登录/模型配置。卸载应用不自动删除以上数据。

## 常见问题

- **没有模型**：先用自己的 Codex 确认登录，再刷新引擎状态；无法使用的明确选择不会自动换成其他模型。
- **运行时版本不匹配**：安装指定版本；更新运行时应先验证协议和 Desktop 历史格式。
- **构建下载失败**：核对对应依赖和下载域名的正常访问与证书配置，不关闭 TLS 校验。
- **模型/API Key 警告**：本集成仅启动 ChatGPT 登录任务；不回落到按量 API 计费。
- **远程入口能点但 Codex 不工作**：远程 Codex 尚未实现，不属于本版支持范围。

## 维护者检查

```bash
pnpm exec tsx --test tests/codex-engine/*.test.ts tests/codex-engine/*.test.mjs
pnpm typecheck
pnpm lint
pnpm architecture:check --changed
```

前身自用构建有本机真实执行、审批、导入、停止和恢复验证。公开版模型范围已经调整，不能由这些记录推出所有账号、平台和配置都已验收。公开版结果见 `features/public-release/acceptance.md`。

以上检查完成后再单独打包，**不要同时运行 typecheck 和桌面构建**：上游 TypeScript 工程会写入 `out/host`，可能覆盖打包入口。构建脚本会检测未打包的 workspace 引用并停止。

最新双平台发行验收见 [桌面发行记录](features/desktop-release/acceptance.md)。Windows 的安装、启动与 App Server 协议烟测不等于真实订阅账号的完整执行验收。
