# 公开预览版验收

## Summary

- PASS: 4
- FAIL: 0
- UNVERIFIED: 0
- BLOCKED: 0

## Results

| AC | Result | Evidence |
|---|---|---|
| AC-001 | PASS | 独立派生清单 7,028 文件；私人路径/工作材料标记/常见 token/JWT/私钥扫描零命中；无凭据、私有快照、依赖缓存或超限文件。上游历史、LICENSE 与第三方声明保留；本次 95 文件修改单独标注。 |
| AC-002 | PASS | 29 项自动测试通过；公开版独立构建、安装及启动通过。真实界面列出账号模型，切换后完成对话，设置显示别名后完成第二轮；任务元数据与两个 turn_context 中的真实模型 ID 一致。公开默认别名为空；缺失模型不回退与偏好保留有自动回归。 |
| AC-003 | PASS | 中英文 README、QUICKSTART、路线图、贡献/安全说明和 Issue 模板齐备，Markdown 本地链接零失效；npm 可获取 Codex 0.155.1。明确源码 alpha 和支持边界。 |
| AC-004 | PASS | [公开仓库](https://github.com/kermars39-web/codex-for-zcode) 的 main、简介及 9 个主题已回读；上传临时分支已清理；[v0.1.0-alpha.1](https://github.com/kermars39-web/codex-for-zcode/releases/tag/v0.1.0-alpha.1) 指向已验证实现 201dd91。 |

## Verification

- 本地：29 项测试、typecheck、lint（0 错误，70 个既有警告）、architecture 检查通过。
- [GitHub 检查](https://github.com/kermars39-web/codex-for-zcode/actions/runs/35678132335)：独立 Linux runner 完成依赖安装、29 项测试、类型、lint 和架构检查；不代表 Linux 桌面应用验收。
- 本机：Apple Silicon 独立打包并验证安装签名；真实界面收到 `PUBLIC_RELEASE_OK` 和别名后的 `ALIAS_ID_OK`。测试仅使用合成提示，账号与运行日志不公开。
- 发现并修正打包流程风险：typecheck 会生成 host 输出，必须完成后再打包；构建脚本检测未打包的 workspace 引用并停止。

## Requirement Changes

- 自用固定模型与别名在公开版本中改为账号模型和可选别名；已安装自用版本不改动。

## Release Boundary

- 源码 alpha；尚未提供公开版二进制、跨平台或远程 Codex 验收。
- 本机复用了已准备的可再生构建资源；尚未完成另一台全新 Mac 从零下载、构建、登录与完整历史导入验收。
