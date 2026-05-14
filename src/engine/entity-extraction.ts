import { companyLexicon, kpiWords, themeLexicon } from './lexicon';
import { ontologyIndustries } from '../ontology';
import type { Entity } from './types';
import { uniqueBy } from './utils';

export function detectEntities(text: string): Entity[] {
  const lower = text.toLowerCase();
  const entities: Entity[] = [];
  for (const [name, meta] of Object.entries(companyLexicon)) {
    if (meta.aliases.some(alias => lower.includes(alias.toLowerCase()))) {
      entities.push({ name, kind: 'company', ticker: meta.ticker });
      entities.push({ name: meta.ticker, kind: 'ticker' });
      meta.themes.forEach(theme => entities.push({ name: theme, kind: 'theme' }));
    }
  }
  ontologyIndustries.forEach(industry => {
    if (industry.aliases.some(alias => lower.includes(alias.toLowerCase()))) {
      entities.push({ name: industry.name, kind: 'industry' });
    }
  });
  themeLexicon.forEach(theme => { if (lower.includes(theme.toLowerCase())) entities.push({ name: theme, kind: 'theme' }); });
  kpiWords.forEach(kpi => { if (lower.includes(kpi)) entities.push({ name: kpi, kind: 'kpi' }); });
  return uniqueBy(entities, e => `${e.kind}:${e.name}`);
}
