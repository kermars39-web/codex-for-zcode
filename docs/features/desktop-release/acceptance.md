# 桌面发行验收

## Summary

- PASS: 4
- FAIL: 0
- UNVERIFIED: 0
- BLOCKED: 0

## Results

| AC | Result | Evidence |
|---|---|---|
| AC-001 | PASS | 双平台 31 项回归通过；运行时布局与缺失辅助程序保护覆盖；原生 Codex 0.155.1 版本与空账号握手通过 |
| AC-002 | PASS | macOS 原生 runner 完成全新构建、framework 链接检查、临时签名完整性、资源/私人数据文件名检查、空账号协议握手与渲染/Host 启动检查 |
| AC-003 | PASS | Windows runner 完成 NSIS 实际安装；安装后 app.asar 与构建产物 SHA256 一致；已安装 Codex 空账号握手与桌面渲染/Host 启动检查通过 |
| AC-004 | PASS | v0.1.0-alpha.2 已公开；两安装包、SHA256SUMS 与两份 smoke.json 均返回 HTTP 200；GitHub 资产 SHA256 与清单一致；发行标签与两个报告对应同一源码提交 |

## Requirement Changes

- 用户明确要求在源码发布后补充 Mac 与 Windows 可下载版本。

## Release Boundary

- 两个平台均为预览版；不使用未提供的发行签名证书，不把协议烟测称为真实订阅的全功能验证。
- Windows 尚未完成真实订阅账号下的命令、审批及完整历史导入验证；Mac 未 Apple 公证，Windows 无发行商代码签名。Intel Mac、Windows ARM 和远程 Codex 不在本次范围。

## Evidence

- 二进制源码：`cc79770ad4899bfa48b55f296846ba0178e93025`。
- [原生构建与发行工作流](https://github.com/kermars39-web/codex-for-zcode/actions/runs/35681520728)。
- [对应源码的独立检查](https://github.com/kermars39-web/codex-for-zcode/actions/runs/35681520153)。
- [公开发行](https://github.com/kermars39-web/codex-for-zcode/releases/tag/v0.1.0-alpha.2)，发布于 2026-09-22；Mac ZIP 307,828,124 字节，Windows EXE 245,318,570 字节。
- Mac SHA256：`528b55ecf28b47b227b6679cb48966b062a101281c1fdec8309d8583a91b9e03`；Windows SHA256：`d429f903929276fc31f4dffcd835c133690f1e403b3945bef03b08d568d21de4`。
- 修复 Windows 测试退出后的目录清理时序，以及 pnpm 安装产物缓存展开 Electron framework 符号链接的问题。保留依赖下载缓存，重新运行安装脚本，并在打包前后检查 framework 链接。
- Windows 安装器必须在同一 builder 流程执行打包与 NSIS 编译，确保安装阶段补丁参与构建；没有禁用编译警告门禁。
