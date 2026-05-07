import type { ContentPack } from '@tss/schema'

export type SectionId =
  | 'dashboard'
  | 'world'
  | 'templates'
  | 'map'
  | 'schedule'
  | 'npc'
  | 'conversations'
  | 'events'
  | 'simulation'
  | 'validation'

export type NpcTabId =
  | 'basic'
  | 'origin'
  | 'background'
  | 'personality'
  | 'state'
  | 'goals'
  | 'secrets'
  | 'schedule'
  | 'behavior'
  | 'relationships'
  | 'conversations'
  | 'events'
  | 'endings'
  | 'jobs'
  | 'checks'

export type ReviewStatus = 'draft' | 'needs_fix' | 'reviewing' | 'accepted' | 'locked' | 'rejected'

export type StoryProject = {
  id: string
  name: string
  description: string
  owner: string
  status: ReviewStatus
  updatedAt: string
  pack: ContentPack
}

export type StoryFile = {
  id: string
  file: string
  label: string
  status: ReviewStatus
  count: number
  content: string
}

export type TemplateField = {
  name: string
  type: string
  required: boolean
  description: string
  example: string
}

export type TemplateCategory = {
  id: string
  name: string
  description: string
  fields: TemplateField[]
  allowedValues?: Array<{ label: string; values: string[] }>
}
