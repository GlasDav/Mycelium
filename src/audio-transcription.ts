import {
  parsePastedNoteImport,
  type NoteImportWarning,
  type ParsedNoteImport,
  type TranscriptChunk
} from './note-import';

export interface AudioTranscriptionChunk {
  startTime: string;
  endTime?: string;
  speaker?: string;
  text: string;
  confidence?: number;
}

export interface AudioTranscriptionJob {
  id: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  filename?: string;
  title?: string;
  observedAt?: string;
  sourcePeople?: string[];
  chunks: AudioTranscriptionChunk[];
  warnings?: NoteImportWarning[];
}

export function normalizeReadyAudioTranscriptionJob(job: AudioTranscriptionJob): ParsedNoteImport {
  if (job.status !== 'ready') {
    throw new Error('Audio transcription job is not ready.');
  }

  const rawTranscript = audioJobToPastedTranscript(job);
  const parsed = parsePastedNoteImport(rawTranscript, {
    fallbackTitle: job.title || job.filename || 'Audio transcript',
    fallbackDate: job.observedAt
  });
  const transcriptChunks = normalizeTranscriptChunks(job.chunks);
  const warnings = mergeWarnings(parsed.warnings, job.warnings ?? []);

  return {
    ...parsed,
    ...(transcriptChunks.length > 0 ? { transcriptChunks } : {}),
    warnings
  };
}

function audioJobToPastedTranscript(job: AudioTranscriptionJob): string {
  const lines: string[] = [];
  const title = cleanHeaderValue(job.title);
  const observedAt = cleanHeaderValue(job.observedAt);
  const sourcePeople = (job.sourcePeople ?? []).map(cleanHeaderValue).filter(Boolean);

  if (title) lines.push(`Title: ${title}`);
  if (observedAt) lines.push(`Observed: ${observedAt}`);
  if (sourcePeople.length > 0) lines.push(`Participants: ${sourcePeople.join('; ')}`);
  if (lines.length > 0) lines.push('');

  for (const chunk of job.chunks) {
    const text = chunk.text.trim();
    if (!text) continue;
    const startTime = chunk.startTime.trim();
    const endTime = chunk.endTime?.trim();
    if (startTime && endTime) {
      lines.push(`${startTime} --> ${endTime}`);
    } else if (startTime) {
      lines.push(`[${startTime}] ${speakerText(chunk.speaker, text)}`);
      lines.push('');
      continue;
    }
    lines.push(speakerText(chunk.speaker, text));
    lines.push('');
  }

  return lines.join('\n').trim();
}

function speakerText(speaker: string | undefined, text: string): string {
  const cleanSpeaker = cleanHeaderValue(speaker);
  return cleanSpeaker ? `${cleanSpeaker}: ${text}` : text;
}

function normalizeTranscriptChunks(chunks: AudioTranscriptionChunk[]): TranscriptChunk[] {
  return chunks
    .map(chunk => {
      const text = chunk.text.trim();
      const startTime = chunk.startTime.trim();
      const endTime = chunk.endTime?.trim();
      const speaker = cleanHeaderValue(chunk.speaker);
      if (!text || !startTime) return undefined;
      return {
        startTime,
        ...(endTime ? { endTime } : {}),
        ...(speaker ? { speaker } : {}),
        text,
        ...(validConfidence(chunk.confidence) ? { confidence: chunk.confidence } : {})
      };
    })
    .filter((chunk): chunk is TranscriptChunk => Boolean(chunk));
}

function cleanHeaderValue(value: string | undefined): string {
  return value?.replace(/\s+/gu, ' ').trim() ?? '';
}

function mergeWarnings(primary: NoteImportWarning[], additional: NoteImportWarning[]): NoteImportWarning[] {
  const merged = [...primary];
  for (const warning of additional) {
    const key = warningKey(warning);
    if (!merged.some(existing => warningKey(existing) === key)) merged.push(warning);
  }
  return merged;
}

function warningKey(warning: NoteImportWarning): string {
  return `${warning.code}:${warning.value ?? ''}:${warning.line ?? ''}`;
}

function validConfidence(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
