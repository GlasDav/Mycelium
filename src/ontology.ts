export interface OntologyIssuer {
  key: string;
  name: string;
  aliases: string[];
  securityKeys: string[];
  industryKeys: string[];
  themeNames: string[];
  watchlistKeys: string[];
}

export interface OntologySecurity {
  key: string;
  ticker: string;
  exchange: string;
  issuerKey: string;
  aliases: string[];
  industryKeys: string[];
  watchlistKeys: string[];
}

export interface OntologyIndustry {
  key: string;
  name: string;
  aliases: string[];
  parentKey?: string;
}

export interface OntologyWatchlist {
  key: string;
  name: string;
  aliases: string[];
  securityKeys: string[];
  issuerKeys: string[];
}

export const ontologyIndustries: OntologyIndustry[] = [
  {
    key: 'information-technology',
    name: 'Information Technology',
    aliases: ['information technology', 'technology', 'tech']
  },
  {
    key: 'semiconductors',
    name: 'Semiconductors',
    aliases: ['semiconductor', 'semiconductors', 'semis', 'chips', 'gpu supply'],
    parentKey: 'information-technology'
  },
  {
    key: 'enterprise-software',
    name: 'Enterprise software',
    aliases: ['enterprise software', 'software infrastructure', 'cloud software'],
    parentKey: 'information-technology'
  },
  {
    key: 'cloud-infrastructure',
    name: 'Cloud infrastructure',
    aliases: ['cloud infrastructure', 'cloud spend', 'azure', 'hyperscaler', 'data center', 'datacenter'],
    parentKey: 'information-technology'
  },
  {
    key: 'consumer-hardware',
    name: 'Consumer hardware',
    aliases: ['consumer hardware', 'iphone', 'smartphone hardware'],
    parentKey: 'information-technology'
  },
  {
    key: 'consumer-discretionary',
    name: 'Consumer Discretionary',
    aliases: ['consumer discretionary', 'consumer']
  },
  {
    key: 'automobiles',
    name: 'Automobiles',
    aliases: ['automobiles', 'autos', 'evs', 'electric vehicles', 'vehicle'],
    parentKey: 'consumer-discretionary'
  },
  {
    key: 'internet-commerce',
    name: 'Internet commerce',
    aliases: ['internet commerce', 'ecommerce', 'e-commerce', 'merchant commerce'],
    parentKey: 'consumer-discretionary'
  },
  {
    key: 'payments',
    name: 'Payments',
    aliases: ['payments', 'payment processing', 'merchant payments']
  }
];

export const ontologySecurities: OntologySecurity[] = [
  {
    key: 'nvda',
    ticker: 'NVDA',
    exchange: 'NASDAQ',
    issuerKey: 'nvidia',
    aliases: ['NVDA', 'NVDA US', 'NVDA.O', 'Nvidia', 'Nvidia Corp', 'NVIDIA Corporation', 'H100', 'Blackwell', 'GPU'],
    industryKeys: ['semiconductors'],
    watchlistKeys: ['ai-capex']
  },
  {
    key: 'aapl',
    ticker: 'AAPL',
    exchange: 'NASDAQ',
    issuerKey: 'apple',
    aliases: ['aapl', 'aapl us', 'aapl.o', 'apple', 'apple inc', 'iphone', 'app store'],
    industryKeys: ['consumer-hardware'],
    watchlistKeys: ['consumer']
  },
  {
    key: 'tsla',
    ticker: 'TSLA',
    exchange: 'NASDAQ',
    issuerKey: 'tesla',
    aliases: ['tsla', 'tsla us', 'tsla.o', 'tesla', 'tesla inc', 'model y', 'supercharger'],
    industryKeys: ['automobiles'],
    watchlistKeys: ['consumer', 'ev-transition']
  },
  {
    key: 'shop',
    ticker: 'SHOP',
    exchange: 'NASDAQ',
    issuerKey: 'shopify',
    aliases: ['shop', 'shop us', 'shop.n', 'shopify', 'shopify inc', 'merchant'],
    industryKeys: ['internet-commerce', 'payments'],
    watchlistKeys: ['smb-commerce']
  },
  {
    key: 'msft',
    ticker: 'MSFT',
    exchange: 'NASDAQ',
    issuerKey: 'microsoft',
    aliases: ['msft', 'msft us', 'msft.o', 'microsoft', 'microsoft corporation', 'azure', 'copilot'],
    industryKeys: ['enterprise-software', 'cloud-infrastructure'],
    watchlistKeys: ['ai-capex']
  }
];

