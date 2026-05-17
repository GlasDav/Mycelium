import { linkedEntity, mergeLinkedEntities, metadataArraysFromLinkedEntities } from '../entity-links';
import { canAccess, accessScopeFromVisibility } from './access';
import { scoreClaimConfidence } from './confidence';
import { detectEntities } from './entity-extraction';
import { kpiWords, negativeDirectionWords, positiveDirectionWords } from './lexicon';
import { linkedEntitiesForNote, metadataForNote } from './metadata';
import { freshnessFor, inferTemporalWindow } from './temporal';
import type { Claim, Direction, Note, User } from './types';
import { maxDate, slug, sortedUnique } from './utils';

export type ClaimDraftInput = Partial<Claim> & Pick<Claim, 'subject' | 'text'>;

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
      const industries = sortedUnique([...noteMetadata.industries, ...entities.filter(e => e.kind === 'industry').map(e => e.name)]);
      const linkedEntities = mergeLinkedEntities(
        noteLinks,
        [linkedEntity('company', 'subject', company.name)],
        tickers.map(ticker => linkedEntity('security', 'security', ticker.toUpperCase(), { ticker: ticker.toUpperCase() })),
        industries.map(industry => linkedEntity('industry', 'industry', industry)),
        themes.map(theme => linkedEntity('theme', 'theme', theme)),
        kpis.map(kpi => linkedEntity('kpi', 'kpi', kpi))
      );
      const temporal = inferTemporalWindow(note, sentence, asOf);
      const linkedMetadata = metadataArraysFromLinkedEntities(linkedEntities);
      const text = sentence.replace(/\s+/g, ' ');
      const claimThemes = sortedUnique([...themes, ...linkedMetadata.manualThemes]);
      const claimTickers = sortedUnique([...tickers, ...linkedMetadata.tickers]);
      const claimIndustries = sortedUnique([...industries, ...linkedMetadata.industries]);
      const claimCompanyTags = sortedUnique([...companyTags, ...linkedMetadata.companyTags]);
      const claimKpis = sortedUnique([...kpis, ...linkedMetadata.kpis]);
      const claimWatchlistTags = sortedUnique([...noteMetadata.watchlistTags, ...linkedMetadata.watchlistTags]);
      const claimSourcePeople = sortedUnique([...noteMetadata.sourcePeople, ...linkedMetadata.sourcePeople]);
      claims.push({
        id: `${note.id}-${slug(company.name)}-${claims.length}`,
        noteId: note.id,
        subject: company.name,
        text,
        direction: dir,
        evidence: sentence,
        confidence: scoreClaimConfidence({
          direction: dir,
          text,
          evidence: sentence,
          themes: claimThemes,
          tickers: claimTickers,
          industries: claimIndustries,
          companyTags: claimCompanyTags,
          kpis: claimKpis,
          sourcePeople: claimSourcePeople,
          observedAt: temporal.observedAt,
          appliesToStart: temporal.appliesToStart,
          appliesToEnd: temporal.appliesToEnd,
          horizon: temporal.horizon
        }),
        themes: claimThemes,
        tickers: claimTickers,
        industries: claimIndustries,
        companyTags: claimCompanyTags,
        kpis: claimKpis,
        watchlistTags: claimWatchlistTags,
        sourcePeople: claimSourcePeople,
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

export function normalizeClaimDraft(note: Note, draft: ClaimDraftInput, index: number, asOf = maxDate([note.createdAt, note.observedAt])): Claim | undefined {
  const subject = draft.subject.trim();
  const text = draft.text.replace(/\s+/g, ' ').trim();
  if (!subject || !text) return undefined;

  const evidence = (draft.evidence?.trim() || text).replace(/\s+/g, ' ');
  const entities = detectEntities(`${subject}. ${text} ${evidence}`);
  const companies = entities.filter(e => e.kind === 'company');
  const subjectCompany = companies.find(company => company.name.toLowerCase() === subject.toLowerCase()) ?? companies[0];
  const noteMetadata = metadataForNote(note);
  const noteLinks = linkedEntitiesForNote(note);
  const direction = draft.direction ?? directionFor(text);
  const temporal = inferTemporalWindow(note, text, asOf);

  const themes = sortedUnique([
    ...entities.filter(e => e.kind === 'theme').map(e => e.name),
    ...noteMetadata.manualThemes,
    ...(draft.themes ?? [])
  ]);
  const tickers = sortedUnique([
    ...noteMetadata.tickers,
    ...entities.filter(e => e.kind === 'ticker').map(e => e.ticker ?? e.name),
    subjectCompany?.ticker,
    ...(draft.tickers ?? [])
  ].filter(Boolean) as string[]);
  const kpis = sortedUnique([
    ...noteMetadata.kpis,
    ...entities.filter(e => e.kind === 'kpi').map(e => e.name),
    ...(draft.kpis ?? [])
  ]);
  const companyTags = sortedUnique([
    ...noteMetadata.companyTags,
    subjectCompany?.name ?? subject,
    ...(draft.companyTags ?? [])
  ]);
  const industries = sortedUnique([
    ...noteMetadata.industries,
    ...entities.filter(e => e.kind === 'industry').map(e => e.name),
    ...(draft.industries ?? [])
  ]);
  const linkedEntities = mergeLinkedEntities(
    noteLinks,
    draft.linkedEntities,
    [linkedEntity('company', 'subject', subjectCompany?.name ?? subject)],
    tickers.map(ticker => linkedEntity('security', 'security', ticker.toUpperCase(), { ticker: ticker.toUpperCase() })),
    industries.map(industry => linkedEntity('industry', 'industry', industry)),
    themes.map(theme => linkedEntity('theme', 'theme', theme)),
    kpis.map(kpi => linkedEntity('kpi', 'kpi', kpi))
  );
  const linkedMetadata = metadataArraysFromLinkedEntities(linkedEntities);
  const claimThemes = sortedUnique([...themes, ...linkedMetadata.manualThemes]);
  const claimTickers = sortedUnique([...tickers, ...linkedMetadata.tickers]);
  const claimIndustries = sortedUnique([...industries, ...linkedMetadata.industries]);
  const claimCompanyTags = sortedUnique([...companyTags, ...linkedMetadata.companyTags]);
  const claimKpis = sortedUnique([...kpis, ...linkedMetadata.kpis]);
  const claimWatchlistTags = sortedUnique([...noteMetadata.watchlistTags, ...(draft.watchlistTags ?? []), ...linkedMetadata.watchlistTags]);
  const claimSourcePeople = sortedUnique([...noteMetadata.sourcePeople, ...(draft.sourcePeople ?? []), ...linkedMetadata.sourcePeople]);
  const observedAt = draft.observedAt ?? temporal.observedAt;
  const appliesToStart = draft.appliesToStart ?? temporal.appliesToStart;
  const appliesToEnd = Object.prototype.hasOwnProperty.call(draft, 'appliesToEnd') ? draft.appliesToEnd : temporal.appliesToEnd;
  const horizon = draft.horizon ?? temporal.horizon;
  const confidence = typeof draft.confidence === 'number'
    ? draft.confidence
    : scoreClaimConfidence({
      direction,
      text,
      evidence,
      themes: claimThemes,
      tickers: claimTickers,
      industries: claimIndustries,
      companyTags: claimCompanyTags,
      kpis: claimKpis,
      sourcePeople: claimSourcePeople,
      observedAt,
      appliesToStart,
      appliesToEnd,
      horizon
    });

  return {
    id: draft.id ?? `${note.id}-${slug(subjectCompany?.name ?? subject)}-${index}`,
    noteId: draft.noteId ?? note.id,
    subject: subjectCompany?.name ?? subject,
    text,
    direction,
    evidence,
    confidence,
    themes: claimThemes,
    tickers: claimTickers,
    industries: claimIndustries,
    companyTags: claimCompanyTags,
    kpis: claimKpis,
    watchlistTags: claimWatchlistTags,
    sourcePeople: claimSourcePeople,
    linkedEntities,
    createdAt: draft.createdAt ?? note.createdAt,
    observedAt,
    appliesToStart,
    appliesToEnd,
    horizon,
    freshness: draft.freshness ?? freshnessFor(appliesToEnd ?? observedAt, asOf),
    authorId: draft.authorId ?? note.authorId,
    visibility: draft.visibility ?? note.visibility,
    accessScope: draft.accessScope ?? note.accessScope ?? accessScopeFromVisibility(note.visibility),
    team: draft.team ?? note.team,
    teamId: draft.teamId ?? note.teamId
  };
}

export function buildClaims(notes: Note[], user: User): Claim[] {
  const asOf = maxDate(notes.flatMap(n => [n.createdAt, n.observedAt]).filter(Boolean) as string[]);
  return notes.filter(n => canAccess(user, n)).flatMap(note => extractClaims(note, asOf));
}
