import type { ContentPack, GameLog, GameRuntimeState, Quest, QuestCompletion, QuestRuntimeState } from '@tss/schema'
import { applyEffects } from './effect-engine'
import { evaluateCondition } from './condition-engine'
import { cloneState, makeLog } from './state-utils'

export type QuestCompletionTrigger = QuestCompletion

export type QuestResult = {
  ok: boolean
  state: GameRuntimeState
  logs: GameLog[]
  reason?: string
}

export type QuestEntry = {
  quest: Quest
  state: QuestRuntimeState
}

function makeQuestState(state: GameRuntimeState, questId: string): QuestRuntimeState {
  return {
    id: questId,
    status: 'active',
    startedAt: {
      day: state.time.day,
      segment: state.time.segment,
    },
  }
}

function appendLogs(state: GameRuntimeState, logs: GameLog[]) {
  if (logs.length > 0) state.eventLogs.push(...logs)
}

function findQuest(pack: ContentPack, questId: string): Quest | undefined {
  return pack.quests.find((quest) => quest.id === questId)
}

function makeResult(state: GameRuntimeState, logs: GameLog[], ok: boolean, reason?: string): QuestResult {
  return { ok, state, logs, reason }
}

export function startQuestInPlace(pack: ContentPack, state: GameRuntimeState, questId: string): Omit<QuestResult, 'state'> {
  const quest = findQuest(pack, questId)
  if (!quest) return { ok: false, logs: [makeLog(state, 'system', `任务不存在：${questId}`)], reason: 'quest_not_found' }
  if (!evaluateCondition(quest.conditions, state)) return { ok: false, logs: [makeLog(state, 'system', `任务条件未满足：${quest.title}`, quest.id)], reason: 'conditions_not_met' }

  const current = state.worldState.quests[questId]
  if (current?.status === 'completed') return { ok: true, logs: [], reason: 'already_completed' }
  if (current?.status === 'active') return { ok: true, logs: [], reason: 'already_active' }

  state.worldState.quests[questId] = makeQuestState(state, questId)
  return { ok: true, logs: [makeLog(state, 'event', `任务开始：${quest.title}`, quest.id)] }
}

export function startQuest(pack: ContentPack, state: GameRuntimeState, questId: string): QuestResult {
  const next = cloneState(state)
  const result = startQuestInPlace(pack, next, questId)
  appendLogs(next, result.logs)
  return makeResult(next, result.logs, result.ok, result.reason)
}

export function failQuestInPlace(pack: ContentPack, state: GameRuntimeState, questId: string): Omit<QuestResult, 'state'> {
  const quest = findQuest(pack, questId)
  if (!quest) return { ok: false, logs: [makeLog(state, 'system', `任务不存在：${questId}`)], reason: 'quest_not_found' }

  const current = state.worldState.quests[questId]
  if (current?.status === 'completed') return { ok: false, logs: [], reason: 'already_completed' }
  if (current?.status === 'failed') return { ok: true, logs: [], reason: 'already_failed' }

  state.worldState.quests[questId] = {
    ...(current ?? makeQuestState(state, questId)),
    status: 'failed',
  }
  return { ok: true, logs: [makeLog(state, 'event', `任务失败：${quest.title}`, quest.id)] }
}

export function failQuest(pack: ContentPack, state: GameRuntimeState, questId: string): QuestResult {
  const next = cloneState(state)
  const result = failQuestInPlace(pack, next, questId)
  appendLogs(next, result.logs)
  return makeResult(next, result.logs, result.ok, result.reason)
}

export function failQuestObjectiveInPlace(pack: ContentPack, state: GameRuntimeState, questId: string, objectiveId: string): Omit<QuestResult, 'state'> {
  const quest = findQuest(pack, questId)
  if (!quest) return { ok: false, logs: [makeLog(state, 'system', `任务不存在：${questId}`)], reason: 'quest_not_found' }
  if (!quest.objectives?.some((objective) => objective.id === objectiveId)) return { ok: false, logs: [makeLog(state, 'system', `任务目标不存在：${objectiveId}`)], reason: 'objective_not_found' }

  const current = state.worldState.quests[questId] ?? makeQuestState(state, questId)
  current.failedObjectiveIds ??= []
  if (!current.failedObjectiveIds.includes(objectiveId)) current.failedObjectiveIds.push(objectiveId)
  state.worldState.quests[questId] = current
  return { ok: true, logs: [makeLog(state, 'event', `任务目标失败：${quest.title} / ${objectiveId}`, quest.id)] }
}

