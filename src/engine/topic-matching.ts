import type { Claim } from './types';

export type TopicFamilyId =
  | 'demand_orders'
  | 'supply_inventory'
  | 'capex_budget'
  | 'pricing_margin'
  | 'growth_revenue'
  | 'adoption_churn';

interface TopicFamily {
  id: TopicFamilyId;
  terms: string[];
}

const topicFamilies: TopicFamily[] = [
  {
    id: 'demand_orders',
    terms: ['demand', 'order', 'orders', 'backlog', 'buyer', 'buyers', 'cancellation', 'cancellations', 'attach rate', 'attach-rate']
  },
  {
    id: 'supply_inventory',
    terms: ['supply', 'inventory', 'channel', 'supplier', 'digestion', 'shortage', 'tight']
  },
  {
    id: 'capex_budget',
    terms: ['capex', 'budget', 'spend', 'spending', 'purchases', 'plans', 'budget pressure']
  },
  {
    id: 'pricing_margin',
    terms: ['pricing', 'price', 'margin', 'gross margin', 'margin pressure']
  },
  {
    id: 'growth_revenue',
    terms: ['growth', 'revenue', 'sales', 'recovering', 'improving', 'accelerating']
  },
  {
    id: 'adoption_churn',
    terms: ['attach', 'attach rate', 'attach-rate', 'churn', 'retention', 'payments attach']
  }
];

export function topicFamiliesForClaim(claim: Claim): TopicFamilyId[] {
  const text = normalizeTopicText([claim.text, claim.evidence, ...(claim.kpis ?? [])].join(' '));
  return topicFamilies
    .filter(family => family.terms.some(term => hasTopicTerm(text, term)))
    .map(family => family.id);
}

export function sharedTopicFamilies(a: Claim, b: Claim): TopicFamilyId[] {
  const aFamilies = new Set(topicFamiliesForClaim(a));
  const bFamilies = new Set(topicFamiliesForClaim(b));
  return topicFamilies.map(family => family.id).filter(family => aFamilies.has(family) && bFamilies.has(family));
}

export function topicScoreForFamilies(families: TopicFamilyId[]): number {
  return Math.min(4, families.length * 2);
}

function normalizeTopicText(text: string): string {
  return text.toLowerCase().replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasTopicTerm(text: string, term: string): boolean {
  const normalizedTerm = normalizeTopicText(term);
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`).test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
