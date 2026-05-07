import type { Condition, ConditionGroup, ContentPack, GameRuntimeState } from '@tss/schema'
import { getByPath, relationKey } from './state-utils'

const playerAttributeFields = ['health', 'stamina', 'money', 'reputation', 'combat', 'negotiation', 'medicine', 'stealth']
const relationshipFields = ['sourceId', 'targetId', 'value', 'trust', 'fear', 'gratitude', 'suspicion', 'tags']

export type ConditionFailure = {
  fact?: string
  expected: string
  actual: unknown
}

export function getFactValue(state: GameRuntimeState, factPath: string): unknown {
  const parts = factPath.split('.')
  if (parts[0] === 'time') return getByPath(state.time, parts.slice(1).join('.'))
  if (parts[0] === 'player') return getByPath(state.player, parts.slice(1).join('.'))
  if (parts[0] === 'variables') return state.worldState.variables[parts[1]]
  if (parts[0] === 'quests') return getByPath(state.worldState.quests[parts[1]], parts.slice(2).join('.'))
  if (parts[0] === 'facts') return state.worldState.facts[parts.slice(1).join('.')]

  if (parts[0] === 'location') {
    const location = state.worldState.locations[parts[1]]
    if (!location) return undefined
    return getByPath(location, parts.slice(2).join('.'))
  }

  if (parts[0] === 'building') {
    const building = state.worldState.buildings[parts[1]]
    if (!building) return undefined
    return getByPath(building, parts.slice(2).join('.'))
  }

  if (parts[0] === 'npc') {
    const npc = state.worldState.npcs[parts[1]]
    if (!npc) return undefined
    return getByPath(npc, parts.slice(2).join('.'))
  }

  if (parts[0] === 'relationship') {
    const source = parts[1]
    const target = parts[2]
    const field = parts[3]
    if (!source || !target || !field) return undefined
    const rel = state.worldState.relationships[relationKey(source, target)]
    return rel ? getByPath(rel, field) : undefined
  }

  return undefined
}

function compareCondition(condition: Extract<Condition, { fact: string }>, state: GameRuntimeState): boolean {
  const actual = getFactValue(state, condition.fact)
  if ('equals' in condition) return actual === condition.equals
  if ('not_equals' in condition) return actual !== condition.not_equals
  if ('greater_than' in condition) return typeof actual === 'number' && actual > condition.greater_than
  if ('greater_than_or_equal' in condition) return typeof actual === 'number' && actual >= condition.greater_than_or_equal
  if ('less_than' in condition) return typeof actual === 'number' && actual < condition.less_than
  if ('less_than_or_equal' in condition) return typeof actual === 'number' && actual <= condition.less_than_or_equal
  if ('in' in condition) return condition.in.includes(actual)
  if ('not_in' in condition) return !condition.not_in.includes(actual)
  if ('exists' in condition) return condition.exists ? actual !== undefined : actual === undefined
  return false
}

export function evaluateCondition(condition: ConditionGroup | undefined, state: GameRuntimeState): boolean {
  if (!condition) return true
  if ('all' in condition) return condition.all.every((item) => evaluateCondition(item, state))
  if ('any' in condition) return condition.any.some((item) => evaluateCondition(item, state))
  if ('not' in condition) return !evaluateCondition(condition.not, state)
  if ('fact' in condition) return compareCondition(condition, state)
  return true
}

function expectedText(condition: Extract<Condition, { fact: string }>): string {
  if ('equals' in condition) return `等于 ${String(condition.equals)}`
  if ('not_equals' in condition) return `不等于 ${String(condition.not_equals)}`
  if ('greater_than' in condition) return `大于 ${condition.greater_than}`
  if ('greater_than_or_equal' in condition) return `大于等于 ${condition.greater_than_or_equal}`
  if ('less_than' in condition) return `小于 ${condition.less_than}`
  if ('less_than_or_equal' in condition) return `小于等于 ${condition.less_than_or_equal}`
  if ('in' in condition) return `属于 ${condition.in.join(', ')}`
  if ('not_in' in condition) return `不属于 ${condition.not_in.join(', ')}`
  if ('exists' in condition) return condition.exists ? '存在' : '不存在'
  return '满足条件'
}

export function explainConditionFailures(condition: ConditionGroup | undefined, state: GameRuntimeState): ConditionFailure[] {
  if (!condition || evaluateCondition(condition, state)) return []
  if ('all' in condition) return condition.all.flatMap((item) => explainConditionFailures(item, state))
  if ('any' in condition) {
    return [{ expected: '至少满足任意一个子条件', actual: condition.any.map((item) => evaluateCondition(item, state)) }]
  }
  if ('not' in condition) return [{ expected: '不满足内部条件', actual: evaluateCondition(condition.not, state) }]
  if ('fact' in condition) return [{ fact: condition.fact, expected: expectedText(condition), actual: getFactValue(state, condition.fact) }]
  return []
}

export function canResolveFactPath(pack: ContentPack, factPath: string): boolean {
  const parts = factPath.split('.')
  if (parts[0] === 'time') return parts.length === 2 && ['day', 'segment', 'actionPoints'].includes(parts[1])
  if (parts[0] === 'player') {
    if (parts.length === 2) return parts[1] === 'identity' || parts[1] === 'locationId'
    if (parts.length === 3 && parts[1] === 'state') return playerAttributeFields.includes(parts[2])
    if (parts.length === 3 && parts[1] === 'inventory') return Boolean(parts[2])
    return false
  }
  if (parts[0] === 'variables') return parts.length === 2 && pack.variables.some((item) => item.key === parts[1])
  if (parts[0] === 'quests') {
    if (!pack.quests.some((item) => item.id === parts[1])) return false
    return parts.length === 3 && ['id', 'status', 'startedAt', 'completedAt'].includes(parts[2])
      || parts.length === 4 && ['startedAt', 'completedAt'].includes(parts[2]) && ['day', 'segment'].includes(parts[3])
  }
  if (parts[0] === 'facts') return Boolean(parts[1])
  if (parts[0] === 'location') {
    if (!pack.locations.some((item) => item.id === parts[1])) return false
    return parts.length === 3 && ['id', 'discovered', 'accessible'].includes(parts[2]) || parts.length >= 4 && parts[2] === 'state'
  }
  if (parts[0] === 'building') {
    if (!pack.buildings.some((item) => item.id === parts[1])) return false
    return parts.length === 3 && parts[2] === 'id' || parts.length >= 4 && parts[2] === 'state'
  }
  if (parts[0] === 'npc') {
    if (!pack.npcs.some((item) => item.id === parts[1])) return false
    return parts.length === 3 && ['id', 'locationId'].includes(parts[2]) || parts.length >= 4 && parts[2] === 'state'
  }
  if (parts[0] === 'relationship') {
    const validActor = (id: string | undefined) => id === 'player' || pack.npcs.some((item) => item.id === id)
    return parts.length === 4 && validActor(parts[1]) && validActor(parts[2]) && relationshipFields.includes(parts[3])
  }
  return false
}
