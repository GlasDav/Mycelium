import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readAppCss(): string {
  const root = process.cwd();
  const entry = readFileSync(join(root, 'src', 'styles.css'), 'utf8');
  return entry.replace(/@import\s+['"]\.\/styles\/([^'"]+)['"];/g, (_match, file) => {
    return readFileSync(join(root, 'src', 'styles', file), 'utf8');
  });
}

test('auth shell overrides the global app shell grid', () => {
  const css = readAppCss();
  const match = css.match(/\.auth-shell\s*\{(?<body>[^}]+)\}/);
  assert(match?.groups?.body, 'auth-shell rule is missing');

  const body = match.groups.body;
  assert.match(body, /grid-template-columns\s*:\s*minmax\(0,\s*1fr\)/);
  assert.match(body, /width\s*:\s*100%/);
});

test('notes sidebar and metadata controls have stable layout selectors', () => {
  const css = readAppCss();

  for (const selector of [
    '.app-main',
    '.context-header',
    '.command-palette',
    '.status-toast-stack',
    '.app-main.without-notes-sidebar',
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
    '.timeline-control',
    '.map-density-control',
    '.map-lane.current',
    '.map-lane.historical',
    '.window-status-chip',
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

test('non-notes pages reclaim the notes sidebar grid column', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const match = css.match(/\.app-main\.without-notes-sidebar\s*\{(?<body>[^}]+)\}/);
  assert(match?.groups?.body, 'without-notes-sidebar shell rule is missing');

  assert.match(match.groups.body, /grid-template-columns\s*:\s*64px\s+minmax\(0,\s*1fr\)/);
});

test('note import layout selectors keep pasted imports compact', () => {
  const css = readAppCss();

  for (const selector of [
    '.note-import-panel',
    '.note-import-input',
    '.note-import-preview',
    '.note-import-actions',
    '.note-import-warning'
  ]) {
    assert.match(css, new RegExp(`${selector.replace('.', '\\.')}\\s*\\{`), `${selector} rule is missing`);
  }

  const inputMatch = css.match(/\.note-import-input\s*\{(?<body>[^}]+)\}/);
  const actionsMatch = css.match(/\.note-import-actions\s*\{(?<body>[^}]+)\}/);

  assert(inputMatch?.groups?.body, 'note-import-input rule is missing');
  assert(actionsMatch?.groups?.body, 'note-import-actions rule is missing');
  assert.match(inputMatch.groups.body, /width\s*:\s*100%/);
  assert.match(inputMatch.groups.body, /min-width\s*:\s*0/);
  assert.match(inputMatch.groups.body, /resize\s*:\s*vertical/);
  assert.match(inputMatch.groups.body, /max-height\s*:\s*(2[4-9][0-9]|[3-5][0-9]{2})px/);
  assert.match(actionsMatch.groups.body, /display\s*:\s*flex/);
  assert.match(actionsMatch.groups.body, /flex-wrap\s*:\s*wrap/);
});

test('note import panel does not shift the workbench editor row or button styling', () => {
  const css = readAppCss();
  const primaryMatch = css.match(/\.primary-note\s*\{(?<body>[^}]+)\}/);

  assert(primaryMatch?.groups?.body, 'primary-note rule is missing');
  assert.doesNotMatch(primaryMatch.groups.body, /minmax\(360px,\s*1fr\)/);
  assert.match(css, /\.new-note-action,\s*\.history-note-action,\s*\.note-import-action\s*\{/);
  assert.match(css, /\.new-note-action:hover,\s*\.history-note-action:hover,\s*\.note-import-action:hover\s*\{/);
});

test('sidebar note rows stay one line and vertically dense', () => {
  const css = readAppCss();
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
  const css = readAppCss();
  const buttonMatch = css.match(/\.sidebar-note\s*\{(?<body>[^}]+)\}/);

  assert(buttonMatch?.groups?.body, 'sidebar-note rule is missing');
  assert.match(buttonMatch.groups.body, /padding\s*:\s*[01]px\s+[456]px/);
});

test('sidebar notes list does not stretch rows to fill available height', () => {
  const css = readAppCss();
  const listMatch = css.match(/\.notes-list\s*\{(?<body>[^}]+)\}/);

  assert(listMatch?.groups?.body, 'notes-list rule is missing');
  assert.match(listMatch.groups.body, /display\s*:\s*flex/);
  assert.match(listMatch.groups.body, /flex-direction\s*:\s*column/);
  assert.doesNotMatch(listMatch.groups.body, /display\s*:\s*grid/);
});

