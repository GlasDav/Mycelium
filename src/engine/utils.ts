export const DAY = 24 * 60 * 60 * 1000;

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

export function maxDate(dates: (string | undefined)[]): string {
  const valid = dates.filter(Boolean) as string[];
  if (!valid.length) return new Date().toISOString().slice(0, 10);
  return valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

export function overlapKeywords(a: string, b: string): number {
  const stop = new Set(['the','and','for','with','that','this','from','into','but','has','have','are','was','were','will','should','could','about','because','after','before','current']);
  const aw = new Set(a.toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 3 && !stop.has(w)) ?? []);
  const bw = new Set(b.toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 3 && !stop.has(w)) ?? []);
  return [...aw].filter(w => bw.has(w)).length;
}

export function relationIdForClaims(a: { id: string }, b: { id: string }): string {
  return `rel-${[a.id, b.id].sort().join('::')}`;
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function sortedUnique(values: string[]): string[] {
  return uniqueBy(values.map(value => value.trim()).filter(Boolean), value => value.toLowerCase()).sort((a, b) => a.localeCompare(b));
}

export function uniqueBy<T>(items: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function tally(items: string[]): [string, number][] {
  const m = new Map<string, number>();
  items.forEach(i => m.set(i, (m.get(i) ?? 0) + 1));
  return [...m.entries()].sort((a,b) => b[1] - a[1]);
}
