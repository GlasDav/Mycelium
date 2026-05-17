import { parsePastedNoteImport, type ParsedNoteImport } from './note-import';

export interface NoteImportFileLike {
  name: string;
  size: number;
  text(): Promise<string>;
}

export const NOTE_IMPORT_FILE_ACCEPT = '.txt,.md,.markdown';
export const NOTE_IMPORT_FILE_MAX_BYTES = 1048576;

const supportedExtensions = new Set(['txt', 'md', 'markdown']);

export async function readNoteImportFile(file: NoteImportFileLike): Promise<ParsedNoteImport> {
  const extension = fileExtension(file.name);
  if (!supportedExtensions.has(extension)) {
    throw new Error('Unsupported note import file type. Choose a .txt, .md, or .markdown file.');
  }
  if (file.size > NOTE_IMPORT_FILE_MAX_BYTES) {
    throw new Error('Note import file is too large. Choose a file up to 1 MB.');
  }

  const text = await file.text();
  return parsePastedNoteImport(text, { fallbackTitle: filenameWithoutExtension(file.name) });
}

function fileExtension(name: string): string {
  const match = name.trim().toLowerCase().match(/\.([^.]+)$/u);
  return match?.[1] ?? '';
}

function filenameWithoutExtension(name: string): string {
  const base = name.trim().replace(/^.*[\\/]/u, '');
  return base.replace(/\.[^.]+$/u, '').trim() || 'Imported note';
}
