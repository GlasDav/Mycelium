import {
  legacyArraysToLinkedEntities,
  metadataArraysFromLinkedEntities,
  type MetadataArrays
} from './entity-links';
import type { AccessScope } from './engine';
import { parsePastedNoteImport, type ParsedNoteImport } from './note-import';

export interface PortableNoteInput extends Partial<MetadataArrays> {
  title?: string;
  body?: string;
  observedAt?: string;
  accessScope?: AccessScope;
}

interface PortableFrontmatter {
  title?: string;
  observedAt?: string;
  accessScope?: AccessScope;
  metadata: MetadataArrays;
}

const frontmatterPattern = /^---\n([\s\S]*?)\n---\n?/u;
const accessScopes = new Set<AccessScope>(['personal', 'team', 'organization']);

export function formatNoteCopyMarkdown(note: Pick<PortableNoteInput, 'title' | 'body'>): string {
  const title = normalizedTitle(note.title);
  const body = (note.body ?? '').trim();
  return body ? `# ${title}\n\n${body}` : `# ${title}`;
}

export function formatNoteExportMarkdown(note: PortableNoteInput): string {
  const lines: string[] = ['---', `title: ${frontmatterValue(normalizedTitle(note.title))}`];
  if (note.observedAt) lines.push(`observedAt: ${frontmatterValue(note.observedAt)}`);
  if (note.accessScope) lines.push(`accessScope: ${note.accessScope}`);
  appendArray(lines, 'tickers', note.tickers);
  appendArray(lines, 'themes', note.manualThemes);
  appendArray(lines, 'kpis', note.kpis);
  appendArray(lines, 'industries', note.industries);
  appendArray(lines, 'companies', note.companyTags);
  appendArray(lines, 'watchlists', note.watchlistTags);
  appendArray(lines, 'participants', note.sourcePeople);
  lines.push('---');

  const body = (note.body ?? '').trim();
  return `${lines.join('\n')}\n\n${body}`;
}

export function parsePortableMarkdownNote(raw: string, options: { fallbackTitle?: string; fallbackDate?: string } = {}): ParsedNoteImport {
  const normalized = raw.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n');
  const extracted = extractFrontmatter(normalized);
  const withoutFrontmatter = extracted ? normalized.slice(extracted.rawLength) : normalized;
  const h1 = extracted?.frontmatter.title ? undefined : extractLeadingH1(withoutFrontmatter);
  const body = h1 ? withoutFrontmatter.slice(h1.rawLength).replace(/^\n+/u, '') : withoutFrontmatter;
  const fallbackTitle = extracted?.frontmatter.title ?? h1?.title ?? options.fallbackTitle;
  const fallbackDate = extracted?.frontmatter.observedAt ?? options.fallbackDate;
  const parsed = parsePastedNoteImport(body, { fallbackTitle, fallbackDate });

  if (!extracted) {
    return h1 ? { ...parsed, title: h1.title, body: body.trim() } : parsed;
  }

  const metadata = mergeImportMetadata(parsed, extracted.frontmatter.metadata);
  const linkedEntities = legacyArraysToLinkedEntities(metadata);
  const canonicalMetadata = metadataArraysFromLinkedEntities(linkedEntities);

  return {
    ...parsed,
    title: extracted.frontmatter.title ?? parsed.title,
    body: body.trim(),
    observedAt: extracted.frontmatter.observedAt ?? parsed.observedAt,
    accessScope: extracted.frontmatter.accessScope,
    ...canonicalMetadata,
    linkedEntities
  };
}

export function safeMarkdownFilename(title: string | undefined): string {
  const base = (title ?? '')
    .trim()
    .replace(/\.md$/iu, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/gu, '-')
    .replace(/\s+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '');
  return `${base || 'Untitled-note'}.md`;
}

function extractFrontmatter(raw: string): { frontmatter: PortableFrontmatter; rawLength: number } | undefined {
  const match = raw.match(frontmatterPattern);
  if (!match) return undefined;
  return { frontmatter: parseFrontmatter(match[1]), rawLength: match[0].length };
}

