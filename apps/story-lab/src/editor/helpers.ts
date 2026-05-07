import type { ConditionGroup, ContentPack, Effect, GameEvent, ValidationIssue } from '@tss/schema'

export function countSeverity(issues: ValidationIssue[]) {
  return issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] ?? 0) + 1
    return acc
  }, {})
}

export function countBucket(issues: ValidationIssue[], types: string[]) {
  return issues.filter((issue) => types.includes(issue.type)).length
}

export function issueKey(issue: ValidationIssue, index: number) {
  return `${issue.severity}:${issue.type}:${issue.targetId ?? 'pack'}:${issue.path ?? '-'}:${index}`
}

export function inferFile(issue: ValidationIssue) {
  const target = issue.targetId ?? ''
  if (target.startsWith('npc_')) return 'npcs/details.json'
  if (target.startsWith('event_')) return 'events.json'
  if (target.startsWith('conversation_')) return 'conversations.json'
  if (target.startsWith('loc_')) return 'locations.json'
  if (target.startsWith('building_')) return 'buildings.json'
  if (target.startsWith('ending_')) return 'endings.json'
  if (issue.type.includes('conversation')) return 'conversations.json'
  if (issue.type.includes('location')) return 'locations.json'
  return 'content-pack.json'
}

export function formatIssue(issue: ValidationIssue) {
  return [
    `错误类型：${issue.type}`,
    `文件：${inferFile(issue)}`,
    `对象：${issue.targetId ?? '-'}`,
    `字段：${issue.path ?? '-'}`,
    `说明：${issue.message}`,
  ].join('\n')
}

export function buildFixPrompt(issues: ValidationIssue[], sourcePack: ContentPack) {
  const body = issues.length === 0 ? '当前没有检测问题。' : issues.map(formatIssue).join('\n\n')
  return [
    '以下是剧情编辑器的内容校验结果。',
    '请只修复错误，不要重写全部内容。',
    '',
    '【错误】',
    body,
    '',
    '【内容包摘要】',
    `${sourcePack.packId} / ${sourcePack.world.name} / ${sourcePack.version}`,
    '',
    '【修复要求】',
    '1. 如果缺失对象确实应该存在，请只输出合法的对象草稿。',
    '2. 如果引用不必要，请从引用字段中移除。',
    '3. 不要修改无关字段。',
    '4. 输出 YAML 或 JSON，并保持既有 id 命名风格。',
  ].join('\n')
}

export function normalizeVariable(value: number, min = 0, max = 100) {
  if (max <= min) return 0
  return ((value - min) / (max - min)) * 100
}

export function pipelineCopy(status: string) {
  if (status === 'draft') return '内容草稿'
  if (status === 'needs_fix') return '检测未通过'
  if (status === 'reviewing') return '等待人工审查'
  if (status === 'accepted') return '可进入测试包'
  if (status === 'locked') return '最终定稿'
  return status
}

export function summarizeEffect(effect: Effect) {
  switch (effect.type) {
    case 'change_variable':
      return `${effect.key} ${formatDelta(effect.delta)}`
    case 'set_variable':
      return `${effect.key} = ${effect.value}`
    case 'change_location_state':
      return `${effect.locationId}.${effect.path}`
    case 'change_building_state':
      return `${effect.buildingId}.${effect.path}`
    case 'change_npc_state':
      return `${effect.npcId}.${effect.path}`
    case 'change_player_attribute':
      return `${effect.attribute} ${formatDelta(effect.delta)}`
    case 'change_relationship':
      return `${effect.source}->${effect.target}.${effect.path} ${formatDelta(effect.delta)}`
    case 'add_fact':
      return `add ${effect.key}`
    case 'remove_fact':
      return `remove ${effect.key}`
    case 'trigger_event':
      return `trigger ${effect.eventId}`
    case 'start_conversation':
      return `conversation ${effect.conversationId}`
    case 'move_npc':
      return `${effect.npcId} -> ${effect.locationId}`
    case 'move_player':
      return `player -> ${effect.locationId}`
    case 'add_item':
      return `add ${effect.itemId} x${effect.count}`
    case 'remove_item':
      return `remove ${effect.itemId} x${effect.count}`
    case 'open_shop':
      return `open ${effect.shopId}`
    case 'discover_location':
      return `discover ${effect.locationId}`
    case 'set_tile_visible':
      return `${effect.tileId} visible ${effect.visible}`
    case 'trigger_ending':
      return `ending ${effect.endingId}`
    case 'start_quest':
      return `start quest ${effect.questId}`
    case 'fail_quest':
      return `fail quest ${effect.questId}`
    case 'fail_quest_objective':
      return `fail objective ${effect.questId}.${effect.objectiveId}`
    case 'conditional':
      return `conditional x${effect.effects.length}`
  }
}

export function formatDelta(delta: number) {
  return delta >= 0 ? `+${delta}` : String(delta)
}

export function conditionFacts(condition?: ConditionGroup): string[] {
  if (!condition) return []
  if ('fact' in condition) return [condition.fact]
  if ('all' in condition) return condition.all.flatMap(conditionFacts)
  if ('any' in condition) return condition.any.flatMap(conditionFacts)
  if ('not' in condition) return conditionFacts(condition.not)
  return []
}

export function inferEndingImpact(pack: ContentPack, event: GameEvent) {
  const changedVariables = event.effects.flatMap((effect) => {
    if (effect.type === 'change_variable' || effect.type === 'set_variable') return [effect.key]
    return []
  })
  return pack.endings
    .filter((ending) =>
      ending.causalChainRules.some((rule) => 'variable' in rule && changedVariables.includes(rule.variable)),
    )
    .map((ending) => ending.name)
}
