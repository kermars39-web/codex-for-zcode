# 桌面发行任务

- [ ] T-001 | AC: AC-001 | 打包匹配平台的 Codex 及依赖 | Proof: 布局与缺失文件回归、真实运行时版本和协议
  - Scope: 平台布局、构建脚本、Main 定位
  - Depends on: None
  - Excludes: 引擎权限行为
- [ ] T-002 | AC: AC-002, AC-003 | 在各自平台构建并验证可安装产物 | Proof: runner 构建、Mac 签名与启动、Windows 安装与启动
  - Scope: 工作流与包内烟测
  - Depends on: T-001
  - Excludes: Windows 个人订阅与完整历史导入验证
- [ ] T-003 | AC: AC-004 | 发布带校验和的预览安装包 | Proof: GitHub 发行及资产元数据回读
  - Scope: README、下载说明、发行页
  - Depends on: T-002
  - Excludes: 付费签名与社区宣传
