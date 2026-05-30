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
    '.note-import-transcript-preview',
    '.note-import-consent',
    '.note-import-audio-controls',
    '.note-import-audio-status',
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
  assert.match(css, /\.note-import-audio-controls\s*\{[^}]*flex-wrap\s*:\s*wrap/s);
  assert.match(css, /\.note-import-consent\s*\{[^}]*grid-template-columns\s*:\s*auto\s+minmax\(0,\s*1fr\)/s);
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

test('premium notes polish defines a clean modern capture surface', () => {
  const entry = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const css = readAppCss();

  for (const token of [
    '--app-bg',
    '--chrome-surface',
    '--panel-border',
    '--panel-shadow',
    '--control-shadow',
    '--editor-surface',
    '--editor-line'
  ]) {
    assert.match(css, new RegExp(`${token}\\s*:`), `${token} token is missing`);
  }

  assert.match(entry, /body\s*\{[^}]*background:\s*var\(--app-bg\)/s);
  assert.match(css, /body \.left-rail\s*\{[^}]*background:\s*linear-gradient/s);
  assert.match(css, /body \.notes-sidebar:not\(\.collapsed\)\s*\{/);
  assert.match(css, /body \.context-header\s*\{[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.panel\s*\{[^}]*border-color:\s*var\(--panel-border\)/s);
  assert.match(css, /body \.note-workbench\s*\{[^}]*gap:\s*16px/s);
  assert.match(css, /body \.primary-note\s*\{[^}]*padding:\s*18px/s);
  assert.match(css, /body \.markdown-editor\s*\{[^}]*background:\s*var\(--editor-surface\)/s);
  assert.match(css, /body \.markdown-display-editor\s*\{[^}]*font-size:\s*16px/s);
  assert.match(css, /body \.metadata-chip-input\s*\{[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.75\)/s);
  assert.match(css, /body \.capture-actions button:not\(:disabled\)\s*\{[^}]*transform:\s*translateY\(-1px\)/s);
  assert.match(css, /body \.live-preview\s*\{[^}]*scrollbar-gutter:\s*stable/s);
});

test('premium note editor reads as a focused writing instrument', () => {
  const css = readAppCss();

  assert.match(css, /body \.primary-note\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.96\),\s*rgba\(248,\s*251,\s*250,\s*0\.92\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.primary-note::before\s*\{[^}]*content:\s*""[^}]*position:\s*absolute[^}]*inset:\s*0 0 auto[^}]*height:\s*3px[^}]*background:\s*linear-gradient\(90deg,\s*var\(--accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.62\)\)/s);
  assert.match(css, /body \.note-title-input\s*\{[^}]*min-height:\s*48px[^}]*border:\s*1px solid transparent[^}]*border-bottom-color:\s*var\(--editor-line\)[^}]*border-radius:\s*10px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.54\)[^}]*padding:\s*8px 10px 10px[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.78\)/s);
  assert.match(css, /body \.note-title-input:focus\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.28\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.92\)[^}]*box-shadow:\s*var\(--focus-ring\)/s);
  assert.match(css, /body \.markdown-editor\s*\{[^}]*min-height:\s*444px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*var\(--editor-surface\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.76\),\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.markdown-display-editor\s*\{[^}]*min-height:\s*392px[^}]*scrollbar-gutter:\s*stable[^}]*background:\s*var\(--editor-surface\)[^}]*padding:\s*20px[^}]*font-size:\s*16px[^}]*line-height:\s*1\.62/s);
  assert.match(css, /body \.markdown-display-editor:focus\s*\{[^}]*background:\s*#ffffff[^}]*box-shadow:\s*inset 0 0 0 1px rgba\(15,\s*118,\s*110,\s*0\.18\),\s*inset 0 0 0 4px rgba\(15,\s*118,\s*110,\s*0\.08\)/s);
  assert.match(css, /body \.markdown-editor\.read-only \.markdown-display-editor\s*\{[^}]*background:\s*rgba\(247,\s*250,\s*249,\s*0\.72\)[^}]*color:\s*var\(--muted\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
});

test('premium note metadata controls read as a provenance console', () => {
  const css = readAppCss();

  assert.match(css, /body \.primary-note \.metadata-grid\s*\{[^}]*gap:\s*10px[^}]*margin-top:\s*14px[^}]*padding:\s*8px[^}]*border:\s*1px solid rgba\(15,\s*23,\s*42,\s*0\.06\)[^}]*border-radius:\s*10px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.52\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
  assert.match(css, /body \.primary-note \.metadata-grid label\s*\{[^}]*gap:\s*7px[^}]*min-height:\s*74px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*border-radius:\s*8px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)[^}]*padding:\s*8px[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.primary-note \.metadata-grid span\s*\{[^}]*color:\s*var\(--accent\)[^}]*font-size:\s*10px[^}]*font-weight:\s*780[^}]*letter-spacing:\s*0/s);
  assert.match(css, /body \.primary-note \.metadata-grid input,\s*body \.primary-note \.metadata-grid select\s*\{[^}]*min-height:\s*34px[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.14\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.86\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.78\)/s);
  assert.match(css, /body \.metadata-linking\s*\{[^}]*gap:\s*12px[^}]*margin-top:\s*12px[^}]*padding-top:\s*12px[^}]*border-top:\s*1px solid var\(--panel-border\)/s);
  assert.match(css, /body \.metadata-chip-input\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.78\),\s*rgba\(248,\s*251,\s*250,\s*0\.7\)\)[^}]*padding:\s*11px[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.75\),\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.metadata-chip-input::before\s*\{[^}]*content:\s*""[^}]*position:\s*absolute[^}]*inset:\s*0 0 auto[^}]*height:\s*2px[^}]*background:\s*linear-gradient\(90deg,\s*rgba\(15,\s*118,\s*110,\s*0\.42\),\s*transparent\)/s);
  assert.match(css, /body \.metadata-chip-head\s*\{[^}]*gap:\s*8px[^}]*min-height:\s*30px/s);
  assert.match(css, /body \.metadata-chip-head > label\s*\{[^}]*color:\s*var\(--accent\)[^}]*font-size:\s*11px[^}]*font-weight:\s*780[^}]*letter-spacing:\s*0/s);
  assert.match(css, /body \.metadata-chip-list\s*\{[^}]*gap:\s*6px[^}]*min-height:\s*28px/s);
});

test('premium context header reads as a stable command strip', () => {
  const css = readAppCss();

  assert.match(css, /body \.context-header\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.96\),\s*rgba\(249,\s*251,\s*250,\s*0\.94\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.context-header::before\s*\{[^}]*content:\s*""[^}]*inset:\s*0 0 auto[^}]*height:\s*3px[^}]*background:\s*linear-gradient\(90deg,\s*var\(--accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.68\)\)/s);
  assert.match(css, /body \.context-header-meta\s*\{[^}]*gap:\s*8px[^}]*padding:\s*4px[^}]*border:\s*1px solid rgba\(15,\s*23,\s*42,\s*0\.06\)[^}]*border-radius:\s*10px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.58\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
  assert.match(css, /body \.context-header-meta span,\s*body \.context-header-meta strong\s*\{[^}]*min-height:\s*30px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.76\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.context-header-meta button,\s*body \.command-trigger\s*\{[^}]*min-height:\s*32px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.82\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.command-trigger\s*\{[^}]*color:\s*var\(--accent\)[^}]*font-weight:\s*780/s);
  assert.match(css, /body \.context-header-meta button:hover,\s*body \.context-header-meta button:focus-visible,\s*body \.command-trigger:hover,\s*body \.command-trigger:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.24\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.72\)[^}]*transform:\s*translateY\(-1px\)/s);
});

