# Notes Sidebar And Metadata Design

## Goal

Make notes easier to navigate and filter by moving them into a dedicated collapsible sidebar, and make stock/theme/KPI selections true note metadata that persists through the server and Supabase.

## Approved Direction

Use Option A from the layout review: keep the existing compact icon rail for workspace modes, then add a dedicated notes sidebar between that rail and the main workspace.

The notes sidebar is a primary navigation surface, not a secondary "recent notes" widget. It defaults open on desktop, can collapse to a narrow handle, and remains available while users write notes, review claims, inspect the relationship map, or browse the archive.

## UX Requirements

The sidebar shows all visible notes sorted by most recent by default. Recency uses `observedAt` first, then `createdAt` as fallback. Each note row shows title, date, visibility, source type, and compact chips for saved tickers, themes, and KPIs when present.

The sidebar includes filters for:

- text search over title and body;
- stock/ticker;
- theme;
- KPI;
- date range;
- source type;
- visibility;
- sort order.

The sort order supports newest first, oldest first, title, and source type. Newest first remains the default.

Selecting a note in the sidebar switches to archive mode, records the selected note id, and visually highlights that note in the archive list. A future drawer/editor can build on the same selected-note state.

The existing right-side "Recent notes" panel is removed so the sidebar is the canonical note navigation surface. Signals and trust-boundary panels remain on the right.

## Capture Metadata Requirements

The "New note" panel gets explicit metadata controls for:

- stocks/tickers;
- themes;
- KPIs.

The controls support choosing from known values and adding free-form entries. Known stock options come from the existing company lexicon. Known theme and KPI options come from exported engine lexicons. Free-form entries are trimmed, deduplicated case-insensitively, and displayed as chips before save.

Saved note metadata is authoritative user input. It does not merely append text to the note body.

## Data Model

Add persisted fields to notes:

- `tickers: string[]`
- `manualThemes: string[]`
- `kpis: string[]`

Use `manualThemes` instead of `themes` on notes to avoid ambiguity with extracted claim themes. Claims can continue using `themes` for now.

Supabase stores these fields as arrays on `public.notes`:

- `tickers text[] not null default '{}'`
- `manual_themes text[] not null default '{}'`
- `kpis text[] not null default '{}'`

The server memory repository, Supabase repository adapter, BFF create-note input, and frontend API types all pass these fields through.

Existing seed/demo note rows keep these fields empty. New notes created through the UI must persist them.

## Extraction And Graph Behavior

Manual tickers/themes/KPIs participate immediately in the product surface:

- Sidebar filters and archive chips use saved note metadata.
- Live preview combines detected entities from note body with selected metadata.
- Claim extraction merges `manualThemes` into extracted claim themes for claims produced from that note.
- KPIs remain note-level metadata in this iteration.
- Tickers remain note-level metadata in this iteration.

This keeps scope controlled while aligning with the roadmap direction toward first-class stock/security and KPI graph links.

## Component Shape

Keep implementation close to current app structure:

- Add small pure helper functions for note metadata normalization, option derivation, filtering, and sorting.
- Add focused tests around these helpers before wiring UI.
- Keep `src/main.tsx` as the integration point for now, since the current app is already single-file UI.
- Do not do broad component refactors in this pass.

Expected UI additions:

- `NotesSidebar`
- `MetadataChipInput`
- helper functions such as `normalizeTags`, `deriveNoteFilterOptions`, `filterAndSortNotes`

## Testing Requirements

Add tests that fail before implementation and pass after:

- note creation persists `tickers`, `manualThemes`, and `kpis` in the workspace service;
- Supabase migration defines the new note metadata columns;
- Supabase repository maps metadata arrays both directions;
- note filtering supports stock/theme/KPI/date/search and newest-first sorting;
- extraction merges manual themes into claim themes.

Run `npm run validate` before reporting completion.

## Non-Goals

This pass does not need:

- a full security master;
- many-to-many stock/security tables;
- claim-level KPI schema;
- a full note detail drawer;
- a graph visualization redesign;
- external data ingestion.

## Open Decisions Resolved

The metadata is true persisted note metadata. It is not just a UI affordance and drives filters immediately.

The approved layout is Option A: dedicated collapsible notes sidebar.
