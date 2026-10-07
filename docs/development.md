# 第一版开发与验证

当前已实现零第三方依赖的 TypeScript 业务原型，Node.js 24 可直接执行。还没有数据库、Web 页面、用户鉴权、真实 Agent 或 WhatsApp。

```sh
npm test
npm run demo
```

也可直接使用 Node 执行：

```sh
node --test tests/*.test.ts
node apps/agent-worker/demo.ts
```

原型验证同 SKU 多供应商匹配、内外库存核验、库存锁定数量、精确金额、利润底线、最早截止时间、货源改价、核验撤销、人工接管与发送前复核。所有数据是模拟数据，没有真正发送任何客户消息。

这些函数不构成生产发送授权：后续必须增加数据库事务、角色和客户权限、不可篡改报价记录、审批、Outbox、渠道幂等与回执。Node 执行 TypeScript 不等于完成静态类型检查；正式工程引入框架时应增加 TypeScript 编译器与锁文件。

接下来先用数据库保存询单、货源、核验和报价，建立授权 API；再接入工作台与 runtime 适配器。Codex 集成仍待小规模实测。
