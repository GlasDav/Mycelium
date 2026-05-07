import type { Visibility } from './engine';

export type NoteSort = 'newest' | 'oldest' | 'title' | 'sourceType';

export interface NoteFilterable {
  title: string;
  body: string;
  visibility: Visibility;
  sourceType: string;
  createdAt: string;
  observedAt?: string;
  tickers?: string[];
  manualThemes?: string[];
  kpis?: string[];
}

export interface NoteFilters {
  query?: string;
  ticker?: string;
  theme?: string;
  kpi?: string;
  dateFrom?: string;
  dateTo?: string;
  sourceType?: string;
  visibility?: Visibility | '';
  sort?: NoteSort;
}

export interface NoteFilterOptions {
  tickers: string[];
  themes: string[];
  kpis: string[];
  sourceTypes: string[];
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
    tickers: sortedUnique(notes.flatMap(note => note.tickers ?? [])),
    themes: sortedUnique(notes.flatMap(note => note.manualThemes ?? [])),
    kpis: sortedUnique(notes.flatMap(note => note.kpis ?? [])),
    sourceTypes: sortedUnique(notes.map(note => note.sourceType)),
    visibilities: sortedUnique(notes.map(note => note.visibility)) as Visibility[]
  };
}

export function filterAndSortNotes<T extends NoteFilterable>(notes: T[], filters: NoteFilters = {}): T[] {
  const query = filters.query?.trim().toLowerCase();
  const filtered = notes.filter(note => {
    const noteDate = noteRecencyDate(note);
    return (!query || `${note.title} ${note.body}`.toLowerCase().includes(query))
      && matchesTag(note.tickers, filters.ticker)
      && matchesTag(note.manualThemes, filters.theme)
      && matchesTag(note.kpis, filters.kpi)
      && (!filters.dateFrom || noteDate >= filters.dateFrom)
      && (!filters.dateTo || noteDate <= filters.dateTo)
      && (!filters.sourceType || note.sourceType === filters.sourceType)
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
  if (sort === 'sourceType') return a.sourceType.localeCompare(b.sourceType) || b.title.localeCompare(a.title);
  return noteRecencyDate(b).localeCompare(noteRecencyDate(a));
}

function matchesTag(values: string[] | undefined, expected: string | undefined): boolean {
  if (!expected) return true;
  return (values ?? []).some(value => value.toLowerCase() === expected.toLowerCase());
}

function sortedUnique(values: string[]): string[] {
  return normalizeTags(values).sort((a, b) => a.localeCompare(b));
}
