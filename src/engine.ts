export type Visibility = 'public' | 'team' | 'private';
export type Role = 'Analyst' | 'PM' | 'Compliance' | 'Guest';
export type Direction = 'positive' | 'negative' | 'neutral';
export type RelationType = 'agreement' | 'contradiction';

export interface User { id: string; name: string; role: Role; team: string; }
export interface Note { id: string; title: string; body: string; authorId: string; team: string; visibility: Visibility; sourceType: string; createdAt: string; }
export interface Entity { name: string; kind: 'company' | 'ticker' | 'theme' | 'kpi'; ticker?: string; }
export interface Claim { id: string; noteId: string; subject: string; text: string; direction: Direction; evidence: string; confidence: number; themes: string[]; createdAt: string; authorId: string; visibility: Visibility; team: string; }
export interface Relation { id: string; type: RelationType; a: Claim; b: Claim; reason: string; score: number; }
export interface Alert { id: string; severity: 'high' | 'medium' | 'low'; title: string; body: string; relation?: Relation; company?: string; }

export const companyLexicon: Record<string, { ticker: string; aliases: string[]; themes: string[] }> = {
  Nvidia: { ticker: 'NVDA', aliases: ['nvidia', 'nvda', 'gpu', 'h100', 'blackwell'], themes: ['AI infrastructure', 'Semiconductors'] },
  Apple: { ticker: 'AAPL', aliases: ['apple', 'aapl', 'iphone', 'app store'], themes: ['Consumer hardware', 'Services'] },
  Tesla: { ticker: 'TSLA', aliases: ['tesla', 'tsla', 'model y', 'supercharger'], themes: ['EV demand', 'Autonomy'] },
  Shopify: { ticker: 'SHOP', aliases: ['shopify', 'shop', 'merchant'], themes: ['SMB commerce', 'Payments'] },
  Microsoft: { ticker: 'MSFT', aliases: ['microsoft', 'msft', 'azure', 'copilot'], themes: ['AI infrastructure', 'Enterprise software'] }
};

const themeLexicon = ['AI infrastructure', 'Semiconductors', 'EV demand', 'Autonomy', 'Consumer hardware', 'Services', 'SMB commerce', 'Payments', 'Enterprise software', 'Cloud spend'];
const kpiWords = ['revenue', 'margin', 'gross margin', 'demand', 'inventory', 'capex', 'orders', 'churn', 'pricing', 'utilization', 'growth', 'supply'];
const positive = ['accelerat', 'strong', 'improv', 'beat', 'expanding', 'tight', 'robust', 'upside', 'recover', 'increase', 'higher', 'raised'];
const negative = ['slow', 'weak', 'declin', 'miss', 'pressure', 'soft', 'excess', 'risk', 'downside', 'cut', 'lower', 'delay'];

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

export function extractClaims(note: Note): Claim[] {
  const sentences = note.body.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const claims: Claim[] = [];
  for (const sentence of sentences) {
    const entities = detectEntities(sentence);
    const companies = entities.filter(e => e.kind === 'company');
    if (!companies.length) continue;
    const dir = directionFor(sentence);
    if (dir === 'neutral' && !kpiWords.some(k => sentence.toLowerCase().includes(k))) continue;
    for (const company of companies) {
      const themes = uniqueBy(entities.filter(e => e.kind === 'theme').map(e => e.name), x => x);
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
        authorId: note.authorId,
        visibility: note.visibility,
        team: note.team
      });
    }
  }
  return claims;
}

export function buildClaims(notes: Note[], user: User): Claim[] {
  return notes.filter(n => canAccess(user, n)).flatMap(extractClaims);
}

