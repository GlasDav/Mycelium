import { companyLexicon, kpiWords, themeLexicon } from './lexicon';
import type { Entity } from './types';
import { uniqueBy } from './utils';

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
