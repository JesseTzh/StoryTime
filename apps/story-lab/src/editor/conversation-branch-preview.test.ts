import { describe, expect, test } from 'vitest'
import type { Conversation } from '@tss/schema'
import { analyzeConversationBranches } from './conversation-branch-preview'

function baseConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conversation_test',
    npcId: 'npc_test',
    title: 'Test conversation',
    entryNodeId: 'entry',
    nodes: [
      {
        id: 'entry',
        speaker: 'npc_test',
        text: 'Entry text',
        replies: [
          { id: 'reply_continue', text: 'Continue', nextNodeId: 'middle' },
          { id: 'reply_end', text: 'End', endConversation: true },
        ],
      },
      {
        id: 'middle',
        speaker: 'player',
        text: 'Middle text',
        replies: [{ id: 'reply_finish', text: 'Finish', endConversation: true }],
      },
    ],
    ...overrides,
  }
}

describe('analyzeConversationBranches', () => {
  test('builds preview paths from the entry node', () => {
    const result = analyzeConversationBranches(baseConversation())

    expect(result.paths).toEqual([
      {
        id: 'entry:reply_continue:middle:reply_finish:end',
        steps: [
          { nodeId: 'entry', replyId: 'reply_continue', nextNodeId: 'middle', endsConversation: false },
          { nodeId: 'middle', replyId: 'reply_finish', endsConversation: true },
        ],
        status: 'complete',
      },
      {
        id: 'entry:reply_end:end',
        steps: [{ nodeId: 'entry', replyId: 'reply_end', endsConversation: true }],
        status: 'complete',
      },
    ])
    expect(result.issues).toEqual([])
  })

  test('reports broken reply links and unreachable nodes', () => {
    const result = analyzeConversationBranches(baseConversation({
      nodes: [
        {
          id: 'entry',
          speaker: 'npc_test',
          text: 'Entry text',
          replies: [{ id: 'reply_missing', text: 'Missing', nextNodeId: 'missing_node' }],
        },
        {
          id: 'orphan',
          speaker: 'npc_test',
          text: 'Unreachable text',
          replies: [{ id: 'reply_end', text: 'End', endConversation: true }],
        },
      ],
    }))

    expect(result.issues.map((issue) => issue.type)).toEqual(['broken_link', 'unreachable_node'])
    expect(result.paths[0]).toMatchObject({ status: 'broken' })
  })

  test('reports missing entry, duplicate ids, and dangling replies', () => {
    const result = analyzeConversationBranches(baseConversation({
      entryNodeId: 'missing_entry',
      nodes: [
        {
          id: 'entry',
          speaker: 'npc_test',
          text: 'Entry text',
          replies: [
            { id: 'reply_repeat', text: 'No target' },
            { id: 'reply_repeat', text: 'Repeated', endConversation: true },
          ],
        },
        {
          id: 'entry',
          speaker: 'npc_test',
          text: 'Repeated node',
          replies: [],
        },
      ],
    }))

    expect(result.issues.map((issue) => issue.type)).toEqual([
      'missing_entry',
      'duplicate_node_id',
      'duplicate_reply_id',
      'dangling_reply',
      'unreachable_node',
      'unreachable_node',
    ])
    expect(result.paths).toEqual([])
  })
})
