import {
  emptyMetadataArrays,
  legacyArraysToLinkedEntities,
  metadataArraysFromLinkedEntities,
  type LinkedEntity,
  type MetadataArrays
} from './entity-links';
import { detectEntities } from './engine/entity-extraction';
import { companyLexicon, kpiWords, themeLexicon } from './engine/lexicon';

export interface NoteImportParseOptions {
  fallbackTitle?: string;
  fallbackDate?: string;
}

export interface TranscriptChunk {
  startTime: string;
  endTime?: string;
  speaker?: string;
  text: string;
}

export interface NoteImportWarning {
  code: 'ambiguous_date' | 'missing_body' | 'generic_speaker_ignored';
  message: string;
  value?: string;
  line?: number;
}

export type TranscriptImportWarning = NoteImportWarning;

export interface ParsedNoteImport extends MetadataArrays {
  title: string;
  body: string;
  observedAt?: string;
  linkedEntities: LinkedEntity[];
  transcriptChunks?: TranscriptChunk[];
  warnings: NoteImportWarning[];
}

type HeaderName =
  | 'title'
  | 'subject'
  | 'date'
  | 'meeting date'
  | 'observed'
  | 'participants'
  | 'attendees'
  | 'companies'
  | 'tickers'
  | 'themes'
  | 'kpis';

const headerNames = new Set<HeaderName>([
  'title',
  'subject',
  'date',
  'meeting date',
  'observed',
  'participants',
  'attendees',
  'companies',
  'tickers',
  'themes',
  'kpis'
]);

const monthNumbers: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12'
};

const genericSpeakerLabels = new Set(['speaker', 'analyst', 'operator', 'moderator', 'q', 'a', 'unknown']);
const timestamp = String.raw`(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?`;
const timestampRangeLine = new RegExp(String.raw`^\s*(${timestamp})\s*-->\s*(${timestamp})(?:\s+.*)?$`, 'u');
const leadingTimestamp = new RegExp(String.raw`^\s*\[?\s*(${timestamp})\s*\]?\s*`, 'u');

export function parsePastedNoteImport(raw: string, options: NoteImportParseOptions = {}): ParsedNoteImport {
  const warnings: NoteImportWarning[] = [];
  const metadata = emptyMetadataArrays();
  const bodyLines: string[] = [];
  const transcriptChunks: TranscriptChunk[] = [];
  let pendingCue: Pick<TranscriptChunk, 'startTime' | 'endTime'> | undefined;
  let titleHeader = '';
  let subjectHeader = '';
  let observedAt: string | undefined;
  let sawExplicitDate = false;

  const lines = raw.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n').split('\n');

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const cue = parseTimestampRangeLine(rawLine);
    if (cue) {
      pendingCue = cue;
      return;
    }
    const leadingTime = parseLeadingTimestamp(rawLine);
    const cleaned = cleanTranscriptLine(rawLine);
    if (!cleaned) return;

    const header = parseHeader(cleaned);
    if (header) {
      const { name, value } = header;
      if (name === 'title') titleHeader = value.trim();
      if (name === 'subject') subjectHeader = value.trim();
      if (name === 'date' || name === 'meeting date' || name === 'observed') {
        sawExplicitDate = true;
        const parsed = parseSafeDate(value);
        if (parsed.date && !observedAt) observedAt = parsed.date;
        if (parsed.ambiguous) {
          addWarning(warnings, {
            code: 'ambiguous_date',
            message: 'Ambiguous numeric date ignored.',
            value,
            line: lineNumber
          });
        }
      }
      if (name === 'participants' || name === 'attendees') {
        metadata.sourcePeople.push(...parsePeopleList(value, warnings, lineNumber));
      }
      if (name === 'companies') metadata.companyTags.push(...splitList(value).map(canonicalCompanyInput));
      if (name === 'tickers') metadata.tickers.push(...splitList(value));
      if (name === 'themes') metadata.manualThemes.push(...splitList(value).map(value => canonicalLexiconTerm(value, themeLexicon)));
      if (name === 'kpis') metadata.kpis.push(...splitList(value).map(value => canonicalLexiconTerm(value, kpiWords)));
      return;
    }

    const speakerCleaned = cleanSpeakerLine(cleaned, metadata, warnings, lineNumber);
    if (speakerCleaned.bodyLine) {
      bodyLines.push(speakerCleaned.bodyLine);
      const chunkTimes = pendingCue ?? (leadingTime ? { startTime: leadingTime } : undefined);
      if (chunkTimes) {
        transcriptChunks.push({
          ...chunkTimes,
          ...(speakerCleaned.speaker ? { speaker: speakerCleaned.speaker } : {}),
          text: speakerCleaned.text
        });
      }
    }
    pendingCue = undefined;
  });

  if (!observedAt && options.fallbackDate) {
    const parsed = parseSafeDate(options.fallbackDate);
    if (parsed.date) observedAt = parsed.date;
    if (parsed.ambiguous && !sawExplicitDate) {
      addWarning(warnings, {
        code: 'ambiguous_date',
        message: 'Ambiguous fallback date ignored.',
        value: options.fallbackDate
      });
    }
  }

  const body = bodyLines.join('\n').trim();
  if (!body) {
    addWarning(warnings, {
      code: 'missing_body',
      message: 'No note body content was found.'
    });
  }

  mergeMetadata(metadata, metadataFromDetectedEntities(body));
  const linkedEntities = legacyArraysToLinkedEntities(metadata);
  const canonicalMetadata = metadataArraysFromLinkedEntities(linkedEntities);

  return {
    title: stableTitle(titleHeader || subjectHeader || titleFromBody(body) || options.fallbackTitle || 'Imported note'),
    body,
    observedAt,
    ...canonicalMetadata,
    linkedEntities,
    ...(transcriptChunks.length > 0 ? { transcriptChunks } : {}),
    warnings
  };
}

