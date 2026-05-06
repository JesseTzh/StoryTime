import type { ContentPack, ValidationIssue } from '@tss/schema'
import {
  EFFECT_TYPES,
  ENVIRONMENT_INTERACTION_TYPES,
  EVENT_TYPES,
  INTERACTION_TYPES,
  QUEST_COMPLETION_TYPES,
  TERRAIN_TYPES,
  TIME_SEGMENTS,
} from '@tss/schema'
import { issue } from './helpers'

function validateUniqueIds(label: string, ids: Array<string | undefined>, issues: ValidationIssue[]) {
  const seen = new Set<string>()
  for (const id of ids) {
    if (!id) continue
    if (seen.has(id)) issues.push(issue('error', 'schema_error', `${label} 存在重复 id：${id}`, id))
    seen.add(id)
  }
}

function hasOwn(value: unknown, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

export function validateSchema(pack: ContentPack): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const rawPack = pack as unknown as Record<string, unknown>
  if (hasOwn(rawPack, 'actions')) issues.push(issue('error', 'schema_error', '顶层 actions 已废弃，请使用 interactions', pack.packId, 'actions'))
  for (const event of pack.events ?? []) {
    if (hasOwn(event, 'playerOptions')) {
      issues.push(issue('error', 'schema_error', 'events.playerOptions 已废弃，请使用 interactions、conversations 或 quests', event.id, 'events.playerOptions'))
    }
  }

  const requiredArrays: Array<keyof ContentPack> = ['variables', 'maps', 'locations', 'buildings', 'factions', 'identities', 'npcs', 'relationships', 'interactions', 'quests', 'rewards', 'events', 'conversations', 'items', 'endings']
  for (const key of requiredArrays) {
    if (!Array.isArray(pack[key] as unknown[])) issues.push(issue('error', 'schema_error', `顶层字段 ${String(key)} 必须是数组`, pack.packId, String(key)))
  }
  if (!pack.packId) issues.push(issue('error', 'schema_error', '缺少 packId'))
  if (!pack.world?.maxDays || pack.world.maxDays < 1) issues.push(issue('error', 'schema_error', 'world.maxDays 必须大于 0'))
  if (!pack.world?.editorBackground) issues.push(issue('error', 'schema_error', 'world.editorBackground 必填', pack.packId, 'world.editorBackground'))
  if (!pack.runtime?.initialState?.playerLocationId) issues.push(issue('error', 'schema_error', 'runtime.initialState.playerLocationId 必填', pack.packId, 'runtime.initialState.playerLocationId'))
  if (!Array.isArray(pack.runtime?.dailyDriftRules)) issues.push(issue('error', 'schema_error', 'runtime.dailyDriftRules 必须是数组', pack.packId, 'runtime.dailyDriftRules'))

  validateUniqueIds('variables', pack.variables.map((item) => item.key), issues)
  validateUniqueIds('maps', pack.maps.map((item) => item.id), issues)
  validateUniqueIds('tiles', pack.maps.flatMap((map) => map.tiles.map((tile) => tile.id)), issues)
  validateUniqueIds('locations', pack.locations.map((item) => item.id), issues)
  validateUniqueIds('buildings', pack.buildings.map((item) => item.id), issues)
  validateUniqueIds('factions', pack.factions.map((item) => item.id), issues)
  validateUniqueIds('identities', pack.identities.map((item) => item.id), issues)
  validateUniqueIds('npcs', pack.npcs.map((item) => item.id), issues)
  validateUniqueIds('interactions', (Array.isArray(pack.interactions) ? pack.interactions : []).map((item) => item.id), issues)
  validateUniqueIds('quests', (Array.isArray(pack.quests) ? pack.quests : []).map((item) => item.id), issues)
  validateUniqueIds('rewards', (Array.isArray(pack.rewards) ? pack.rewards : []).map((item) => item.id), issues)
  validateUniqueIds('events', pack.events.map((item) => item.id), issues)
  validateUniqueIds('conversations', pack.conversations.map((item) => item.id), issues)
  validateUniqueIds('conversationNodes', pack.conversations.flatMap((conversation) => conversation.nodes.map((node) => `${conversation.id}:${node.id}`)), issues)
  validateUniqueIds('conversationReplies', pack.conversations.flatMap((conversation) => conversation.nodes.flatMap((node) => node.replies.map((reply) => `${conversation.id}:${reply.id}`))), issues)
  validateUniqueIds('items', pack.items.map((item) => item.id), issues)
  validateUniqueIds('endings', pack.endings.map((item) => item.id), issues)
  validateUniqueIds('npcSchedules', pack.npcs.flatMap((npc) => npc.schedule.map((item) => item.id)), issues)
  validateUniqueIds('dailyDriftRules', (pack.runtime?.dailyDriftRules ?? []).map((item) => item.id), issues)

  for (const map of pack.maps) {
    if (!map.id || map.width < 1 || map.height < 1) issues.push(issue('error', 'schema_error', '地图缺少 id 或尺寸非法', map.id))
    for (const tile of map.tiles) {
      if (!TERRAIN_TYPES.includes(tile.terrain)) issues.push(issue('error', 'schema_error', `非法地形：${tile.terrain}`, tile.id, 'terrain'))
    }
  }

  for (const location of pack.locations) {
    const rawLocation = location as unknown as Record<string, unknown>
    if (hasOwn(rawLocation, 'actionIds')) issues.push(issue('error', 'schema_error', 'locations.actionIds 已废弃，请使用 interactionIds', location.id, 'locations.actionIds'))
    if (!Array.isArray(rawLocation.interactionIds)) issues.push(issue('error', 'schema_error', 'location.interactionIds 必须是数组', location.id, 'locations.interactionIds'))
  }

  for (const building of pack.buildings) {
    const rawBuilding = building as unknown as Record<string, unknown>
    if (hasOwn(rawBuilding, 'actionIds')) issues.push(issue('error', 'schema_error', 'buildings.actionIds 已废弃，请使用 interactionIds', building.id, 'buildings.actionIds'))
    if (!Array.isArray(rawBuilding.interactionIds)) issues.push(issue('error', 'schema_error', 'building.interactionIds 必须是数组', building.id, 'buildings.interactionIds'))
  }

  for (const interaction of Array.isArray(pack.interactions) ? pack.interactions : []) {
    const rawInteraction = interaction as unknown as Record<string, unknown>
    if (!INTERACTION_TYPES.includes(interaction.type)) issues.push(issue('error', 'schema_error', `非法交互类型：${interaction.type}`, interaction.id, 'type'))
    if (!interaction.name || !interaction.targetId) issues.push(issue('error', 'schema_error', '交互缺少 name 或 targetId', interaction.id))
    if (hasOwn(rawInteraction, 'effects') && !Array.isArray(rawInteraction.effects)) issues.push(issue('error', 'schema_error', 'interaction.effects 必须是数组', interaction.id, 'effects'))
    if (interaction.type === 'environment' && !ENVIRONMENT_INTERACTION_TYPES.includes(interaction.environmentType)) {
      issues.push(issue('error', 'schema_error', `非法环境交互类型：${interaction.environmentType}`, interaction.id, 'environmentType'))
    }
    if (interaction.type === 'give') {
      if (hasOwn(rawInteraction, 'acceptedEffects') && !Array.isArray(rawInteraction.acceptedEffects)) issues.push(issue('error', 'schema_error', 'interaction.acceptedEffects 必须是数组', interaction.id, 'acceptedEffects'))
      if (typeof interaction.itemCount !== 'number' || interaction.itemCount <= 0) issues.push(issue('error', 'schema_error', '给予交互 itemCount 必须是大于 0 的 number', interaction.id, 'itemCount'))
    }
    if (interaction.type === 'combat') {
      if (hasOwn(rawInteraction, 'victoryEffects') && !Array.isArray(rawInteraction.victoryEffects)) issues.push(issue('error', 'schema_error', 'interaction.victoryEffects 必须是数组', interaction.id, 'victoryEffects'))
      if (typeof interaction.enemyCombat !== 'number' || interaction.enemyCombat < 0) issues.push(issue('error', 'schema_error', '战斗交互 enemyCombat 必须是不能小于 0 的 number', interaction.id, 'enemyCombat'))
    }
  }

  for (const quest of Array.isArray(pack.quests) ? pack.quests : []) {
    if (!quest.title) issues.push(issue('error', 'schema_error', 'quest.title 必填', quest.id, 'title'))
    if (!quest.description) issues.push(issue('error', 'schema_error', 'quest.description 必填', quest.id, 'description'))
    if (!quest.sourceNpcId) issues.push(issue('error', 'schema_error', 'quest.sourceNpcId 必填', quest.id, 'sourceNpcId'))
    if (!quest.completion || !QUEST_COMPLETION_TYPES.includes(quest.completion.type)) issues.push(issue('error', 'schema_error', 'quest.completion 必须定义合法完成方式', quest.id, 'completion'))
    if (!Array.isArray(quest.rewardIds) || quest.rewardIds.length === 0) issues.push(issue('error', 'schema_error', 'quest.rewardIds 必须至少包含一个奖励', quest.id, 'rewardIds'))
  }

  for (const reward of Array.isArray(pack.rewards) ? pack.rewards : []) {
    if (!reward.name) issues.push(issue('error', 'schema_error', 'reward.name 必填', reward.id, 'name'))
    if (!reward.description) issues.push(issue('error', 'schema_error', 'reward.description 必填', reward.id, 'description'))
    if (!Array.isArray(reward.effects) || reward.effects.length === 0) issues.push(issue('error', 'schema_error', 'reward.effects 必须至少包含一个效果', reward.id, 'effects'))
  }

  for (const event of pack.events) {
    if (!EVENT_TYPES.includes(event.type)) issues.push(issue('error', 'schema_error', `非法事件类型：${event.type}`, event.id, 'type'))
    if (!event.description) issues.push(issue('warning', 'schema_error', '事件缺少描述', event.id, 'description'))
  }

  for (const identity of pack.identities) {
    if (!identity.backgroundSummary) issues.push(issue('error', 'schema_error', 'identity.backgroundSummary 必填', identity.id, 'backgroundSummary'))
    if (!identity.intro?.title) issues.push(issue('error', 'schema_error', 'identity.intro.title 必填', identity.id, 'intro.title'))
    if (!identity.intro?.story) issues.push(issue('error', 'schema_error', 'identity.intro.story 必填', identity.id, 'intro.story'))
    if (!identity.intro?.origin) issues.push(issue('error', 'schema_error', 'identity.intro.origin 必填', identity.id, 'intro.origin'))
    if (!identity.intro?.motivation) issues.push(issue('error', 'schema_error', 'identity.intro.motivation 必填', identity.id, 'intro.motivation'))
  }

  for (const conversation of pack.conversations) {
    const rawConversation = conversation as unknown as Record<string, unknown>
    if (!conversation.title) issues.push(issue('error', 'schema_error', 'conversation.title 必填', conversation.id, 'title'))
    const nodeIds = new Set(conversation.nodes.map((node) => node.id))
    if (!nodeIds.has(conversation.entryNodeId)) issues.push(issue('error', 'schema_error', `entryNodeId 不存在：${conversation.entryNodeId}`, conversation.id, 'entryNodeId'))
    if (hasOwn(rawConversation, 'impact')) issues.push(issue('error', 'schema_error', 'conversation.impact 已移除，请使用 effects 表达实际状态变化', conversation.id, 'impact'))
    for (const node of conversation.nodes) {
      if (!node.text) issues.push(issue('error', 'schema_error', '会话节点缺少 text', node.id, 'text'))
      if (!node.speaker) issues.push(issue('error', 'schema_error', '会话节点缺少 speaker', node.id, 'speaker'))
      if (!Array.isArray(node.replies)) issues.push(issue('error', 'schema_error', '会话节点 replies 必须是数组', node.id, 'replies'))
      for (const reply of node.replies ?? []) {
        const rawReply = reply as unknown as Record<string, unknown>
        if (!reply.text) issues.push(issue('error', 'schema_error', '会话回复缺少 text', reply.id, 'text'))
        if (!reply.nextNodeId && reply.endConversation !== true) issues.push(issue('error', 'schema_error', '会话回复必须包含 nextNodeId 或 endConversation', reply.id))
        if (reply.nextNodeId && !nodeIds.has(reply.nextNodeId)) issues.push(issue('error', 'schema_error', `nextNodeId 不存在：${reply.nextNodeId}`, reply.id, 'nextNodeId'))
        if (hasOwn(rawReply, 'impact')) issues.push(issue('error', 'schema_error', 'reply.impact 已移除，请使用 effects 表达实际状态变化', reply.id, 'impact'))
      }
    }
  }

  for (const interaction of Array.isArray(pack.interactions) ? pack.interactions : []) {
    const effects = Array.isArray(interaction.effects) ? interaction.effects : []
    const acceptedEffects = 'acceptedEffects' in interaction && Array.isArray(interaction.acceptedEffects) ? interaction.acceptedEffects : []
    const victoryEffects = 'victoryEffects' in interaction && Array.isArray(interaction.victoryEffects) ? interaction.victoryEffects : []
    for (const effect of [...effects, ...acceptedEffects, ...victoryEffects]) {
      if (!EFFECT_TYPES.includes(effect.type)) issues.push(issue('error', 'schema_error', `非法效果类型：${effect.type}`, interaction.id, 'effects'))
    }
  }
  for (const event of pack.events) {
    for (const effect of event.effects) if (!EFFECT_TYPES.includes(effect.type)) issues.push(issue('error', 'schema_error', `非法效果类型：${effect.type}`, event.id, 'effects'))
  }
  for (const reward of Array.isArray(pack.rewards) ? pack.rewards : []) {
    for (const effect of Array.isArray(reward.effects) ? reward.effects : []) {
      if (!EFFECT_TYPES.includes(effect.type)) issues.push(issue('error', 'schema_error', `非法效果类型：${effect.type}`, reward.id, 'effects'))
    }
  }
  for (const conversation of pack.conversations) {
    for (const node of conversation.nodes) {
      for (const effect of node.effects ?? []) if (!EFFECT_TYPES.includes(effect.type)) issues.push(issue('error', 'schema_error', `非法效果类型：${effect.type}`, node.id, 'effects'))
      for (const reply of node.replies) for (const effect of reply.effects ?? []) if (!EFFECT_TYPES.includes(effect.type)) issues.push(issue('error', 'schema_error', `非法效果类型：${effect.type}`, reply.id, 'effects'))
    }
  }
  for (const npc of pack.npcs) {
    if (!Array.isArray(npc.schedule)) issues.push(issue('error', 'schema_error', `NPC ${npc.id} 的 schedule 必须是数组`, npc.id, 'schedule'))
    for (const entry of npc.schedule ?? []) {
      if (!TIME_SEGMENTS.includes(entry.segment)) issues.push(issue('error', 'schema_error', `非法日程时段：${entry.segment}`, entry.id, 'segment'))
      if (!entry.activity) issues.push(issue('warning', 'schema_error', '日程缺少 activity', entry.id, 'activity'))
      for (const effect of entry.effects ?? []) if (!EFFECT_TYPES.includes(effect.type)) issues.push(issue('error', 'schema_error', `非法效果类型：${effect.type}`, entry.id, 'effects'))
    }
  }
  for (const npc of pack.npcs) for (const rule of npc.behaviorRules) for (const effect of rule.effects) if (!EFFECT_TYPES.includes(effect.type)) issues.push(issue('error', 'schema_error', `非法效果类型：${effect.type}`, rule.id, 'effects'))
  for (const rule of pack.runtime?.dailyDriftRules ?? []) for (const effect of rule.effects) if (!EFFECT_TYPES.includes(effect.type)) issues.push(issue('error', 'schema_error', `非法效果类型：${effect.type}`, rule.id, 'effects'))
  return issues
}
