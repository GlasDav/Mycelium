# Notes Sidebar Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible all-notes sidebar and persist stock/theme/KPI selections as true note metadata.

**Architecture:** Extend the existing note model with `tickers`, `manualThemes`, and `kpis`, map those fields through the memory and Supabase repositories, and merge manual themes into extracted claim themes. Add pure frontend helper functions for tag normalization, note filter options, and note filtering/sorting, then wire a `NotesSidebar` and `MetadataChipInput` into the existing single-file React UI.

**Tech Stack:** Vite, React, TypeScript, Fastify BFF, Supabase/Postgres migration SQL, Node test runner.

---

### Task 1: Metadata Persistence And Extraction

**Files:**
- Modify: `src/engine.ts`
- Modify: `server/workspace-service.ts`
- Modify: `server/supabase-repository.ts`
- Modify: `supabase/migrations/202605060001_production_foundation.sql`
- Modify: `tests/workspace-service.test.ts`
- Modify: `tests/schema.test.ts`

- [ ] **Step 1: Write failing workspace-service test**

Add assertions to `note creation persists metadata, materializes graph rows, and writes audit events`:

```ts
tickers: ['NVDA'],
manualThemes: ['AI infrastructure'],
kpis: ['demand']
```

Assert the created note contains these arrays and that the extracted Blackwell claim includes `AI infrastructure`.

- [ ] **Step 2: Write failing schema test**

In `tests/schema.test.ts`, assert the migration contains `tickers text[]`, `manual_themes text[]`, and `kpis text[]` columns on `public.notes`.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- tests/workspace-service.test.ts tests/schema.test.ts`

Expected: fail because metadata fields do not exist or are not mapped.

- [ ] **Step 4: Implement metadata fields**

Add optional `tickers`, `manualThemes`, and `kpis` arrays to `Note`, `WorkspaceNote`, and `CreateNoteInput`. Default missing arrays to `[]` when seeding or creating notes. Map fields to Supabase row columns `tickers`, `manual_themes`, and `kpis`.

- [ ] **Step 5: Merge manual themes into claim themes**

In `extractClaims`, merge `note.manualThemes ?? []` into each claim's `themes` array using the existing `uniqueBy` helper.

- [ ] **Step 6: Run tests and verify pass**

Run: `npm test -- tests/workspace-service.test.ts tests/schema.test.ts`

Expected: pass.

### Task 2: Note Filtering Helpers

**Files:**
- Create: `src/note-filters.ts`
- Create: `tests/note-filters.test.ts`

- [ ] **Step 1: Write failing helper tests**

Cover:

- `normalizeTags([' NVDA ', 'nvda', 'MSFT'])` returns `['NVDA', 'MSFT']`.
- `deriveNoteFilterOptions(notes)` returns sorted stock/theme/KPI/source/visibility options from saved note metadata.
- `filterAndSortNotes(notes, filters)` supports search, stock, theme, KPI, date range, visibility, source type, and newest-first sorting.

- [ ] **Step 2: Run test and verify failure**

Run: `npm test -- tests/note-filters.test.ts`

Expected: fail because `src/note-filters.ts` does not exist.

- [ ] **Step 3: Implement helpers**

Create `NoteFilters`, `NoteSort`, `normalizeTags`, `deriveNoteFilterOptions`, `filterAndSortNotes`, and `noteRecencyDate`. Keep these functions pure and independent of React.

- [ ] **Step 4: Run test and verify pass**

Run: `npm test -- tests/note-filters.test.ts`

Expected: pass.

### Task 3: UI Integration

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/styles.css`
- Modify: `tests/layout-css.test.ts`

- [ ] **Step 1: Write failing CSS structure test**

Add assertions that `.app-main`, `.notes-sidebar`, `.notes-sidebar.collapsed`, `.metadata-chip-input`, and `.note-card.selected` CSS rules exist.

- [ ] **Step 2: Run test and verify failure**

Run: `npm test -- tests/layout-css.test.ts`

Expected: fail because the new CSS selectors do not exist.

- [ ] **Step 3: Wire metadata controls**

In `src/main.tsx`, add state for `tickers`, `manualThemes`, and `kpis`, use `MetadataChipInput` for each field, include the arrays in `previewNote()` and `createNote()`, and clear them after save.

- [ ] **Step 4: Wire notes sidebar**

In `src/main.tsx`, add sidebar filter state, derive filter options from `graph.visibleNotes`, render `NotesSidebar`, remove the right-side recent notes panel, and highlight the selected archive note.

- [ ] **Step 5: Add CSS**

Update layout to use an outer `.app-main` grid with icon rail, notes sidebar, and shell. Add responsive behavior so the sidebar becomes full-width below tablet sizes.

- [ ] **Step 6: Run UI-related tests**

Run: `npm test -- tests/layout-css.test.ts tests/note-filters.test.ts`

Expected: pass.

### Task 4: Full Verification

**Files:**
- Modify as needed: `README.md`, `AGENT_CONTEXT.md`, `LIVE_ROADMAP.md` only if user-facing setup or roadmap status changes materially.

- [ ] **Step 1: Run full validation**

Run: `npm run validate`

Expected: build passes and all tests pass.

- [ ] **Step 2: Restart local app**

Restart the local server on the existing app port and verify `/api/session/bootstrap` returns Supabase config.

- [ ] **Step 3: Manual smoke check**

Create a note with ticker/theme/KPI metadata, verify it appears in the notes sidebar, and verify sidebar filters find it.

- [ ] **Step 4: Report changes**

Summarize code changes, verification output, and any residual limitations.
