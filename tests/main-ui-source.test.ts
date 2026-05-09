import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('new note capture uses an editable title field and markdown editor', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /noteTitle/);
  assert.match(source, /placeholder="Title\.\.\."/);
  assert.match(source, /aria-label="Note title"/);
  assert.match(source, /<MarkdownEditor/);
  assert.match(source, /<MarkdownPreview/);
});

test('notes sidebar has independently collapsible filters', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /filtersCollapsed/);
  assert.match(source, /note-filter-panel/);
  assert.match(source, /sidebar-note-row/);
});

test('sidebar note clicks load the note into the note workbench', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /<FilePlus2\/>\s*Note/);
  assert.doesNotMatch(source, /<FilePlus2\/>\s*New note/);
  assert.match(source, /setNoteTitle\(note\.title\)/);
  assert.match(source, /setDraft\(note\.body\)/);
  assert.match(source, /setViewMode\('review'\)/);
});

test('note workbench does not ask for source or claim validity metadata', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const workbenchStart = source.indexOf('<section className="note-workbench">');
  const sideStart = source.indexOf('<aside className="note-side">', workbenchStart);
  assert(workbenchStart >= 0 && sideStart > workbenchStart, 'note workbench source is missing');
  const capture = source.slice(workbenchStart, sideStart);

  assert.doesNotMatch(capture, /<span>Source<\/span>/);
  assert.doesNotMatch(capture, /<span>Applies from<\/span>/);
  assert.doesNotMatch(capture, /<span>Applies to<\/span>/);
  assert.doesNotMatch(capture, /<span>Horizon<\/span>/);
  assert.match(capture, /<span>Observed<\/span>/);
  assert.match(capture, /<span>Visibility<\/span>/);
});

test('notes sidebar filters do not include source metadata controls', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const sidebarStart = source.indexOf('function NotesSidebar');
  const sidebarEnd = source.indexOf('function FilterSelect', sidebarStart);
  assert(sidebarStart >= 0 && sidebarEnd > sidebarStart, 'NotesSidebar source is missing');
  const sidebar = source.slice(sidebarStart, sidebarEnd);

  assert.doesNotMatch(sidebar, /label="Source"/);
  assert.doesNotMatch(sidebar, /sourceType/);
  assert.doesNotMatch(sidebar, /<option value="sourceType">source<\/option>/);
});

test('markdown editor exposes display editing only with undo and redo controls', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const editorStart = source.indexOf('function MarkdownEditor');
  const editorEnd = source.indexOf('function MarkdownPreview');
  assert(editorStart >= 0 && editorEnd > editorStart, 'MarkdownEditor source is missing');
  const editor = source.slice(editorStart, editorEnd);

  assert.match(editor, /markdown-display-editor/);
  assert.match(editor, /contentEditable/);
  assert.doesNotMatch(editor, /<textarea/);
  assert.match(editor, /Undo2/);
  assert.match(editor, /Redo2/);
  assert.match(editor, /execCommand\('undo'\)/);
  assert.match(editor, /execCommand\('redo'\)/);
  assert.match(editor, /key === 'z'/);
  assert.match(editor, /key === 'y'/);
});

test('markdown editor exposes slash command palette keyboard wiring', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const editorStart = source.indexOf('function MarkdownEditor');
  const editorEnd = source.indexOf('function MarkdownPreview');
  assert(editorStart >= 0 && editorEnd > editorStart, 'MarkdownEditor source is missing');
  const editor = source.slice(editorStart, editorEnd);

  assert.match(editor, /slashMarkdownCommands/);
  assert.match(editor, /markdown-slash-palette/);
  assert.match(editor, /ArrowDown/);
  assert.match(editor, /ArrowUp/);
  assert.match(editor, /Escape/);
});

test('note workbench has a new note action and no sample prompt buttons', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /function startNewNote/);
  assert.match(source, /onClick=\{startNewNote\}/);
  assert.match(source, />New note</);
  assert.match(source, /setSelectedNoteId\(''\)/);
  assert.doesNotMatch(source, /className="samples"/);
  assert.doesNotMatch(source, /Use sample/);
});

