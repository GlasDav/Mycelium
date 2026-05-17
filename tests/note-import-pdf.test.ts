import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPdfText } from '../src/note-import-pdf';

test('extractPdfText returns page text in page order with readable line breaks', async () => {
  const pdf = minimalPdf([
    ['Nvidia demand remains strong.', 'Blackwell supply improves.'],
    ['Microsoft Azure spend is stabilizing.']
  ]);

  const text = await extractPdfText(pdf);

  assert.equal(
    text,
    'Nvidia demand remains strong.\nBlackwell supply improves.\n\nMicrosoft Azure spend is stabilizing.'
  );
});

test('extractPdfText rejects malformed PDF data with a clear error', async () => {
  await assert.rejects(
    () => extractPdfText(new TextEncoder().encode('not a pdf').buffer),
    /Could not parse PDF text/
  );
});

test('extractPdfText rejects PDFs with no extractable text', async () => {
  await assert.rejects(
    () => extractPdfText(minimalPdf([[]])),
    /No extractable text found in PDF/
  );
});

function minimalPdf(pages: string[][]): ArrayBuffer {
  const objects: string[] = [];
  const catalogObject = 1;
  const pagesObject = 2;
  const pageObjectIds = pages.map((_, index) => 3 + index * 3);

  objects[catalogObject] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[pagesObject] =
    `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;

  pages.forEach((lines, index) => {
    const pageObject = pageObjectIds[index];
    const fontObject = pageObject + 1;
    const contentObject = pageObject + 2;
    const operations = lines.map(line => `(${escapePdfString(line)}) Tj`).join('\n0 -14 Td\n');
    const content = operations ? `BT\n/F1 12 Tf\n72 720 Td\n${operations}\nET` : '';

    objects[pageObject] =
      `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[fontObject] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    objects[contentObject] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  const chunks = ['%PDF-1.4\n'];
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = chunks.join('').length;
    chunks.push(`${id} 0 obj\n${objects[id]}\nendobj\n`);
  }

  const xrefOffset = chunks.join('').length;
  chunks.push(`xref\n0 ${objects.length}\n0000000000 65535 f \n`);
  for (let id = 1; id < objects.length; id += 1) {
    chunks.push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new TextEncoder().encode(chunks.join('')).buffer;
}

function escapePdfString(value: string): string {
  return value.replace(/[\\()]/gu, match => `\\${match}`);
}
