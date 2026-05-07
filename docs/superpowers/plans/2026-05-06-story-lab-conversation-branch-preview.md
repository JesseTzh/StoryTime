# Story Lab Conversation Branch Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only Story Lab page for previewing conversation branch structure and diagnostics.

**Architecture:** Add a pure conversation branch analyzer, then wire a new `conversations` section into the existing Story Lab React shell. The page consumes the current `ContentPack` and validation report without editing or saving source files.

**Tech Stack:** React, TypeScript, Vitest, existing Story Lab UI primitives, `@tss/schema`, `@tss/validator`.

---

### Task 1: Branch Analysis Module

**Files:**
- Create: `apps/story-lab/src/editor/conversation-branch-preview.ts`
- Test: `apps/story-lab/src/editor/conversation-branch-preview.test.ts`

- [ ] Write tests for broken reply links, unreachable nodes, duplicate IDs, and preview paths.
- [ ] Run `pnpm test -- apps/story-lab/src/editor/conversation-branch-preview.test.ts` and confirm the tests fail because the module does not exist.
- [ ] Implement `analyzeConversationBranches(conversation)`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Conversation Branch Page

**Files:**
- Create: `apps/story-lab/src/pages/editor/conversation-branch-page.tsx`
- Modify: `apps/story-lab/src/pages/editor-pages.tsx`
- Modify: `apps/story-lab/src/editor/types.ts`
- Modify: `apps/story-lab/src/App.tsx`

- [ ] Add `conversations` to `SectionId`.
- [ ] Add nav entry labeled `对话分支`.
- [ ] Track `selectedConversationId`, reset it when pack changes, and render `ConversationBranchPage`.
- [ ] Build read-only list, detail, branch preview, diagnostics, selected validation issue list, and raw JSON sections.
- [ ] Ensure every native page element has `data-test-id`.

### Task 3: Styling And Verification

**Files:**
- Modify: `apps/story-lab/src/styles/editor.css`

- [ ] Add focused layout styles for branch previews and diagnostic rows using the existing card/list language.
- [ ] Run `pnpm check`.
- [ ] Fix any type, test, content, or build failures.