test('premium dashboard and map polish uses refined analytic surfaces', () => {
  const css = readAppCss();

  assert.match(css, /body \.dashboard-header\s*\{[^}]*background:\s*linear-gradient/s);
  assert.match(css, /body \.dashboard-controls select\s*\{[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.dashboard-scope-toggle,\s*body \.dashboard-range-toggle\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
  assert.match(css, /body \.dashboard-metric-card\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /body \.dashboard-metric-card::before\s*\{[^}]*height:\s*3px/s);
  assert.match(css, /body \.dashboard-metric-card:hover,\s*body \.dashboard-metric-card:focus-visible\s*\{[^}]*transform:\s*translateY\(-2px\)/s);
  assert.match(css, /body \.dashboard-chart-card,\s*body \.dashboard-widget-card\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.92\)/s);
  assert.match(css, /body \.dashboard-bar-row,\s*body \.dashboard-top-list button\s*\{[^}]*border:\s*1px solid var\(--panel-border\)/s);
  assert.match(css, /body \.dashboard-donut\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*box-shadow:\s*inset 0 0 0 1px rgba\(255,\s*255,\s*255,\s*0\.72\),\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.timeline-control\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.graph-canvas\s*\{[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.82\),\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.map-lane\.current,\s*body \.map-lane\.historical\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.86\)/s);
});

test('premium dashboard metric cards read as executive analytical counters', () => {
  const css = readAppCss();

  assert.match(css, /body \.dashboard-metric-card\s*\{[^}]*grid-template-columns:\s*36px minmax\(0,\s*1fr\)[^}]*grid-template-rows:\s*auto 1fr auto[^}]*gap:\s*10px 12px[^}]*min-height:\s*140px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(247,\s*250,\s*249,\s*0\.88\)\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.dashboard-metric-card::after\s*\{[^}]*content:\s*""[^}]*position:\s*absolute[^}]*inset:\s*auto 12px 12px[^}]*height:\s*1px[^}]*background:\s*linear-gradient\(90deg,\s*rgba\(15,\s*118,\s*110,\s*0\.24\),\s*transparent\)/s);
  assert.match(css, /body \.dashboard-metric-card svg\s*\{[^}]*width:\s*36px[^}]*height:\s*36px[^}]*border:\s*1px solid rgba\(15,\s*118,\s*110,\s*0\.16\)[^}]*border-radius:\s*10px[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.72\)[^}]*padding:\s*8px[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.dashboard-metric-card span\s*\{[^}]*align-self:\s*center[^}]*color:\s*var\(--accent\)[^}]*font-size:\s*11px[^}]*font-weight:\s*780[^}]*letter-spacing:\s*0/s);
  assert.match(css, /body \.dashboard-metric-card b\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*font-size:\s*44px[^}]*font-weight:\s*780[^}]*letter-spacing:\s*0[^}]*text-wrap:\s*balance/s);
  assert.match(css, /body \.dashboard-metric-card small\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*min-height:\s*28px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*border-radius:\s*999px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)[^}]*padding:\s*5px 8px[^}]*line-height:\s*1\.25/s);
  assert.match(css, /body \.dashboard-metric-card:hover,\s*body \.dashboard-metric-card:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.24\)[^}]*box-shadow:\s*0 22px 46px rgba\(15,\s*23,\s*42,\s*0\.11\)[^}]*transform:\s*translateY\(-2px\)/s);
});

test('premium secondary surfaces polish auth archive admin and review cards', () => {
  const css = readAppCss();

  assert.match(css, /body \.auth-panel\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.94\)/s);
  assert.match(css, /body \.auth-grid input,\s*body \.auth-grid select\s*\{[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.auth-actions button,\s*body \.review-actions button,\s*body \.relation-actions button,\s*body \.ghost-action\s*\{[^}]*border-color:\s*var\(--panel-border\)/s);
  assert.match(css, /body \.workspace\.archive-workspace\s*\{[^}]*max-width:\s*1180px/s);
  assert.match(css, /body \.notes > article\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.74\)/s);
  assert.match(css, /body \.note-card\.selected\s*\{[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.admin-workspace\s*\{[^}]*margin-inline:\s*0/s);
  assert.match(css, /body \.admin-row\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.8\)/s);
  assert.match(css, /body \.admin-create-row input,\s*body \.admin-create-row select,\s*body \.admin-inline-edit input,\s*body \.admin-member-controls select\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.9\)/s);
  assert.match(css, /body \.empty\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)/s);
  assert.match(css, /body \.claim\s*\{[^}]*border-color:\s*var\(--panel-border\)/s);
  assert.match(css, /body \.relation-detail-drawer\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(247,\s*250,\s*249,\s*0\.88\)\)/s);
  assert.match(css, /body \.relation-detail-grid span,\s*body \.relation-detail-claim\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)/s);
});

