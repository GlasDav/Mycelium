import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveNoteFilterOptions,
  filterAndSortNotes,
  normalizeTags,
  type NoteFilters
} from '../src/note-filters';
import type { WorkspaceNote } from '../server/workspace-service';

const base = {
  orgId: 'org1',
  authorId: 'u1',
  authorName: 'Maya Chen',
  team: 'Semis',
  visibility: 'team' as const,
  accessScope: 'team' as const,
  sourceType: 'Channel check',
  createdAt: '2026-05-01',
  updatedAt: '2026-05-01T00:00:00.000Z',
  observedAt: '2026-05-01',
  appliesToStart: '2026-05-01',
  horizon: 'near_term' as const
};

const notes: WorkspaceNote[] = [
  {
    ...base,
    id: 'n1',
    title: 'Nvidia demand check',
    body: 'Nvidia Blackwell demand is strong.',
    observedAt: '2026-05-06',
    tickers: ['NVDA'],
    manualThemes: ['AI infrastructure'],
    kpis: ['Demand'],
    industries: ['Semiconductors'],
    watchlistTags: ['AI Capex'],
    sourcePeople: ['Dana Lee']
  },
  {
    ...base,
    id: 'n2',
    title: 'Apple services read',
    body: 'Services pricing remains robust.',
    team: 'Consumer',
    visibility: 'public',
    accessScope: 'organization',
    sourceType: 'Supplier call',
    observedAt: '2026-05-04',
    tickers: ['AAPL'],
    manualThemes: ['Services'],
    kpis: ['Pricing'],
    industries: ['Consumer hardware'],
    watchlistTags: ['Consumer'],
    sourcePeople: ['Mei Tan']
  },
  {
    ...base,
    id: 'n3',
    title: 'Cloud spend review',
    body: 'Azure capex approval cycles are slowing.',
    sourceType: 'Expert call',
    createdAt: '2026-05-07',
    observedAt: undefined,
    tickers: ['MSFT', 'NVDA'],
    manualThemes: ['Cloud spend'],
    kpis: ['Capex'],
    industries: ['Cloud infrastructure'],
    watchlistTags: ['AI Capex'],
    sourcePeople: ['Dana Lee']
  }
];

test('normalizeTags trims and deduplicates values case-insensitively', () => {
  assert.deepEqual(normalizeTags([' NVDA ', 'nvda', '', 'MSFT']), ['NVDA', 'MSFT']);
});

test('deriveNoteFilterOptions returns sorted metadata options', () => {
  const options = deriveNoteFilterOptions(notes);

  assert.deepEqual(options.tickers, ['AAPL', 'MSFT', 'NVDA']);
  assert.deepEqual(options.themes, ['AI infrastructure', 'Cloud spend', 'Services']);
  assert.deepEqual(options.kpis, ['Capex', 'Demand', 'Pricing']);
  assert.deepEqual(options.industries, ['Cloud infrastructure', 'Consumer hardware', 'Semiconductors']);
  assert.deepEqual(options.watchlists, ['AI Capex', 'Consumer']);
  assert.deepEqual(options.sourcePeople, ['Dana Lee', 'Mei Tan']);
  assert.equal('sourceTypes' in options, false);
  assert.deepEqual(options.visibilities, ['public', 'team']);
  assert.deepEqual(options.accessScopes, ['organization', 'team']);
});

test('filterAndSortNotes filters by metadata, dates, visibility, and search', () => {
  const filters: NoteFilters = {
    query: 'blackwell',
    ticker: 'NVDA',
    theme: 'AI infrastructure',
    kpi: 'Demand',
    industry: 'Semiconductors',
    watchlist: 'AI Capex',
    sourcePerson: 'Dana Lee',
    dateFrom: '2026-05-05',
    dateTo: '2026-05-07',
    visibility: 'team',
    accessScope: 'team',
    sort: 'newest'
  };

  assert.deepEqual(filterAndSortNotes(notes, filters).map(note => note.id), ['n1']);
});

test('filterAndSortNotes filters by canonical access scope independently from legacy visibility', () => {
  assert.deepEqual(filterAndSortNotes(notes, { accessScope: 'organization' }).map(note => note.id), ['n2']);
  assert.deepEqual(filterAndSortNotes(notes, { accessScope: 'team' }).map(note => note.id), ['n3', 'n1']);
});

test('filterAndSortNotes filters new metadata facets independently', () => {
  assert.deepEqual(filterAndSortNotes(notes, { industry: 'Cloud infrastructure' }).map(note => note.id), ['n3']);
  assert.deepEqual(filterAndSortNotes(notes, { watchlist: 'AI Capex' }).map(note => note.id), ['n3', 'n1']);
  assert.deepEqual(filterAndSortNotes(notes, { sourcePerson: 'Dana Lee' }).map(note => note.id), ['n3', 'n1']);
});

test('filterAndSortNotes ignores legacy source filters', () => {
  const filters = { sourceType: 'Supplier call' } as NoteFilters & { sourceType: string };

  assert.deepEqual(filterAndSortNotes(notes, filters).map(note => note.id), ['n3', 'n1', 'n2']);
});

test('filterAndSortNotes defaults to newest first using observed date then created date', () => {
  assert.deepEqual(filterAndSortNotes(notes, { sort: 'newest' }).map(note => note.id), ['n3', 'n1', 'n2']);
  assert.deepEqual(filterAndSortNotes(notes, { sort: 'oldest' }).map(note => note.id), ['n2', 'n1', 'n3']);
});

test('filterAndSortNotes supports title sorting', () => {
  assert.deepEqual(filterAndSortNotes(notes, { sort: 'title' }).map(note => note.id), ['n2', 'n3', 'n1']);
});
