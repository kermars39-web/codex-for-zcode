# 桌面发行任务

- [x] T-001 | AC: AC-001 | 打包匹配平台的 Codex 及依赖 | Proof: 31 项回归、两平台原生运行时版本与空账号握手通过，见 acceptance.md
  - Scope: 平台布局、构建脚本、Main 定位
  - Depends on: None
  - Excludes: 引擎权限行为
- [x] T-002 | AC: AC-002, AC-003 | 在各自平台构建并验证可安装产物 | Proof: 原生 runner 构建、Mac 签名与启动、Windows 安装与启动均通过，见 acceptance.md
  - Scope: 工作流与包内烟测
  - Depends on: T-001
  - Excludes: Windows 个人订阅与完整历史导入验证
- [x] T-003 | AC: AC-004 | 发布带校验和的预览安装包 | Proof: 公开发行、五项资产 HTTP 200、标签与源码一致、两包 SHA256 与清单一致，见 acceptance.md
  - Scope: README、下载说明、发行页
  - Depends on: T-002
  - Excludes: 付费签名与社区宣传