test('premium mobile polish keeps operational surfaces compact and scroll safe', () => {
  const css = readAppCss();
  const premiumFooterStart = css.indexOf('body .capture-actions button:not(:disabled),');
  assert(premiumFooterStart >= 0, 'premium action footer block is missing');

  const premiumMobileStart = css.indexOf('@media (max-width: 760px)', premiumFooterStart);
  assert(premiumMobileStart >= 0, 'premium mobile block is missing');

  const premiumMobile = css.slice(premiumMobileStart);
  assert.match(premiumMobile, /body \.app-main\s*\{[^}]*gap:\s*10px/s);
  assert.match(premiumMobile, /body \.left-rail\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(premiumMobile, /body \.left-rail nav\s*\{[^}]*min-width:\s*0/s);
  assert.match(premiumMobile, /body \.context-header\s*\{[^}]*padding:\s*12px/s);
  assert.match(premiumMobile, /body \.context-header-meta span,\s*body \.context-header-meta strong\s*\{[^}]*max-width:\s*none/s);
  assert.match(premiumMobile, /body \.auth-shell\s*\{[^}]*padding:\s*12px/s);
  assert.match(premiumMobile, /body \.auth-panel\s*\{[^}]*padding:\s*20px 14px/s);
  assert.match(premiumMobile, /body \.auth-panel h1\s*\{[^}]*font-size:\s*36px/s);
  assert.match(premiumMobile, /body \.dashboard-controls\s*\{[^}]*width:\s*100%/s);
  assert.match(premiumMobile, /body \.dashboard-controls select,\s*body \.capture-actions select,\s*body \.relation-actions select\s*\{[^}]*width:\s*100%/s);
});

test('premium feedback and import surfaces use coherent light workstation treatment', () => {
  const css = readAppCss();

  assert.match(css, /body \.inline-error\s*\{[^}]*background:\s*rgba\(250,\s*231,\s*229,\s*0\.84\)/s);
  assert.match(css, /body \.inline-success\s*\{[^}]*background:\s*rgba\(228,\s*245,\s*235,\s*0\.84\)/s);
  assert.match(css, /body \.note-import-panel\s*\{[^}]*border:\s*1px solid var\(--panel-border\)/s);
  assert.match(css, /body \.note-import-input\s*\{[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.7\)/s);
  assert.match(css, /body \.note-import-file-button,\s*body \.note-import-actions button\s*\{[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.note-import-preview,\s*body \.note-import-transcript-preview,\s*body \.note-import-audio-status\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.82\)/s);
  assert.match(css, /body \.note-import-warning\s*\{[^}]*background:\s*rgba\(255,\s*242,\s*216,\s*0\.72\)/s);
  assert.match(css, /body \.note-history-drawer\s*\{[^}]*border:\s*1px solid var\(--panel-border\)/s);
  assert.match(css, /body \.note-history-item\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)/s);
  assert.match(css, /body \.note-history-head button\s*\{[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.status-toast\s*\{[^}]*border-color:\s*var\(--panel-border\)/s);
  assert.match(css, /body \.status-toast button:hover,\s*body \.status-toast button:focus-visible\s*\{[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.72\)/s);
});

test('premium finishing details cover scrollbars disabled controls and reduced motion', () => {
  const css = readAppCss();

  assert.match(css, /body \.notes-list,\s*body \.live-preview,\s*body \.command-palette-list,\s*body \.dashboard-widget-card \.dashboard-top-list,\s*body \.dashboard-widget-card \.person-memory-list\s*\{[^}]*scrollbar-color:\s*rgba\(15,\s*118,\s*110,\s*0\.28\) transparent/s);
  assert.match(css, /body \.markdown-toolbar button,\s*body \.metadata-chip-entry button,\s*body \.metadata-chip-list button,\s*body \.map-active-filters button\s*\{[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body button:disabled,\s*body select:disabled,\s*body input:disabled,\s*body textarea:disabled,\s*body \.markdown-toolbar button:disabled,\s*body \.dashboard-top-list button:disabled\s*\{[^}]*filter:\s*saturate\(0\.72\)/s);
  assert.match(css, /body \.map-active-filters button:hover,\s*body \.map-active-filters button:focus-visible\s*\{[^}]*transform:\s*translateY\(-1px\)/s);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*body \*,\s*body \*::before,\s*body \*::after\s*\{[^}]*transition-duration:\s*0\.01ms/s);
});

test('premium status toasts read as typed system events', () => {
  const css = readAppCss();

  assert.match(css, /body \.status-toast\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*grid-template-columns:\s*30px minmax\(0,\s*1fr\) 28px[^}]*gap:\s*10px[^}]*min-height:\s*58px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.96\),\s*rgba\(247,\s*250,\s*249,\s*0\.9\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.status-toast::before\s*\{[^}]*content:\s*""[^}]*inset:\s*0 auto 0 0[^}]*width:\s*4px[^}]*background:\s*var\(--accent\)/s);
  assert.match(css, /body \.status-toast > svg\s*\{[^}]*width:\s*30px[^}]*height:\s*30px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.72\)[^}]*padding:\s*6px/s);
  assert.match(css, /body \.status-toast b\s*\{[^}]*font-size:\s*13px[^}]*font-weight:\s*780[^}]*line-height:\s*1\.2/s);
  assert.match(css, /body \.status-toast small\s*\{[^}]*font-size:\s*12px[^}]*line-height:\s*1\.38/s);
  assert.match(css, /body \.status-toast\.success::before\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*var\(--sage\),\s*rgba\(47,\s*143,\s*100,\s*0\.52\)\)/s);
  assert.match(css, /body \.status-toast\.error::before\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*var\(--rose\),\s*rgba\(189,\s*75,\s*69,\s*0\.52\)\)/s);
  assert.match(css, /body \.status-toast\.info::before\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*var\(--blue\),\s*rgba\(63,\s*111,\s*181,\s*0\.52\)\)/s);
  assert.match(css, /body \.status-toast\.success > svg\s*\{[^}]*border-color:\s*rgba\(47,\s*143,\s*100,\s*0\.22\)[^}]*background:\s*rgba\(228,\s*245,\s*235,\s*0\.72\)/s);
  assert.match(css, /body \.status-toast\.error > svg\s*\{[^}]*border-color:\s*rgba\(189,\s*75,\s*69,\s*0\.24\)[^}]*background:\s*rgba\(250,\s*231,\s*229,\s*0\.78\)/s);
  assert.match(css, /body \.status-toast\.info > svg\s*\{[^}]*border-color:\s*rgba\(63,\s*111,\s*181,\s*0\.22\)[^}]*background:\s*rgba\(226,\s*236,\s*250,\s*0\.72\)/s);
  assert.match(css, /body \.status-toast button\s*\{[^}]*width:\s*28px[^}]*height:\s*28px[^}]*border:\s*1px solid transparent/s);
  assert.match(css, /body \.status-toast button:hover,\s*body \.status-toast button:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.18\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.72\)[^}]*transform:\s*translateY\(-1px\)/s);
});

test('light visual system does not reference undefined legacy text color token', () => {
  const css = readAppCss();

  assert.doesNotMatch(css, /var\(--text\)/);
  assert.match(css, /\.admin-team-checks label\s*\{[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /\.auth-grid input,\s*\.auth-grid select,\s*\.metadata-grid input,\s*\.metadata-grid select,\s*\.claim-editor input,\s*\.claim-editor select,\s*\.claim-editor textarea,\s*\.relation-review-note textarea,\s*\.relation-actions select\s*\{[^}]*color:\s*var\(--ink\)/s);
});

test('visual system keeps letter spacing at zero for readable dense labels', () => {
  const css = readAppCss();
  const letterSpacingValues = [...css.matchAll(/letter-spacing\s*:\s*([^;}]+)/g)].map((match) => match[1].trim());

  assert(letterSpacingValues.length > 0, 'expected letter-spacing declarations to be audited');
  assert.deepEqual([...new Set(letterSpacingValues)], ['0']);
  assert.match(css, /\.admin-create-row span,\s*\.admin-member-controls span\s*\{[^}]*letter-spacing:\s*0/s);
  assert.match(css, /\.auth-grid span,\s*\.metadata-grid span,\s*\.claim-editor span,\s*\.relation-review-note span\s*\{[^}]*letter-spacing:\s*0/s);
  assert.match(css, /\.relation-detail-grid span\s*\{[^}]*letter-spacing:\s*0/s);
});

test('light visual system removes legacy dark translucent controls from workstation forms', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

  assert.doesNotMatch(css, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.0[456]\)/);
  assert.doesNotMatch(css, /#ffb7b7|#d8ffc2|#12140f/);
  assert.match(css, /\.auth-grid input,\s*\.auth-grid select,\s*\.metadata-grid input,\s*\.metadata-grid select,\s*\.claim-editor input,\s*\.claim-editor select,\s*\.claim-editor textarea,\s*\.relation-review-note textarea,\s*\.relation-actions select\s*\{[^}]*background:\s*var\(--surface\)/s);
  assert.match(css, /\.auth-actions button,\s*\.review-actions button,\s*\.relation-actions button,\s*\.ghost-action\s*\{[^}]*background:\s*var\(--surface\)/s);
  assert.match(css, /\.auth-actions button:first-child,\s*\.review-actions button:first-child\s*\{[^}]*color:\s*#ffffff/s);
  assert.match(css, /\.inline-error\s*\{[^}]*background:\s*var\(--rose-soft\)[^}]*color:\s*var\(--rose\)/s);
  assert.match(css, /\.inline-success\s*\{[^}]*background:\s*var\(--sage-soft\)[^}]*color:\s*var\(--sage\)/s);
});

test('compact action controls keep stable dimensions across labels and icons', () => {
  const css = readAppCss();

  assert.match(css, /\.metadata-chip-entry button,\s*\.metadata-chip-list button\s*\{[^}]*min-height:\s*32px/s);
  assert.match(css, /\.metadata-chip-entry button\s*\{[^}]*min-width:\s*32px/s);
  assert.match(css, /\.metadata-chip-list button\s*\{[^}]*min-height:\s*28px/s);
  assert.match(css, /\.new-note-action,\s*\.history-note-action,\s*\.note-import-action\s*\{[^}]*min-height:\s*34px/s);
  assert.match(css, /\.context-header-meta button,\s*\.command-trigger\s*\{[^}]*min-width:\s*34px/s);
});

