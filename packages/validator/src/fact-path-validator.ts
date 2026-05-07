import type { Condition, ConditionGroup, ContentPack, ValidationIssue } from '@tss/schema'
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

export function validateFactPaths(pack: ContentPack): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const interaction of Array.isArray(pack.interactions) ? pack.interactions : []) issues.push(...validateConditionPaths(pack, interaction.conditions, interaction.id))
  for (const quest of Array.isArray(pack.quests) ? pack.quests : []) {
    issues.push(...validateConditionPaths(pack, quest.conditions, quest.id))
    for (const objective of quest.objectives ?? []) issues.push(...validateConditionPaths(pack, objective.conditions, objective.id))
  }
  for (const event of pack.events) issues.push(...validateConditionPaths(pack, event.trigger, event.id))
  for (const conversation of pack.conversations) {
    issues.push(...validateConditionPaths(pack, conversation.conditions, conversation.id))
    for (const node of conversation.nodes) {
      for (const reply of node.replies) issues.push(...validateConditionPaths(pack, reply.conditions, reply.id))
    }
  }
  for (const ending of pack.endings) issues.push(...validateConditionPaths(pack, ending.conditions, ending.id))
  for (const npc of pack.npcs) {
    for (const entry of npc.schedule) issues.push(...validateConditionPaths(pack, entry.conditions, entry.id))
    for (const rule of npc.behaviorRules) issues.push(...validateConditionPaths(pack, rule.conditions, rule.id))
  }
  for (const rule of pack.runtime?.dailyDriftRules ?? []) issues.push(...validateConditionPaths(pack, rule.conditions, rule.id))
  return issues
}

export { collectFactPaths }
