import type { ContentPack, Conversation, ConversationReply, GameLog, GameRuntimeState } from '@tss/schema'
import { evaluateCondition, explainConditionFailures } from './condition-engine'
import { applyEffects } from './effect-engine'
import { resolveQuestCompletions } from './quest-engine'
import { cloneState, makeLog } from './state-utils'

export type ConversationAvailability = {
  available: boolean
  reasons: string[]
}

export type ConversationEntry = ConversationAvailability & {
  conversation: Conversation
}

export function getConversationAvailability(pack: ContentPack, state: GameRuntimeState, conversation: Conversation): ConversationAvailability {
  const reasons: string[] = []
  const npc = pack.npcs.find((item) => item.id === conversation.npcId)
  const runtimeNpc = state.worldState.npcs[conversation.npcId]
  if (!npc || !runtimeNpc) reasons.push('NPC 不存在')
  if (runtimeNpc?.state.alive === false) reasons.push('NPC 当前无法交谈')
  if (runtimeNpc && runtimeNpc.locationId !== state.player.locationId) reasons.push('需要与对方在同一地点')
  if (!conversation.nodes.some((node) => node.id === conversation.entryNodeId)) reasons.push('会话入口节点不存在')
  if (!evaluateCondition(conversation.conditions, state)) {
    reasons.push(...explainConditionFailures(conversation.conditions, state).map((item) => `${item.fact ?? '条件'}：需要 ${item.expected}，当前 ${String(item.actual)}`))
  }
  return { available: reasons.length === 0, reasons }
}

export function getAvailableConversationsForNpc(pack: ContentPack, state: GameRuntimeState, npcId: string): ConversationEntry[] {
  return pack.conversations
    .filter((conversation) => conversation.npcId === npcId)
    .map((conversation) => ({ conversation, ...getConversationAvailability(pack, state, conversation) }))
    .filter((entry) => entry.available)
    .sort((a, b) => (b.conversation.priority ?? 0) - (a.conversation.priority ?? 0) || a.conversation.title.localeCompare(b.conversation.title))
}

export function getConversationReplyAvailability(state: GameRuntimeState, reply: ConversationReply): ConversationAvailability {
  const reasons: string[] = []
  if (!evaluateCondition(reply.conditions, state)) {
    reasons.push(...explainConditionFailures(reply.conditions, state).map((item) => `${item.fact ?? '条件'}：需要 ${item.expected}，当前 ${String(item.actual)}`))
  }
  if (reply.itemCost && (state.player.inventory[reply.itemCost.itemId] ?? 0) < reply.itemCost.itemCount) {
    reasons.push(`物品不足：${reply.itemCost.itemId}`)
  }
  return { available: reasons.length === 0, reasons }
}

export function startConversation(pack: ContentPack, state: GameRuntimeState, conversationId: string): { state: GameRuntimeState; logs: GameLog[]; ok: boolean; reasons: string[] } {
  const conversation = pack.conversations.find((item) => item.id === conversationId)
  if (!conversation) return { state, logs: [], ok: false, reasons: ['会话不存在'] }
  const availability = getConversationAvailability(pack, state, conversation)
  if (!availability.available) return { state, logs: [], ok: false, reasons: availability.reasons }
  const entryNode = conversation.nodes.find((node) => node.id === conversation.entryNodeId)
  if (!entryNode) return { state, logs: [], ok: false, reasons: ['会话入口节点不存在'] }

  const next = cloneState(state)
  const logs: GameLog[] = [makeLog(next, 'conversation', `开始会话：${conversation.title}`, conversation.id)]
  next.worldState.activeConversation = {
    conversationId: conversation.id,
    npcId: conversation.npcId,
    nodeId: entryNode.id,
  }
  recordConversationHistory(next, conversation.id, conversation.npcId, entryNode.id)
  logs.push(...applyEffects(pack, next, entryNode.effects ?? []))
  next.eventLogs = [...next.eventLogs, ...logs]
  return { state: next, logs, ok: true, reasons: [] }
}

export function getActiveConversationNode(pack: ContentPack, state: GameRuntimeState) {
  const active = state.worldState.activeConversation
  if (!active) return undefined
  const conversation = pack.conversations.find((item) => item.id === active.conversationId)
  const node = conversation?.nodes.find((item) => item.id === active.nodeId)
  return conversation && node ? { conversation, node } : undefined
}

