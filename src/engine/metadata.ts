import {
  legacyArraysToLinkedEntities,
  mergeLinkedEntities,
  metadataArraysFromLinkedEntities,
  type LinkedEntity,
  type MetadataArrays
} from '../entity-links';
import type { Claim, Note } from './types';
import { sortedUnique } from './utils';

export function metadataForNote(note: Note): MetadataArrays {
  return combineMetadataArrays(note, metadataArraysFromLinkedEntities(note.linkedEntities));
}

export function metadataForClaim(claim: Claim): MetadataArrays {
  return combineMetadataArrays({
    tickers: claim.tickers,
    manualThemes: claim.themes,
    kpis: claim.kpis,
    industries: claim.industries,
    companyTags: claim.companyTags,
    watchlistTags: claim.watchlistTags,
    sourcePeople: claim.sourcePeople
  }, metadataArraysFromLinkedEntities(claim.linkedEntities));
}

export function linkedEntitiesForNote(note: Note): LinkedEntity[] {
  return mergeLinkedEntities(note.linkedEntities, legacyArraysToLinkedEntities(metadataForNote(note)));
}

export function sourcePeopleForClaim(claim: Claim): string[] {
  return metadataForClaim(claim).sourcePeople;
}

export function intersectionCount(a: string[], b: string[]): number {
  const right = new Set(b.map(value => value.toLowerCase()));
  return sortedUnique(a).filter(value => right.has(value.toLowerCase())).length;
}

function combineMetadataArrays(base: Partial<MetadataArrays>, derived: Partial<MetadataArrays> = {}): MetadataArrays {
  return {
    tickers: sortedUnique([...(base.tickers ?? []), ...(derived.tickers ?? [])].map(value => value.toUpperCase())),
    manualThemes: sortedUnique([...(base.manualThemes ?? []), ...(derived.manualThemes ?? [])]),
    kpis: sortedUnique([...(base.kpis ?? []), ...(derived.kpis ?? [])]),
    industries: sortedUnique([...(base.industries ?? []), ...(derived.industries ?? [])]),
    companyTags: sortedUnique([...(base.companyTags ?? []), ...(derived.companyTags ?? [])]),
    watchlistTags: sortedUnique([...(base.watchlistTags ?? []), ...(derived.watchlistTags ?? [])]),
    sourcePeople: sortedUnique([...(base.sourcePeople ?? []), ...(derived.sourcePeople ?? [])])
  };
}