test('visual system tokenizes repeated workstation surface and rail colors', () => {
  const css = readAppCss();

  for (const token of ['--surface-wash', '--surface-muted', '--surface-map', '--rail-ink', '--rail-muted', '--rail-accent']) {
    assert.match(css, new RegExp(`${token}\\s*:`), `${token} token is missing`);
  }

  assert.doesNotMatch(css, /#fbfbf8|#f5f4f0|#eef4f2|#e8f1ec|#e9ffef|#9aa8a3/i);
  assert.match(css, /\.note-filter-stack input,\s*\.note-filter-stack select,\s*\.metadata-chip-input input,\s*\.metadata-chip-input select\s*\{[^}]*background:\s*var\(--surface-wash\)/s);
  assert.match(css, /\.graph-canvas\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*var\(--surface-wash\),\s*var\(--surface-map\)\)/s);
  assert.match(css, /\.left-rail\s*\{[^}]*color:\s*var\(--rail-ink\)/s);
  assert.match(css, /\.left-rail button\s*\{[^}]*color:\s*var\(--rail-muted\)/s);
});

test('command buttons keep stable height and non-wrapping labels', () => {
  const css = readAppCss();

  assert.match(css, /\.capture-actions button\s*\{[^}]*min-height:\s*38px[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.capture-actions button span\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.dashboard-scope-toggle button,\s*\.dashboard-range-toggle button\s*\{[^}]*min-height:\s*30px[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.empty-actions button\s*\{[^}]*min-height:\s*34px[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.auth-actions button,\s*\.review-actions button,\s*\.relation-actions button,\s*\.ghost-action\s*\{[^}]*min-height:\s*36px[^}]*white-space:\s*nowrap/s);
});

test('premium demo guide surfaces feel integrated with the workstation shell', () => {
  const css = readAppCss();

  assert.match(css, /body \.demo-guide\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.76\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.demo-guide-head\s*\{[^}]*align-items:\s*center/s);
  assert.match(css, /body \.demo-guide-dismiss\s*\{[^}]*min-width:\s*34px[^}]*height:\s*34px[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.demo-guide-steps\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(132px,\s*1fr\)\)/s);
  assert.match(css, /body \.demo-guide-steps button\s*\{[^}]*min-height:\s*118px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.demo-guide-steps button:hover,\s*body \.demo-guide-steps button:focus-visible\s*\{[^}]*transform:\s*translateY\(-1px\)/s);
  assert.match(css, /body \.demo-guide-steps small\s*\{[^}]*letter-spacing:\s*0/s);
});

test('premium relation and source-person lists use polished scan cards', () => {
  const css = readAppCss();

  assert.match(css, /body \.relation-list article,\s*body \.person-memory-list button\s*\{[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.82\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.person-memory-list button\s*\{[^}]*min-height:\s*72px/s);
  assert.match(css, /body \.relation-list article:hover,\s*body \.person-memory-list button:hover,\s*body \.person-memory-list button:focus-visible\s*\{[^}]*transform:\s*translateY\(-1px\)/s);
  assert.match(css, /body \.relation-list article\.selected\s*\{[^}]*box-shadow:\s*0 12px 28px rgba\(15,\s*118,\s*110,\s*0\.12\)/s);
  assert.match(css, /body \.relation-list p,\s*body \.person-memory-list b\s*\{[^}]*line-height:\s*1\.38/s);
});

test('premium map affordances use refined legend chips and elevated nodes', () => {
  const css = readAppCss();

  assert.match(css, /body \.relation-legend span\s*\{[^}]*min-height:\s*28px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.76\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.window-status-chip\s*\{[^}]*min-height:\s*22px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.node\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.94\)[^}]*box-shadow:\s*0 14px 34px rgba\(15,\s*23,\s*42,\s*0\.12\)/s);
  assert.match(css, /body \.node\.satellite\s*\{[^}]*min-width:\s*132px[^}]*line-height:\s*1\.28/s);
  assert.match(css, /body \.node\.satellite\.selected\s*\{[^}]*box-shadow:\s*var\(--focus-ring\),\s*0 18px 42px rgba\(15,\s*118,\s*110,\s*0\.16\)/s);
});

test('premium command and slash palettes use refined elevated overlays', () => {
  const css = readAppCss();

  assert.match(css, /body \.command-palette\s*\{[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.command-palette-search\s*\{[^}]*background:\s*rgba\(247,\s*250,\s*249,\s*0\.92\)/s);
  assert.match(css, /body \.command-palette-list button\s*\{[^}]*min-height:\s*44px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.7\)/s);
  assert.match(css, /body \.command-palette-list button\.active:not\(:disabled\)\s*\{[^}]*box-shadow:\s*inset 3px 0 0 var\(--accent\),\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.markdown-slash-palette\s*\{[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.markdown-slash-palette button\s*\{[^}]*min-height:\s*34px[^}]*white-space:\s*nowrap/s);
});

test('premium sidebar filters and metadata options use compact elevated controls', () => {
  const css = readAppCss();

  assert.match(css, /body \.note-filter-panel\s*\{[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.58\)[^}]*border-radius:\s*8px/s);
  assert.match(css, /body \.note-filter-toggle\s*\{[^}]*min-height:\s*34px[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.clear-note-filters\s*\{[^}]*min-height:\s*34px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)[^}]*box-shadow:\s*var\(--control-shadow\)[^}]*white-space:\s*nowrap/s);
  assert.match(css, /body \.note-filter-stack input,\s*body \.note-filter-stack select\s*\{[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
  assert.match(css, /body \.metadata-token-option\s*\{[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.82\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.metadata-token-option:hover,\s*body \.metadata-token-option:focus-visible,\s*body \.metadata-token-option\.active\s*\{[^}]*transform:\s*translateY\(-1px\)/s);
});

test('premium claim review editor uses polished trust-workflow controls', () => {
  const css = readAppCss();

  assert.match(css, /body \.claim\s*\{[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.86\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.claim:hover\s*\{[^}]*transform:\s*translateY\(-1px\)[^}]*box-shadow:\s*0 12px 28px rgba\(15,\s*23,\s*42,\s*0\.09\)/s);
  assert.match(css, /body \.claim\.editable\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.92\)[^}]*padding:\s*14px/s);
  assert.match(css, /body \.claim-editor\s*\{[^}]*gap:\s*12px[^}]*margin-top:\s*14px/s);
  assert.match(css, /body \.claim-editor textarea\s*\{[^}]*min-height:\s*96px[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
  assert.match(css, /body \.claim-editor \.metadata-chip-input\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.76\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.review-actions\s*\{[^}]*gap:\s*8px[^}]*padding-top:\s*2px/s);
  assert.match(css, /body \.review-actions button:hover,\s*body \.review-actions button:focus-visible\s*\{[^}]*transform:\s*translateY\(-1px\)/s);
});

test('premium operational support surfaces use finished elevated treatment', () => {
  const css = readAppCss();

  assert.match(css, /body \.admin-panel\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(247,\s*250,\s*249,\s*0\.9\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.admin-section,\s*body \.admin-list\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.admin-row:hover\s*\{[^}]*transform:\s*translateY\(-1px\)[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.22\)/s);
  assert.match(css, /body \.admin-team-checks label\s*\{[^}]*min-height:\s*32px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.74\)[^}]*border-radius:\s*8px/s);
  assert.match(css, /body \.archive-count\s*\{[^}]*width:\s*fit-content[^}]*min-height:\s*28px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.74\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.revision-meta span\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.74\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.subject-rail button\s*\{[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.8\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.subject-rail button:hover,\s*body \.subject-rail button:focus-visible,\s*body \.subject-rail button\.active\s*\{[^}]*transform:\s*translateY\(-1px\)/s);
});

test('premium map timeline states and review notes feel integrated', () => {
  const css = readAppCss();

  assert.match(css, /body \.timeline-affordance\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.timeline-affordance i\s*\{[^}]*background:\s*linear-gradient\(90deg,\s*rgba\(15,\s*118,\s*110,\s*0\.18\),\s*rgba\(63,\s*111,\s*181,\s*0\.42\)\)/s);
  assert.match(css, /body \.map-loading-state,\s*body \.map-error-state\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.74\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.map-error-state\s*\{[^}]*border-color:\s*rgba\(189,\s*75,\s*69,\s*0\.24\)[^}]*background:\s*rgba\(250,\s*231,\s*229,\s*0\.84\)/s);
  assert.match(css, /body \.map-lane-empty,\s*body \.map-lane-overflow\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.7\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.map-lane-overflow\s*\{[^}]*width:\s*fit-content[^}]*background:\s*rgba\(255,\s*242,\s*216,\s*0\.72\)/s);
  assert.match(css, /body \.relation-review-note\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.7\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.relation-review-note textarea\s*\{[^}]*min-height:\s*92px[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\),\s*var\(--control-shadow\)/s);
});

test('premium relation detail drawer reads as a trust review workspace', () => {
  const css = readAppCss();

  assert.match(css, /body \.relation-detail-drawer\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*gap:\s*14px[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(247,\s*250,\s*249,\s*0\.88\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.relation-detail-drawer::before\s*\{[^}]*content:\s*""[^}]*inset:\s*0 0 auto[^}]*height:\s*3px[^}]*background:\s*linear-gradient\(90deg,\s*var\(--accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.68\)\)/s);
  assert.match(css, /body \.relation-detail-grid\s*\{[^}]*gap:\s*9px/s);
  assert.match(css, /body \.relation-detail-grid span\s*\{[^}]*min-height:\s*58px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.relation-detail-grid b\s*\{[^}]*font-size:\s*13px[^}]*line-height:\s*1\.25/s);
  assert.match(css, /body \.relation-detail-claims\s*\{[^}]*gap:\s*12px/s);
  assert.match(css, /body \.relation-detail-claim\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*padding:\s*12px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.82\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.relation-detail-claim::before\s*\{[^}]*content:\s*""[^}]*inset:\s*0 auto 0 0[^}]*width:\s*3px[^}]*background:\s*linear-gradient\(180deg,\s*var\(--accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.62\)\)/s);
  assert.match(css, /body \.relation-detail-claim p,\s*body \.relation-detail-drawer > p\s*\{[^}]*line-height:\s*1\.48/s);
  assert.match(css, /body \.relation-detail-drawer > p\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.relation-detail-review\s*\{[^}]*display:\s*grid[^}]*gap:\s*10px[^}]*border-top:\s*1px solid var\(--panel-border\)[^}]*padding-top:\s*12px/s);
  assert.match(css, /body \.relation-actions\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*auto\)\) minmax\(170px,\s*1fr\) minmax\(0,\s*auto\)[^}]*gap:\s*8px/s);
  assert.match(css, /body \.relation-actions select\s*\{[^}]*min-height:\s*36px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.relation-actions button:hover,\s*body \.relation-actions button:focus-visible,\s*body \.relation-actions select:hover,\s*body \.relation-actions select:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.26\)[^}]*background-color:\s*rgba\(223,\s*244,\s*238,\s*0\.72\)[^}]*transform:\s*translateY\(-1px\)/s);
});

