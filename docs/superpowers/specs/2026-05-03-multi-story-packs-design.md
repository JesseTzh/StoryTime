# Multi Story Packs Design

## Goal

`apps/game-client` must support multiple generated content packs. After the browser app starts, the first playable screen must ask the player which story pack to play; the client should no longer auto-load the manifest default pack for gameplay.

## Constraints

- All visible page elements and interactive controls added for this feature need `data-test-id`.
- Client source code must not hardcode concrete story content such as existing world names or pack ids.
- No backward compatibility is required for the old single-default-pack startup path.
- A new simple test story pack should be authored under `content/<pack>` and included in generated `content/packs` artifacts.
- After implementation, merge the feature branch back to `main` and remove the worktree.

## Recommended Approach

Use the generated manifest as the story selection source. On startup, load `/content-packs/manifest.json`, render a story-pack selection page, and fetch the chosen pack only after the player selects it.

This keeps story metadata in content artifacts, keeps client code generic, and avoids increasing initial payload size as more packs are added.

## Client Design

`content-loader.ts` will expose:

- `loadContentPackManifest()`: fetches the generated manifest.
- `loadContentPack(entry)`: fetches a pack JSON by manifest entry `href`.
- Manifest entry types containing `packId`, `version`, `name`, `summary`, and `href`.

`main.tsx` will render React immediately instead of waiting for a default pack.

`App.tsx` will own startup state:

- manifest loading
- manifest load error
- story selection
- selected pack loading
- selected pack load error
- initialized gameplay

When a pack loads, `initializeGameStore(pack)` sets the pack-specific save key. The app then attempts `loadSavedGame()` for that pack. If no save exists, the existing identity page is shown.

`StoryPackSelectPage` will render one card per manifest entry with generic labels and content-authored values. Selecting a story triggers pack loading. The page will not include any concrete story names in source code.

## Content Design

Add one minimal source pack under `content/<new-test-pack>`:

- `world.yaml` with metadata and a short world definition.
- minimal `variables.yaml`, `maps.yaml`, `locations.yaml`, `buildings.yaml`, `factions.yaml`, `identities.yaml`, `actions.yaml`, `events.yaml`, `items.yaml`, `endings.yaml`, and `runtime.yaml`.
- one NPC directory listed by `npcs/index.yaml`, including the required identity, background, attributes, relationships, behavior, and conversations files.

The pack should be small but playable: one identity, one location, one NPC conversation, one action, and one ending condition.

## Testing

Use TDD for code behavior changes:

- Extend `content-loader.test.ts` to verify manifest loading and chosen pack loading.
- Add a lightweight app/page source constraint test that checks story selection page data-test ids and confirms startup no longer calls `loadDefaultContentPack`.
- Keep the existing source constraint test that forbids concrete story names in game-client source.
- Add or extend content artifact tests to assert generated manifests can include multiple packs.

Verification commands:

- `pnpm test`
- `pnpm validate:content`
- `pnpm build:content-pack`
- `pnpm --filter @tss/game-client typecheck`
- `pnpm --filter @tss/game-client build`

## Self Review

- No placeholders remain.
- The design keeps content data in generated artifacts and client source generic.
- Startup, save loading, error handling, testability, and new content pack generation are covered.
