# 公开预览版验收

## Summary

- PASS: 2
- FAIL: 0
- UNVERIFIED: 2
- BLOCKED: 0

## Results

| AC | Result | Evidence |
|---|---|---|
| AC-001 | PASS | 独立派生清单 7,028 文件；私人路径/工作材料标记/常见 token/JWT/私钥扫描零命中；无凭据、私有快照、依赖缓存或超限文件。上游历史、LICENSE 与第三方声明保留；本次 95 文件修改单独标注。 |
| AC-002 | UNVERIFIED | 等待模型回归和界面验证 |
| AC-003 | PASS | 中英文 README、QUICKSTART、路线图、贡献/安全说明和 Issue 模板齐备，Markdown 本地链接零失效；npm 可获取 Codex 0.155.1。明确源码 alpha 和支持边界。 |
| AC-004 | UNVERIFIED | 尚未创建远端 |

## Requirement Changes

- 自用固定模型与别名在公开版本中改为账号模型和可选别名；已安装自用版本不改动。

## Release Boundary

- 源码 alpha；尚未提供公开版二进制、跨平台或远程 Codex 验收。
