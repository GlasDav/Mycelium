import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('command palette keeps filtering and keyboard selection in the extracted shell', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'premium-shell.tsx'), 'utf8');

  assert.match(source, /filterCommandItems/);
  assert.match(source, /activeIndex/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /aria-selected/);
  assert.match(source, /runActiveItem/);
  assert.match(source, /onDialogKeyDown/);
  assert.match(source, /event\.key !== 'Tab'/);
  assert.match(source, /document\.activeElement === last/);
  assert.match(source, /canToggleFocusMode/);
});
