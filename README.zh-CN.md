<p align="center"><img src="docs/assets/cover.png" alt="TradeFlow 贸联 从客户询价到可追踪的销售闭环" width="100%" /></p>

<p align="center">
  <a href="https://github.com/xliang-L/trade-ai-agent/actions/workflows/check.yml"><img src="https://github.com/xliang-L/trade-ai-agent/actions/workflows/check.yml/badge.svg?branch=main" alt="业务流程检查" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-24634c" alt="MIT 许可证" /></a>
  <img src="https://img.shields.io/badge/Node.js-24-263b33" alt="Node.js 24" />
  <img src="https://img.shields.io/badge/stage-interactive%20prototype-e7eee9?labelColor=263b33" alt="交互原型" />
</p>
<p align="center"><a href="README.md">English</a> · <b>简体中文</b></p>
<p align="center"><a href="#业务工作流">工作流</a> · <a href="#整体架构">架构</a> · <a href="#快速体验">快速体验</a> · <a href="docs/demo-walkthrough.md">演示指南</a></p>

# TradeFlow 贸联

**面向手机与 3C 外贸团队的销售协同工作台。**

把分散的客户询价、供应商货源和业务判断串成可追踪的流程：补齐需求、比较货源、人工核验、规则报价、授权议价、人工接管。

客户问过什么、货在哪里、价格为什么这样报、下一步该谁处理，都有明确记录。历史需求可以在新货源到达时重新成为销售机会。

> **当前状态：**浏览器本地交互演示、已测试的 TypeScript 报价引擎及独立的本地数据库/API 原型。对话与发送为模拟，尚未接入真实大模型、WhatsApp、生产登录或 ERP。

## 解决什么问题

| 业务问题 | 对应流程 |
| --- | --- |
| 今天客户要货，过几天到货时已经忘了联系谁。 | 历史需求沉淀 → 到货匹配 → 再次确认采购意向。 |
| 同一型号，多家供应商的价格、数量和有效期各不相同。 | 多来源独立保存、并列比较，排除过期与数量不足货源。 |
| 想让 AI 像业务员一样谈价，又担心乱降价。 | 区分客户目标价、对客报价、内部底价和授权额度。 |
| 聊天接近成交，需要业务员无缝接手。 | 保留上下文，人工处理锁货与付款，回写最终结果。 |

## 业务工作流

<img src="docs/assets/workflow.png" alt="需求补齐、库存匹配、采购核验、有效报价、授权议价、主管审批与人工接管的闭环" width="100%" />

1. **理解客户需求。** 读取客户背景，追问缺失的版本、颜色、数量、预算及交付条件。
2. **匹配并核验货源。** 比较内部库存与外部供应商报价，由采购确认来源、可售数量与当前成本。
3. **报价并推进谈判。** 生成有时效的报价；在配置额度内让价，超范围交主管审批。
4. **交接并沉淀结果。** 购买意向交给销售，锁货、收款及最终订单由人工确认；未满足需求继续留在历史池。

**一条可演示的业务线：**200 台 iPhone 13 → 报价 285 美元/台 → 授权让价至 284 → 客户继续要求 283 时进入主管审批。库存核验、有效期和内部底价贯穿全程。金额为演示配置，需要业务方确认。

## 整体架构

<img src="docs/assets/architecture.png" alt="TradeFlow 分层架构：业务工作台、演示状态、本地 API、领域规则、持久化、运行时契约和规划中的渠道适配" width="100%" />

架构将**业务决策权**与 **Agent 执行过程**分开：领域引擎负责金额计算、利润、时效与发送前检查；`AgentRuntime` 描述启动、恢复、中断和动作建议。AI 的运行过程不能替代库存核验、主管授权或人工成交确认。

图中是逻辑分层，不代表已经部署一套微服务集群。实线模块表示当前代码或浏览器模拟，虚线模块表示未来接入。

| 层次 | 当前交付 |
| --- | --- |
| 销售工作台 | 模拟 CRM、货源比较、SOP 补齐、采购核验、报价、英文预设对话、有限让价、审批与结果回写。 |
| 业务核心 | 类型化匹配、整数金额、利润校验、有效期与发送检查，供演示和本地原型复用。 |
| 数据库与 API | PGlite、SQL 迁移、客户归属过滤和事务审计；与浏览器演示分别运行，并非已接通的前后端。 |
| 运行时与集成 | 已有 `AgentRuntime` 接口及架构设计；真实模型、持久任务编排、WhatsApp 和 ERP 尚待接入。 |

## 快速体验

需要 **Node.js 24** 和 **pnpm 11.25.0**，演示无需 API Key。

```sh
git clone https://github.com/xliang-L/trade-ai-agent.git
cd trade-ai-agent
pnpm install --frozen-lockfile
pnpm build:demo
pnpm dev:demo
```

打开 **http://127.0.0.1:4173**。也可以用浏览器直接打开生成的 **`artifacts/TradeFlow-demo.html`**，离线展示完整预设流程。

首页点击「演示完整业务流程」。重新展示时使用「演示说明 → 重置模拟数据」。工作台界面为中文，面向客户的预设对话为英文。

```sh
pnpm typecheck
pnpm test
pnpm demo       # 命令行报价引擎示例
pnpm dev:api    # 独立的本地 API 原型，127.0.0.1:3000
```

API 使用固定演示身份，只用于本机开发；进一步运行说明见[开发文档](docs/development.md)。

## 项目结构

```text
apps/
  web/demo/          业务工作台与场景模型
  api/               本地 HTTP 原型
  agent-worker/      命令行领域流程示例
packages/
  domain/            匹配、报价及发送校验
  database/          数据访问与 SQL 迁移
  contracts/         Agent 运行时接口
tests/
  unit/              报价领域测试
  integration/       数据库与 HTTP 测试
  demo/              演示场景与离线打包测试
scripts/             演示构建与预览工具
docs/
  assets/            封面、流程图、架构图
  adr/               架构决策
  requirements/      需求基线与来源文字
artifacts/           生成产物，不进入 Git
```

## 演进路线

- **V1 · 跑通销售闭环：**当前已有演示与领域原型，下一步连接真实身份、知识库、模型及 WhatsApp。
- **V2 · 扩展客户经营：**分层维护、社媒内容、线索分发与运营指标。
- **V3 · 连接业务系统：**ERP、库存及订单同步、多渠道接待与供应商分析。

进一步阅读：[总体架构](docs/architecture.md)、[分期路线](docs/roadmap.md)、[当前需求差异](docs/requirements-demo-review.md)。

## 参与贡献

先用 Issue 描述业务场景与预期行为，按现有应用和模块边界提交改动，附上相关验证。示例只使用虚构数据。工程约定见[开发文档](docs/development.md)和 [Git 工作流](docs/git-workflow.md)。

## 参考项目

README 展示和架构表达参考了 [Twenty](https://github.com/twentyhq/twenty)、[Chatwoot](https://github.com/chatwoot/chatwoot)、[LangGraph](https://github.com/langchain-ai/langgraph)。这些是独立项目，不是本项目依赖或已完成的集成；本仓库未复制其代码或视觉素材。

## 许可证

[MIT](LICENSE) · Copyright © 2026 TradeFlow contributors。第三方依赖保留各自许可证。
