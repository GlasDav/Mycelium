import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccess, detectEntities, detectRelations, extractClaims, runPipeline, type Note, type User } from '../src/engine';

const analyst: User = { id: 'a', name: 'Analyst', role: 'Analyst', team: 'Semis' };
const pm: User = { id: 'p', name: 'PM', role: 'PM', team: 'Portfolio' };
const base = { authorId: 'a', team: 'Semis', visibility: 'team' as const, sourceType: 'call', createdAt: '2026-05-01' };

test('extracts entities and claims from investment notes', () => {
  const note: Note = { ...base, id: 'n1', title: 'note', body: 'Nvidia demand is strong and GPU supply is tight. Apple iPhone demand is soft.' };
  const entities = detectEntities(note.body);
  assert(entities.some(e => e.name === 'Nvidia' && e.kind === 'company'));
  assert(entities.some(e => e.name === 'NVDA' && e.kind === 'ticker'));
  const claims = extractClaims(note);
  assert.equal(claims.length, 2);
  assert.equal(claims[0].direction, 'positive');
  assert.equal(claims[1].direction, 'negative');
});

test('permission model hides other-team restricted notes from analysts', () => {
  const hidden: Note = { ...base, id: 'n2', title: 'hidden', team: 'Consumer', authorId: 'other', body: 'Apple demand is weak.' };
  assert.equal(canAccess(analyst, hidden), false);
  assert.equal(canAccess(pm, hidden), true);
});

test('detects contradictions across accessible claims', () => {
  const notes: Note[] = [
    { ...base, id: 'n1', title: 'bull', body: 'Nvidia demand is strong and GPU supply is tight.' },
    { ...base, id: 'n2', title: 'bear', body: 'Nvidia demand is weak as cloud capex slows.' }
  ];
  const graph = runPipeline(notes, analyst);
  assert(graph.relations.some(r => r.type === 'contradiction'));
  assert(graph.alerts.some(a => a.severity === 'high'));
});
