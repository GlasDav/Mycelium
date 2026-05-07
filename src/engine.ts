export type Visibility = 'public' | 'team' | 'private';
export type Role = 'Analyst' | 'PM' | 'Compliance' | 'Guest';
export type Direction = 'positive' | 'negative' | 'neutral';
export type Horizon = 'point_in_time' | 'near_term' | 'quarter' | 'year' | 'unknown';
export type Freshness = 'fresh' | 'aging' | 'stale';
export type RelationType = 'contradiction' | 'update_or_trend_reversal' | 'historical_tension' | 'open_tension' | 'corroboration' | 'agreement' | 'stale_evidence';

export interface User { id: string; name: string; role: Role; team: string; }
export interface Note {
  id: string;
  title: string;
  body: string;
  authorId: string;
  team: string;
  visibility: Visibility;
  sourceType: string;
  createdAt: string;
  observedAt?: string;
  appliesToStart?: string;
  appliesToEnd?: string;
  horizon?: Horizon;
  tickers?: string[];
  manualThemes?: string[];
  kpis?: string[];
}
export interface Entity { name: string; kind: 'company' | 'ticker' | 'theme' | 'kpi'; ticker?: string; }
export interface Claim {
  id: string;
  noteId: string;
  subject: string;
  text: string;
  direction: Direction;
  evidence: string;
  confidence: number;
  themes: string[];
  createdAt: string;
  observedAt: string;
  appliesToStart: string;
  appliesToEnd?: string;
  horizon: Horizon;
  freshness: Freshness;
  authorId: string;
  visibility: Visibility;
  team: string;
}
export interface Relation { id: string; type: RelationType; a: Claim; b: Claim; reason: string; score: number; overlapDays: number; }
export interface Alert { id: string; severity: 'high' | 'medium' | 'low'; title: string; body: string; relation?: Relation; company?: string; }

export const companyLexicon: Record<string, { ticker: string; aliases: string[]; themes: string[] }> = {
  Nvidia: { ticker: 'NVDA', aliases: ['nvidia', 'nvda', 'gpu', 'h100', 'blackwell'], themes: ['AI infrastructure', 'Semiconductors'] },
  Apple: { ticker: 'AAPL', aliases: ['apple', 'aapl', 'iphone', 'app store'], themes: ['Consumer hardware', 'Services'] },
  Tesla: { ticker: 'TSLA', aliases: ['tesla', 'tsla', 'model y', 'supercharger'], themes: ['EV demand', 'Autonomy'] },
  Shopify: { ticker: 'SHOP', aliases: ['shopify', 'shop', 'merchant'], themes: ['SMB commerce', 'Payments'] },
  Microsoft: { ticker: 'MSFT', aliases: ['microsoft', 'msft', 'azure', 'copilot'], themes: ['AI infrastructure', 'Enterprise software'] }
};

export const themeLexicon = ['AI infrastructure', 'Semiconductors', 'EV demand', 'Autonomy', 'Consumer hardware', 'Services', 'SMB commerce', 'Payments', 'Enterprise software', 'Cloud spend'];
export const kpiWords = ['revenue', 'margin', 'gross margin', 'demand', 'inventory', 'capex', 'orders', 'churn', 'pricing', 'utilization', 'growth', 'supply'];
const positive = ['accelerat', 'strong', 'improv', 'beat', 'expanding', 'tight', 'robust', 'upside', 'recover', 'increase', 'higher', 'raised'];
const negative = ['slow', 'weak', 'declin', 'miss', 'pressure', 'soft', 'excess', 'risk', 'downside', 'cut', 'lower', 'delay'];
const DAY = 24 * 60 * 60 * 1000;

export function canAccess(user: User, noteOrClaim: Pick<Note | Claim, 'visibility' | 'team' | 'authorId'>): boolean {
  if (user.role === 'PM' || user.role === 'Compliance') return true;
  if (noteOrClaim.visibility === 'public') return true;
  if (noteOrClaim.visibility === 'team') return noteOrClaim.team === user.team;
  return noteOrClaim.authorId === user.id;
}

