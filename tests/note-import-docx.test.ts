import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDocxText } from '../src/note-import-docx';

test('DOCX import extracts paragraph text in document order with normalized whitespace and entities', async () => {
  const docx = minimalDocx(`
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p>
          <w:r><w:t>Title &amp; topic</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:t>NVIDIA</w:t></w:r>
          <w:r><w:t xml:space="preserve"> demand </w:t></w:r>
          <w:r><w:t>remains strong.</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:t>Gross&#160;margin   expands</w:t></w:r>
          <w:r><w:tab/></w:r>
          <w:r><w:t>through Q3.</w:t></w:r>
        </w:p>
      </w:body>
    </w:document>
  `);

  const text = await extractDocxText(docx);

  assert.equal(text, 'Title & topic\nNVIDIA demand remains strong.\nGross margin expands through Q3.');
});

test('DOCX import throws a clear error when document XML is missing', async () => {
  await assert.rejects(
    () => extractDocxText(zipWithFiles({ '[Content_Types].xml': '<Types />' })),
    /DOCX file is malformed: missing word\/document\.xml/
  );
});

test('DOCX import throws a clear error when no text can be extracted', async () => {
  await assert.rejects(
    () => extractDocxText(minimalDocx('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p /></w:body></w:document>')),
    /No text could be extracted from the DOCX file/
  );
});

function minimalDocx(documentXml: string): ArrayBuffer {
  return zipWithFiles({
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types" />',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" />',
    'word/document.xml': documentXml
  });
}

function zipWithFiles(files: Record<string, string>): ArrayBuffer {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const contentBytes = encoder.encode(content);
    const crc = crc32(contentBytes);

    const local = new Uint8Array(30 + nameBytes.length + contentBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(contentBytes, 30 + nameBytes.length);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, centralParts.length, true);
  endView.setUint16(10, centralParts.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);

  return concatUint8Arrays([...localParts, ...centralParts, end]).buffer;
}

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
