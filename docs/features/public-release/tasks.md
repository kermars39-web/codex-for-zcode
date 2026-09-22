# 公开预览版任务

- [x] T-001 | AC: AC-001 | 形成仅含公开源码的派生目录并扫描上传清单 | Proof: 文件清单、私密数据与密钥扫描
  - Scope: 公开导出、忽略规则、许可说明
  - Depends on: None
  - Excludes: 自用数据迁移
- [x] T-002 | AC: AC-002 | 解除个人型号限制并保留真实 ID 与别名隔离 | Proof: 29 项回归、类型检查、真实菜单与别名续聊及实际模型 ID 核对通过
  - Scope: 模型偏好、输入菜单、设置
  - Depends on: T-001
  - Excludes: 引擎协议与审批策略
- [x] T-003 | AC: AC-003 | 交付中英文发布材料和可重复构建入口 | Proof: 文档链接与构建前置检查
  - Scope: README、快速开始、贡献与版本说明
  - Depends on: T-002
  - Excludes: 未验证平台发行包
- [x] T-004 | AC: AC-004 | 推送公开仓库并核对页面、版本和元数据 | Proof: main、公开权限、主题和 v0.1.0-alpha.1 发行已回读
  - Scope: 新仓库和源码预览发行
  - Depends on: T-003
  - Excludes: 社区代发、刷 Star
