import type { EffectType, EnvironmentInteractionType, EventType, InteractionType, QuestCompletionType, QuestStatus, TerrainType, TimeSegment } from './types'

export const TIME_SEGMENTS: TimeSegment[] = ['morning', 'noon', 'night']
export const TERRAIN_TYPES: TerrainType[] = ['town', 'road', 'forest', 'river', 'mountain', 'ruin']
export const INTERACTION_TYPES: InteractionType[] = ['conversation', 'give', 'combat', 'environment']
export const ENVIRONMENT_INTERACTION_TYPES: EnvironmentInteractionType[] = ['gather', 'search']
export const QUEST_COMPLETION_TYPES: QuestCompletionType[] = ['conversation', 'give', 'combat', 'environment']
export const QUEST_STATUSES: QuestStatus[] = ['active', 'completed', 'failed']
export const EVENT_TYPES: EventType[] = ['time_event', 'location_event', 'npc_behavior_event', 'world_state_event', 'player_choice_event']
export const EFFECT_TYPES: EffectType[] = ['change_variable', 'set_variable', 'change_location_state', 'change_building_state', 'change_npc_state', 'change_player_attribute', 'change_relationship', 'add_fact', 'remove_fact', 'trigger_event', 'trigger_ending', 'start_conversation', 'move_npc', 'move_player', 'add_item', 'remove_item', 'open_shop', 'discover_location', 'set_tile_visible', 'start_quest', 'fail_quest']

export const TIME_SEGMENT_LABEL: Record<TimeSegment, string> = {
  morning: '晨',
  noon: '午',
  night: '夜',
}
