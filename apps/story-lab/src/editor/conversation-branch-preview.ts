import type { Conversation } from '@tss/schema'

export type ConversationBranchIssueType =
  | 'missing_entry'
  | 'duplicate_node_id'
  | 'duplicate_reply_id'
  | 'broken_link'
  | 'dangling_reply'
  | 'cycle'
  | 'unreachable_node'

export type ConversationBranchIssue = {
  type: ConversationBranchIssueType
  message: string
  nodeId?: string
  replyId?: string
  targetNodeId?: string
}

export type ConversationBranchStep = {
  nodeId: string
  replyId: string
  nextNodeId?: string
  endsConversation: boolean
}

export type ConversationBranchPath = {
  id: string
  steps: ConversationBranchStep[]
  status: 'complete' | 'broken' | 'cycle'
}

export type ConversationBranchAnalysis = {
  entryNodeExists: boolean
  issues: ConversationBranchIssue[]
  paths: ConversationBranchPath[]
  reachableNodeIds: string[]
  unreachableNodeIds: string[]
}

export function analyzeConversationBranches(conversation: Conversation): ConversationBranchAnalysis {
  const issues: ConversationBranchIssue[] = []
  const paths: ConversationBranchPath[] = []
  const nodesById = new Map(conversation.nodes.map((node) => [node.id, node]))
  const reachableNodeIds = new Set<string>()
  const seenNodeIds = new Set<string>()
  const seenReplyKeys = new Set<string>()

  for (const node of conversation.nodes) {
    if (seenNodeIds.has(node.id)) {
      issues.push({
        type: 'duplicate_node_id',
        message: `节点 ID 重复：${node.id}`,
        nodeId: node.id,
      })
    }
    seenNodeIds.add(node.id)
  }

  for (const node of conversation.nodes) {
    for (const reply of node.replies) {
      const replyKey = `${node.id}:${reply.id}`
      if (seenReplyKeys.has(replyKey)) {
        issues.push({
          type: 'duplicate_reply_id',
          message: `回复 ID 重复：${reply.id}`,
          nodeId: node.id,
          replyId: reply.id,
        })
      }
      seenReplyKeys.add(replyKey)
    }
  }

  for (const node of conversation.nodes) {
    for (const reply of node.replies) {
      if (!reply.endConversation && !reply.nextNodeId) {
        issues.push({
          type: 'dangling_reply',
          message: `回复没有结束会话，也没有 nextNodeId：${reply.id}`,
          nodeId: node.id,
          replyId: reply.id,
        })
      }
    }
  }

  const entryNode = nodesById.get(conversation.entryNodeId)
  if (!entryNode) {
    issues.unshift({
      type: 'missing_entry',
      message: `入口节点不存在：${conversation.entryNodeId}`,
      targetNodeId: conversation.entryNodeId,
    })
  } else {
    walkNode(entryNode.id, [], new Set<string>())
  }

  for (const node of conversation.nodes) {
    if (!reachableNodeIds.has(node.id)) {
      issues.push({
        type: 'unreachable_node',
        message: `入口链路无法到达节点：${node.id}`,
        nodeId: node.id,
      })
    }
  }

  return {
    entryNodeExists: Boolean(entryNode),
    issues,
    paths,
    reachableNodeIds: [...reachableNodeIds],
    unreachableNodeIds: conversation.nodes.filter((node) => !reachableNodeIds.has(node.id)).map((node) => node.id),
  }

  function walkNode(nodeId: string, steps: ConversationBranchStep[], activeNodeIds: Set<string>) {
    const node = nodesById.get(nodeId)
    if (!node) return
    reachableNodeIds.add(nodeId)

    if (activeNodeIds.has(nodeId)) {
      const path = makePath(steps, 'cycle')
      paths.push(path)
      issues.push({
        type: 'cycle',
        message: `分支形成循环：${nodeId}`,
        nodeId,
      })
      return
    }

    const nextActiveNodeIds = new Set(activeNodeIds)
    nextActiveNodeIds.add(nodeId)

    for (const reply of node.replies) {
      const step: ConversationBranchStep = {
        nodeId,
        replyId: reply.id,
        endsConversation: reply.endConversation === true,
      }
      if (reply.nextNodeId) step.nextNodeId = reply.nextNodeId
      const nextSteps = [...steps, step]

      if (reply.endConversation) {
        paths.push(makePath(nextSteps, 'complete'))
        continue
      }

      if (!reply.nextNodeId) {
        paths.push(makePath(nextSteps, 'broken'))
        continue
      }

      if (!nodesById.has(reply.nextNodeId)) {
        issues.push({
          type: 'broken_link',
          message: `回复指向不存在的节点：${reply.nextNodeId}`,
          nodeId,
          replyId: reply.id,
          targetNodeId: reply.nextNodeId,
        })
        paths.push(makePath(nextSteps, 'broken'))
        continue
      }

      walkNode(reply.nextNodeId, nextSteps, nextActiveNodeIds)
    }
  }
}

function makePath(steps: ConversationBranchStep[], status: ConversationBranchPath['status']): ConversationBranchPath {
  const segments = steps.flatMap((step, index) => {
    if (step.endsConversation) return index === 0 ? [step.nodeId, step.replyId, 'end'] : [step.replyId, 'end']
    if (index === 0) return [step.nodeId, step.replyId, step.nextNodeId ?? 'missing']
    return [step.replyId, step.nextNodeId ?? 'missing']
  })
  return {
    id: [...segments, status === 'cycle' ? 'cycle' : undefined].filter(Boolean).join(':'),
    steps,
    status,
  }
}
