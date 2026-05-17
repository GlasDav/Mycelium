import test from 'node:test';
import assert from 'node:assert/strict';
import { extractClaims, type Note } from '../src/engine';
import {
  parsePastedNoteImport,
  type NoteImportWarning,
  type ParsedNoteImport
} from '../src/note-import';
import {
  NOTE_IMPORT_FILE_ACCEPT,
  NOTE_IMPORT_FILE_MAX_BYTES,
  readNoteImportFile,
  type NoteImportFileLike
} from '../src/note-import-files';

function warningCodes(parsed: ParsedNoteImport): NoteImportWarning['code'][] {
  return parsed.warnings.map(warning => warning.code).sort();
}

function assertIncludes<T>(values: T[], expected: T) {
  assert(
    values.includes(expected),
    `Expected ${JSON.stringify(values)} to include ${JSON.stringify(expected)}`
  );
}

test('structured meeting note parses headers, strips body metadata, and canonicalizes linked entities', () => {
  const parsed = parsePastedNoteImport(`
Title: NVIDIA management meeting
Date: 2026-05-06
Participants: Dana Lee; Morgan Chen
Companies: NVIDIA Corporation, Microsoft
Tickers: nvda us, MSFT
Themes: AI infrastructure, Cloud spend
KPIs: demand, gross margin

Dana Lee: NVIDIA Corporation demand remains strong through Q3.
Morgan Chen: Microsoft Azure cloud spend improves and gross margin is stabilizing.
  `);

  assert.equal(parsed.title, 'NVIDIA management meeting');
  assert.equal(parsed.observedAt, '2026-05-06');
  assert.deepEqual(parsed.sourcePeople, ['Dana Lee', 'Morgan Chen']);
  assert.deepEqual(parsed.tickers, ['MSFT', 'NVDA']);
  assertIncludes(parsed.companyTags, 'Nvidia');
  assertIncludes(parsed.companyTags, 'Microsoft');
  assertIncludes(parsed.manualThemes, 'AI infrastructure');
  assertIncludes(parsed.manualThemes, 'Cloud spend');
  assertIncludes(parsed.kpis, 'demand');
  assertIncludes(parsed.kpis, 'gross margin');
  assert(!parsed.body.includes('Title:'));
  assert(!parsed.body.includes('Participants:'));
  assert(parsed.body.includes('Dana Lee: NVIDIA Corporation demand remains strong through Q3.'));
  assert(parsed.body.includes('Morgan Chen: Microsoft Azure cloud spend improves and gross margin is stabilizing.'));

  const nvda = parsed.linkedEntities.find(entity => entity.role === 'security' && entity.key === 'nvda');
  assert.equal(nvda?.name, 'NVDA');
  assert.equal(nvda?.externalIds?.ticker, 'NVDA');
  assert(parsed.linkedEntities.some(entity => entity.role === 'company' && entity.key === 'nvidia'));
});

test('transcript paste strips timestamps and VTT noise, keeps named speakers, and ignores generic speakers', () => {
  const parsed = parsePastedNoteImport(`
WEBVTT

1
00:00:00.000 --> 00:00:05.000
Speaker 1: Welcome to the call.

[00:01] Dana Lee: Nvidia demand is strong.
00:00:05 --> 00:00:12
Analyst: Could you discuss margins?
2
[00:02:15] Morgan Chen: Blackwell supply is tight.
Operator: Thanks everyone.
  `);

  assert(!parsed.body.includes('WEBVTT'));
  assert(!/\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*-->/u.test(parsed.body));
  assert(!parsed.body.includes('[00:01]'));
  assert(!parsed.body.includes('Speaker 1:'));
  assert(!parsed.body.includes('Analyst:'));
  assert(!parsed.body.includes('Operator:'));
  assert(parsed.body.includes('Dana Lee: Nvidia demand is strong.'));
  assert(parsed.body.includes('Morgan Chen: Blackwell supply is tight.'));
  assert.deepEqual(parsed.sourcePeople, ['Dana Lee', 'Morgan Chen']);
  assertIncludes(warningCodes(parsed), 'generic_speaker_ignored');
});

test('ambiguous numeric dates are not inferred and produce a warning', () => {
  const parsed = parsePastedNoteImport(`
Subject: Ambiguous channel check
Date: 05/06/2026

Nvidia demand is strong.
  `);

  assert.equal(parsed.title, 'Ambiguous channel check');
  assert.equal(parsed.observedAt, undefined);
  assertIncludes(warningCodes(parsed), 'ambiguous_date');
});

test('ontology aliases dedupe NVIDIA Corporation, nvda us, and NVDA to canonical metadata', () => {
  const parsed = parsePastedNoteImport(`
Companies: NVIDIA Corporation
Tickers: nvda us, NVDA

NVDA demand remains strong in semis.
  `);

  assert.deepEqual(parsed.tickers, ['NVDA']);
  assert.deepEqual(parsed.companyTags, ['Nvidia']);
  assert.deepEqual(parsed.industries, ['Information Technology', 'Semiconductors']);
  assert.deepEqual(parsed.watchlistTags, ['AI Capex']);
  assert.equal(parsed.linkedEntities.filter(entity => entity.role === 'security' && entity.key === 'nvda').length, 1);
  assert.equal(parsed.linkedEntities.filter(entity => entity.role === 'company' && entity.key === 'nvidia').length, 1);
});