test('premium import workflow microstates stay polished and readable', () => {
  const css = readAppCss();

  assert.match(css, /body \.note-import-file-row\s*\{[^}]*flex-wrap:\s*wrap[^}]*padding:\s*2px/s);
  assert.match(css, /body \.note-import-consent\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.note-import-consent input\s*\{[^}]*accent-color:\s*var\(--accent\)/s);
  assert.match(css, /body \.note-import-audio-controls span\s*\{[^}]*border:\s*1px solid rgba\(15,\s*118,\s*110,\s*0\.16\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.62\)/s);
  assert.match(css, /body \.note-import-audio-status\.ready\s*\{[^}]*border-color:\s*rgba\(47,\s*143,\s*100,\s*0\.28\)[^}]*background:\s*rgba\(228,\s*245,\s*235,\s*0\.72\)/s);
  assert.match(css, /body \.note-import-audio-status\.failed\s*\{[^}]*border-color:\s*rgba\(189,\s*75,\s*69,\s*0\.26\)[^}]*background:\s*rgba\(250,\s*231,\s*229,\s*0\.82\)/s);
  assert.match(css, /body \.note-import-preview b,\s*body \.note-import-preview span\s*\{[^}]*display:\s*inline-flex[^}]*min-height:\s*24px/s);
  assert.match(css, /body \.note-import-preview p\s*\{[^}]*max-height:\s*96px[^}]*overflow:\s*auto/s);
  assert.match(css, /body \.note-import-transcript-preview small\s*\{[^}]*border-top:\s*1px solid rgba\(15,\s*23,\s*42,\s*0\.07\)[^}]*padding-top:\s*6px/s);
});

test('premium loading and admin fallback states feel intentional', () => {
  const css = readAppCss();

  assert.match(css, /body \.dashboard-loading\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.82\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.dashboard-loading::after\s*\{[^}]*content:\s*""[^}]*height:\s*3px[^}]*background:\s*linear-gradient\(90deg,\s*var\(--accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.7\)\)/s);
  assert.match(css, /body \.dashboard-loading p\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.admin-panel > p\s*\{[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.admin-panel > button\s*\{[^}]*min-height:\s*36px[^}]*border-color:\s*var\(--panel-border\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.admin-panel > button:hover,\s*body \.admin-panel > button:focus-visible\s*\{[^}]*background:\s*var\(--accent-soft\)[^}]*transform:\s*translateY\(-1px\)/s);
});

test('premium recurring panel headers and note context chips are refined', () => {
  const css = readAppCss();

  assert.match(css, /body \.panel-title\s*\{[^}]*width:\s*fit-content[^}]*min-height:\s*28px[^}]*border:\s*1px solid rgba\(15,\s*118,\s*110,\s*0\.13\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.7\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.panel-title svg\s*\{[^}]*width:\s*15px[^}]*height:\s*15px[^}]*color:\s*var\(--accent\)/s);
  assert.match(css, /body \.note-panel-head \.panel-title\s*\{[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.68\)[^}]*color:\s*var\(--accent\)/s);
  assert.match(css, /body \.note-meta\s*\{[^}]*gap:\s*6px[^}]*margin:\s*0 0 12px/s);
  assert.match(css, /body \.note-meta span\s*\{[^}]*min-height:\s*26px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
});

test('premium history drawer keeps revisions compact and scannable', () => {
  const css = readAppCss();

  assert.match(css, /body \.note-history-head\s*\{[^}]*padding-bottom:\s*8px[^}]*border-bottom:\s*1px solid var\(--panel-border\)/s);
  assert.match(css, /body \.note-history-item h3\s*\{[^}]*font-size:\s*14px[^}]*line-height:\s*1\.25[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /body \.note-history-item small\s*\{[^}]*color:\s*var\(--muted\)[^}]*line-height:\s*1\.35/s);
  assert.match(css, /body \.note-history-item \.markdown-preview\s*\{[^}]*max-height:\s*180px[^}]*overflow:\s*auto[^}]*padding:\s*10px[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
  assert.match(css, /body \.note-history-item \.markdown-preview h1,\s*body \.note-history-item \.markdown-preview h2,\s*body \.note-history-item \.markdown-preview h3\s*\{[^}]*font-size:\s*14px[^}]*line-height:\s*1\.3/s);
});

test('premium note cards and metadata chips feel dense and selectable', () => {
  const css = readAppCss();

  assert.match(css, /body \.notes > article\s*\{[^}]*transition:\s*border-color 0\.16s ease,\s*background-color 0\.16s ease,\s*box-shadow 0\.16s ease,\s*transform 0\.16s ease/s);
  assert.match(css, /body \.notes > article:hover\s*\{[^}]*transform:\s*translateY\(-1px\)[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.2\)[^}]*box-shadow:\s*0 10px 24px rgba\(15,\s*23,\s*42,\s*0\.08\)/s);
  assert.match(css, /body \.note-card\.selected\s*\{[^}]*position:\s*relative[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.32\)[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(223,\s*244,\s*238,\s*0\.78\),\s*rgba\(255,\s*255,\s*255,\s*0\.84\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.note-card\.selected::before\s*\{[^}]*width:\s*3px[^}]*background:\s*linear-gradient\(180deg,\s*var\(--accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.72\)\)/s);
  assert.match(css, /body \.note-metadata-chips\s*\{[^}]*gap:\s*5px[^}]*margin-top:\s*10px/s);
  assert.match(css, /body \.note-metadata-chips \.chip\s*\{[^}]*min-height:\s*24px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.76\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.note-metadata-chips\.compact \.chip\s*\{[^}]*min-height:\s*22px[^}]*padding:\s*3px 6px/s);
});

