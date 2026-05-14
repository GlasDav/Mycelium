import { ontologyIssuers, securityForIssuer } from '../ontology';
import { sortedUnique } from './utils';

export const companyLexicon: Record<string, { ticker: string; aliases: string[]; themes: string[] }> = Object.fromEntries(
  ontologyIssuers.map(issuer => {
    const security = securityForIssuer(issuer);
    return [
      issuer.name,
      {
        ticker: security?.ticker ?? issuer.name.toUpperCase(),
        aliases: sortedUnique(issuer.aliases.map(alias => alias.toLowerCase())),
        themes: issuer.themeNames
      }
    ];
  })
);

export const themeLexicon = sortedUnique(ontologyIssuers.flatMap(issuer => issuer.themeNames));
export const kpiWords = ['revenue', 'margin', 'gross margin', 'demand', 'inventory', 'capex', 'orders', 'churn', 'pricing', 'utilization', 'growth', 'supply'];
export const positiveDirectionWords = ['accelerat', 'strong', 'improv', 'beat', 'expanding', 'tight', 'robust', 'upside', 'recover', 'increase', 'higher', 'raised'];
export const negativeDirectionWords = ['slow', 'weak', 'declin', 'miss', 'pressure', 'soft', 'excess', 'risk', 'downside', 'cut', 'lower', 'delay'];
