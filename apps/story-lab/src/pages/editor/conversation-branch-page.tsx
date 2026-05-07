import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  MessageSquareText,
  Route,
  UserRound,
} from 'lucide-react'
import type { ContentPack, Conversation, ValidationIssue } from '@tss/schema'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui'
import {
  CodeBlock,
  Definition,
  EmptyState,
  IssueList,
  PageHeader,
} from '../../components/common'
import { conditionFacts, summarizeEffect } from '../../editor/helpers'
import { analyzeConversationBranches, type ConversationBranchAnalysis } from '../../editor/conversation-branch-preview'

export function ConversationBranchPage({
  issues,
  pack,
  selectedConversation,
  onSelectConversation,
}: {
  issues: ValidationIssue[]
  pack: ContentPack
  selectedConversation?: Conversation
  onSelectConversation: (id: string) => void
}) {
  const analysisByConversation = new Map(pack.conversations.map((conversation) => [conversation.id, analyzeConversationBranches(conversation)]))
  const analysis = selectedConversation ? analysisByConversation.get(selectedConversation.id) : undefined
  const selectedIssues = selectedConversation ? relatedConversationIssues(issues, selectedConversation) : []
  const conversationsByNpc = pack.npcs
    .map((npc) => ({
      npc,
      conversations: pack.conversations.filter((conversation) => conversation.npcId === npc.id),
    }))
    .filter((group) => group.conversations.length > 0)
  const unassignedConversations = pack.conversations.filter((conversation) => !pack.npcs.some((npc) => npc.id === conversation.npcId))

  return (
    <>
      <PageHeader
        eyebrow="Conversation Branches"
        testId="conversation-branches-header"
        title="对话分支"
        description="查看当前内容包的会话入口、回复链路和结构诊断"
      />

      <section className="conversation-branch-layout" data-test-id="conversation-branches-layout">
        <Card data-test-id="conversation-branches-list-card">
          <CardHeader>
            <CardTitle>会话列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="conversation-npc-menu" data-test-id="conversation-branches-list">
              {conversationsByNpc.map((group) => (
                <div key={group.npc.id} className="conversation-npc-group" data-test-id={`conversation-branch-npc-group-${group.npc.id}`}>
                  <div className="conversation-npc-title" data-test-id={`conversation-branch-npc-title-${group.npc.id}`}>
                    <UserRound size={16} />
                    <strong>{group.npc.name}</strong>
                  </div>
                  <div className="conversation-title-list" data-test-id={`conversation-branch-npc-conversations-${group.npc.id}`}>
                    {group.conversations.map((conversation) => (
                      <ConversationTitleButton
                        key={conversation.id}
                        analysisIssueCount={analysisByConversation.get(conversation.id)?.issues.length ?? 0}
                        conversation={conversation}
                        selected={selectedConversation?.id === conversation.id}
                        onSelectConversation={onSelectConversation}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {unassignedConversations.length > 0 && (
                <div className="conversation-npc-group" data-test-id="conversation-branch-npc-group-unassigned">
                  <div className="conversation-npc-title" data-test-id="conversation-branch-npc-title-unassigned">
                    <UserRound size={16} />
                    <strong>未匹配 NPC</strong>
                  </div>
                  <div className="conversation-title-list" data-test-id="conversation-branch-npc-conversations-unassigned">
                    {unassignedConversations.map((conversation) => (
                      <ConversationTitleButton
                        key={conversation.id}
                        analysisIssueCount={analysisByConversation.get(conversation.id)?.issues.length ?? 0}
                        conversation={conversation}
                        selected={selectedConversation?.id === conversation.id}
                        onSelectConversation={onSelectConversation}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedConversation && analysis ? (
          <>
            <ConversationDetailCard conversation={selectedConversation} pack={pack} />
            <ConversationPreviewCard analysis={analysis} conversation={selectedConversation} issues={selectedIssues} />
          </>
        ) : (
          <Card data-test-id="conversation-branches-empty-card">
            <CardContent>
              <EmptyState testId="conversation-branches-empty" title="暂无会话" />
            </CardContent>
          </Card>
        )}
      </section>
    </>
  )
}

function ConversationTitleButton({
  analysisIssueCount,
  conversation,
  selected,
  onSelectConversation,
}: {
  analysisIssueCount: number
  conversation: Conversation
  selected: boolean
  onSelectConversation: (id: string) => void
}) {
  return (
    <button
      className={selected ? 'conversation-title-row is-selected' : 'conversation-title-row'}
      data-test-id={`conversation-branch-select-${conversation.id}`}
      type="button"
      onClick={() => onSelectConversation(conversation.id)}
    >
      <MessageSquareText size={15} />
      <span data-test-id={`conversation-branch-title-${conversation.id}`}>{conversation.title}</span>
      <Badge className={analysisIssueCount > 0 ? 'danger' : 'ok'} data-test-id={`conversation-branch-status-${conversation.id}`}>
        {analysisIssueCount > 0 ? `${analysisIssueCount} 问题` : '正常'}
      </Badge>
    </button>
  )
}

function ConversationDetailCard({ conversation, pack }: { conversation: Conversation; pack: ContentPack }) {
  const npc = pack.npcs.find((item) => item.id === conversation.npcId)
  const replyCount = conversation.nodes.reduce((total, node) => total + node.replies.length, 0)

  return (
    <Card data-test-id="conversation-branches-detail-card">
      <CardHeader>
        <CardTitle>{conversation.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="definition-grid" data-test-id="conversation-branches-definitions">
          <Definition label="会话 ID" testId="conversation-branches-id" value={conversation.id} />
          <Definition label="NPC" testId="conversation-branches-npc" value={npc?.name ?? conversation.npcId} />
          <Definition label="入口节点" testId="conversation-branches-entry" value={conversation.entryNodeId} />
          <Definition label="优先级" testId="conversation-branches-priority" value={conversation.priority ?? 0} />
          <Definition label="节点" testId="conversation-branches-node-count" value={conversation.nodes.length} />
          <Definition label="回复" testId="conversation-branches-reply-count" value={replyCount} />
        </div>

        <div className="conversation-condition-card" data-test-id="conversation-branches-conditions">
          <strong data-test-id="conversation-branches-conditions-title">触发条件</strong>
          <span data-test-id="conversation-branches-conditions-summary">{conditionFacts(conversation.conditions).join(', ') || '无'}</span>
          <CodeBlock value={conversation.conditions ?? {}} compact />
        </div>

        <div className="conversation-node-list" data-test-id="conversation-branches-node-list">
          {conversation.nodes.map((node) => (
            <article key={`${conversation.id}-${node.id}`} className="conversation-node-card" data-test-id={`conversation-branches-node-${node.id}`}>
              <div className="conversation-node-head" data-test-id={`conversation-branches-node-head-${node.id}`}>
                <Badge data-test-id={`conversation-branches-node-speaker-${node.id}`}>{node.speaker}</Badge>
                <strong data-test-id={`conversation-branches-node-id-${node.id}`}>{node.id}</strong>
              </div>
              <p data-test-id={`conversation-branches-node-text-${node.id}`}>{node.text}</p>
              {node.effects && node.effects.length > 0 && (
                <small data-test-id={`conversation-branches-node-effects-${node.id}`}>{node.effects.map(summarizeEffect).join(' / ')}</small>
              )}
              <div className="conversation-reply-list" data-test-id={`conversation-branches-replies-${node.id}`}>
                {node.replies.length === 0 ? (
                  <EmptyState testId={`conversation-branches-replies-empty-${node.id}`} title="该节点暂无回复" />
                ) : (
                  node.replies.map((reply) => (
                    <div key={`${node.id}-${reply.id}`} className="conversation-reply-row" data-test-id={`conversation-branches-reply-${node.id}-${reply.id}`}>
                      <GitBranch size={14} />
                      <span data-test-id={`conversation-branches-reply-text-${node.id}-${reply.id}`}>{reply.text}</span>
                      <Badge data-test-id={`conversation-branches-reply-target-${node.id}-${reply.id}`}>{reply.endConversation ? '结束' : reply.nextNodeId ?? '未连接'}</Badge>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ConversationPreviewCard({
  analysis,
  conversation,
  issues,
}: {
  analysis: ConversationBranchAnalysis
  conversation: Conversation
  issues: ValidationIssue[]
}) {
  return (
    <Card data-test-id="conversation-branches-preview-card">
      <CardHeader>
        <CardTitle>分支预览</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="conversation-diagnostic-summary" data-test-id="conversation-branches-diagnostic-summary">
          <div data-test-id="conversation-branches-reachable-summary">
            <Route size={16} />
            <strong>{analysis.reachableNodeIds.length}</strong>
            <span>可达节点</span>
          </div>
          <div data-test-id="conversation-branches-issue-summary">
            <AlertTriangle size={16} />
            <strong>{analysis.issues.length}</strong>
            <span>结构问题</span>
          </div>
        </div>

        <div className="conversation-path-list" data-test-id="conversation-branches-path-list">
          {analysis.paths.length === 0 ? (
            <EmptyState testId="conversation-branches-path-empty" title="暂无可预览路径" />
          ) : (
            analysis.paths.map((path, index) => (
              <div key={path.id || index} className={`conversation-path-row ${path.status}`} data-test-id={`conversation-branches-path-${index}`}>
                <Badge data-test-id={`conversation-branches-path-status-${index}`}>{path.status}</Badge>
                <div data-test-id={`conversation-branches-path-steps-${index}`}>
                  {path.steps.map((step, stepIndex) => (
                    <span key={`${path.id}-${step.nodeId}-${step.replyId}-${stepIndex}`} data-test-id={`conversation-branches-path-step-${index}-${stepIndex}`}>
                      {step.nodeId} / {step.replyId}{step.endsConversation ? ' -> end' : ` -> ${step.nextNodeId ?? 'missing'}`}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="conversation-issue-list" data-test-id="conversation-branches-local-issues">
          {analysis.issues.length === 0 ? (
            <div className="conversation-ok-row" data-test-id="conversation-branches-local-ok">
              <CheckCircle2 size={16} />
              <span>本地结构检查未发现问题</span>
            </div>
          ) : (
            analysis.issues.map((issue, index) => (
              <div key={`${issue.type}-${issue.nodeId ?? issue.targetNodeId ?? index}-${issue.replyId ?? ''}`} className="conversation-issue-row" data-test-id={`conversation-branches-local-issue-${index}`}>
                <AlertTriangle size={16} />
                <span>{issue.message}</span>
              </div>
            ))
          )}
        </div>

        <div data-test-id="conversation-branches-validation-issues">
          <h3 data-test-id="conversation-branches-validation-title">内容包校验</h3>
          <IssueList issues={issues} />
        </div>

        <div data-test-id="conversation-branches-raw">
          <h3 data-test-id="conversation-branches-raw-title">原始结构</h3>
          <CodeBlock value={conversation} compact />
        </div>
      </CardContent>
    </Card>
  )
}

function relatedConversationIssues(issues: ValidationIssue[], conversation: Conversation) {
  const targetIds = new Set([
    conversation.id,
    ...conversation.nodes.flatMap((node) => [node.id, ...node.replies.map((reply) => reply.id)]),
  ])
  return issues.filter((issue) => Boolean(issue.targetId && targetIds.has(issue.targetId)) || issue.message.includes(conversation.id))
}
