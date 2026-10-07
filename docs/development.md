# 第一版开发与验证

已实现库存核验与报价领域逻辑、PostgreSQL SQL 迁移、PGlite 本地持久化开发数据库，以及本机演示 HTTP API。已有 12 项测试，覆盖关键报价风控、客户归属过滤、事务审计、重启恢复与 API 响应。

PGlite 是本机开发使用的 PostgreSQL 运行环境，支持 Node 文件系统持久化，参见 [官方文档](https://pglite.dev/docs/)。生产独立 PostgreSQL 驱动、多进程行为及部署仍待实现与验证。

## 运行

需要 Node.js 24 和 pnpm 11.25.0。

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm demo
pnpm dev:api
```

API 仅监听 `127.0.0.1:3000`，身份固定为测试业务员 `demo-sales-a`，仅用于本机模拟验证，不能公网部署。开发数据位于 `.data/development`，不提交到 Git。

| 方法与路径 | 用途 |
|---|---|
| GET /health | 返回本机演示状态 |
| GET /customers | 当前测试业务员可见客户 |
| POST /demands | 创建历史询单；customerId、productId、quantity、currency |
| POST /matches | 查找候选；demandId。响应不包含成本 |
| POST /quotes | 人工核验后生成报价；demandId、offerId |

核验暂由内部业务服务执行，并在测试中验证采购角色；尚未开放 HTTP 核验入口。演示 API 不是真实认证系统，不能通过参数伪装采购或其他业务员。

```sh
curl http://127.0.0.1:3000/customers
curl -X POST http://127.0.0.1:3000/demands -H 'Content-Type: application/json' \
  -d '{"customerId":"demo-customer-a","productId":"demo-phone-128-black","quantity":10,"currency":"USD"}'
```

迁移包含客户、询单、货源、当前核验、报价、基础审计表。完整版本历史、核验历史、SOP、客户字段、审批和事务 Outbox 尚未实现；当前表结构是第一条垂直流程开发基线，不等于完整架构数据模型。

还有哪些未实现：正式用户登录与授权、管理工作台、Excel 导入、正式 PostgreSQL 驱动、知识库、Codex、WhatsApp、发送网关、报价审批、任务调度和生产部署。人工接管发送检查目前仅是领域原型，没有真实会话控制服务。

业务待确认项与演示默认值见 [业务对齐清单](business-alignment.md)。
