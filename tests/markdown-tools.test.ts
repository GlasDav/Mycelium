import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMarkdownCommand } from '../src/markdown-tools';

test('applyMarkdownCommand wraps inline selections with markdown formatting', () => {
  assert.equal(applyMarkdownCommand('alpha', 0, 5, 'bold').value, '**alpha**');
  assert.equal(applyMarkdownCommand('alpha', 0, 5, 'italic').value, '*alpha*');
  assert.equal(applyMarkdownCommand('alpha', 0, 5, 'underline').value, '<u>alpha</u>');
  assert.equal(applyMarkdownCommand('alpha', 0, 5, 'font-large').value, '<span data-size="large">alpha</span>');
});

test('applyMarkdownCommand formats every selected line for block commands', () => {
  assert.equal(applyMarkdownCommand('alpha\nbeta', 0, 10, 'heading-2').value, '## alpha\n## beta');
  assert.equal(applyMarkdownCommand('alpha\nbeta', 0, 10, 'bullet-list').value, '- alpha\n- beta');
  assert.equal(applyMarkdownCommand('alpha\nbeta', 0, 10, 'numbered-list').value, '1. alpha\n2. beta');
  assert.equal(applyMarkdownCommand('alpha\nbeta', 0, 10, 'quote').value, '> alpha\n> beta');
});

test('applyMarkdownCommand indents and outdents selected lines', () => {
  const indented = applyMarkdownCommand('alpha\nbeta', 0, 10, 'indent').value;
  assert.equal(indented, '  alpha\n  beta');
  assert.equal(applyMarkdownCommand(indented, 0, indented.length, 'outdent').value, 'alpha\nbeta');
});
