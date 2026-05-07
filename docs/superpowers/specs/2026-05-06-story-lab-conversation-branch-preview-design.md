# Story Lab Conversation Branch Preview Design

## Goal

Add a read-only Story Lab page for inspecting conversation branches in the current content pack.

## Scope

- Add a `conversations` Story Lab section labeled `对话分支`.
- Show a selectable conversation list with NPC, node count, reply count, and local structure status.
- Show the selected conversation metadata, nodes, replies, conditions, effects, and raw structure.
- Show a branch preview derived from `entryNodeId`.
- Flag local structure problems: missing entry node, broken `nextNodeId`, unreachable nodes, duplicate node IDs, duplicate reply IDs, and replies that neither end nor continue.
- Surface existing `validateContentPack` issues related to the selected conversation.
- Do not edit content, save files, write source YAML, or hardcode concrete story content.
- All new page elements need `data-test-id`.

## Architecture

Create a small pure analysis module under `apps/story-lab/src/editor/` that accepts a schema `Conversation` and returns preview paths plus issues. The React page consumes that module and existing `validateContentPack` output. App state only tracks the selected conversation ID.

## UI

The page uses the existing Story Lab shell and card/list visual language:

- Left card: conversation list.
- Middle card: selected conversation detail and node/reply hierarchy.
- Right card: branch preview, local diagnostics, selected-conversation validation issues, and raw JSON.

## Testing

Add Vitest coverage for the pure branch analysis module. Existing Story Lab source constraint tests cover `data-test-id` rules during `pnpm check`.