export function completeQuestInPlace(pack: ContentPack, state: GameRuntimeState, questId: string): Omit<QuestResult, 'state'> {
  const quest = findQuest(pack, questId)
  if (!quest) return { ok: false, logs: [makeLog(state, 'system', `任务不存在：${questId}`)], reason: 'quest_not_found' }

  const current = state.worldState.quests[questId]
  if (!current || current.status !== 'active') {
    if (current?.status === 'completed') return { ok: true, logs: [], reason: 'already_completed' }
    return { ok: false, logs: [], reason: 'quest_not_active' }
  }

  current.status = 'completed'
  current.completedAt = {
    day: state.time.day,
    segment: state.time.segment,
  }

  const completionLogs = [makeLog(state, 'event', `任务完成：${quest.title}`, quest.id)]
  const rewardEffects = quest.rewardIds.flatMap((rewardId) => pack.rewards.find((reward) => reward.id === rewardId)?.effects ?? [])
  const rewardLogs = applyEffects(pack, state, rewardEffects)
  return { ok: true, logs: [...completionLogs, ...rewardLogs] }
}

export function completeQuest(pack: ContentPack, state: GameRuntimeState, questId: string): QuestResult {
  const next = cloneState(state)
  const result = completeQuestInPlace(pack, next, questId)
  appendLogs(next, result.logs)
  return makeResult(next, result.logs, result.ok, result.reason)
}

function matchesCompletion(completion: QuestCompletion, trigger: QuestCompletionTrigger): boolean {
  if (completion.type !== trigger.type) return false
  if (completion.type === 'conversation' && trigger.type === 'conversation') {
    return completion.npcId === trigger.npcId
      && completion.conversationId === trigger.conversationId
      && (!completion.replyId || completion.replyId === trigger.replyId)
  }
  if (completion.type === 'give' && trigger.type === 'give') {
    return completion.npcId === trigger.npcId
      && completion.itemId === trigger.itemId
      && trigger.itemCount >= completion.itemCount
      && (!completion.interactionId || completion.interactionId === trigger.interactionId)
  }
  if (completion.type === 'combat' && trigger.type === 'combat') {
    return completion.targetType === trigger.targetType
      && completion.targetId === trigger.targetId
      && trigger.result === 'victory'
      && (!completion.interactionId || completion.interactionId === trigger.interactionId)
  }
  if (completion.type === 'environment' && trigger.type === 'environment') {
    return completion.environmentType === trigger.environmentType
      && completion.targetType === trigger.targetType
      && completion.targetId === trigger.targetId
      && (!completion.interactionId || completion.interactionId === trigger.interactionId)
  }
  return false
}

function questObjectivesSatisfied(quest: Quest, state: GameRuntimeState): boolean {
  const failedObjectiveIds = state.worldState.quests[quest.id]?.failedObjectiveIds ?? []
  return (quest.objectives ?? []).every((objective) => !failedObjectiveIds.includes(objective.id) && evaluateCondition(objective.conditions, state))
}

export function resolveQuestCompletions(pack: ContentPack, state: GameRuntimeState, trigger: QuestCompletionTrigger): QuestResult {
  const next = cloneState(state)
  const logs: GameLog[] = []

  for (const quest of pack.quests) {
    const current = next.worldState.quests[quest.id]
    if (current?.status !== 'active') continue
    if (!matchesCompletion(quest.completion, trigger)) continue
    if (!questObjectivesSatisfied(quest, next)) continue
    const result = completeQuestInPlace(pack, next, quest.id)
    logs.push(...result.logs)
  }

  appendLogs(next, logs)
  return makeResult(next, logs, true)
}

export function getQuestEntries(pack: ContentPack, state: GameRuntimeState): QuestEntry[] {
  return Object.values(state.worldState.quests)
    .map((questState) => {
      const quest = findQuest(pack, questState.id)
      return quest ? { quest, state: questState } : undefined
    })
    .filter((entry): entry is QuestEntry => entry !== undefined)
    .sort((left, right) => Number(left.state.status === 'completed') - Number(right.state.status === 'completed'))
}
