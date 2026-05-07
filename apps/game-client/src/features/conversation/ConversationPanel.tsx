import { MessageCircle, RotateCcw } from 'lucide-react'
import { getActiveConversationNode, getConversationReplyAvailability } from '@tss/engine'
import type { Condition, ConditionGroup, PlayerIdentity } from '@tss/schema'
import { Badge, Button } from '@tss/ui'
import { useGameStore } from '@/store/game-store'

export function ConversationPanel({ npcId }: { npcId?: string }) {
  const pack = useGameStore((state) => state.contentPack)
  const runtime = useGameStore((state) => state.runtime)!
  const startConversation = useGameStore((state) => state.startConversation)
  const chooseConversationReply = useGameStore((state) => state.chooseConversationReply)
  const endConversation = useGameStore((state) => state.endConversation)
  const getConversationEntriesForNpc = useGameStore((state) => state.getConversationEntriesForNpc)
  const debugMode = useGameStore((state) => state.debugMode)
  const activeEntry = getActiveConversationNode(pack, runtime)
  const identityLabels = new Map(pack.identities.map((identity) => [identity.id, identity.name]))

  if (activeEntry) {
    const speaker = activeEntry.node.speaker === 'player'
      ? '你'
      : pack.npcs.find((npc) => npc.id === activeEntry.node.speaker)?.name ?? activeEntry.node.speaker
    return (
      <div className="space-y-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3" data-test-id="conversation-active-panel">
        <div className="flex items-start justify-between gap-3" data-test-id="conversation-active-header">
          <div className="min-w-0" data-test-id="conversation-active-copy">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-100" data-test-id="conversation-active-title">
              <MessageCircle className="size-4" data-test-id="conversation-active-icon" />
              {activeEntry.conversation.title}
            </div>
            <div className="mt-1 text-xs text-stone-400" data-test-id="conversation-active-speaker">{speaker}</div>
          </div>
          <Button className="shrink-0" data-test-id="conversation-end-button" size="sm" variant="outline" onClick={endConversation}>
            <RotateCcw className="mr-1 size-3" data-test-id="conversation-end-icon" />
            结束
          </Button>
        </div>
        <p className="text-sm leading-6 text-stone-200" data-test-id="conversation-node-text">{activeEntry.node.text}</p>
        <div className="space-y-2" data-test-id="conversation-reply-list">
          {activeEntry.node.replies.map((reply) => {
            const availability = getConversationReplyAvailability(runtime, reply)
            if (!debugMode && !availability.available) return null
            return (
              <div key={reply.id} className="space-y-1" data-test-id={`conversation-reply-row-${reply.id}`}>
                <Button
                  className="w-full justify-start text-left"
                  data-test-id={`conversation-reply-button-${reply.id}`}
                  disabled={!availability.available}
                  variant="outline"
                  onClick={() => chooseConversationReply(reply.id)}
                >
                  {formatPlayerReplyText(reply.text, reply.conditions, identityLabels)}
                </Button>
                {debugMode && !availability.available && <p className="text-xs leading-5 text-red-200" data-test-id={`conversation-reply-reason-${reply.id}`}>{availability.reasons.join('；')}</p>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!npcId) {
    return <p className="text-xs text-stone-500" data-test-id="conversation-empty-state">选择当前地点的 NPC 后可查看话题。</p>
  }

  const entries = getConversationEntriesForNpc(npcId)
  const visibleEntries = debugMode ? entries : entries.filter((entry) => entry.available)
  return (
    <div className="space-y-2" data-test-id="conversation-topic-list">
      {visibleEntries.length === 0 && <p className="text-xs text-stone-500" data-test-id="conversation-no-topics">暂无可用话题。</p>}
      {visibleEntries.map(({ conversation, available, reasons, visited }) => (
        <div key={conversation.id} className="rounded-lg border border-white/10 bg-black/15 p-3" data-test-id={`conversation-topic-row-${conversation.id}`}>
          <div className="flex items-start justify-between gap-3" data-test-id={`conversation-topic-row-body-${conversation.id}`}>
            <div className="min-w-0" data-test-id={`conversation-topic-copy-${conversation.id}`}>
              <div className="flex flex-wrap items-center gap-2" data-test-id={`conversation-topic-title-row-${conversation.id}`}>
                <span className="text-sm text-stone-100" data-test-id={`conversation-topic-title-${conversation.id}`}>{conversation.title}</span>
                {visited && <Badge data-test-id={`conversation-topic-visited-${conversation.id}`}>已谈过</Badge>}
              </div>
              {debugMode && !available && <p className="mt-1 text-xs leading-5 text-red-200" data-test-id={`conversation-topic-reason-${conversation.id}`}>{reasons.join('；')}</p>}
            </div>
            <Button
              className="shrink-0"
              data-test-id={`conversation-start-button-${conversation.id}`}
              disabled={!available}
              size="sm"
              onClick={() => startConversation(conversation.id)}
            >
              交谈
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatPlayerReplyText(text: string, conditions: ConditionGroup | undefined, identityLabels: Map<PlayerIdentity['id'], PlayerIdentity['name']>) {
  const identityId = findReplyIdentityId(conditions)
  const identityName = identityId ? identityLabels.get(identityId) : undefined
  if (!identityName) return text
  const identityLabel = identityName.length > 2 ? identityName.slice(-2) : identityName
  return `[${identityLabel}] ${text}`
}

function findReplyIdentityId(conditions: ConditionGroup | undefined): string | undefined {
  if (!conditions) return undefined
  if ('fact' in conditions && conditions.fact === 'player.identity' && 'equals' in conditions && typeof conditions.equals === 'string') return conditions.equals
  if ('all' in conditions) return conditions.all.map(findReplyIdentityIdFromCondition).find(Boolean)
  if ('any' in conditions) return conditions.any.map(findReplyIdentityIdFromCondition).find(Boolean)
  if ('not' in conditions) return findReplyIdentityIdFromCondition(conditions.not)
  return undefined
}

function findReplyIdentityIdFromCondition(condition: Condition): string | undefined {
  if ('fact' in condition && condition.fact === 'player.identity' && 'equals' in condition && typeof condition.equals === 'string') return condition.equals
  if ('all' in condition) return condition.all.map(findReplyIdentityIdFromCondition).find(Boolean)
  if ('any' in condition) return condition.any.map(findReplyIdentityIdFromCondition).find(Boolean)
  if ('not' in condition) return findReplyIdentityIdFromCondition(condition.not)
  return undefined
}
