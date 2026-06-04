import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatNoteCopyMarkdown,
  formatNoteExportMarkdown,
  parsePortableMarkdownNote,
  safeMarkdownFilename
} from '../src/note-interchange';

const note = {
  title: 'Nvidia expert call',
  body: 'Nvidia demand remains **strong**.\n\n- Blackwell supply is tight.',
  observedAt: '2026-05-12',
  accessScope: 'team' as const,
  tickers: ['NVDA'],
  manualThemes: ['AI infrastructure'],
  kpis: ['demand'],
  industries: ['Semiconductors'],
  companyTags: ['Nvidia'],
  watchlistTags: ['AI leaders'],
  sourcePeople: ['Dana Lee']
};

test('copy markdown includes title heading and body only', () => {
  assert.equal(
    formatNoteCopyMarkdown(note),
    '# Nvidia expert call\n\nNvidia demand remains **strong**.\n\n- Blackwell supply is tight.'
  );
});

test('export markdown includes frontmatter metadata and body', () => {
  const exported = formatNoteExportMarkdown(note);

  assert.match(exported, /^---\n/);
  assert.match(exported, /title: Nvidia expert call\n/);
  assert.match(exported, /observedAt: 2026-05-12\n/);
  assert.match(exported, /accessScope: team\n/);
  assert.match(exported, /tickers:\n  - NVDA\n/);
  assert.match(exported, /themes:\n  - AI infrastructure\n/);
  assert.match(exported, /participants:\n  - Dana Lee\n/);
  assert.match(exported, /\n---\n\nNvidia demand remains \*\*strong\*\*\.\n\n- Blackwell supply is tight\.$/);
});

test('portable markdown export round trips metadata and access scope', () => {
  const parsed = parsePortableMarkdownNote(formatNoteExportMarkdown(note));

  assert.equal(parsed.title, 'Nvidia expert call');
  assert.equal(parsed.body, note.body);
  assert.equal(parsed.observedAt, '2026-05-12');
  assert.equal(parsed.accessScope, 'team');
  assert(parsed.tickers.includes('NVDA'));
  assert(parsed.manualThemes.includes('AI infrastructure'));
  assert(parsed.kpis.includes('demand'));
  assert(parsed.industries.includes('Semiconductors'));
  assert(parsed.companyTags.includes('Nvidia'));
  assert(parsed.watchlistTags.includes('AI leaders'));
  assert(parsed.sourcePeople.includes('Dana Lee'));
  assert(parsed.linkedEntities.length > 0);
});

test('generic markdown imports leading h1 as title and strips it from body', () => {
  const parsed = parsePortableMarkdownNote('# Management meeting\n\nNvidia demand is strong.');

  assert.equal(parsed.title, 'Management meeting');
  assert.equal(parsed.body, 'Nvidia demand is strong.');
  assert.deepEqual(parsed.tickers, ['NVDA']);
});

test('safe markdown filenames remove unsafe characters and keep extension', () => {
  assert.equal(safeMarkdownFilename(' Nvidia/Q2: Expert * Call? '), 'Nvidia-Q2-Expert-Call.md');
  assert.equal(safeMarkdownFilename(''), 'Untitled-note.md');
});