test('premium source-person memory panel reads as a finished dashboard module', () => {
  const css = readAppCss();

  assert.match(css, /body \.person-memory-panel\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(247,\s*250,\s*249,\s*0\.9\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.person-memory-panel::before\s*\{[^}]*content:\s*""[^}]*height:\s*3px[^}]*background:\s*linear-gradient\(90deg,\s*var\(--accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.72\)\)/s);
  assert.match(css, /body \.person-memory-panel \.panel-title\s*\{[^}]*margin-bottom:\s*2px[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.7\)/s);
  assert.match(css, /body \.person-memory-list\s*\{[^}]*gap:\s*7px/s);
  assert.match(css, /body \.person-memory-list span\s*\{[^}]*color:\s*var\(--ink\)[^}]*font-size:\s*13px[^}]*line-height:\s*1\.2/s);
  assert.match(css, /body \.person-memory-list small,\s*body \.person-memory-list em\s*\{[^}]*line-height:\s*1\.35[^}]*overflow-wrap:\s*anywhere/s);
});

test('premium markdown toolbar feels precise and tactile', () => {
  const css = readAppCss();

  assert.match(css, /body \.markdown-toolbar\s*\{[^}]*gap:\s*5px[^}]*border-bottom:\s*1px solid var\(--panel-border\)[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.88\),\s*rgba\(237,\s*244,\s*241,\s*0\.86\)\)[^}]*box-shadow:\s*inset 0 -1px 0 rgba\(15,\s*23,\s*42,\s*0\.04\)/s);
  assert.match(css, /body \.markdown-toolbar button\s*\{[^}]*width:\s*32px[^}]*height:\s*32px[^}]*border:\s*1px solid rgba\(15,\s*118,\s*110,\s*0\.12\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.markdown-toolbar button:hover,\s*body \.markdown-toolbar button:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.3\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.78\)[^}]*transform:\s*translateY\(-1px\)/s);
  assert.match(css, /body \.markdown-toolbar button:disabled\s*\{[^}]*background:\s*rgba\(247,\s*250,\s*249,\s*0\.68\)[^}]*box-shadow:\s*none/s);
  assert.match(css, /body \.markdown-toolbar svg\s*\{[^}]*stroke-width:\s*2\.15/s);
});

test('premium left rail reads as polished persistent workspace chrome', () => {
  const css = readAppCss();

  assert.match(css, /body \.left-rail\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(28,\s*43,\s*40,\s*0\.98\),\s*rgba\(10,\s*18,\s*17,\s*0\.98\)\),\s*var\(--rail\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.mark\s*\{[^}]*background:\s*linear-gradient\(145deg,\s*rgba\(233,\s*255,\s*239,\s*0\.16\),\s*rgba\(15,\s*118,\s*110,\s*0\.28\)\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.18\),\s*0 12px 28px rgba\(0,\s*0,\s*0,\s*0\.22\)/s);
  assert.match(css, /body \.left-rail nav\s*\{[^}]*gap:\s*7px[^}]*padding:\s*6px[^}]*border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.07\)/s);
  assert.match(css, /body \.left-rail button\s*\{[^}]*position:\s*relative[^}]*border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.06\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.03\)/s);
  assert.match(css, /body \.left-rail button:hover,\s*body \.left-rail button:focus-visible,\s*body \.left-rail button\.active\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.12\)[^}]*transform:\s*translateY\(-1px\)/s);
  assert.match(css, /body \.left-rail button\.active::before\s*\{[^}]*width:\s*3px[^}]*background:\s*linear-gradient\(180deg,\s*var\(--rail-accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.86\)\)/s);
  assert.match(css, /body \.rail-footer\s*\{[^}]*color:\s*rgba\(232,\s*241,\s*236,\s*0\.46\)[^}]*text-shadow:\s*0 1px 0 rgba\(0,\s*0,\s*0,\s*0\.2\)/s);
});

test('premium capture actions read as a deliberate save command strip', () => {
  const css = readAppCss();

  assert.match(css, /body \.capture-actions\s*\{[^}]*gap:\s*8px[^}]*align-items:\s*center[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.66\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.capture-actions button\s*\{[^}]*min-height:\s*40px[^}]*border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.1\)[^}]*background:\s*linear-gradient\(180deg,\s*#12211f,\s*#0b1413\)[^}]*box-shadow:\s*0 12px 26px rgba\(16,\s*24,\s*22,\s*0\.16\)/s);
  assert.match(css, /body \.capture-actions button span\s*\{[^}]*min-height:\s*24px[^}]*border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.1\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)[^}]*color:\s*rgba\(232,\s*241,\s*236,\s*0\.78\)/s);
  assert.match(css, /body \.capture-actions select\s*\{[^}]*min-height:\s*40px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.9\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.capture-actions button:disabled\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(18,\s*33,\s*31,\s*0\.62\),\s*rgba\(11,\s*20,\s*19,\s*0\.62\)\)[^}]*box-shadow:\s*none/s);
});

test('premium live extraction suggestions feel actionable and controlled', () => {
  const css = readAppCss();

  assert.match(css, /body \.live-preview\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(247,\s*250,\s*249,\s*0\.9\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.entity-cloud\s*\{[^}]*gap:\s*6px[^}]*padding:\s*2px/s);
  assert.match(css, /body \.entity-cloud \.chip\s*\{[^}]*min-height:\s*30px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.entity-cloud \.chip:hover,\s*body \.entity-cloud \.chip:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.28\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.74\)[^}]*transform:\s*translateY\(-1px\)/s);
  assert.match(css, /body \.entity-cloud \.chip svg\s*\{[^}]*width:\s*13px[^}]*height:\s*13px[^}]*color:\s*var\(--accent\)/s);
  assert.match(css, /body \.preview-claims\s*\{[^}]*gap:\s*8px[^}]*margin-top:\s*14px[^}]*padding-top:\s*12px[^}]*border-top:\s*1px solid var\(--panel-border\)/s);
  assert.match(css, /body \.live-preview \.claim\.compact,\s*body \.preview-claims \.claim\s*\{[^}]*padding:\s*10px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.76\)/s);
});

test('premium current-note intelligence reads as a finished review workspace', () => {
  const css = readAppCss();

  assert.match(css, /body \.note-intelligence\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(247,\s*250,\s*249,\s*0\.9\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.note-intelligence::before\s*\{[^}]*content:\s*""[^}]*height:\s*3px[^}]*background:\s*linear-gradient\(90deg,\s*var\(--accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.7\)\)/s);
  assert.match(css, /body \.note-intelligence-grid\s*\{[^}]*gap:\s*14px[^}]*align-items:\s*stretch/s);
  assert.match(css, /body \.note-intelligence-grid > div\s*\{[^}]*min-width:\s*0[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.note-intelligence h3\s*\{[^}]*margin:\s*0 0 10px[^}]*font-size:\s*14px[^}]*letter-spacing:\s*0/s);
  assert.match(css, /body \.note-intelligence \.claim-list,\s*body \.note-intelligence \.note-relations-panel\s*\{[^}]*gap:\s*9px/s);
  assert.match(css, /body \.note-intelligence \.empty\s*\{[^}]*min-height:\s*132px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.58\)[^}]*box-shadow:\s*none/s);
});

