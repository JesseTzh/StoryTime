import type { Condition, ConditionGroup, ContentPack, Effect, ValidationIssue } from '@tss/schema'
import { canResolveFactPath } from '@tss/engine'
import { issue } from './helpers'

function collectFactPaths(condition: ConditionGroup | undefined): string[] {
  if (!condition) return []
  if ('all' in condition) return condition.all.flatMap(collectFactPaths)
  if ('any' in condition) return condition.any.flatMap(collectFactPaths)
  if ('not' in condition) return collectFactPaths(condition.not)
  if ('fact' in condition) return [condition.fact]
  return []
}

function validateConditionPaths(pack: ContentPack, condition: ConditionGroup | undefined, targetId: string): ValidationIssue[] {
  return collectFactPaths(condition)
    .filter((path) => !canResolveFactPath(pack, path))
    .map((path) => issue('error', 'fact_path_error', `条件路径不可解析：${path}`, targetId, 'conditions'))
}

function validateEffectConditionPaths(pack: ContentPack, effects: Effect[] | undefined, targetId: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const effect of Array.isArray(effects) ? effects : []) {
    if (effect.type !== 'conditional') continue
    issues.push(...validateConditionPaths(pack, effect.conditions, targetId))
    issues.push(...validateEffectConditionPaths(pack, effect.effects, targetId))
    issues.push(...validateEffectConditionPaths(pack, effect.elseEffects, targetId))
  }
  return issues
}

export function validateFactPaths(pack: ContentPack): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const interaction of Array.isArray(pack.interactions) ? pack.interactions : []) {
    issues.push(...validateConditionPaths(pack, interaction.conditions, interaction.id))
    issues.push(...validateEffectConditionPaths(pack, interaction.effects, interaction.id))
    if (interaction.type === 'give') issues.push(...validateEffectConditionPaths(pack, interaction.acceptedEffects, interaction.id))
    if (interaction.type === 'combat') issues.push(...validateEffectConditionPaths(pack, interaction.victoryEffects, interaction.id))
  }
  for (const quest of Array.isArray(pack.quests) ? pack.quests : []) {
    issues.push(...validateConditionPaths(pack, quest.conditions, quest.id))
    for (const objective of quest.objectives ?? []) issues.push(...validateConditionPaths(pack, objective.conditions, objective.id))
  }
  for (const event of pack.events) {
    issues.push(...validateConditionPaths(pack, event.trigger, event.id))
    issues.push(...validateEffectConditionPaths(pack, event.effects, event.id))
  }
  for (const conversation of pack.conversations) {
    issues.push(...validateConditionPaths(pack, conversation.conditions, conversation.id))
    for (const node of conversation.nodes) {
      issues.push(...validateEffectConditionPaths(pack, node.effects, node.id))
      for (const reply of node.replies) issues.push(...validateConditionPaths(pack, reply.conditions, reply.id))
      for (const reply of node.replies) issues.push(...validateEffectConditionPaths(pack, reply.effects, reply.id))
    }
  }
  for (const ending of pack.endings) issues.push(...validateConditionPaths(pack, ending.conditions, ending.id))
  for (const npc of pack.npcs) {
    for (const entry of npc.schedule) {
      issues.push(...validateConditionPaths(pack, entry.conditions, entry.id))
      issues.push(...validateEffectConditionPaths(pack, entry.effects, entry.id))
    }
    for (const rule of npc.behaviorRules) {
      issues.push(...validateConditionPaths(pack, rule.conditions, rule.id))
      issues.push(...validateEffectConditionPaths(pack, rule.effects, rule.id))
    }
  }
  for (const rule of pack.runtime?.dailyDriftRules ?? []) {
    issues.push(...validateConditionPaths(pack, rule.conditions, rule.id))
    issues.push(...validateEffectConditionPaths(pack, rule.effects, rule.id))
  }
  for (const reward of Array.isArray(pack.rewards) ? pack.rewards : []) issues.push(...validateEffectConditionPaths(pack, reward.effects, reward.id))
  return issues
}

export { collectFactPaths }