test('body-only fallback derives a stable title and metadata from deterministic entity detection', () => {
  const parsed = parsePastedNoteImport(
    `
NVIDIA Corporation demand is strong as Blackwell supply improves.
Channel checks suggest gross margin expansion.
    `,
    { fallbackTitle: 'Imported note', fallbackDate: '2026-05-08' }
  );

  assert.equal(parsed.title, 'NVIDIA Corporation demand is strong as Blackwell supply improves.');
  assert.equal(parsed.observedAt, '2026-05-08');
  assert.deepEqual(parsed.tickers, ['NVDA']);
  assert.deepEqual(parsed.companyTags, ['Nvidia']);
  assertIncludes(parsed.manualThemes, 'AI infrastructure');
  assertIncludes(parsed.manualThemes, 'Semiconductors');
  assertIncludes(parsed.kpis, 'demand');
  assertIncludes(parsed.kpis, 'gross margin');
  assertIncludes(parsed.kpis, 'supply');
  assert(!warningCodes(parsed).includes('missing_body'));
});

test('parsed result builds a Note while claim windows stay inferred by extraction', () => {
  const parsed = parsePastedNoteImport(`
Title: Nvidia channel check
Observed: May 6, 2026

Nvidia demand should improve through Q3.
  `);
  const parsedRecord = parsed as Record<string, unknown>;

  assert.equal('appliesToStart' in parsedRecord, false);
  assert.equal('appliesToEnd' in parsedRecord, false);
  assert.equal('horizon' in parsedRecord, false);

  const note: Note = {
    id: 'parsed-note',
    title: parsed.title,
    body: parsed.body,
    authorId: 'analyst',
    visibility: 'team',
    sourceType: 'import',
    createdAt: '2026-05-07',
    observedAt: parsed.observedAt,
    tickers: parsed.tickers,
    manualThemes: parsed.manualThemes,
    kpis: parsed.kpis,
    industries: parsed.industries,
    companyTags: parsed.companyTags,
    watchlistTags: parsed.watchlistTags,
    sourcePeople: parsed.sourcePeople,
    linkedEntities: parsed.linkedEntities
  };

  const [claim] = extractClaims(note, '2026-05-07');

  assert.equal(claim.observedAt, '2026-05-06');
  assert.equal(claim.appliesToStart, '2026-05-06');
  assert.equal(claim.appliesToEnd, '2026-09-03');
  assert.equal(claim.horizon, 'quarter');
});

test('empty imports keep a fallback title and emit a missing body warning', () => {
  const parsed = parsePastedNoteImport('Title: Empty note', { fallbackTitle: 'Imported note' });

  assert.equal(parsed.title, 'Empty note');
  assert.equal(parsed.body, '');
  assertIncludes(warningCodes(parsed), 'missing_body');
});

function importFile(name: string, text: string, size = text.length): NoteImportFileLike {
  return {
    name,
    size,
    text: async () => text
  };
}

test('text note import reads client-side text and falls back to filename title', async () => {
  const parsed = await readNoteImportFile(importFile('Nvidia channel check.txt', 'Nvidia demand is strong.'));

  assert.equal(NOTE_IMPORT_FILE_ACCEPT, '.txt,.md,.markdown');
  assert.equal(parsed.title, 'Nvidia demand is strong.');
  assert.equal(parsed.body, 'Nvidia demand is strong.');
  assert.deepEqual(parsed.tickers, ['NVDA']);
});

test('text note import uses filename fallback when body has no title', async () => {
  const parsed = await readNoteImportFile(importFile('field-notes.TXT', ''));

  assert.equal(parsed.title, 'field-notes');
  assertIncludes(warningCodes(parsed), 'missing_body');
});

test('markdown note import preserves markdown content', async () => {
  const parsed = await readNoteImportFile(importFile('Management Meeting.MARKDOWN', '# Nvidia meeting\n\n- Demand remains **strong**.'));

  assert.equal(parsed.title, '# Nvidia meeting');
  assert.equal(parsed.body, '# Nvidia meeting\n- Demand remains **strong**.');
});

test('file note import rejects unsupported extensions', async () => {
  await assert.rejects(
    () => readNoteImportFile(importFile('notes.pdf', 'Nvidia demand is strong.')),
    /Unsupported note import file type/
  );
});

test('file note import rejects files over the size limit', async () => {
  await assert.rejects(
    () => readNoteImportFile(importFile('oversized.md', '', NOTE_IMPORT_FILE_MAX_BYTES + 1)),
    /Note import file is too large/
  );
});
