import type { ContentPack, Effect, GameLog, GameRuntimeState } from '@tss/schema'
import { evaluateCondition } from './condition-engine'
import { buildEndingResult } from './ending-engine'
import { failQuestInPlace, startQuestInPlace } from './quest-engine'
import { changeNumberByPath, clampVariable, ensureRelationship, makeLog, setByPath } from './state-utils'

export function applyEffect(pack: ContentPack, state: GameRuntimeState, effect: Effect): GameLog[] {
  const logs: GameLog[] = []
  switch (effect.type) {
    case 'change_variable': {
      const current = state.worldState.variables[effect.key] ?? 0
      const next = clampVariable(pack, effect.key, current + effect.delta)
      state.worldState.variables[effect.key] = next
      logs.push(makeLog(state, 'system', `世界变量「${effect.key}」${effect.delta >= 0 ? '+' : ''}${effect.delta} → ${next}`))
      break
    }
    case 'set_variable': {
      const next = clampVariable(pack, effect.key, effect.value)
      state.worldState.variables[effect.key] = next
      logs.push(makeLog(state, 'system', `世界变量「${effect.key}」设为 ${next}`))
      break
    }
    case 'change_location_state': {
      const target = state.worldState.locations[effect.locationId]
      if (!target) break
      if (typeof effect.delta === 'number') {
        const next = changeNumberByPath(target.state, effect.path, effect.delta)
        logs.push(makeLog(state, 'system', `地点状态「${effect.locationId}.${effect.path}」变化为 ${next}`))
      } else {
        setByPath(target.state, effect.path, effect.value)
        logs.push(makeLog(state, 'system', `地点状态「${effect.locationId}.${effect.path}」已更新`))
      }
      if (effect.path === 'is_accessible') target.accessible = effect.value !== false
      if (effect.path === 'discovered') target.discovered = effect.value === true
      break
    }
    case 'change_building_state': {
      const target = state.worldState.buildings[effect.buildingId]
      if (!target) break
      if (typeof effect.delta === 'number') {
        changeNumberByPath(target.state, effect.path, effect.delta)
      } else {
        setByPath(target.state, effect.path, effect.value)
      }
      logs.push(makeLog(state, 'system', `建筑状态「${effect.buildingId}.${effect.path}」已更新`))
      break
    }
    case 'change_npc_state': {
      const target = state.worldState.npcs[effect.npcId]
      if (!target) break
      setByPath(target.state, effect.path, effect.value)
      logs.push(makeLog(state, 'npc', `NPC「${effect.npcId}」状态更新：${effect.path}`))
      break
    }
    case 'change_player_attribute': {
      const current = state.player.state[effect.attribute] ?? 0
      const next = Math.max(0, current + effect.delta)
      state.player.state[effect.attribute] = next
      logs.push(makeLog(state, 'player', `你的「${effect.attribute}」${effect.delta >= 0 ? '+' : ''}${effect.delta} → ${next}`))
      break
    }
    case 'change_relationship': {
      const relationship = ensureRelationship(state, effect.source, effect.target)
      const current = relationship[effect.path]
      if (typeof current === 'number') {
        (relationship as unknown as Record<string, number>)[effect.path] = Math.max(-100, Math.min(100, current + effect.delta))
        if (effect.path !== 'value') relationship.value = Math.max(-100, Math.min(100, relationship.value + Math.round(effect.delta / 2)))
      }
      logs.push(makeLog(state, 'system', `关系「${effect.source} → ${effect.target}」${effect.path} ${effect.delta >= 0 ? '+' : ''}${effect.delta}`))
      break
    }
    case 'add_fact': {
      state.worldState.facts[effect.key] = effect.value
      logs.push(makeLog(state, 'system', `事实已记录：${effect.key}`))
      break
    }
    case 'remove_fact': {
      delete state.worldState.facts[effect.key]
      logs.push(makeLog(state, 'system', `事实已移除：${effect.key}`))
      break
    }
    case 'trigger_event': {
      if (!state.worldState.eventHistory.includes(effect.eventId) && !state.worldState.pendingEventIds.includes(effect.eventId)) {
        state.worldState.pendingEventIds.push(effect.eventId)
      }
      logs.push(makeLog(state, 'event', `事件进入待触发队列：${effect.eventId}`))
      break
    }
    case 'trigger_ending': {
      const ending = pack.endings.find((item) => item.id === effect.endingId)
      if (!ending) {
        logs.push(makeLog(state, 'system', `结局不存在：${effect.endingId}`))
        break
      }
      if (!evaluateCondition(ending.conditions, state)) {
        logs.push(makeLog(state, 'ending', `结局条件未满足：${ending.name}`, ending.id))
        break
      }
      state.endingResult = buildEndingResult(ending, state)
      logs.push(makeLog(state, 'ending', `结局：${ending.name}`, ending.summary))
      break
    }
    case 'start_conversation': {
      const conversation = pack.conversations.find((item) => item.id === effect.conversationId)
      if (!conversation) break
      const entryNode = conversation.nodes.find((node) => node.id === conversation.entryNodeId)
      if (!entryNode) break
      if (evaluateCondition(conversation.conditions, state)) {
        state.worldState.activeConversation = {
          conversationId: conversation.id,
          npcId: conversation.npcId,
          nodeId: entryNode.id,
        }
        state.worldState.conversationHistory ??= []
        state.worldState.conversationHistory.push({
          conversationId: conversation.id,
          npcId: conversation.npcId,
          nodeId: entryNode.id,
          day: state.time.day,
          segment: state.time.segment,
        })
        logs.push(makeLog(state, 'conversation', `开始会话：${conversation.title}`, conversation.id))
        for (const nodeEffect of entryNode.effects ?? []) logs.push(...applyEffect(pack, state, nodeEffect))
      } else {
        logs.push(makeLog(state, 'conversation', '当前条件无法开始该会话。', conversation.id))
      }
      break
    }
    case 'move_npc': {
      const npc = state.worldState.npcs[effect.npcId]
      if (npc) {
        npc.locationId = effect.locationId
        logs.push(makeLog(state, 'npc', `NPC「${effect.npcId}」前往「${effect.locationId}」`))
      }
      break
    }
    case 'move_player': {
      state.player.locationId = effect.locationId
      const tile = pack.maps[0].tiles.find((item) => item.locationId === effect.locationId)
      state.selectedTileId = tile?.id ?? state.selectedTileId
      logs.push(makeLog(state, 'player', `你前往「${effect.locationId}」`))
      break
    }
    case 'add_item': {
      state.player.inventory[effect.itemId] = (state.player.inventory[effect.itemId] ?? 0) + effect.count
      logs.push(makeLog(state, 'player', `获得物品：${effect.itemId} × ${effect.count}`))
      break
    }
    case 'remove_item': {
      state.player.inventory[effect.itemId] = Math.max(0, (state.player.inventory[effect.itemId] ?? 0) - effect.count)
      logs.push(makeLog(state, 'player', `消耗物品：${effect.itemId} × ${effect.count}`))
      break
    }
    case 'open_shop': {
      logs.push(makeLog(state, 'system', `打开商店：${effect.shopId}`))
      break
    }
    case 'discover_location': {
      const location = state.worldState.locations[effect.locationId]
      if (location) {
        location.discovered = true
        location.accessible = true
        location.state.discovered = true
        location.state.is_accessible = true
        logs.push(makeLog(state, 'system', `发现地点：${effect.locationId}`))
      }
      break
    }
    case 'set_tile_visible': {
      state.worldState.tileOverrides[effect.tileId] = {
        ...state.worldState.tileOverrides[effect.tileId],
        visible: effect.visible,
        discovered: effect.discovered,
      }
      logs.push(makeLog(state, 'system', `地图地块已更新：${effect.tileId}`))
      break
    }
    case 'start_quest': {
      logs.push(...startQuestInPlace(pack, state, effect.questId).logs)
      break
    }
    case 'fail_quest': {
      logs.push(...failQuestInPlace(pack, state, effect.questId).logs)
      break
    }
  }
  return logs
}

export function applyEffects(pack: ContentPack, state: GameRuntimeState, effects: Effect[]): GameLog[] {
  return effects.flatMap((effect) => applyEffect(pack, state, effect))
}