export const ontologyIssuers: OntologyIssuer[] = [
  {
    key: 'nvidia',
    name: 'Nvidia',
    aliases: ['Nvidia', 'Nvidia Corp', 'NVIDIA Corporation', 'NVDA', 'H100', 'Blackwell', 'GPU'],
    securityKeys: ['nvda'],
    industryKeys: ['semiconductors'],
    themeNames: ['AI infrastructure', 'Semiconductors'],
    watchlistKeys: ['ai-capex']
  },
  {
    key: 'apple',
    name: 'Apple',
    aliases: ['apple', 'apple inc', 'aapl', 'iphone', 'app store'],
    securityKeys: ['aapl'],
    industryKeys: ['consumer-hardware'],
    themeNames: ['Consumer hardware', 'Services'],
    watchlistKeys: ['consumer']
  },
  {
    key: 'tesla',
    name: 'Tesla',
    aliases: ['tesla', 'tesla inc', 'tsla', 'model y', 'supercharger'],
    securityKeys: ['tsla'],
    industryKeys: ['automobiles'],
    themeNames: ['EV demand', 'Autonomy'],
    watchlistKeys: ['consumer', 'ev-transition']
  },
  {
    key: 'shopify',
    name: 'Shopify',
    aliases: ['shopify', 'shopify inc', 'shop', 'merchant'],
    securityKeys: ['shop'],
    industryKeys: ['internet-commerce', 'payments'],
    themeNames: ['SMB commerce', 'Payments'],
    watchlistKeys: ['smb-commerce']
  },
  {
    key: 'microsoft',
    name: 'Microsoft',
    aliases: ['microsoft', 'microsoft corporation', 'msft', 'azure', 'copilot'],
    securityKeys: ['msft'],
    industryKeys: ['enterprise-software', 'cloud-infrastructure'],
    themeNames: ['AI infrastructure', 'Enterprise software', 'Cloud spend'],
    watchlistKeys: ['ai-capex']
  }
];

export const ontologyWatchlists: OntologyWatchlist[] = [
  {
    key: 'ai-capex',
    name: 'AI Capex',
    aliases: ['ai capex', 'ai infrastructure'],
    securityKeys: ['nvda', 'msft'],
    issuerKeys: ['nvidia', 'microsoft']
  },
  {
    key: 'consumer',
    name: 'Consumer',
    aliases: ['consumer'],
    securityKeys: ['aapl', 'tsla'],
    issuerKeys: ['apple', 'tesla']
  },
  {
    key: 'ev-transition',
    name: 'EV Transition',
    aliases: ['ev transition', 'ev demand'],
    securityKeys: ['tsla'],
    issuerKeys: ['tesla']
  },
  {
    key: 'smb-commerce',
    name: 'SMB Commerce',
    aliases: ['smb commerce', 'merchant commerce'],
    securityKeys: ['shop'],
    issuerKeys: ['shopify']
  }
];

const issuersByKey = new Map(ontologyIssuers.map(issuer => [issuer.key, issuer]));
const securitiesByKey = new Map(ontologySecurities.map(security => [security.key, security]));
const industriesByKey = new Map(ontologyIndustries.map(industry => [industry.key, industry]));
const watchlistsByKey = new Map(ontologyWatchlists.map(watchlist => [watchlist.key, watchlist]));

const issuerAliasIndex = buildAliasIndex(ontologyIssuers);
const securityAliasIndex = buildAliasIndex(ontologySecurities);
const industryAliasIndex = buildAliasIndex(ontologyIndustries);
const watchlistAliasIndex = buildAliasIndex(ontologyWatchlists);

export function findIssuer(value: string | undefined): OntologyIssuer | undefined {
  if (!value) return undefined;
  return issuersByKey.get(normalizedKey(value)) ?? issuerAliasIndex.get(normalizeAlias(value));
}

export function findSecurity(value: string | undefined): OntologySecurity | undefined {
  if (!value) return undefined;
  const direct = securitiesByKey.get(normalizedKey(value)) ?? securityAliasIndex.get(normalizeAlias(value));
  if (direct) return direct;
  const issuer = findIssuer(value);
  return issuer ? securitiesByKey.get(issuer.securityKeys[0]) : undefined;
}