test('premium map controls feel like precise analytical instrumentation', () => {
  const css = readAppCss();

  assert.match(css, /body \.graph-panel\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(247,\s*250,\s*249,\s*0\.9\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.timeline-control\s*\{[^}]*gap:\s*7px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.timeline-control input,\s*body \.map-filter-bar select\s*\{[^}]*min-height:\s*34px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.9\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
  assert.match(css, /body \.timeline-control button,\s*body \.map-density-control button\s*\{[^}]*min-height:\s*34px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.76\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.timeline-control button:hover,\s*body \.timeline-control button:focus-visible,\s*body \.map-density-control button:hover,\s*body \.map-density-control button:focus-visible,\s*body \.map-density-control button\.active\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.3\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.78\)[^}]*transform:\s*translateY\(-1px\)/s);
  assert.match(css, /body \.map-filter-bar\s*\{[^}]*gap:\s*7px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.map-density-control\s*\{[^}]*gap:\s*7px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
});

test('premium dashboard controls read as tactile analytical filters', () => {
  const css = readAppCss();

  assert.match(css, /body \.dashboard-controls\s*\{[^}]*gap:\s*9px/s);
  assert.match(css, /body \.dashboard-scope-toggle button,\s*body \.dashboard-range-toggle button\s*\{[^}]*min-height:\s*32px[^}]*border:\s*1px solid transparent[^}]*background:\s*transparent[^}]*transition:\s*border-color 0\.16s ease,\s*background-color 0\.16s ease,\s*color 0\.16s ease,\s*box-shadow 0\.16s ease,\s*transform 0\.16s ease/s);
  assert.match(css, /body \.dashboard-scope-toggle button:hover:not\(:disabled\),\s*body \.dashboard-scope-toggle button:focus-visible,\s*body \.dashboard-range-toggle button:hover,\s*body \.dashboard-range-toggle button:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.18\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.62\)[^}]*transform:\s*translateY\(-1px\)/s);
  assert.match(css, /body \.dashboard-scope-toggle button\.active,\s*body \.dashboard-range-toggle button\.active\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.22\)[^}]*background:\s*var\(--surface-elevated-strong\)[^}]*box-shadow:\s*0 8px 18px rgba\(15,\s*23,\s*42,\s*0\.09\)/s);
  assert.match(css, /body \.dashboard-scope-toggle button:disabled\s*\{[^}]*color:\s*rgba\(76,\s*94,\s*108,\s*0\.72\)[^}]*background:\s*rgba\(15,\s*23,\s*42,\s*0\.035\)[^}]*box-shadow:\s*none/s);
  assert.match(css, /body \.dashboard-top-list button,\s*body \.dashboard-bar-row\s*\{[^}]*min-height:\s*38px[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\)[^}]*transition:\s*border-color 0\.16s ease,\s*background-color 0\.16s ease,\s*box-shadow 0\.16s ease,\s*transform 0\.16s ease/s);
  assert.match(css, /body \.dashboard-top-list button:hover:not\(:disabled\),\s*body \.dashboard-top-list button:focus-visible,\s*body \.dashboard-bar-row:hover,\s*body \.dashboard-bar-row:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.26\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.68\)[^}]*box-shadow:\s*0 10px 22px rgba\(15,\s*118,\s*110,\s*0\.1\)[^}]*transform:\s*translateY\(-1px\)/s);
});

test('premium dashboard signals read as a triaged intelligence feed', () => {
  const css = readAppCss();

  assert.match(css, /body \.signals-card\s*\{[^}]*gap:\s*9px[^}]*align-content:\s*start/s);
  assert.match(css, /body \.signals-card \.alert\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*display:\s*grid[^}]*gap:\s*5px[^}]*margin:\s*0[^}]*min-height:\s*92px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.76\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.signals-card \.alert::before\s*\{[^}]*content:\s*""[^}]*inset:\s*0 auto 0 0[^}]*width:\s*4px[^}]*background:\s*var\(--accent\)/s);
  assert.match(css, /body \.signals-card \.alert\.high::before\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*var\(--rose\),\s*rgba\(189,\s*75,\s*69,\s*0\.58\)\)/s);
  assert.match(css, /body \.signals-card \.alert\.medium::before\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*var\(--amber\),\s*rgba\(177,\s*124,\s*36,\s*0\.58\)\)/s);
  assert.match(css, /body \.signals-card \.alert\.low::before\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*var\(--sage\),\s*rgba\(47,\s*143,\s*100,\s*0\.58\)\)/s);
  assert.match(css, /body \.signals-card \.alert span\s*\{[^}]*width:\s*fit-content[^}]*min-height:\s*22px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*border-radius:\s*999px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.74\)[^}]*letter-spacing:\s*0/s);
  assert.match(css, /body \.signals-card \.alert h3\s*\{[^}]*margin:\s*0[^}]*font-size:\s*15px[^}]*line-height:\s*1\.25/s);
  assert.match(css, /body \.signals-card \.alert p\s*\{[^}]*color:\s*var\(--ink-2\)[^}]*line-height:\s*1\.42/s);
  assert.match(css, /body \.signals-card \.alert:hover,\s*body \.signals-card \.alert:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.26\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.66\)[^}]*box-shadow:\s*0 12px 26px rgba\(15,\s*118,\s*110,\s*0\.1\)[^}]*transform:\s*translateY\(-1px\)/s);
});

test('premium freshness card reads as a deliberate analytical module', () => {
  const css = readAppCss();

  assert.match(css, /body \.freshness-card\s*\{[^}]*display:\s*grid[^}]*align-content:\s*center[^}]*justify-items:\s*center[^}]*gap:\s*10px/s);
  assert.match(css, /body \.dashboard-donut\s*\{[^}]*width:\s*132px[^}]*height:\s*132px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*conic-gradient\([^}]*box-shadow:\s*inset 0 0 0 1px rgba\(255,\s*255,\s*255,\s*0\.72\),\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.dashboard-donut::after\s*\{[^}]*content:\s*""[^}]*inset:\s*16px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.9\)/s);
  assert.match(css, /body \.dashboard-donut b\s*\{[^}]*position:\s*relative[^}]*z-index:\s*1[^}]*font-size:\s*30px[^}]*line-height:\s*1/s);
  assert.match(css, /body \.dashboard-donut-caption\s*\{[^}]*width:\s*fit-content[^}]*border:\s*1px solid var\(--panel-border\)[^}]*border-radius:\s*999px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.74\)[^}]*color:\s*var\(--muted\)/s);
  assert.match(css, /body \.dashboard-legend\s*\{[^}]*gap:\s*7px[^}]*justify-content:\s*center/s);
  assert.match(css, /body \.dashboard-legend button\s*\{[^}]*min-height:\s*30px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.dashboard-donut:hover,\s*body \.dashboard-donut:focus-visible,\s*body \.dashboard-legend button:hover,\s*body \.dashboard-legend button:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.26\)[^}]*background-color:\s*rgba\(223,\s*244,\s*238,\s*0\.72\)[^}]*transform:\s*translateY\(-1px\)/s);
});

