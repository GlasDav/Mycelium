import type { Visibility } from './engine';
import { metadataArraysFromLinkedEntities, type LinkedEntity, type MetadataArrays } from './entity-links';

export type NoteSort = 'newest' | 'oldest' | 'title';

export interface NoteFilterable {
  title: string;
  body: string;
  visibility: Visibility;
  createdAt: string;
  observedAt?: string;
  tickers?: string[];
  manualThemes?: string[];
  kpis?: string[];
  industries?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
  linkedEntities?: LinkedEntity[];
}

export interface NoteFilters {
  query?: string;
  ticker?: string;
  theme?: string;
  kpi?: string;
  industry?: string;
  watchlist?: string;
  sourcePerson?: string;
  dateFrom?: string;
  dateTo?: string;
  visibility?: Visibility | '';
  sort?: NoteSort;
}

export interface NoteFilterOptions {
  tickers: string[];
  themes: string[];
  kpis: string[];
  industries?: string[];
  watchlists?: string[];
  sourcePeople?: string[];
  visibilities: Visibility[];
}

export function normalizeTags(values: string[] = []): string[] {
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

export function deriveNoteFilterOptions(notes: NoteFilterable[]): NoteFilterOptions {
  return {
    tickers: sortedUnique(notes.flatMap(note => metadataForNote(note).tickers)),
    themes: sortedUnique(notes.flatMap(note => metadataForNote(note).manualThemes)),
    kpis: sortedUnique(notes.flatMap(note => metadataForNote(note).kpis)),
    industries: sortedUnique(notes.flatMap(note => metadataForNote(note).industries)),
    watchlists: sortedUnique(notes.flatMap(note => metadataForNote(note).watchlistTags)),
    sourcePeople: sortedUnique(notes.flatMap(note => metadataForNote(note).sourcePeople)),
    visibilities: sortedUnique(notes.map(note => note.visibility)) as Visibility[]
  };
}

export function filterAndSortNotes<T extends NoteFilterable>(notes: T[], filters: NoteFilters = {}): T[] {
  const query = filters.query?.trim().toLowerCase();
  const filtered = notes.filter(note => {
    const noteDate = noteRecencyDate(note);
    const metadata = metadataForNote(note);
    return (!query || `${note.title} ${note.body}`.toLowerCase().includes(query))
      && matchesTag(metadata.tickers, filters.ticker)
      && matchesTag(metadata.manualThemes, filters.theme)
      && matchesTag(metadata.kpis, filters.kpi)
      && matchesTag(metadata.industries, filters.industry)
      && matchesTag(metadata.watchlistTags, filters.watchlist)
      && matchesTag(metadata.sourcePeople, filters.sourcePerson)
      && (!filters.dateFrom || noteDate >= filters.dateFrom)
      && (!filters.dateTo || noteDate <= filters.dateTo)
      && (!filters.visibility || note.visibility === filters.visibility);
  });

  return [...filtered].sort((a, b) => compareNotes(a, b, filters.sort ?? 'newest'));
}

export function noteRecencyDate(note: Pick<NoteFilterable, 'createdAt' | 'observedAt'>): string {
  return note.observedAt || note.createdAt;
}

function compareNotes(a: NoteFilterable, b: NoteFilterable, sort: NoteSort): number {
  if (sort === 'oldest') return noteRecencyDate(a).localeCompare(noteRecencyDate(b));
  if (sort === 'title') return a.title.localeCompare(b.title);
  return noteRecencyDate(b).localeCompare(noteRecencyDate(a));
}

function matchesTag(values: string[] | undefined, expected: string | undefined): boolean {
  if (!expected) return true;
  return (values ?? []).some(value => value.toLowerCase() === expected.toLowerCase());
}

function metadataForNote(note: NoteFilterable): MetadataArrays {
  const fromLinks = metadataArraysFromLinkedEntities(note.linkedEntities);
  return {
    tickers: sortedUnique([...(note.tickers ?? []), ...fromLinks.tickers].map(value => value.toUpperCase())),
    manualThemes: sortedUnique([...(note.manualThemes ?? []), ...fromLinks.manualThemes]),
    kpis: sortedUnique([...(note.kpis ?? []), ...fromLinks.kpis]),
    industries: sortedUnique([...(note.industries ?? []), ...fromLinks.industries]),
    companyTags: sortedUnique(fromLinks.companyTags),
    watchlistTags: sortedUnique([...(note.watchlistTags ?? []), ...fromLinks.watchlistTags]),
    sourcePeople: sortedUnique([...(note.sourcePeople ?? []), ...fromLinks.sourcePeople])
  };
}

function sortedUnique(values: string[]): string[] {
  return normalizeTags(values).sort((a, b) => a.localeCompare(b));
}
