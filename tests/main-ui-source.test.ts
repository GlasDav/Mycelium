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
  assert.match(source, /setSourceType\(note\.sourceType\)/);
  assert.match(source, /setViewMode\('review'\)/);
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

test('note workbench has a new note action and no sample prompt buttons', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /function startNewNote/);
  assert.match(source, /onClick=\{startNewNote\}/);
  assert.match(source, />New note</);
  assert.match(source, /setSelectedNoteId\(''\)/);
  assert.doesNotMatch(source, /className="samples"/);
  assert.doesNotMatch(source, /Use sample/);
});
