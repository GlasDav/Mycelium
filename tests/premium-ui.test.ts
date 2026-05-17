import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommandItems,
  buildContextHeaderModel,
  buildDashboardDrilldown,
  buildMetadataTokenOptions,
  filterCommandItems,
  saveStatusLabel,
  type PremiumCommandContext
} from '../src/premium-ui';

const baseCommandContext: PremiumCommandContext = {
  viewMode: 'notes',
  canSaveNote: true,
  canOpenHistory: true,
  canUseAdmin: false,
  hasNoteFilters: true,
  hasMapFilters: true,
  noteImportOpen: false,
  selectedNoteTitle: 'Nvidia channel check'
};

test('context header model summarizes page, note, scope, as-of, and save state', () => {
  const model = buildContextHeaderModel({
    viewMode: 'map',
    userRole: 'PM',
    teamName: 'Semis',
    selectedNoteTitle: 'Nvidia channel check',
    accessScope: 'team',
    mapAsOf: '2026-05-01',
    latestAsOf: '2026-05-17',
    dirty: true,
    saving: false,
    readOnly: false,
    error: ''
  });

  assert.equal(model.pageLabel, 'Relationship map');
  assert.equal(model.workspaceLabel, 'PM / Semis');
  assert.equal(model.noteLabel, 'Nvidia channel check');
  assert.equal(model.scopeLabel, 'Team');
  assert.equal(model.asOfLabel, 'As of 2026-05-01');
  assert.equal(model.statusLabel, 'Unsaved changes');
  assert.deepEqual(model.badges, ['Team', 'Historical']);
});

test('command palette items expose workflow actions and filter by label or shortcut', () => {
  const items = buildCommandItems(baseCommandContext);

  assert(items.some(item => item.id === 'save-note' && item.shortcut === 'Cmd/Ctrl+Enter' && !item.disabled));
  assert(items.some(item => item.id === 'open-history' && item.label.includes('history')));
  assert(items.some(item => item.id === 'clear-filters'));
  assert(!items.some(item => item.id === 'open-admin'));
  assert.deepEqual(filterCommandItems(items, 'map').map(item => item.id), ['open-map']);
  assert.deepEqual(filterCommandItems(items, 'ctrl enter').map(item => item.id), ['save-note']);
});

test('command palette disables unavailable actions instead of omitting core commands', () => {
  const items = buildCommandItems({ ...baseCommandContext, canSaveNote: false, canOpenHistory: false });

  assert.equal(items.find(item => item.id === 'save-note')?.disabled, true);
  assert.equal(items.find(item => item.id === 'open-history')?.disabled, true);
});

test('metadata token options prefer canonical labels while preserving manual values', () => {
  const options = buildMetadataTokenOptions({
    kind: 'security',
    values: ['NVDA'],
    options: ['nvda us', 'MSFT', 'Custom Basket']
  });

  assert.deepEqual(options.map(option => option.value), ['NVDA', 'MSFT', 'Custom Basket']);
  assert.equal(options.find(option => option.value === 'NVDA')?.label, 'NVDA');
  assert.equal(options.find(option => option.value === 'NVDA')?.detail, 'Nvidia');
  assert.equal(options.find(option => option.value === 'Custom Basket')?.detail, 'Manual security');
});

test('dashboard drilldowns route metrics and widgets to map or archive filters', () => {
  assert.deepEqual(buildDashboardDrilldown('metric-notes', 'Notes'), { viewMode: 'archive' });
  assert.deepEqual(buildDashboardDrilldown('metric-relations', 'Relations'), { viewMode: 'map' });
  assert.deepEqual(buildDashboardDrilldown('relation-type', 'contradiction'), { viewMode: 'map', mapFilters: { relationType: 'contradiction' } });
  assert.deepEqual(buildDashboardDrilldown('freshness', 'stale'), { viewMode: 'map', mapFilters: { freshness: 'stale' } });
  assert.deepEqual(buildDashboardDrilldown('company', 'Nvidia'), { viewMode: 'map', selected: 'Nvidia' });
  assert.deepEqual(buildDashboardDrilldown('security', 'NVDA'), { viewMode: 'map', mapFilters: { security: 'NVDA' } });
  assert.deepEqual(buildDashboardDrilldown('kpi', 'Margins'), { viewMode: 'archive', noteFilters: { kpi: 'Margins' } });
  assert.deepEqual(buildDashboardDrilldown('source-person', 'Dana Lee'), { viewMode: 'archive', noteFilters: { sourcePerson: 'Dana Lee' }, mapFilters: { sourcePerson: 'Dana Lee' } });
});

test('save status label prioritizes saving, errors, read-only, and dirty state', () => {
  assert.equal(saveStatusLabel({ saving: true }), 'Saving...');
  assert.equal(saveStatusLabel({ error: 'Nope' }), 'Needs attention');
  assert.equal(saveStatusLabel({ readOnly: true }), 'Read only');
  assert.equal(saveStatusLabel({ dirty: true }), 'Unsaved changes');
  assert.equal(saveStatusLabel({ draftRecovered: true }), 'Draft recovered');
  assert.equal(saveStatusLabel({ lastSavedAt: '2026-05-17T12:05:00Z' }), 'Saved 12:05');
  assert.equal(saveStatusLabel({}), 'Ready');
});
