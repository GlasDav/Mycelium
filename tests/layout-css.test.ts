import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('auth shell overrides the global app shell grid', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const match = css.match(/\.auth-shell\s*\{(?<body>[^}]+)\}/);
  assert(match?.groups?.body, 'auth-shell rule is missing');

  const body = match.groups.body;
  assert.match(body, /grid-template-columns\s*:\s*minmax\(0,\s*1fr\)/);
  assert.match(body, /width\s*:\s*100%/);
});

test('notes sidebar and metadata controls have stable layout selectors', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

  for (const selector of [
    '.app-main',
    '.notes-sidebar',
    '.notes-sidebar.collapsed',
    '.note-filter-panel',
    '.note-filter-panel.collapsed',
    '.sidebar-note-row',
    '.sidebar-note-title',
    '.note-title-input',
    '.markdown-toolbar',
    '.markdown-preview',
    '.metadata-chip-input',
    '.map-filter-bar',
    '.person-memory-panel',
    '.person-memory-list',
    '.empty-actions',
    '.note-card.selected',
    '.relation-detail-drawer',
    '.relation-detail-grid',
    '.relation-detail-claims',
    '.note-intelligence',
    '.dashboard-scope-toggle',
    '.dashboard-range-toggle',
    '.dashboard-metric-grid',
    '.dashboard-metric-card',
    '.dashboard-chart-card'
  ]) {
    assert.match(css, new RegExp(`${selector.replace('.', '\\.')}\\s*\\{`), `${selector} rule is missing`);
  }
});

test('sidebar note rows stay one line and vertically dense', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const rowMatch = css.match(/\.sidebar-note-row\s*\{(?<body>[^}]+)\}/);
  const titleMatch = css.match(/\.sidebar-note-title\s*\{(?<body>[^}]+)\}/);
  const dateMatch = css.match(/\.sidebar-note-date\s*\{(?<body>[^}]+)\}/);

  assert(rowMatch?.groups?.body, 'sidebar-note-row rule is missing');
  assert(titleMatch?.groups?.body, 'sidebar-note-title rule is missing');
  assert(dateMatch?.groups?.body, 'sidebar-note-date rule is missing');

  assert.match(rowMatch.groups.body, /grid-template-columns\s*:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.match(rowMatch.groups.body, /min-height\s*:\s*(1[6-9]|20)px/);
  assert.match(titleMatch.groups.body, /white-space\s*:\s*nowrap/);
  assert.match(titleMatch.groups.body, /overflow\s*:\s*hidden/);
  assert.match(titleMatch.groups.body, /text-overflow\s*:\s*ellipsis/);
  assert.match(dateMatch.groups.body, /white-space\s*:\s*nowrap/);
});

test('sidebar note buttons use compact padding for maximum visible rows', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const buttonMatch = css.match(/\.sidebar-note\s*\{(?<body>[^}]+)\}/);

  assert(buttonMatch?.groups?.body, 'sidebar-note rule is missing');
  assert.match(buttonMatch.groups.body, /padding\s*:\s*[01]px\s+[456]px/);
});

test('sidebar notes list does not stretch rows to fill available height', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const listMatch = css.match(/\.notes-list\s*\{(?<body>[^}]+)\}/);

  assert(listMatch?.groups?.body, 'notes-list rule is missing');
  assert.match(listMatch.groups.body, /display\s*:\s*flex/);
  assert.match(listMatch.groups.body, /flex-direction\s*:\s*column/);
  assert.doesNotMatch(listMatch.groups.body, /display\s*:\s*grid/);
});

test('workspace pages have separate layout selectors', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

  for (const selector of [
    '.page-shell',
    '.page-layout',
    '.notes-layout',
    '.dashboard-layout',
    '.workspace.map-workspace',
    '.workspace.archive-workspace',
    '.archive-count'
  ]) {
    assert.match(css, new RegExp(`${selector.replace('.', '\\.')}\\s*\\{`), `${selector} rule is missing`);
  }
});

test('archive workspace overrides the shared workspace grid with full-width layout', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const workspaceIndex = css.indexOf('.workspace {');
  const archiveIndex = css.indexOf('.workspace.archive-workspace {');
  const archiveMatch = css.match(/\.workspace\.archive-workspace\s*\{(?<body>[^}]+)\}/);

  assert(workspaceIndex >= 0, 'shared workspace rule is missing');
  assert(archiveIndex > workspaceIndex, 'archive workspace override must come after the shared workspace rule');
  assert(archiveMatch?.groups?.body, 'archive workspace rule is missing');
  assert.match(archiveMatch.groups.body, /display\s*:\s*block/);
});

test('dashboard grid and empty state actions stay compact inside panels', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const gridMatch = css.match(/\.dashboard-metric-grid\s*\{(?<body>[^}]+)\}/);
  const actionsMatch = css.match(/\.empty-actions\s*\{(?<body>[^}]+)\}/);

  assert(gridMatch?.groups?.body, 'dashboard-metric-grid rule is missing');
  assert(actionsMatch?.groups?.body, 'empty-actions rule is missing');
  assert.match(gridMatch.groups.body, /grid-template-columns\s*:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(actionsMatch.groups.body, /display\s*:\s*flex/);
  assert.match(actionsMatch.groups.body, /flex-wrap\s*:\s*wrap/);
});

test('dashboard insight and widget grids keep cards aligned and evenly sized', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const insightMatch = css.match(/\.dashboard-insight-grid\s*\{(?<body>[^}]+)\}/);
  const widgetGridMatch = css.match(/\.dashboard-widget-grid\s*\{(?<body>[^}]+)\}/);
  const widgetCardMatch = css.match(/\.dashboard-widget-card\s*\{(?<body>[^}]+)\}/);
  const freshnessCardMatch = css.match(/\.freshness-card\s*\{(?<body>[^}]+)\}/);

  assert(insightMatch?.groups?.body, 'dashboard-insight-grid rule is missing');
  assert(widgetGridMatch?.groups?.body, 'dashboard-widget-grid rule is missing');
  assert(widgetCardMatch?.groups?.body, 'dashboard-widget-card rule is missing');
  assert(freshnessCardMatch?.groups?.body, 'freshness-card rule is missing');
  assert.match(insightMatch.groups.body, /align-items\s*:\s*stretch/);
  assert.match(widgetGridMatch.groups.body, /grid-template-columns\s*:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(widgetCardMatch.groups.body, /min-height\s*:\s*(18[0-9]|19[0-9]|2[0-9]{2})px/);
  assert.match(freshnessCardMatch.groups.body, /justify-items\s*:\s*center/);
});
