export async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  const documentXml = await readZipTextFile(arrayBuffer, 'word/document.xml');
  if (documentXml === undefined) {
    throw new Error('DOCX file is malformed: missing word/document.xml.');
  }

  const paragraphs = extractParagraphs(documentXml);
  if (paragraphs.length === 0) {
    throw new Error('No text could be extracted from the DOCX file.');
  }

  return paragraphs.join('\n');
}

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

async function readZipTextFile(arrayBuffer: ArrayBuffer, targetName: string): Promise<string | undefined> {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const centralDirectory = findCentralDirectory(view);
  const entries = readCentralDirectory(view, centralDirectory.offset, centralDirectory.entryCount);
  const entry = entries.find(candidate => normalizeZipPath(candidate.name) === targetName);
  if (!entry) return undefined;

  const content = await readEntryBytes(view, bytes, entry);
  return new TextDecoder().decode(content);
}

function findCentralDirectory(view: DataView): { offset: number; entryCount: number } {
  const minEndRecordLength = 22;
  const maxCommentLength = 0xffff;
  const start = Math.max(0, view.byteLength - minEndRecordLength - maxCommentLength);

  for (let offset = view.byteLength - minEndRecordLength; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) !== 0x06054b50) continue;
    return {
      entryCount: view.getUint16(offset + 10, true),
      offset: view.getUint32(offset + 16, true)
    };
  }

  throw new Error('DOCX file is malformed: invalid ZIP container.');
}

function readCentralDirectory(view: DataView, offset: number, entryCount: number): ZipEntry[] {
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let cursor = offset;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > view.byteLength || view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error('DOCX file is malformed: invalid ZIP central directory.');
    }

    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd > view.byteLength) {
      throw new Error('DOCX file is malformed: invalid ZIP central directory.');
    }

    entries.push({
      name: decoder.decode(new Uint8Array(view.buffer, view.byteOffset + nameStart, fileNameLength)),
      compressionMethod: view.getUint16(cursor + 10, true),
      compressedSize: view.getUint32(cursor + 20, true),
      uncompressedSize: view.getUint32(cursor + 24, true),
      localHeaderOffset: view.getUint32(cursor + 42, true)
    });

    cursor = nameEnd + extraLength + commentLength;
  }

  return entries;
}

async function readEntryBytes(view: DataView, zipBytes: Uint8Array, entry: ZipEntry): Promise<Uint8Array> {
  const headerOffset = entry.localHeaderOffset;
  if (headerOffset + 30 > view.byteLength || view.getUint32(headerOffset, true) !== 0x04034b50) {
    throw new Error('DOCX file is malformed: invalid ZIP local file header.');
  }

  const fileNameLength = view.getUint16(headerOffset + 26, true);
  const extraLength = view.getUint16(headerOffset + 28, true);
  const dataStart = headerOffset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataStart > view.byteLength || dataEnd > view.byteLength) {
    throw new Error('DOCX file is malformed: truncated ZIP entry.');
  }

  const compressed = zipBytes.subarray(dataStart, dataEnd);
  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) return inflateRaw(compressed, entry.uncompressedSize);

  throw new Error('DOCX file is malformed: unsupported ZIP compression method.');
}

async function inflateRaw(compressed: Uint8Array, expectedSize: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DOCX file is malformed: compressed DOCX entries are not supported in this browser.');
  }

  const compressedBuffer = new ArrayBuffer(compressed.byteLength);
  new Uint8Array(compressedBuffer).set(compressed);
  const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const output = new Uint8Array(await new Response(stream).arrayBuffer());
  if (expectedSize > 0 && output.byteLength !== expectedSize) {
    throw new Error('DOCX file is malformed: decompressed ZIP entry size did not match.');
  }
  return output;
}

function normalizeZipPath(path: string): string {
  return path.replace(/\\/gu, '/').replace(/^\/+/u, '');
}

function extractParagraphs(documentXml: string): string[] {
  const paragraphs: string[] = [];
  const paragraphPattern = /<[\w.-]+:p\b[^>]*>([\s\S]*?)<\/[\w.-]+:p>|<p\b[^>]*>([\s\S]*?)<\/p>/gu;
  for (const match of documentXml.matchAll(paragraphPattern)) {
    const paragraphXml = match[1] ?? match[2] ?? '';
    const text = normalizeText(extractParagraphText(paragraphXml));
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

function extractParagraphText(paragraphXml: string): string {
  const pieces: string[] = [];
  const tokenPattern = /<(?:(?:[\w.-]+):)?(t|tab|br)\b[^>]*(?:\/>|>([\s\S]*?)<\/(?:(?:[\w.-]+):)?\1>)/gu;

  for (const match of paragraphXml.matchAll(tokenPattern)) {
    const localName = match[1];
    if (localName === 't') pieces.push(decodeXmlEntities(match[2] ?? ''));
    if (localName === 'tab' || localName === 'br') pieces.push(' ');
  }

  return pieces.join('');
}

function normalizeText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/giu, (entity, body: string) => {
    const normalized = body.toLowerCase();
    if (normalized === 'amp') return '&';
    if (normalized === 'lt') return '<';
    if (normalized === 'gt') return '>';
    if (normalized === 'quot') return '"';
    if (normalized === 'apos') return "'";
    if (normalized === 'nbsp') return ' ';
    if (normalized.startsWith('#x')) return codePointToString(Number.parseInt(normalized.slice(2), 16));
    if (normalized.startsWith('#')) return codePointToString(Number.parseInt(normalized.slice(1), 10));
    return entity;
  });
}

function codePointToString(codePoint: number): string {
  return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
}
