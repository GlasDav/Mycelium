import { relationTitle } from './relation-classification';
import type { Alert, Claim, Relation } from './types';
import { tally } from './utils';

export function generateAlerts(relations: Relation[], claims: Claim[]): Alert[] {
  const alerts: Alert[] = relations.slice(0, 8).map((r, i) => ({
    id: `alert-${i}`,
    severity: r.type === 'contradiction' ? 'high' : r.type === 'open_tension' || r.type === 'historical_tension' ? 'medium' : 'low',
    title: relationTitle(r),
    body: `${r.a.text} â†” ${r.b.text}`,
    relation: r,
    company: r.a.subject
  }));
  const clusters = tally(claims.filter(c => c.freshness !== 'stale').map(c => c.subject)).filter(([, count]) => count >= 3);
  clusters.forEach(([company, count]) => alerts.push({ id: `cluster-${company}`, severity: 'low', title: `${company} current research density rising`, body: `${count} accessible fresh claims now mention ${company}.`, company }));
  return alerts;
}
