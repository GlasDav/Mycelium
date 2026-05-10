import { canAccess } from './access';
import { generateAlerts } from './alerts';
import { buildClaims } from './claim-extraction';
import { detectRelations } from './relation-classification';
import { buildPersonMemory, synthesize } from './synthesis';
import type { Note, User } from './types';
import { maxDate, uniqueBy } from './utils';

export function runPipeline(notes: Note[], user: User) {
  const visibleNotes = notes.filter(n => canAccess(user, n));
  const claims = buildClaims(notes, user);
  const relations = detectRelations(claims);
  const alerts = generateAlerts(relations, claims);
  const companies = uniqueBy(claims.map(c => c.subject), x => x).map(subject => synthesize(claims, relations, subject));
  const themes = uniqueBy(claims.flatMap(c => c.themes), x => x).map(theme => synthesize(claims, relations, theme));
  const people = buildPersonMemory(claims, relations);
  return { visibleNotes, claims, relations, alerts, companies, themes, people, asOf: maxDate(claims.map(c => c.observedAt)) };
}
