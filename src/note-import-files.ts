import { parsePastedNoteImport, type ParsedNoteImport } from './note-import';
import { extractDocxText } from './note-import-docx';
import { extractPdfText } from './note-import-pdf';

export interface NoteImportFileLike {
  name: string;
  size: number;
  text(): Promise<string>;
  arrayBuffer?(): Promise<ArrayBuffer>;
}

export interface AudioImportFileSummary {
  filename: string;
  sizeBytes: number;
  status: 'preview_only';
  message: string;
}

export const NOTE_IMPORT_FILE_ACCEPT = '.txt,.md,.markdown,.docx,.pdf,.vtt,.srt';
export const AUDIO_IMPORT_FILE_ACCEPT = '.mp3,.m4a,.wav,.webm,.mp4,.aac';
export const NOTE_IMPORT_FILE_MAX_BYTES = 1048576;

const supportedExtensions = new Set(['txt', 'md', 'markdown', 'docx', 'pdf', 'vtt', 'srt']);
const supportedAudioExtensions = new Set(['mp3', 'm4a', 'wav', 'webm', 'mp4', 'aac']);

export async function readNoteImportFile(file: NoteImportFileLike): Promise<ParsedNoteImport> {
  const extension = fileExtension(file.name);
  if (!supportedExtensions.has(extension)) {
    throw new Error('Unsupported note import file type. Choose a .txt, .md, .markdown, .docx, .pdf, .vtt, or .srt file.');
  }
  if (file.size > NOTE_IMPORT_FILE_MAX_BYTES) {
    throw new Error('Note import file is too large. Choose a file up to 1 MB.');
  }

  const text = await readFileTextByType(file, extension);
  return parsePastedNoteImport(text, { fallbackTitle: filenameWithoutExtension(file.name) });
}

export function summarizeAudioImportFile(file: Pick<NoteImportFileLike, 'name' | 'size'>): AudioImportFileSummary {
  const extension = fileExtension(file.name);
  if (!supportedAudioExtensions.has(extension)) {
    throw new Error('Unsupported audio import file type. Choose a .mp3, .m4a, .wav, .webm, .mp4, or .aac file.');
  }
  return {
    filename: filenameFromPath(file.name),
    sizeBytes: file.size,
    status: 'preview_only',
    message: 'Audio transcription is not wired yet. Add a transcript fixture or pasted transcript text before applying.'
  };
}

async function readFileTextByType(file: NoteImportFileLike, extension: string): Promise<string> {
  if (extension === 'docx') {
    try {
      return await extractDocxText(await readArrayBuffer(file));
    } catch (error) {
      throw new Error(`DOCX note import could not be read. ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (extension === 'pdf') {
    try {
      return await extractPdfText(await readArrayBuffer(file));
    } catch (error) {
      throw new Error(`PDF note import could not be read. ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return file.text();
}

async function readArrayBuffer(file: NoteImportFileLike): Promise<ArrayBuffer> {
  if (!file.arrayBuffer) {
    throw new Error('This browser cannot read binary note import files.');
  }
  return file.arrayBuffer();
}

function fileExtension(name: string): string {
  const match = name.trim().toLowerCase().match(/\.([^.]+)$/u);
  return match?.[1] ?? '';
}

function filenameWithoutExtension(name: string): string {
  const base = filenameFromPath(name);
  return base.replace(/\.[^.]+$/u, '').trim() || 'Imported note';
}

function filenameFromPath(name: string): string {
  return name.trim().replace(/^.*[\\/]/u, '');
}
