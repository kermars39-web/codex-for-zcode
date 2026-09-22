# 原版聊天与新建任务界面对齐任务

- [x] T-001 | AC: AC-001 | 恢复原版居中首页与项目选择 | Proof: 实机新建、项目切换、提示词填入与发送
  - Scope: CodexChatPane、CodexComposer、壳层传入原生项目菜单
  - Depends on: None
  - Excludes: 插件安装与自动执行
- [x] T-002 | AC: AC-002, AC-003 | 统一正文、用户气泡和过程折叠 | Proof: 展示解析回归、实机历史正文和思考展开
  - Scope: CodexTranscript 与展示组件
  - Depends on: None
  - Excludes: 历史数据改写
- [x] T-003 | AC: AC-004 | 安装本机并验证完整流程 | Proof: 历史哈希、发送、重启恢复及仓库检查
  - Scope: 本机可回退安装和验收记录
  - Depends on: T-001, T-002
  - Excludes: 公开发布
- [ ] T-004 | AC: AC-005 | 发布源码与双平台 alpha.3 预览包 | Proof: GitHub Actions、Release 文件与校验和
  - Scope: 现有公开仓库、原生平台打包和下载入口
  - Depends on: T-001, T-002, T-003
  - Excludes: Windows 真实订阅账号的完整执行与审批验收
