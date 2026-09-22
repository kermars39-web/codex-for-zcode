# Codex for ZCode · macOS / Windows 预览版

在 ZCode 中文工作台使用自己的 ChatGPT / Codex 登录。首次提供无需源码构建的桌面包。

| 平台 | 下载文件 | 使用 |
|---|---|---|
| macOS Apple Silicon（M 系列） | `Codex-for-ZCode-0.1.0-alpha.2-macos-arm64.zip` | 解压后将 `.app` 拖到应用程序目录 |
| Windows x64（Intel / AMD） | `Codex-for-ZCode-0.1.0-alpha.2-windows-x64.exe` | 运行安装器，选择用户安装目录 |

包内含 Codex 0.155.1 与对应平台资源，不包含账号、聊天或额外模型权益。第一次使用从“任务更多操作 → 引擎与模型设置”登录自己的 ChatGPT；已登录本机 Codex 的用户可复用自己的登录。

Mac 为本地临时签名，尚未获得 Apple 公证；Windows 暂无发行商代码签名。系统可能显示安全提示，请核对本项目地址及 `SHA256SUMS.txt`，不要关闭系统安全保护。若组织策略阻止运行，联系管理员或使用源码构建。

两种安装包由各自原生 GitHub runner 构建，验证内置 Codex 版本与空账号 App Server 握手；桌面启动验证依据渲染启动与 Host 请求完成。Windows 另执行 NSIS 安装并比较已安装文件。每个平台的 `*-smoke.json` 给出对应源码提交和结果。

**验证边界：** macOS 的订阅聊天、工具与历史导入已有前序本机测试；Windows 本版为安装、启动和协议预览，尚未完成真实订阅账号下的执行、审批及完整历史导入验收。Intel Mac、Windows ARM、Linux 与远程 Codex 不属于本次发行范围。

上游 ZCode 3.14.0；这是社区派生项目，非 OpenAI 或 Z.ai 官方产品。本项目不提供网络通道，不改变官方服务地区与账号权限。反馈请使用仓库 Issue 模板并去除私人信息。