export function detectRelations(claims: Claim[]): Relation[] {
  const relations: Relation[] = [];
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const a = claims[i], b = claims[j];
      if (a.subject !== b.subject || a.noteId === b.noteId) continue;
      const sharedThemes = a.themes.filter(t => b.themes.includes(t));
      const sharedWords = overlapKeywords(a.text, b.text);
      const related = sharedThemes.length || sharedWords >= 2;
      if (!related) continue;
      if (a.direction !== 'neutral' && b.direction !== 'neutral' && a.direction !== b.direction) {
        relations.push({ id: `rel-${a.id}-${b.id}`, type: 'contradiction', a, b, reason: `${a.subject} claims point in opposite directions`, score: 0.7 + Math.min(0.25, sharedWords / 20) });
      } else if (a.direction === b.direction && a.direction !== 'neutral') {
        relations.push({ id: `rel-${a.id}-${b.id}`, type: 'agreement', a, b, reason: `${a.subject} claims reinforce the same direction`, score: 0.62 + Math.min(0.28, sharedWords / 25) });
      }
    }
  }
  return relations.sort((a,b) => b.score - a.score);
}

export function synthesize(claims: Claim[], relations: Relation[], subject: string) {
  const scoped = claims.filter(c => c.subject === subject || c.themes.includes(subject));
  const positives = scoped.filter(c => c.direction === 'positive').length;
  const negatives = scoped.filter(c => c.direction === 'negative').length;
  const contradictions = relations.filter(r => r.type === 'contradiction' && (r.a.subject === subject || r.a.themes.includes(subject)));
  const stance = positives > negatives ? 'constructive' : negatives > positives ? 'cautious' : 'mixed';
  const topThemes = tally(scoped.flatMap(c => c.themes)).slice(0, 4).map(x => x[0]);
  return { subject, stance, positives, negatives, total: scoped.length, contradictions: contradictions.length, topThemes, summary: `${subject} reads ${stance}: ${positives} supportive and ${negatives} skeptical accessible claims, with ${contradictions.length} active contradiction${contradictions.length === 1 ? '' : 's'}.` };
}

export function generateAlerts(relations: Relation[], claims: Claim[]): Alert[] {
  const alerts: Alert[] = relations.slice(0, 8).map((r, i) => ({
    id: `alert-${i}`,
    severity: r.type === 'contradiction' ? 'high' : 'medium',
    title: r.type === 'contradiction' ? `Contradiction on ${r.a.subject}` : `Agreement cluster on ${r.a.subject}`,
    body: `${r.a.text} ↔ ${r.b.text}`,
    relation: r,
    company: r.a.subject
  }));
  const clusters = tally(claims.map(c => c.subject)).filter(([, count]) => count >= 3);
  clusters.forEach(([company, count]) => alerts.push({ id: `cluster-${company}`, severity: 'low', title: `${company} research density rising`, body: `${count} accessible claims now mention ${company}.`, company }));
  return alerts;
}

export function runPipeline(notes: Note[], user: User) {
  const visibleNotes = notes.filter(n => canAccess(user, n));
  const claims = buildClaims(notes, user);
  const relations = detectRelations(claims);
  const alerts = generateAlerts(relations, claims);
  const companies = uniqueBy(claims.map(c => c.subject), x => x).map(subject => synthesize(claims, relations, subject));
  const themes = uniqueBy(claims.flatMap(c => c.themes), x => x).map(theme => synthesize(claims, relations, theme));
  return { visibleNotes, claims, relations, alerts, companies, themes };
}

function overlapKeywords(a: string, b: string): number {
  const stop = new Set(['the','and','for','with','that','this','from','into','but','has','have','are','was','were','will','should','could','about']);
  const aw = new Set(a.toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 3 && !stop.has(w)) ?? []);
  const bw = new Set(b.toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 3 && !stop.has(w)) ?? []);
  return [...aw].filter(w => bw.has(w)).length;
}
function uniqueBy<T>(items: T[], key: (x: T) => string): T[] { const seen = new Set<string>(); return items.filter(item => { const k = key(item); if (seen.has(k)) return false; seen.add(k); return true; }); }
function tally(items: string[]): [string, number][] { const m = new Map<string, number>(); items.forEach(i => m.set(i, (m.get(i) ?? 0) + 1)); return [...m.entries()].sort((a,b) => b[1] - a[1]); }
function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
