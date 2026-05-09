export type EntityType = 'company' | 'security' | 'industry' | 'theme' | 'kpi' | 'watchlist' | 'source_person';
export type EntityRole = 'company' | 'subject' | 'security' | 'industry' | 'theme' | 'kpi' | 'watchlist' | 'source_person';

export interface LinkedEntity {
  id?: string;
  type: EntityType;
  role: EntityRole;
  key: string;
  name: string;
  aliases?: string[];
  externalIds?: Record<string, string>;
}

export interface MetadataArrays {
  tickers: string[];
  manualThemes: string[];
  kpis: string[];
  industries: string[];
  companyTags: string[];
  watchlistTags: string[];
  sourcePeople: string[];
}

export const emptyMetadataArrays = (): MetadataArrays => ({
  tickers: [],
  manualThemes: [],
  kpis: [],
  industries: [],
  companyTags: [],
  watchlistTags: [],
  sourcePeople: []
});

export function slugKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

export function normalizeLinkedEntities(values: LinkedEntity[] = []): LinkedEntity[] {
  const seen = new Set<string>();
  const result: LinkedEntity[] = [];

  for (const value of values) {
    const name = value.name?.trim();
    if (!name) continue;
    const type = value.type;
    const role = value.role;
    const key = value.key?.trim() || slugKey(name);
    const dedupeKey = `${type}:${role}:${key.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push({
      ...value,
      type,
      role,
      key,
      name,
      aliases: normalizeStringArray(value.aliases ?? []),
      externalIds: normalizeExternalIds(value.externalIds)
    });
  }

  return result;
}

export function legacyArraysToLinkedEntities(input: Partial<MetadataArrays>): LinkedEntity[] {
  return normalizeLinkedEntities([
    ...(input.companyTags ?? []).map(name => linkedEntity('company', 'company', name)),
    ...(input.tickers ?? []).map(name => linkedEntity('security', 'security', name.toUpperCase(), { ticker: name.toUpperCase() })),
    ...(input.industries ?? []).map(name => linkedEntity('industry', 'industry', name)),
    ...(input.manualThemes ?? []).map(name => linkedEntity('theme', 'theme', name)),
    ...(input.kpis ?? []).map(name => linkedEntity('kpi', 'kpi', name)),
    ...(input.watchlistTags ?? []).map(name => linkedEntity('watchlist', 'watchlist', name)),
    ...(input.sourcePeople ?? []).map(name => linkedEntity('source_person', 'source_person', name))
  ]);
}

export function mergeLinkedEntities(...groups: Array<LinkedEntity[] | undefined>): LinkedEntity[] {
  return normalizeLinkedEntities(groups.flatMap(group => group ?? []));
}

export function metadataArraysFromLinkedEntities(values: LinkedEntity[] = []): MetadataArrays {
  const entities = normalizeLinkedEntities(values);
  return {
    tickers: sortedUnique(entities.filter(entity => entity.role === 'security').map(entity => entity.externalIds?.ticker ?? entity.name.toUpperCase())),
    manualThemes: sortedUnique(entities.filter(entity => entity.role === 'theme').map(entity => entity.name)),
    kpis: sortedUnique(entities.filter(entity => entity.role === 'kpi').map(entity => entity.name)),
    industries: sortedUnique(entities.filter(entity => entity.role === 'industry').map(entity => entity.name)),
    companyTags: sortedUnique(entities.filter(entity => entity.role === 'company' || entity.role === 'subject').map(entity => entity.name)),
    watchlistTags: sortedUnique(entities.filter(entity => entity.role === 'watchlist').map(entity => entity.name)),
    sourcePeople: sortedUnique(entities.filter(entity => entity.role === 'source_person').map(entity => entity.name))
  };
}

export function linkedEntity(type: EntityType, role: EntityRole, name: string, externalIds: Record<string, string> = {}): LinkedEntity {
  return {
    type,
    role,
    key: slugKey(externalIds.ticker ?? name),
    name: name.trim(),
    aliases: [],
    externalIds
  };
}

export function linkedEntitiesForRole(values: LinkedEntity[] = [], role: EntityRole): LinkedEntity[] {
  return normalizeLinkedEntities(values).filter(entity => entity.role === role);
}

export function sameLinkedEntities(a: LinkedEntity[] = [], b: LinkedEntity[] = []): boolean {
  const left = normalizeLinkedEntities(a);
  const right = normalizeLinkedEntities(b);
  if (left.length !== right.length) return false;
  return left.every((value, index) => {
    const other = right[index];
    return value.type === other.type
      && value.role === other.role
      && value.key === other.key
      && value.name === other.name
      && JSON.stringify(value.externalIds ?? {}) === JSON.stringify(other.externalIds ?? {});
  });
}

function normalizeStringArray(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function normalizeExternalIds(value: Record<string, string> | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value ?? {})) {
    const normalized = raw.trim();
    if (normalized) result[key] = normalized;
  }
  return result;
}

function sortedUnique(values: string[]): string[] {
  return normalizeStringArray(values).sort((a, b) => a.localeCompare(b));
}