export function detectEntities(text: string): Entity[] {
  const lower = text.toLowerCase();
  const entities: Entity[] = [];
  for (const [name, meta] of Object.entries(companyLexicon)) {
    if (meta.aliases.some(alias => lower.includes(alias))) {
      entities.push({ name, kind: 'company', ticker: meta.ticker });
      entities.push({ name: meta.ticker, kind: 'ticker' });
      meta.themes.forEach(theme => entities.push({ name: theme, kind: 'theme' }));
    }
  }
  themeLexicon.forEach(theme => { if (lower.includes(theme.toLowerCase())) entities.push({ name: theme, kind: 'theme' }); });
  kpiWords.forEach(kpi => { if (lower.includes(kpi)) entities.push({ name: kpi, kind: 'kpi' }); });
  return uniqueBy(entities, e => `${e.kind}:${e.name}`);
}

export function directionFor(sentence: string): Direction {
  const lower = sentence.toLowerCase();
  const pos = positive.some(w => lower.includes(w));
  const neg = negative.some(w => lower.includes(w));
  if (pos && !neg) return 'positive';
  if (neg && !pos) return 'negative';
  if (pos && neg) return lower.indexOf('but') > -1 || lower.indexOf('however') > -1 ? 'neutral' : 'negative';
  return 'neutral';
}

export function extractClaims(note: Note, asOf = maxDate([note.createdAt, note.observedAt])): Claim[] {
  const sentences = note.body.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const claims: Claim[] = [];
  for (const sentence of sentences) {
    const entities = detectEntities(sentence);
    const companies = entities.filter(e => e.kind === 'company');
    if (!companies.length) continue;
    const dir = directionFor(sentence);
    if (dir === 'neutral' && !kpiWords.some(k => sentence.toLowerCase().includes(k))) continue;
    for (const company of companies) {
      const themes = uniqueBy([...entities.filter(e => e.kind === 'theme').map(e => e.name), ...(note.manualThemes ?? [])], x => x);
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
        createdAt: note.createdAt,
        observedAt: temporal.observedAt,
        appliesToStart: temporal.appliesToStart,
        appliesToEnd: temporal.appliesToEnd,
        horizon: temporal.horizon,
        freshness: freshnessFor(temporal.appliesToEnd ?? temporal.observedAt, asOf),
        authorId: note.authorId,
        visibility: note.visibility,
        team: note.team
      });
    }
  }
  return claims;
}

export function buildClaims(notes: Note[], user: User): Claim[] {
  const asOf = maxDate(notes.flatMap(n => [n.createdAt, n.observedAt]).filter(Boolean) as string[]);
  return notes.filter(n => canAccess(user, n)).flatMap(note => extractClaims(note, asOf));
}

export function detectRelations(claims: Claim[]): Relation[] {
  const relations: Relation[] = [];
  const asOf = maxDate(claims.map(c => c.observedAt));
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const a = claims[i], b = claims[j];
      if (a.subject !== b.subject || a.noteId === b.noteId) continue;
      const sharedThemes = a.themes.filter(t => b.themes.includes(t));
      const sharedWords = overlapKeywords(a.text, b.text);
      const related = sharedThemes.length || sharedWords >= 2;
      if (!related) continue;
      const relation = classifyTemporalRelation(a, b, sharedWords, asOf);
      if (relation) relations.push(relation);
    }
  }
  return relations.sort((a,b) => b.score - a.score);
}

