/** 架构草案：未接入 Codex SDK，不表示已支持生产恢复语义。 */
export type RunScope = {
  organizationId: string;
  actorId: string;
  conversationId: string;
  conversationControlVersion: number;
  allowedToolNames: readonly string[];
  sopVersion: string;
};

export type RuntimeBinding = {
  provider: string;
  threadId: string;
  turnId?: string;
};

export type RunInput = {
  runId: string;
  scope: RunScope;
  input: string;
  /** 后端授权且已去除不应暴露字段的上下文。 */
  context: readonly { kind: string; content: unknown; sourceVersion: string }[];
};

export type RuntimeEvent =
  | { type: 'text.delta'; runId: string; delta: string }
  | { type: 'tool.requested'; runId: string; callId: string; name: string; arguments: unknown }
  | { type: 'completed'; runId: string; binding: RuntimeBinding }
  | { type: 'interrupted'; runId: string }
  | { type: 'failed'; runId: string; code: string; retryable: boolean };

/** 事件流只进入内部工作台与审计，不能直接连接客户渠道。 */
export interface AgentRuntime {
  start(input: RunInput): AsyncIterable<RuntimeEvent>;
  resume(input: RunInput, binding: RuntimeBinding): AsyncIterable<RuntimeEvent>;
  interrupt(runId: string, binding: RuntimeBinding): Promise<void>;
}

/** AI 只能提出草稿，发送授权由业务服务重新校验。 */
export type MessageDraftProposal = {
  conversationId: string;
  expectedControlVersion: number;
  purpose: 'collect_fields' | 'quote' | 'follow_up' | 'handoff_notice';
  body: string;
  quoteId?: string;
  quoteVersion?: number;
  idempotencyKey: string;
};