export function findIndustry(value: string | undefined): OntologyIndustry | undefined {
  if (!value) return undefined;
  return industriesByKey.get(normalizedKey(value)) ?? industryAliasIndex.get(normalizeAlias(value));
}

export function findWatchlist(value: string | undefined): OntologyWatchlist | undefined {
  if (!value) return undefined;
  return watchlistsByKey.get(normalizedKey(value)) ?? watchlistAliasIndex.get(normalizeAlias(value));
}

export function issuerForSecurity(security: OntologySecurity): OntologyIssuer | undefined {
  return issuersByKey.get(security.issuerKey);
}

export function securityForIssuer(issuer: OntologyIssuer): OntologySecurity | undefined {
  return securitiesByKey.get(issuer.securityKeys[0]);
}

export function industriesForKeys(keys: string[]): OntologyIndustry[] {
  const seen = new Set<string>();
  const result: OntologyIndustry[] = [];
  for (const key of keys) {
    for (const industry of industryWithAncestors(key)) {
      if (seen.has(industry.key)) continue;
      seen.add(industry.key);
      result.push(industry);
    }
  }
  return result;
}

export function industriesForSecurity(security: OntologySecurity): OntologyIndustry[] {
  return industriesForKeys(security.industryKeys);
}

export function industriesForIssuer(issuer: OntologyIssuer): OntologyIndustry[] {
  return industriesForKeys(issuer.industryKeys);
}

export function watchlistsForSecurity(security: OntologySecurity): OntologyWatchlist[] {
  return watchlistsForKeys(security.watchlistKeys);
}

export function watchlistsForIssuer(issuer: OntologyIssuer): OntologyWatchlist[] {
  return watchlistsForKeys(issuer.watchlistKeys);
}

export function issuerKeyForSubject(value: string | undefined): string {
  return findIssuer(value)?.key ?? normalizedKey(value ?? '');
}

export function subjectsReferToSameIssuer(a: string, b: string): boolean {
  const left = findIssuer(a);
  const right = findIssuer(b);
  if (left && right) return left.key === right.key;
  return normalizeAlias(a) === normalizeAlias(b);
}

export function securityExternalIds(security: OntologySecurity): Record<string, string> {
  return {
    ticker: security.ticker,
    exchange: security.exchange,
    issuerKey: security.issuerKey
  };
}

export function issuerExternalIds(issuer: OntologyIssuer): Record<string, string> {
  const security = securityForIssuer(issuer);
  return {
    issuerKey: issuer.key,
    ...(security ? { ticker: security.ticker } : {})
  };
}

export function industryExternalIds(industry: OntologyIndustry): Record<string, string> {
  return {
    industryKey: industry.key,
    sectorKey: sectorKeyForIndustry(industry)
  };
}

export function watchlistExternalIds(watchlist: OntologyWatchlist): Record<string, string> {
  return {
    watchlistKey: watchlist.key
  };
}

export function normalizedKey(value: string): string {
  return normalizeAlias(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

function industryWithAncestors(key: string): OntologyIndustry[] {
  const industry = industriesByKey.get(key);
  if (!industry) return [];
  const ancestors = industry.parentKey ? industryWithAncestors(industry.parentKey) : [];
  return [...ancestors, industry];
}

function sectorKeyForIndustry(industry: OntologyIndustry): string {
  if (!industry.parentKey) return industry.key;
  return sectorKeyForIndustry(industriesByKey.get(industry.parentKey) ?? industry);
}

function watchlistsForKeys(keys: string[]): OntologyWatchlist[] {
  return keys.flatMap(key => watchlistsByKey.get(key) ?? []);
}

function buildAliasIndex<T extends { key: string; name?: string; ticker?: string; aliases: string[] }>(items: T[]): Map<string, T> {
  const index = new Map<string, T>();
  for (const item of items) {
    const aliases = [item.key, item.name, item.ticker, ...item.aliases].filter(Boolean) as string[];
    aliases.forEach(alias => index.set(normalizeAlias(alias), item));
  }
  return index;
}

function normalizeAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[._:]/g, ' ')
    .replace(/\b(incorporated|inc|corporation|corp|ltd|plc|class a|ordinary shares)\b/g, '')
    .replace(/\bus equity\b/g, ' us')
    .replace(/\s+/g, ' ')
    .trim();
}
