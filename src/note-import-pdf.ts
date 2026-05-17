type PdfDocumentProxy = {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getTextContent(): Promise<{ items: unknown[] }>;
  }>;
  destroy(): Promise<void>;
};
type PdfTextItem = { str: string; hasEOL: boolean };

export async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  let document: PdfDocumentProxy | undefined;
  try {
    const { getDocument, VerbosityLevel } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = getDocument({
      data: new Uint8Array(arrayBuffer),
      disableWorker: true,
      useSystemFonts: true,
      verbosity: VerbosityLevel.ERRORS
    } as unknown as Parameters<typeof getDocument>[0]);
    document = await loadingTask.promise as PdfDocumentProxy;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const normalized = normalizePageText(textItemsToPlainText(content.items));
      if (normalized) pages.push(normalized);
    }

    const text = pages.join('\n\n').trim();
    if (!text) throw new Error('No extractable text found in PDF.');
    return text;
  } catch (error) {
    if (error instanceof Error && error.message === 'No extractable text found in PDF.') {
      throw error;
    }
    throw new Error('Could not parse PDF text. Choose a readable PDF with selectable text.');
  } finally {
    await document?.destroy();
  }
}

function textItemsToPlainText(items: unknown[]): string {
  const pieces: string[] = [];
  for (const item of items) {
    if (!isPdfTextItem(item)) continue;
    const text = item.str.replace(/\s+/gu, ' ').trim();
    if (text) pieces.push(text);
    pieces.push(item.hasEOL ? '\n' : ' ');
  }
  return pieces.join('');
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  return typeof item === 'object' && item !== null && 'str' in item && typeof (item as PdfTextItem).str === 'string';
}

function normalizePageText(text: string): string {
  return text
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t\f\v]+/gu, ' ').trim())
    .filter(Boolean)
    .join('\n');
}
