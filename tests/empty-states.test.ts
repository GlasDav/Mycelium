import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyStateForNotes,
  emptyStateForRelations,
  emptyStates,
  type EmptyStateActionTarget,
  type EmptyStateId
} from '../src/empty-states';

test('note archive and sidebar empty copy distinguishes true empty workspace from filtered no-results', () => {
  const trueEmpty = emptyStateForNotes({ hasWorkspaceNotes: false, hasActiveFilters: false });
  const filtered = emptyStateForNotes({ hasWorkspaceNotes: true, hasActiveFilters: true });

  assert.equal(trueEmpty.id, 'no-workspace-notes');
  assert.match(trueEmpty.title, /no notes/i);
  assert.match(trueEmpty.body, /first note/i);
  assert.deepEqual(trueEmpty.actions.map(action => action.target), ['capture']);

  assert.equal(filtered.id, 'no-filtered-notes');
  assert.match(filtered.title, /match/i);
  assert.match(filtered.body, /clear/i);
  assert.deepEqual(filtered.actions.map(action => action.target), ['clear-filters']);
});

test('graph and subject empty copy says the first note creates the company view', () => {
  const state = emptyStates['no-graph'];

  assert.match(state.title, /company view/i);
  assert.match(state.body, /first note creates the company view/i);
  assert.deepEqual(state.actions.map(action => action.target), ['capture']);
});

test('review claims empty copy points users back to capture and extraction', () => {
  const state = emptyStates['no-review-claims'];

  assert.match(state.title, /claims/i);
  assert.match(state.body, /capture/i);
  assert.match(state.body, /extraction/i);
  assert.deepEqual(state.actions.map(action => action.target), ['capture']);
});

test('relation empty copy distinguishes true no relations from filter no-results', () => {
  const trueEmpty = emptyStateForRelations({ hasRelations: false, hasActiveFilters: false });
  const filtered = emptyStateForRelations({ hasRelations: true, hasActiveFilters: true });

  assert.equal(trueEmpty.id, 'no-relations');
  assert.match(trueEmpty.body, /capture/i);
  assert.match(trueEmpty.body, /review/i);
  assert.deepEqual(trueEmpty.actions.map(action => action.target), ['capture']);

  assert.equal(filtered.id, 'no-filtered-relations');
  assert.match(filtered.title, /match/i);
  assert.match(filtered.body, /clear/i);
  assert.deepEqual(filtered.actions.map(action => action.target), ['clear-filters']);
});

test('source-person empty copy points users to participants and source people', () => {
  const state = emptyStates['no-source-person-history'];

  assert.match(state.title, /source-person/i);
  assert.match(state.body, /participants/i);
  assert.match(state.body, /source people/i);
  assert.deepEqual(state.actions.map(action => action.target), ['capture']);
});

test('states with next steps have title, body, and action labels with targets', () => {
  const stateIdsWithNextSteps: EmptyStateId[] = [
    'no-workspace-notes',
    'no-filtered-notes',
    'no-graph',
    'no-review-claims',
    'no-relations',
    'no-filtered-relations',
    'no-source-person-history'
  ];
  const validTargets: EmptyStateActionTarget[] = ['capture', 'clear-filters', 'map', 'archive'];

  for (const id of stateIdsWithNextSteps) {
    const state = emptyStates[id];

    assert.equal(state.id, id);
    assert.ok(state.title.trim(), `${id} needs a title`);
    assert.ok(state.body.trim(), `${id} needs body copy`);
    assert.ok(state.actions.length > 0, `${id} needs at least one action`);

    for (const action of state.actions) {
      assert.ok(action.label.trim(), `${id} action needs a label`);
      assert.ok(validTargets.includes(action.target), `${id} action target must be UI-mappable`);
    }
  }
});