function parseTimestampRangeLine(rawLine: string): Pick<TranscriptChunk, 'startTime' | 'endTime'> | undefined {
  const match = rawLine.trim().match(timestampRangeLine);
  if (!match) return undefined;
  return { startTime: match[1], endTime: match[2] };
}

function parseLeadingTimestamp(rawLine: string): string | undefined {
  return rawLine.trim().match(leadingTimestamp)?.[1];
}

function cleanTranscriptLine(rawLine: string): string {
  let line = rawLine.trim();
  if (!line) return '';
  if (/^WEBVTT\b/iu.test(line)) return '';
  if (/^\d+$/u.test(line)) return '';
  if (timestampRangeLine.test(line)) return '';
  while (leadingTimestamp.test(line)) line = line.replace(leadingTimestamp, '').trim();
  return line;
}

function parseHeader(line: string): { name: HeaderName; value: string } | undefined {
  const match = line.match(/^([A-Za-z][A-Za-z ]{1,24})\s*:\s*(.*)$/u);
  if (!match) return undefined;
  const name = match[1].trim().toLowerCase() as HeaderName;
  if (!headerNames.has(name)) return undefined;
  return { name, value: match[2].trim() };
}

function cleanSpeakerLine(
  line: string,
  metadata: MetadataArrays,
  warnings: NoteImportWarning[],
  lineNumber: number
): { bodyLine: string; speaker?: string; text: string } {
  const speakerMatch = line.match(/^([A-Za-z][A-Za-z0-9 .'-]{0,70})\s*:\s*(.*)$/u);
  if (!speakerMatch) return { bodyLine: line, text: line };

  const label = speakerMatch[1].trim();
  const text = speakerMatch[2].trim();
  if (isGenericSpeaker(label)) {
    addWarning(warnings, {
      code: 'generic_speaker_ignored',
      message: 'Generic transcript speaker label ignored.',
      value: label,
      line: lineNumber
    });
    return { bodyLine: text, text };
  }

  if (isNamedSpeaker(label)) {
    metadata.sourcePeople.push(label);
    return { bodyLine: text ? `${label}: ${text}` : `${label}:`, speaker: label, text };
  }

  return { bodyLine: line, text: line };
}

function isGenericSpeaker(label: string): boolean {
  const normalized = label.trim().toLowerCase().replace(/\s+\d+$/u, '');
  return genericSpeakerLabels.has(normalized);
}

function isNamedSpeaker(label: string): boolean {
  if (isGenericSpeaker(label)) return false;
  const parts = label.split(/\s+/u).filter(Boolean);
  return parts.length >= 2 && parts.every(part => /^[A-Z][A-Za-z'.-]*$/u.test(part));
}

function parsePeopleList(value: string, warnings: NoteImportWarning[], lineNumber: number): string[] {
  const people: string[] = [];
  for (const item of splitList(value)) {
    if (isGenericSpeaker(item)) {
      addWarning(warnings, {
        code: 'generic_speaker_ignored',
        message: 'Generic participant label ignored.',
        value: item,
        line: lineNumber
      });
    } else {
      people.push(item);
    }
  }
  return people;
}

function parseSafeDate(value: string): { date?: string; ambiguous?: boolean } {
  const normalized = value.trim().replace(/\s+/gu, ' ');
  const iso = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/u);
  if (iso) return { date: formatValidDate(iso[1], iso[2], iso[3]) };

  const yearFirstSlash = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/u);
  if (yearFirstSlash) return { date: formatValidDate(yearFirstSlash[1], yearFirstSlash[2], yearFirstSlash[3]) };

  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/u.test(normalized)) return { ambiguous: true };

  const monthFirst = normalized.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{4})$/u);
  if (monthFirst) return { date: formatMonthNameDate(monthFirst[3], monthFirst[1], monthFirst[2]) };

  const dayFirst = normalized.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)[,]?\s+(\d{4})$/u);
  if (dayFirst) return { date: formatMonthNameDate(dayFirst[3], dayFirst[2], dayFirst[1]) };

  return {};
}