export function classifyTemporalRelation(a: Claim, b: Claim, sharedWords = overlapKeywords(a.text, b.text), asOf = maxDate([a.observedAt, b.observedAt])): Relation | null {
  const opposing = a.direction !== 'neutral' && b.direction !== 'neutral' && a.direction !== b.direction;
  const aligned = a.direction === b.direction && a.direction !== 'neutral';
  if (!opposing && !aligned) return null;

  const overlapDays = windowOverlapDays(a, b);
  const compatible = windowsCompatible(a, b);
  const older = Date.parse(a.observedAt) <= Date.parse(b.observedAt) ? a : b;
  const newer = older === a ? b : a;
  const observationGap = Math.abs(daysBetween(a.observedAt, b.observedAt));
  const id = `rel-${a.id}-${b.id}`;
  const baseScore = 0.6 + Math.min(0.24, sharedWords / 24);

  // True contradictions require opposing claims about the same topic whose valid decision windows materially overlap.
  if (opposing && overlapDays >= 30) {
    return { id, type: 'contradiction', a, b, overlapDays, reason: `Opposing ${a.subject} claims overlap for ${overlapDays} days (${formatWindow(a)} vs ${formatWindow(b)}).`, score: baseScore + 0.16 };
  }

  // If windows do not overlap and the later observation reverses the older one, the map should read this as time-series change, not bad data.
  if (opposing && overlapDays === 0 && observationGap >= 120) {
    return { id, type: 'update_or_trend_reversal', a: older, b: newer, overlapDays, reason: `Newer claim reverses an older read after ${observationGap} days, with non-overlapping windows (${formatWindow(older)} → ${formatWindow(newer)}).`, score: baseScore + 0.1 };
  }

  // Short gaps, broad horizons, and tiny overlaps are ambiguous enough to keep in the tension bucket for analyst review.
  if (opposing) {
    const type: RelationType = overlapDays > 0 ? 'historical_tension' : 'open_tension';
    return { id, type, a, b, overlapDays, reason: `Opposing reads have ${overlapDays ? `only ${overlapDays} days of overlap` : 'no material overlap'} and ambiguous horizon/date context (${formatWindow(a)} vs ${formatWindow(b)}).`, score: baseScore };
  }

  if (aligned && compatible) {
    return { id, type: 'corroboration', a, b, overlapDays, reason: `Aligned ${a.subject} claims share compatible windows (${formatWindow(a)} and ${formatWindow(b)}).`, score: baseScore + 0.08 };
  }

  if (aligned && isStale(older, asOf)) {
    return { id, type: 'stale_evidence', a: older, b: newer, overlapDays, reason: `Older aligned evidence is stale as of ${asOf}: ${formatWindow(older)} is no longer likely decision-useful beside ${formatWindow(newer)}.`, score: baseScore - 0.08 };
  }

  if (aligned) {
    return { id, type: 'agreement', a, b, overlapDays, reason: `Aligned claims reinforce the same direction, but date windows are separated (${formatWindow(a)} vs ${formatWindow(b)}).`, score: baseScore };
  }
  return null;
}

export function synthesize(claims: Claim[], relations: Relation[], subject: string) {
  const scoped = claims.filter(c => c.subject === subject || c.themes.includes(subject));
  const current = scoped.filter(c => c.freshness !== 'stale');
  const historical = scoped.filter(c => c.freshness === 'stale');
  const positives = current.filter(c => c.direction === 'positive').length;
  const negatives = current.filter(c => c.direction === 'negative').length;
  const historicalPositives = historical.filter(c => c.direction === 'positive').length;
  const historicalNegatives = historical.filter(c => c.direction === 'negative').length;
  const relevantRelations = relations.filter(r => r.a.subject === subject || r.a.themes.includes(subject));
  const contradictions = relevantRelations.filter(r => r.type === 'contradiction').length;
  const tensions = relevantRelations.filter(r => r.type === 'historical_tension' || r.type === 'open_tension').length;
  const updates = relevantRelations.filter(r => r.type === 'update_or_trend_reversal').length;
  const staleEvidence = relevantRelations.filter(r => r.type === 'stale_evidence').length + historical.length;
  const stance = positives > negatives ? 'constructive' : negatives > positives ? 'cautious' : 'mixed';
  const topThemes = tally(scoped.flatMap(c => c.themes)).slice(0, 4).map(x => x[0]);
  return { subject, stance, positives, negatives, historicalPositives, historicalNegatives, total: scoped.length, currentTotal: current.length, historicalTotal: historical.length, contradictions, tensions, updates, staleEvidence, topThemes, summary: `${subject} current view reads ${stance}: ${positives} supportive and ${negatives} skeptical fresh claims. Historical evidence adds ${historical.length} older claim${historical.length === 1 ? '' : 's'}; ${updates} trend reversal${updates === 1 ? '' : 's'} and ${contradictions} true contradiction${contradictions === 1 ? '' : 's'} are visible.` };
}

export function generateAlerts(relations: Relation[], claims: Claim[]): Alert[] {
  const alerts: Alert[] = relations.slice(0, 8).map((r, i) => ({
    id: `alert-${i}`,
    severity: r.type === 'contradiction' ? 'high' : r.type === 'open_tension' || r.type === 'historical_tension' ? 'medium' : 'low',
    title: relationTitle(r),
    body: `${r.a.text} ↔ ${r.b.text}`,
    relation: r,
    company: r.a.subject
  }));
  const clusters = tally(claims.filter(c => c.freshness !== 'stale').map(c => c.subject)).filter(([, count]) => count >= 3);
  clusters.forEach(([company, count]) => alerts.push({ id: `cluster-${company}`, severity: 'low', title: `${company} current research density rising`, body: `${count} accessible fresh claims now mention ${company}.`, company }));
  return alerts;
}

