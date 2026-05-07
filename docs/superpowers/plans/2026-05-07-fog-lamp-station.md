# Fog Lamp Station Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the engine support and content needed for the fog lamp station rule-horror story flow.

**Architecture:** Extend the existing structured content model instead of adding story-specific code. Quest objectives become optional data on quests, quest runtime status becomes addressable by conditions, and post-turn processing checks endings after interactions, events, and conversation choices.

**Tech Stack:** TypeScript, Vitest, YAML content packs, existing `@tss/schema`, `@tss/engine`, `@tss/validator`, and game client panels.

---

### Task 1: Quest System Support

**Files:**
- Modify: `packages/schema/src/types.ts`
- Modify: `packages/engine/src/condition-engine.ts`
- Modify: `packages/engine/src/quest-engine.test.ts`
- Modify: `packages/engine/src/test-content-pack.ts`
- Modify: `packages/validator/src/schema-validator.ts`
- Modify: `packages/validator/src/fact-path-validator.ts`
- Modify: `apps/game-client/src/features/quests/QuestPanel.tsx`

- [x] Add failing tests for `quests.<id>.status` condition paths and optional quest objectives.
- [x] Implement minimal schema and validator support.
- [x] Show objectives in the quest panel when present.

### Task 2: Post-Turn Ending Checks

**Files:**
- Modify: `packages/engine/src/turn-engine.ts`
- Modify: `apps/game-client/src/store/game-store.ts`
- Modify: `packages/engine/src/quest-engine.test.ts`

- [x] Add failing tests proving an ending can appear immediately after quest completion effects.
- [x] Add explicit `trigger_ending` support so content can end immediately without changing legacy ending timing.

### Task 3: Fog Lamp Station Content

**Files:**
- Modify: `content/demo-crossroads/*.yaml`
- Modify: `content/demo-crossroads/npcs/guide/*.yaml`

- [x] Rewrite the background as Cthulhu-flavored rule horror.
- [x] Add morning, noon, and night ritual interactions that grant quest items.
- [x] Add next-day keeper handoff dialogue/give interaction and a final lamp-lighting interaction.
- [x] Add success and failure endings, with failure turning the player into the next keeper.

### Task 4: Verification And Integration

- [x] Run focused tests for engine and quest UI.
- [x] Run `pnpm check`.
- [x] Build content packs.
- [ ] Commit, merge back to `main`, and remove `.worktrees/fog-lamp-station`.