function formatMonthNameDate(year: string, monthName: string, day: string): string | undefined {
  const month = monthNumbers[monthName.toLowerCase()];
  return month ? formatValidDate(year, month, day) : undefined;
}

function formatValidDate(year: string, month: string, day: string): string | undefined {
  const yyyy = Number(year);
  const mm = Number(month);
  const dd = Number(day);
  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (date.getUTCFullYear() !== yyyy || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return undefined;
  return `${year.padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function splitList(value: string): string[] {
  return value
    .split(/[;,|]/u)
    .map(item => item.trim())
    .filter(Boolean);
}

function metadataFromDetectedEntities(body: string): MetadataArrays {
  const metadata = emptyMetadataArrays();
  for (const entity of detectEntities(body)) {
    if (entity.kind === 'company') {
      metadata.companyTags.push(entity.name);
      if (entity.ticker) metadata.tickers.push(entity.ticker);
    }
    if (entity.kind === 'ticker') metadata.tickers.push(entity.ticker ?? entity.name);
    if (entity.kind === 'industry') metadata.industries.push(entity.name);
    if (entity.kind === 'theme') metadata.manualThemes.push(entity.name);
    if (entity.kind === 'kpi') metadata.kpis.push(entity.name);
    if (entity.kind === 'watchlist') metadata.watchlistTags.push(entity.name);
    if (entity.kind === 'source_person') metadata.sourcePeople.push(entity.name);
  }
  return metadata;
}

function mergeMetadata(target: MetadataArrays, source: MetadataArrays) {
  target.tickers.push(...source.tickers);
  target.manualThemes.push(...source.manualThemes);
  target.kpis.push(...source.kpis);
  target.industries.push(...source.industries);
  target.companyTags.push(...source.companyTags);
  target.watchlistTags.push(...source.watchlistTags);
  target.sourcePeople.push(...source.sourcePeople);
}

function canonicalCompanyInput(value: string): string {
  const normalized = value.trim().toLowerCase();
  for (const [name, meta] of Object.entries(companyLexicon)) {
    if (name.toLowerCase() === normalized || meta.aliases.some(alias => alias.toLowerCase() === normalized)) return name;
  }
  return value;
}

function canonicalLexiconTerm(value: string, lexicon: string[]): string {
  const normalized = value.trim().toLowerCase();
  return lexicon.find(term => term.toLowerCase() === normalized) ?? value.trim();
}

function titleFromBody(body: string): string {
  const firstLine = body.split('\n').map(line => line.trim()).find(Boolean) ?? '';
  const withoutSpeaker = firstLine.replace(/^[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+)+:\s*/u, '');
  return withoutSpeaker;
}

function stableTitle(value: string): string {
  const normalized = value.replace(/\s+/gu, ' ').trim();
  return normalized.length > 96 ? `${normalized.slice(0, 93).trimEnd()}...` : normalized;
}

function addWarning(warnings: NoteImportWarning[], warning: NoteImportWarning) {
  const key = `${warning.code}:${warning.value ?? ''}:${warning.line ?? ''}`;
  const exists = warnings.some(existing => `${existing.code}:${existing.value ?? ''}:${existing.line ?? ''}` === key);
  if (!exists) warnings.push(warning);
}
