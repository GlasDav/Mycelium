import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('auth shell overrides the global app shell grid', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const match = css.match(/\.auth-shell\s*\{(?<body>[^}]+)\}/);
  assert(match?.groups?.body, 'auth-shell rule is missing');

  const body = match.groups.body;
  assert.match(body, /grid-template-columns\s*:\s*minmax\(0,\s*1fr\)/);
  assert.match(body, /width\s*:\s*100%/);
});