export function chooseConversationReply(pack: ContentPack, state: GameRuntimeState, replyId: string): { state: GameRuntimeState; logs: GameLog[]; ok: boolean; reasons: string[] } {
  const activeEntry = getActiveConversationNode(pack, state)
  if (!activeEntry) return { state, logs: [], ok: false, reasons: ['当前没有进行中的会话'] }
  const reply = activeEntry.node.replies.find((item) => item.id === replyId)
  if (!reply) return { state, logs: [], ok: false, reasons: ['回复不存在'] }
  const availability = getConversationReplyAvailability(state, reply)
  if (!availability.available) return { state, logs: [], ok: false, reasons: availability.reasons }

  const next = cloneState(state)
  const logs: GameLog[] = [makeLog(next, 'conversation', `选择回复：${reply.text}`, reply.id)]
  if (reply.itemCost) {
    next.player.inventory[reply.itemCost.itemId] = Math.max(0, (next.player.inventory[reply.itemCost.itemId] ?? 0) - reply.itemCost.itemCount)
    logs.push(makeLog(next, 'player', `交付物品：${reply.itemCost.itemId} × ${reply.itemCost.itemCount}`))
  }
  logs.push(...applyEffects(pack, next, reply.effects ?? []))
  recordConversationHistory(next, activeEntry.conversation.id, activeEntry.conversation.npcId, activeEntry.node.id, reply.id)

  if (reply.endConversation || !reply.nextNodeId) {
    delete next.worldState.activeConversation
  } else {
    const nextNode = activeEntry.conversation.nodes.find((node) => node.id === reply.nextNodeId)
    if (!nextNode) {
      delete next.worldState.activeConversation
      logs.push(makeLog(next, 'system', `会话节点不存在：${reply.nextNodeId}`))
      next.eventLogs = [...next.eventLogs, ...logs]
      return { state: next, logs, ok: false, reasons: [`会话节点不存在：${reply.nextNodeId}`] }
    }
    next.worldState.activeConversation = {
      conversationId: activeEntry.conversation.id,
      npcId: activeEntry.conversation.npcId,
      nodeId: nextNode.id,
    }
    recordConversationHistory(next, activeEntry.conversation.id, activeEntry.conversation.npcId, nextNode.id)
    logs.push(...applyEffects(pack, next, nextNode.effects ?? []))
  }

  const questResult = resolveQuestCompletions(pack, next, {
    type: 'conversation',
    npcId: activeEntry.conversation.npcId,
    conversationId: activeEntry.conversation.id,
    replyId: reply.id,
  })
  next.worldState = questResult.state.worldState
  next.player = questResult.state.player
  next.endingResult = questResult.state.endingResult
  logs.push(...questResult.logs)

  next.eventLogs = [...next.eventLogs, ...logs]
  return { state: next, logs, ok: true, reasons: [] }
}

export function endConversation(state: GameRuntimeState): GameRuntimeState {
  const next = cloneState(state)
  delete next.worldState.activeConversation
  return next
}

export function hasVisitedConversation(state: GameRuntimeState, conversationId: string): boolean {
  return getConversationHistory(state).some((entry) => entry.conversationId === conversationId)
}

export function hasVisitedConversationNode(state: GameRuntimeState, conversationId: string, nodeId: string): boolean {
  return getConversationHistory(state).some((entry) => entry.conversationId === conversationId && entry.nodeId === nodeId)
}

export function hasChosenConversationReply(state: GameRuntimeState, conversationId: string, replyId: string): boolean {
  return getConversationHistory(state).some((entry) => entry.conversationId === conversationId && entry.replyId === replyId)
}

function recordConversationHistory(state: GameRuntimeState, conversationId: string, npcId: string, nodeId: string, replyId?: string): void {
  getConversationHistory(state).push({
    conversationId,
    npcId,
    nodeId,
    replyId,
    day: state.time.day,
    segment: state.time.segment,
  })
}

function getConversationHistory(state: GameRuntimeState) {
  state.worldState.conversationHistory ??= []
  return state.worldState.conversationHistory
}
