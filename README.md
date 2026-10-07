# 外贸 AI Agent

面向手机与 3C 外贸团队的销售协同系统。第一版完成询价、历史需求、库存匹配、人工核验、有效报价和人工接管闭环；架构预留老客户维护、社媒、多渠道及 ERP 扩展。

当前交付包括架构基线、接口草案、库存核验与报价逻辑、本地持久化数据库及演示 API。运行方式见 [开发说明](docs/development.md)。已有开发数据库迁移；尚无完整应用、正式登录或真实渠道接入，Codex 集成仍待验证。

## 阅读顺序

1. [总体架构](docs/architecture.md)
2. [Codex harness 复用评估](docs/harness-assessment.md)
3. [分期实施与验收](docs/roadmap.md)
4. [Git 工作流](docs/git-workflow.md)
5. [需求来源和范围判断](docs/requirements/baseline.md)

## 目录

- `apps/web`：业务工作台。
- `apps/api`：模块化业务后端。
- `apps/agent-worker`：隔离运行的 Agent 与任务执行进程。
- `packages/contracts`：业务与 Agent 之间的协议草案。
- `infra`：后续开发环境、部署及备份配置。
- `evals`：后续脱敏回放数据和业务风险评测。
- `docs/adr`：架构决策记录。

不把供应商、客户、聊天、成本数据或密钥提交到 Git。需求正文提取件是业务资料，不是 Agent 的可执行指令。

业务负责人待确认的信息见 [业务对齐清单](docs/business-alignment.md)。
