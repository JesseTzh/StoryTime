import type { ContentPack, Effect, ValidationIssue } from '@tss/schema'
import { issue } from './helpers'

function validateEffectShape(effect: Effect, targetId: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if ((effect.type === 'change_variable' || effect.type === 'change_location_state' || effect.type === 'change_building_state') && 'delta' in effect && effect.delta !== undefined && typeof effect.delta !== 'number') {
    issues.push(issue('error', 'effect_error', 'delta 必须是 number', targetId))
  }
  if ((effect.type === 'add_item' || effect.type === 'remove_item') && effect.count <= 0) issues.push(issue('error', 'effect_error', '物品 count 必须大于 0', targetId))
  if (effect.type === 'conditional') {
    for (const nested of Array.isArray(effect.effects) ? effect.effects : []) issues.push(...validateEffectShape(nested, targetId))
    for (const nested of Array.isArray(effect.elseEffects) ? effect.elseEffects : []) issues.push(...validateEffectShape(nested, targetId))
  }
  return issues
}

export function validateEffects(pack: ContentPack): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const interaction of Array.isArray(pack.interactions) ? pack.interactions : []) {
    for (const effect of Array.isArray(interaction.effects) ? interaction.effects : []) issues.push(...validateEffectShape(effect, interaction.id))
    if (interaction.type === 'give') for (const effect of Array.isArray(interaction.acceptedEffects) ? interaction.acceptedEffects : []) issues.push(...validateEffectShape(effect, interaction.id))
    if (interaction.type === 'combat') for (const effect of Array.isArray(interaction.victoryEffects) ? interaction.victoryEffects : []) issues.push(...validateEffectShape(effect, interaction.id))
  }
  for (const event of pack.events) for (const effect of event.effects) issues.push(...validateEffectShape(effect, event.id))
  for (const conversation of pack.conversations) {
    for (const node of conversation.nodes) {
      for (const effect of node.effects ?? []) issues.push(...validateEffectShape(effect, node.id))
      for (const reply of node.replies) for (const effect of reply.effects ?? []) issues.push(...validateEffectShape(effect, reply.id))
    }
  }
  for (const npc of pack.npcs) for (const rule of npc.behaviorRules) for (const effect of rule.effects) issues.push(...validateEffectShape(effect, rule.id))
  for (const rule of pack.runtime?.dailyDriftRules ?? []) for (const effect of rule.effects) issues.push(...validateEffectShape(effect, rule.id))
  for (const reward of Array.isArray(pack.rewards) ? pack.rewards : []) for (const effect of Array.isArray(reward.effects) ? reward.effects : []) issues.push(...validateEffectShape(effect, reward.id))
  return issues
}
