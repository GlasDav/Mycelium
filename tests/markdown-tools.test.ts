import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMarkdownCommand, applySlashMarkdownCommand, slashMarkdownCommands } from '../src/markdown-tools';

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

test('slashMarkdownCommands exposes the supported block formatting commands', () => {
  assert.deepEqual(slashMarkdownCommands.map(command => [command.label, command.command]), [
    ['Normal paragraph', 'paragraph'],
    ['Heading 1', 'heading-1'],
    ['Heading 2', 'heading-2'],
    ['Heading 3', 'heading-3'],
    ['Bulleted list', 'bullet-list'],
    ['Numbered list', 'numbered-list'],
    ['Quote', 'quote']
  ]);
});

test('applySlashMarkdownCommand removes the slash trigger before applying block formatting', () => {
  assert.deepEqual(applySlashMarkdownCommand('/h1Alpha', 0, 3, 'heading-1'), {
    value: '# Alpha',
    selectionStart: 0,
    selectionEnd: 7
  });

  assert.equal(applySlashMarkdownCommand('Alpha\n/qBeta', 6, 8, 'quote').value, 'Alpha\n> Beta');
  assert.equal(applySlashMarkdownCommand('/p## Heading', 0, 2, 'paragraph').value, 'Heading');
  assert.equal(applySlashMarkdownCommand('/p> Quoted', 0, 2, 'paragraph').value, 'Quoted');
  assert.equal(applySlashMarkdownCommand('/p- Listed', 0, 2, 'paragraph').value, 'Listed');
});
