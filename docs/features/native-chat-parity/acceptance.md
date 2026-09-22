# 原版聊天与首页适配验收

日期：2026-09-22。本机 UI 验证基于 macOS arm64 `0.1.0-alpha.2-ui.1`；同一界面改动已公开为 `0.1.0-alpha.3`，公开包的验证单独记录。

| Criterion | Result | Evidence |
| --- | --- | --- |
| AC-001 | PASS | 真实安装版显示原生问候与 Logo、居中输入卡、项目菜单和四项建议；点击周报只填草稿，切换默认工作区后真实发送成功。 |
| AC-002 | PASS | 实机长用户气泡可展开和收起；回复表格、代码块、中文、文档链接与历史图片正常；最终安装版已回读附件文件入口和请求正文，图片仍正常显示。 |
| AC-003 | PASS | 真实导入会话展开过程及思考摘要，使用原生图标、Collapsible、Reasoning 与弱色文本；工具记录保留状态和输出，未知耗时不补造。 |
| AC-004 | PASS | 133 个历史快照及上下文文件哈希一致；真实回复 UI_PARITY_V2_OK，底层 gpt-6-astra / xhigh，工具调用 0；最终版本重启后双行草稿与会话结果保留，返回首页及前进／后退正常。 |
| AC-005 | PASS | alpha.3 已公开；Mac arm64 与 Windows x64 同源构建，双端 35 项回归与安装或启动检查通过；5 个附件匿名 HTTP 200，GitHub 资产 SHA256 与随包清单一致；Windows 完整订阅执行仍标为未验收。 |

## 自动检查

- Codex 回归：35 / 35 通过（包含附件中文路径、Windows 路径、前导空行、CRLF、普通 Markdown 与不完整信封保护）。
- 全仓 typecheck 通过；lint 0 errors，70 条既有 warnings；architecture changed 0 violations。
- macOS 构建、签名完整性、打包资源与空账号 App Server 握手通过。
- UI 通过原生客户端实际点击和截图核对；非静态页面模拟或截图冒充运行结果。

## 实现与边界

- 新建页复用原生空态、提示词展示、项目菜单与 ChatPromptEditor；建议只填草稿或跳转既有自动化页。
- 共享用户正文折叠组件接受字符串记录 ID；未改变原 ZCode 消息行为。
- 附件与正文仅做显示投影；复制原始消息仍保留全部原文。未知信封格式保持原样。
- 仅展示引擎公开的思考摘要；未提供的摘要显示说明，不恢复隐藏推理或伪造耗时。
- 未更改引擎执行或审批，也没有新增 Desktop 专属能力。Windows 发布验收仅覆盖原生打包、安装、启动及空账号协议握手，不等于真实订阅账号完整执行验收。

私有截图、安装与历史哈希回执在本机验收目录保存，不加入公开仓库。

## 公开发行验证

- [v0.1.0-alpha.3](https://github.com/kermars39-web/codex-for-zcode/releases/tag/v0.1.0-alpha.3) 为公开预览版；alpha.2 保留供回退。
- 源码提交与发行标签：`318bf87bcd380d4b66a4b396adb3f222afe6dcd7`。两个随包检查报告均记录相同提交及 Codex 0.155.1。
- [集成检查通过](https://github.com/kermars39-web/codex-for-zcode/actions/runs/35700033692)：35 项回归、typecheck、lint 和架构检查。
- [双平台构建通过](https://github.com/kermars39-web/codex-for-zcode/actions/runs/35700041463)：两端各 35 项回归、类型、lint、架构、原生打包、打包资源检查、空账号 App Server 握手及桌面启动；Windows 另通过实际 NSIS 安装和已安装内容比对。
- 发行页、Mac ZIP、Windows EXE、校验和与两份检查报告均经匿名 HTTP 200 核对；以下 SHA256 与 GitHub 上传资产摘要及公开 `SHA256SUMS.txt` 相同。

| 文件 | 字节数 | SHA256 |
| --- | --- | --- |
| `Codex-for-ZCode-0.1.0-alpha.3-macos-arm64.zip` | 307,831,013 | `ea4b8bef6676c586ba0fd47e657779b8ca271f8daf27b7d1e9fd9d4e428073ed` |
| `Codex-for-ZCode-0.1.0-alpha.3-windows-x64.exe` | 245,300,796 | `cba6336d3c700c5888404f3c9ab9796e534401f5d58327fca0551451338f2e3d` |