test('premium relation mix bars read as precise temporal evidence rows', () => {
  const css = readAppCss();

  assert.match(css, /body \.relation-mix-card \.dashboard-bars\s*\{[^}]*gap:\s*8px[^}]*align-content:\s*center/s);
  assert.match(css, /body \.relation-mix-card \.dashboard-bar-row\s*\{[^}]*grid-template-columns:\s*minmax\(126px,\s*0\.78fr\) minmax\(0,\s*1\.35fr\) minmax\(34px,\s*auto\)[^}]*min-height:\s*42px[^}]*padding:\s*9px 10px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\),\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.relation-mix-card \.dashboard-bar-row span\s*\{[^}]*color:\s*var\(--ink\)[^}]*font-size:\s*12px[^}]*font-weight:\s*760/s);
  assert.match(css, /body \.relation-mix-card \.dashboard-bar-row i\s*\{[^}]*height:\s*9px[^}]*border:\s*1px solid rgba\(15,\s*23,\s*42,\s*0\.06\)[^}]*background:\s*rgba\(15,\s*23,\s*42,\s*0\.045\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.82\)/s);
  assert.match(css, /body \.relation-mix-card \.dashboard-bar-row i b\s*\{[^}]*min-width:\s*4px[^}]*box-shadow:\s*0 0 12px rgba\(15,\s*118,\s*110,\s*0\.16\)/s);
  assert.match(css, /body \.relation-mix-card \.dashboard-bar-row strong\s*\{[^}]*min-width:\s*30px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*border-radius:\s*999px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.76\)[^}]*text-align:\s*center/s);
  assert.match(css, /body \.relation-mix-card \.dashboard-bar-row\.contradiction i b\s*\{[^}]*background:\s*linear-gradient\(90deg,\s*var\(--rose\),\s*rgba\(189,\s*75,\s*69,\s*0\.58\)\)/s);
  assert.match(css, /body \.relation-mix-card \.dashboard-bar-row\.update_or_trend_reversal i b\s*\{[^}]*background:\s*linear-gradient\(90deg,\s*var\(--blue\),\s*rgba\(63,\s*111,\s*181,\s*0\.58\)\)/s);
  assert.match(css, /body \.relation-mix-card \.dashboard-bar-row\.historical_tension i b,\s*body \.relation-mix-card \.dashboard-bar-row\.open_tension i b\s*\{[^}]*background:\s*linear-gradient\(90deg,\s*var\(--amber\),\s*rgba\(177,\s*124,\s*36,\s*0\.58\)\)/s);
  assert.match(css, /body \.relation-mix-card \.dashboard-bar-row\.corroboration i b,\s*body \.relation-mix-card \.dashboard-bar-row\.agreement i b\s*\{[^}]*background:\s*linear-gradient\(90deg,\s*var\(--sage\),\s*rgba\(47,\s*143,\s*100,\s*0\.58\)\)/s);
  assert.match(css, /body \.relation-mix-card \.dashboard-bar-row\.stale_evidence i b\s*\{[^}]*background:\s*linear-gradient\(90deg,\s*var\(--muted\),\s*rgba\(76,\s*94,\s*108,\s*0\.42\)\)/s);
});

test('premium admin workspace reads as a controlled operations console', () => {
  const css = readAppCss();

  assert.match(css, /body \.admin-panel\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(247,\s*250,\s*249,\s*0\.9\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.admin-section,\s*body \.admin-list\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.68\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.admin-section h2,\s*body \.admin-section h3\s*\{[^}]*font-size:\s*15px[^}]*letter-spacing:\s*0[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /body \.admin-row\s*\{[^}]*min-height:\s*54px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.8\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\),\s*var\(--control-shadow\)[^}]*transition:\s*border-color 0\.16s ease,\s*background-color 0\.16s ease,\s*box-shadow 0\.16s ease,\s*transform 0\.16s ease/s);
  assert.match(css, /body \.admin-row small\s*\{[^}]*width:\s*fit-content[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.74\)[^}]*padding:\s*3px 7px/s);
  assert.match(css, /body \.admin-inline-edit button,\s*body \.admin-member-controls button,\s*body \.admin-create-row button,\s*body \.admin-row > button\s*\{[^}]*min-height:\s*34px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.admin-inline-edit button:hover,\s*body \.admin-inline-edit button:focus-visible,\s*body \.admin-member-controls button:hover,\s*body \.admin-member-controls button:focus-visible,\s*body \.admin-create-row button:hover,\s*body \.admin-create-row button:focus-visible,\s*body \.admin-row > button:hover,\s*body \.admin-row > button:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.26\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.72\)[^}]*transform:\s*translateY\(-1px\)/s);
  assert.match(css, /body \.admin-team-checks label\s*\{[^}]*min-height:\s*32px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.74\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
  assert.match(css, /body \.admin-team-checks input\s*\{[^}]*accent-color:\s*var\(--accent\)/s);
});

test('premium archive reads as a scannable evidence browser', () => {
  const css = readAppCss();

  assert.match(css, /body \.archive-workspace \.notes\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(247,\s*250,\s*249,\s*0\.9\)\)[^}]*box-shadow:\s*var\(--panel-shadow\)/s);
  assert.match(css, /body \.archive-workspace \.notes::before\s*\{[^}]*content:\s*""[^}]*height:\s*3px[^}]*background:\s*linear-gradient\(90deg,\s*var\(--accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.7\)\)/s);
  assert.match(css, /body \.archive-count\s*\{[^}]*min-height:\s*28px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.74\)[^}]*color:\s*var\(--muted\)/s);
  assert.match(css, /body \.archive-workspace \.note-card\s*\{[^}]*display:\s*grid[^}]*gap:\s*10px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.archive-workspace \.note-card > div:first-child\s*\{[^}]*display:\s*grid[^}]*gap:\s*4px[^}]*padding-bottom:\s*8px[^}]*border-bottom:\s*1px solid var\(--panel-border\)/s);
  assert.match(css, /body \.archive-workspace \.note-card h3\s*\{[^}]*font-size:\s*17px[^}]*line-height:\s*1\.2[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /body \.archive-workspace \.markdown-preview\s*\{[^}]*max-height:\s*280px[^}]*border:\s*1px solid var\(--panel-border\)[^}]*border-radius:\s*8px[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.7\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.72\)/s);
  assert.match(css, /body \.archive-workspace \.markdown-preview h1,\s*body \.archive-workspace \.markdown-preview h2,\s*body \.archive-workspace \.markdown-preview h3\s*\{[^}]*font-size:\s*15px[^}]*line-height:\s*1\.25/s);
});

test('premium empty states read as actionable quiet guidance', () => {
  const css = readAppCss();

  assert.match(css, /body \.empty\s*\{[^}]*position:\s*relative[^}]*overflow:\s*hidden[^}]*display:\s*grid[^}]*gap:\s*6px[^}]*border:\s*1px dashed rgba\(15,\s*118,\s*110,\s*0\.22\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.empty::before\s*\{[^}]*content:\s*""[^}]*inset:\s*0 auto 0 0[^}]*width:\s*3px[^}]*background:\s*linear-gradient\(180deg,\s*var\(--accent\),\s*rgba\(63,\s*111,\s*181,\s*0\.7\)\)/s);
  assert.match(css, /body \.empty > svg\s*\{[^}]*width:\s*28px[^}]*height:\s*28px[^}]*padding:\s*5px[^}]*color:\s*var\(--accent\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.72\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.empty b\s*\{[^}]*margin:\s*0[^}]*font-size:\s*14px[^}]*line-height:\s*1\.25[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /body \.empty p\s*\{[^}]*max-width:\s*62ch[^}]*color:\s*var\(--ink-2\)[^}]*line-height:\s*1\.45/s);
  assert.match(css, /body \.empty-actions\s*\{[^}]*gap:\s*7px[^}]*margin-top:\s*8px/s);
  assert.match(css, /body \.empty-actions button\s*\{[^}]*min-height:\s*32px[^}]*border-color:\s*var\(--panel-border\)[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)[^}]*box-shadow:\s*var\(--control-shadow\)/s);
  assert.match(css, /body \.empty-actions button:hover,\s*body \.empty-actions button:focus-visible\s*\{[^}]*border-color:\s*rgba\(15,\s*118,\s*110,\s*0\.26\)[^}]*background:\s*rgba\(223,\s*244,\s*238,\s*0\.72\)[^}]*transform:\s*translateY\(-1px\)/s);
});