function parseFrontmatter(raw: string): PortableFrontmatter {
  const metadata = emptyPortableMetadata();
  const frontmatter: PortableFrontmatter = { metadata };
  const lines = raw.split('\n');
  let currentArrayKey: keyof MetadataArrays | undefined;

  for (const line of lines) {
    const item = line.match(/^\s*-\s*(.+?)\s*$/u);
    if (item && currentArrayKey) {
      metadata[currentArrayKey].push(frontmatterValueFromRaw(item[1]));
      continue;
    }

    currentArrayKey = undefined;
    const scalar = line.match(/^([A-Za-z][A-Za-z0-9]*)\s*:\s*(.*)$/u);
    if (!scalar) continue;

    const key = scalar[1];
    const value = frontmatterValueFromRaw(scalar[2]);
    if (key === 'title') frontmatter.title = value;
    if (key === 'observedAt' && isIsoDate(value)) frontmatter.observedAt = value;
    if (key === 'accessScope' && accessScopes.has(value as AccessScope)) frontmatter.accessScope = value as AccessScope;

    const arrayKey = metadataKeyForFrontmatter(key);
    if (arrayKey) {
      if (value) metadata[arrayKey].push(...splitInlineList(value));
      currentArrayKey = arrayKey;
    }
  }

  return frontmatter;
}

function metadataKeyForFrontmatter(key: string): keyof MetadataArrays | undefined {
  if (key === 'tickers') return 'tickers';
  if (key === 'themes') return 'manualThemes';
  if (key === 'kpis') return 'kpis';
  if (key === 'industries') return 'industries';
  if (key === 'companies') return 'companyTags';
  if (key === 'watchlists') return 'watchlistTags';
  if (key === 'participants') return 'sourcePeople';
  return undefined;
}

function extractLeadingH1(raw: string): { title: string; rawLength: number } | undefined {
  const match = raw.match(/^\s*#\s+(.+?)(?:\n|$)/u);
  if (!match) return undefined;
  return { title: match[1].trim(), rawLength: match[0].length };
}

function appendArray(lines: string[], key: string, values: string[] | undefined) {
  const clean = values?.map(value => value.trim()).filter(Boolean) ?? [];
  if (!clean.length) return;
  lines.push(`${key}:`);
  clean.forEach(value => lines.push(`  - ${frontmatterValue(value)}`));
}

function mergeImportMetadata(parsed: MetadataArrays, frontmatter: MetadataArrays): MetadataArrays {
  return {
    tickers: [...frontmatter.tickers, ...parsed.tickers],
    manualThemes: [...frontmatter.manualThemes, ...parsed.manualThemes],
    kpis: [...frontmatter.kpis, ...parsed.kpis],
    industries: [...frontmatter.industries, ...parsed.industries],
    companyTags: [...frontmatter.companyTags, ...parsed.companyTags],
    watchlistTags: [...frontmatter.watchlistTags, ...parsed.watchlistTags],
    sourcePeople: [...frontmatter.sourcePeople, ...parsed.sourcePeople]
  };
}

function emptyPortableMetadata(): MetadataArrays {
  return {
    tickers: [],
    manualThemes: [],
    kpis: [],
    industries: [],
    companyTags: [],
    watchlistTags: [],
    sourcePeople: []
  };
}

function splitInlineList(value: string): string[] {
  return value
    .split(/[;,|]/u)
    .map(item => item.trim())
    .filter(Boolean);
}

function frontmatterValue(value: string): string {
  return value.replace(/\r?\n/gu, ' ').trim();
}

function frontmatterValueFromRaw(value: string): string {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^"([\s\S]*)"$/u) ?? trimmed.match(/^'([\s\S]*)'$/u);
  return quoted ? quoted[1].trim() : trimmed;
}

function normalizedTitle(title: string | undefined): string {
  return title?.trim() || 'Untitled note';
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value);
}
