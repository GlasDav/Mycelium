import { linkedEntity, mergeLinkedEntities } from '../entity-links';
import { canAccess, accessScopeFromVisibility } from './access';
import { detectEntities } from './entity-extraction';
import { kpiWords, negativeDirectionWords, positiveDirectionWords } from './lexicon';
import { linkedEntitiesForNote, metadataForNote } from './metadata';
import { freshnessFor, inferTemporalWindow } from './temporal';
import type { Claim, Direction, Note, User } from './types';
import { maxDate, slug, sortedUnique } from './utils';

export function directionFor(sentence: string): Direction {
  const lower = sentence.toLowerCase();
  const pos = positiveDirectionWords.some(w => lower.includes(w));
  const neg = negativeDirectionWords.some(w => lower.includes(w));
  if (pos && !neg) return 'positive';
  if (neg && !pos) return 'negative';
  if (pos && neg) return lower.indexOf('but') > -1 || lower.indexOf('however') > -1 ? 'neutral' : 'negative';
  return 'neutral';
}

export function extractClaims(note: Note, asOf = maxDate([note.createdAt, note.observedAt])): Claim[] {
  const sentences = note.body.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const claims: Claim[] = [];
  const noteMetadata = metadataForNote(note);
  const noteLinks = linkedEntitiesForNote(note);
  for (const sentence of sentences) {
    const entities = detectEntities(sentence);
    const companies = entities.filter(e => e.kind === 'company');
    if (!companies.length) continue;
    const dir = directionFor(sentence);
    if (dir === 'neutral' && !kpiWords.some(k => sentence.toLowerCase().includes(k))) continue;
    for (const company of companies) {
      const themes = sortedUnique([...entities.filter(e => e.kind === 'theme').map(e => e.name), ...noteMetadata.manualThemes]);
      const tickers = sortedUnique([
        ...noteMetadata.tickers,
        ...entities.filter(e => e.kind === 'ticker').map(e => e.ticker ?? e.name),
        company.ticker
      ].filter(Boolean) as string[]);
      const kpis = sortedUnique([...noteMetadata.kpis, ...entities.filter(e => e.kind === 'kpi').map(e => e.name)]);
      const companyTags = sortedUnique([...noteMetadata.companyTags, company.name]);
      const linkedEntities = mergeLinkedEntities(
        noteLinks,
        [linkedEntity('company', 'subject', company.name)],
        tickers.map(ticker => linkedEntity('security', 'security', ticker.toUpperCase(), { ticker: ticker.toUpperCase() })),
        themes.map(theme => linkedEntity('theme', 'theme', theme)),
        kpis.map(kpi => linkedEntity('kpi', 'kpi', kpi))
      );
      const temporal = inferTemporalWindow(note, sentence, asOf);
      claims.push({
        id: `${note.id}-${slug(company.name)}-${claims.length}`,
        noteId: note.id,
        subject: company.name,
        text: sentence.replace(/\s+/g, ' '),
        direction: dir,
        evidence: sentence,
        confidence: dir === 'neutral' ? 0.62 : 0.78,
        themes,
        tickers,
        industries: noteMetadata.industries,
        companyTags,
        kpis,
        watchlistTags: noteMetadata.watchlistTags,
        sourcePeople: noteMetadata.sourcePeople,
        linkedEntities,
        createdAt: note.createdAt,
        observedAt: temporal.observedAt,
        appliesToStart: temporal.appliesToStart,
        appliesToEnd: temporal.appliesToEnd,
        horizon: temporal.horizon,
        freshness: freshnessFor(temporal.appliesToEnd ?? temporal.observedAt, asOf),
        authorId: note.authorId,
        visibility: note.visibility,
        accessScope: note.accessScope ?? accessScopeFromVisibility(note.visibility),
        team: note.team,
        teamId: note.teamId
      });
    }
  }
  return claims;
}

export function buildClaims(notes: Note[], user: User): Claim[] {
  const asOf = maxDate(notes.flatMap(n => [n.createdAt, n.observedAt]).filter(Boolean) as string[]);
  return notes.filter(n => canAccess(user, n)).flatMap(note => extractClaims(note, asOf));
}