export function runPipeline(notes: Note[], user: User) {
  const visibleNotes = notes.filter(n => canAccess(user, n));
  const claims = buildClaims(notes, user);
  const relations = detectRelations(claims);
  const alerts = generateAlerts(relations, claims);
  const companies = uniqueBy(claims.map(c => c.subject), x => x).map(subject => synthesize(claims, relations, subject));
  const themes = uniqueBy(claims.flatMap(c => c.themes), x => x).map(theme => synthesize(claims, relations, theme));
  return { visibleNotes, claims, relations, alerts, companies, themes, asOf: maxDate(claims.map(c => c.observedAt)) };
}

export function relationLabel(type: RelationType): string {
  return ({
    contradiction: 'True contradiction',
    update_or_trend_reversal: 'Update / trend reversal',
    historical_tension: 'Historical tension',
    open_tension: 'Possible contradiction',
    corroboration: 'Corroboration',
    agreement: 'Agreement',
    stale_evidence: 'Stale evidence'
  })[type];
}

function relationTitle(r: Relation): string {
  return `${relationLabel(r.type)} on ${r.a.subject}`;
}

function inferTemporalWindow(note: Note, sentence: string, asOf: string): Pick<Claim, 'observedAt' | 'appliesToStart' | 'appliesToEnd' | 'horizon'> {
  const observedAt = note.observedAt ?? note.createdAt;
  const horizon = note.horizon ?? inferHorizon(sentence, note.sourceType);
  const start = note.appliesToStart ?? observedAt;
  const end = note.appliesToEnd ?? addDays(start, horizonDays(horizon));
  return { observedAt, appliesToStart: start, appliesToEnd: end, horizon };
}

function inferHorizon(sentence: string, sourceType: string): Horizon {
  const lower = `${sentence} ${sourceType}`.toLowerCase();
  if (/today|spot|current|channel check|dealer|supplier/.test(lower)) return 'near_term';
  if (/q[1-4]|quarter|90 day/.test(lower)) return 'quarter';
  if (/year|12 month|fy\d{2}|annual/.test(lower)) return 'year';
  return 'near_term';
}

function horizonDays(horizon: Horizon): number {
  return ({ point_in_time: 14, near_term: 90, quarter: 120, year: 365, unknown: 180 })[horizon];
}

function windowsCompatible(a: Claim, b: Claim): boolean {
  return windowOverlapDays(a, b) >= 15 || Math.abs(daysBetween(a.observedAt, b.observedAt)) <= 45;
}

function windowOverlapDays(a: Claim, b: Claim): number {
  const start = Math.max(Date.parse(a.appliesToStart), Date.parse(b.appliesToStart));
  const end = Math.min(Date.parse(a.appliesToEnd ?? addDays(a.appliesToStart, horizonDays(a.horizon))), Date.parse(b.appliesToEnd ?? addDays(b.appliesToStart, horizonDays(b.horizon))));
  return Math.max(0, Math.round((end - start) / DAY));
}

function freshnessFor(windowEnd: string, asOf: string): Freshness {
  const age = daysBetween(windowEnd, asOf);
  if (age <= 30) return 'fresh';
  if (age <= 180) return 'aging';
  return 'stale';
}

function isStale(claim: Claim, asOf: string): boolean {
  return claim.freshness === 'stale' || daysBetween(claim.appliesToEnd ?? claim.observedAt, asOf) > 180;
}

function formatWindow(c: Claim): string {
  return `${c.appliesToStart}–${c.appliesToEnd ?? 'open'} (${c.horizon}, ${c.freshness})`;
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

function maxDate(dates: (string | undefined)[]): string {
  const valid = dates.filter(Boolean) as string[];
  if (!valid.length) return new Date().toISOString().slice(0, 10);
  return valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

function overlapKeywords(a: string, b: string): number {
  const stop = new Set(['the','and','for','with','that','this','from','into','but','has','have','are','was','were','will','should','could','about','because','after','before','current']);
  const aw = new Set(a.toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 3 && !stop.has(w)) ?? []);
  const bw = new Set(b.toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 3 && !stop.has(w)) ?? []);
  return [...aw].filter(w => bw.has(w)).length;
}
function uniqueBy<T>(items: T[], key: (x: T) => string): T[] { const seen = new Set<string>(); return items.filter(item => { const k = key(item); if (seen.has(k)) return false; seen.add(k); return true; }); }
function tally(items: string[]): [string, number][] { const m = new Map<string, number>(); items.forEach(i => m.set(i, (m.get(i) ?? 0) + 1)); return [...m.entries()].sort((a,b) => b[1] - a[1]); }
function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