test('workspace pages have separate layout selectors', () => {
  const css = readAppCss();

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

test('app shell keeps desktop rail layout until the narrow breakpoint', () => {
  const css = readAppCss();
  const mediumStart = css.indexOf('@media (max-width: 1280px)');
  const narrowStart = css.indexOf('@media (max-width: 920px)', mediumStart);
  const mobileStart = css.indexOf('@media (max-width: 760px)', narrowStart);
  assert(mediumStart >= 0 && narrowStart > mediumStart && mobileStart > narrowStart, 'responsive shell blocks are missing');

  const mediumBlock = css.slice(mediumStart, narrowStart);
  const narrowBlock = css.slice(narrowStart, mobileStart);
  assert.doesNotMatch(mediumBlock, /\.app-main/);
  assert.match(narrowBlock, /\.app-main,\s*\.app-main\.notes-collapsed/);
  assert.match(narrowBlock, /\.left-rail\s*\{/);
  assert.match(narrowBlock, /flex-direction\s*:\s*row/);
});

test('archive workspace overrides the shared workspace grid with full-width layout', () => {
  const css = readAppCss();
  const workspaceIndex = css.indexOf('.workspace {');
  const archiveIndex = css.indexOf('.workspace.archive-workspace {');
  const archiveMatch = css.match(/\.workspace\.archive-workspace\s*\{(?<body>[^}]+)\}/);

  assert(workspaceIndex >= 0, 'shared workspace rule is missing');
  assert(archiveIndex > workspaceIndex, 'archive workspace override must come after the shared workspace rule');
  assert(archiveMatch?.groups?.body, 'archive workspace rule is missing');
  assert.match(archiveMatch.groups.body, /display\s*:\s*block/);
});

test('dashboard grid and empty state actions stay compact inside panels', () => {
  const css = readAppCss();
  const gridMatch = css.match(/\.dashboard-metric-grid\s*\{(?<body>[^}]+)\}/);
  const actionsMatch = css.match(/\.empty-actions\s*\{(?<body>[^}]+)\}/);

  assert(gridMatch?.groups?.body, 'dashboard-metric-grid rule is missing');
  assert(actionsMatch?.groups?.body, 'empty-actions rule is missing');
  assert.match(gridMatch.groups.body, /grid-template-columns\s*:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(actionsMatch.groups.body, /display\s*:\s*flex/);
  assert.match(actionsMatch.groups.body, /flex-wrap\s*:\s*wrap/);
});

test('dashboard insight and widget grids keep cards aligned and evenly sized', () => {
  const css = readAppCss();
  const insightMatch = css.match(/\.dashboard-insight-grid\s*\{(?<body>[^}]+)\}/);
  const widgetGridMatch = css.match(/\.dashboard-widget-grid\s*\{(?<body>[^}]+)\}/);
  const widgetCardMatch = css.match(/\.dashboard-widget-card\s*\{(?<body>[^}]+)\}/);
  const widgetEmptyMatch = css.match(/\.dashboard-widget-card \.empty\s*\{(?<body>[^}]+)\}/);
  const freshnessCardMatch = css.match(/\.freshness-card\s*\{(?<body>[^}]+)\}/);

  assert(insightMatch?.groups?.body, 'dashboard-insight-grid rule is missing');
  assert(widgetGridMatch?.groups?.body, 'dashboard-widget-grid rule is missing');
  assert(widgetCardMatch?.groups?.body, 'dashboard-widget-card rule is missing');
  assert(widgetEmptyMatch?.groups?.body, 'dashboard-widget-card empty rule is missing');
  assert(freshnessCardMatch?.groups?.body, 'freshness-card rule is missing');
  assert.match(insightMatch.groups.body, /align-items\s*:\s*stretch/);
  assert.match(widgetGridMatch.groups.body, /grid-template-columns\s*:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(widgetCardMatch.groups.body, /min-height\s*:\s*(18[0-9]|19[0-9]|2[0-9]{2})px/);
  assert.match(widgetEmptyMatch.groups.body, /overflow\s*:\s*hidden/);
  assert.match(freshnessCardMatch.groups.body, /justify-items\s*:\s*center/);
});

test('premium interaction controls reset native chrome and focus mode expands editor', () => {
  const css = readAppCss();
  const focusMatch = css.match(/\.note-workbench\.focus-mode\s*\{(?<body>[^}]+)\}/);
  const dashboardResetMatch = css.match(/\.dashboard-bar-row,\s*\.dashboard-donut,\s*\.dashboard-legend button\s*\{(?<body>[^}]+)\}/);
  const readOnlyMatch = css.match(/\.markdown-editor\.read-only \.markdown-display-editor\s*\{(?<body>[^}]+)\}/);

  assert(focusMatch?.groups?.body, 'focus-mode workbench rule is missing');
  assert(dashboardResetMatch?.groups?.body, 'dashboard button reset rule is missing');
  assert(readOnlyMatch?.groups?.body, 'read-only markdown rule is missing');
  assert.match(focusMatch.groups.body, /grid-template-columns\s*:\s*minmax\(0,\s*1fr\)/);
  assert.match(dashboardResetMatch.groups.body, /border\s*:\s*0/);
  assert.match(dashboardResetMatch.groups.body, /background-color\s*:\s*transparent/);
  assert.match(readOnlyMatch.groups.body, /cursor\s*:\s*default/);
});

test('premium visual system exposes imported tokens and consistent focus states', () => {
  const entry = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const css = readAppCss();

  assert.match(entry, /@import\s+['"]\.\/styles\/premium\.css['"];/);
  assert.match(css, /--focus-ring/);
  assert.match(css, /--surface-elevated/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.metadata-token-option/);
  assert.match(css, /\.map-active-filters/);
});