test('note workbench supports explicit saved-note editing and server draft recovery', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /saveWorkbenchNote/);
  assert.match(source, /updateNote\(/);
  assert.match(source, /loadNoteDraft/);
  assert.match(source, /upsertNoteDraft/);
  assert.match(source, /deleteNoteDraft/);
  assert.match(source, /clearedDraftSignatureRef/);
  assert.match(source, /draftSignature/);
  assert.match(source, /selectedNoteId: note\.id/);
  assert.match(source, /selectedNoteId \? 'Save note' : 'Add note'/);
  assert.match(source, /selectedNoteId \? 'Save note' : 'Add note'/);
  assert.match(source, /onSubmit=\{saveWorkbenchNote\}/);
});

test('selected saved notes expose a read-only history drawer', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const appReturnStart = source.indexOf('return <main');
  const appReturnEnd = source.indexOf('function NotesSidebar');
  assert(appReturnStart >= 0 && appReturnEnd > appReturnStart, 'App render source is missing');
  const appReturn = source.slice(appReturnStart, appReturnEnd);

  assert.match(source, /loadNoteHistory/);
  assert.match(source, /historyDrawerOpen/);
  assert.match(source, /function NoteHistoryDrawer/);
  assert.match(appReturn, /<NoteHistoryDrawer/);
  assert.match(source, /Previous body/);
  assert.match(source, /changedFields/);
  assert.doesNotMatch(source, /Restore version/);
});

test('left rail modes render separate page bodies instead of in-page tabs', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const appReturnStart = source.indexOf('return <main');
  const appReturnEnd = source.indexOf('function NotesSidebar');
  assert(appReturnStart >= 0 && appReturnEnd > appReturnStart, 'App render source is missing');
  const appReturn = source.slice(appReturnStart, appReturnEnd);

  assert.match(appReturn, /className=\{`shell page-shell \$\{viewMode\}-page`\}/);
  assert.match(appReturn, /viewMode === 'review' && <ReviewPage/);
  assert.match(appReturn, /viewMode === 'map' && <MapPage/);
  assert.match(appReturn, /viewMode === 'archive' && <ArchivePage/);
  assert.doesNotMatch(appReturn, /className="mode-tabs"/);
});

test('claim review cards capture analyst review notes on every action', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const claimStart = source.indexOf('function ClaimCard');
  const claimEnd = source.indexOf('function RelationshipMap', claimStart);
  assert(claimStart >= 0 && claimEnd > claimStart, 'ClaimCard source is missing');
  const claimCard = source.slice(claimStart, claimEnd);

  assert.match(claimCard, /reviewNote/);
  assert.match(claimCard, /<span>Review note<\/span>/);
  assert.match(claimCard, /value=\{reviewNote\}/);
  assert.match(claimCard, /reviewNote,\s*\n/);
  assert.match(claimCard, /reviewStatus: 'analyst_confirmed', reviewNote/);
  assert.match(claimCard, /reviewStatus: 'analyst_rejected', reviewNote/);
});

test('relation review cards capture analyst notes and map mode exposes a detail drawer', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const relationStart = source.indexOf('function RelationshipMap');
  const relationEnd = source.indexOf('function Metric', relationStart);
  assert(relationStart >= 0 && relationEnd > relationStart, 'RelationshipMap source is missing');
  const relationSource = source.slice(relationStart, relationEnd);

  assert.match(relationSource, /selectedRelationId/);
  assert.match(relationSource, /relation-detail-drawer/);
  assert.match(relationSource, /Current type/);
  assert.match(relationSource, /Original type/);
  assert.match(relationSource, /Overlap days/);
  assert.match(relationSource, /Review note/);
  assert.match(relationSource, /reviewStatus: 'confirmed', reviewNote/);
  assert.match(relationSource, /reviewStatus: 'dismissed', reviewNote/);
  assert.match(relationSource, /reviewStatus: 'reclassified', type, reviewNote/);
});
