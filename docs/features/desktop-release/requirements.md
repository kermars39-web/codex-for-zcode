# macOS 与 Windows 预览发行

Status: Confirmed

## Goal

用户可直接从 GitHub 下载并打开 Codex for ZCode，无需先配置源码构建环境。

## User Scenarios

1. Apple Silicon Mac 用户下载压缩包，解压并打开独立应用。
2. Windows x64 用户下载安装器，安装后使用自己的 Codex / ChatGPT 登录。
3. 用户可核对校验和、源码版本与平台实测范围。

## Scope

### In

- macOS arm64 ZIP 与 Windows x64 NSIS EXE，内置匹配平台的 Codex 0.155.1 及配套程序。
- GitHub 原生平台构建、产物检查、启动及 App Server 协议烟测；发布校验和与验证说明。
- v0.1.0-alpha.2 预览版，保留源码 alpha.1 与自用安装。

### Out

- Intel Mac、Windows ARM、Linux、远程 Codex。
- 未提供的 Apple Developer ID 公证、Windows 商业签名证书。
- 未在 Windows 真实订阅账号完成的全功能验收承诺。

## Constraints

- 不携带维护者账号、CODEX_HOME、历史或本机用户数据；不修改原版 ZCode 身份。
- 使用现有 App Server 和审批实现，不改权限策略。
- 不跳过系统安全保护；发行说明明确签名与实验性边界。

## Acceptance Criteria

- AC-001: 两个平台选择匹配的 Codex 原生运行时并包含所需辅助程序；错误平台或缺失文件构建失败。
- AC-002: macOS arm64 产物通过签名完整性、运行时协议与桌面启动检查，产物内容不含个人数据。
- AC-003: Windows x64 安装器在 Windows runner 上实际安装，桌面进程与内置 Codex 协议启动检查通过。
- AC-004: GitHub 公开预览发行包含两种产物、SHA256 与对应源码/平台验证说明，下载元数据可读回核对。

## Decisions

- 构建脚本是产物内容和平台布局唯一所有者；Main 只按当前平台定位已打包 Codex。
- 保留现有 Mac 构建入口为兼容包装，共用跨平台构建入口。
- 干净 GitHub runner → 检查 → 构建 → 包内运行时与安装启动烟测 → 上传临时产物 → 汇总校验和 → 草稿发行 → 核对后公开。
- 仅额外提供便于下载的客户端，不放宽认证、服务地区、模型权限或审批。

## Open Questions

- None
