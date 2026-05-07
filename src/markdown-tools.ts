export type MarkdownCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'paragraph'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'bullet-list'
  | 'numbered-list'
  | 'quote'
  | 'indent'
  | 'outdent'
  | 'font-small'
  | 'font-large';

export interface MarkdownEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export type SlashMarkdownCommand = Extract<MarkdownCommand, 'paragraph' | 'heading-1' | 'heading-2' | 'heading-3' | 'bullet-list' | 'numbered-list' | 'quote'>;

export interface SlashMarkdownCommandOption {
  command: SlashMarkdownCommand;
  label: string;
}

export const slashMarkdownCommands: SlashMarkdownCommandOption[] = [
  { command: 'paragraph', label: 'Normal paragraph' },
  { command: 'heading-1', label: 'Heading 1' },
  { command: 'heading-2', label: 'Heading 2' },
  { command: 'heading-3', label: 'Heading 3' },
  { command: 'bullet-list', label: 'Bulleted list' },
  { command: 'numbered-list', label: 'Numbered list' },
  { command: 'quote', label: 'Quote' }
];

export function applyMarkdownCommand(value: string, selectionStart: number, selectionEnd: number, command: MarkdownCommand): MarkdownEdit {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  if (isInlineCommand(command)) {
    return applyInlineCommand(value, start, end, command);
  }

  return applyBlockCommand(value, start, end, command);
}

export function applySlashMarkdownCommand(value: string, triggerStart: number, triggerEnd: number, command: SlashMarkdownCommand): MarkdownEdit {
  const start = Math.max(0, Math.min(triggerStart, triggerEnd));
  const end = Math.max(start, Math.max(triggerStart, triggerEnd));
  const nextValue = `${value.slice(0, start)}${value.slice(end)}`;
  return applyMarkdownCommand(nextValue, start, start, command);
}

function isInlineCommand(command: MarkdownCommand) {
  return command === 'bold' || command === 'italic' || command === 'underline' || command === 'font-small' || command === 'font-large';
}

function applyInlineCommand(value: string, start: number, end: number, command: MarkdownCommand): MarkdownEdit {
  const selected = value.slice(start, end) || 'text';
  const wrappers: Record<Extract<MarkdownCommand, 'bold' | 'italic' | 'underline' | 'font-small' | 'font-large'>, [string, string]> = {
    bold: ['**', '**'],
    italic: ['*', '*'],
    underline: ['<u>', '</u>'],
    'font-small': ['<span data-size="small">', '</span>'],
    'font-large': ['<span data-size="large">', '</span>']
  };
  const [open, close] = wrappers[command as keyof typeof wrappers];
  const replacement = `${open}${selected}${close}`;
  return {
    value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
    selectionStart: start + open.length,
    selectionEnd: start + open.length + selected.length
  };
}

function applyBlockCommand(value: string, start: number, end: number, command: MarkdownCommand): MarkdownEdit {
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextLineBreak = value.indexOf('\n', end);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const formatted = lines.map((line, index) => formatLine(line, index, command)).join('\n');

  return {
    value: `${value.slice(0, lineStart)}${formatted}${value.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + formatted.length
  };
}

function formatLine(line: string, index: number, command: MarkdownCommand) {
  switch (command) {
    case 'paragraph':
      return stripBlockFormatting(line);
    case 'heading-1':
      return `# ${stripHeading(line)}`;
    case 'heading-2':
      return `## ${stripHeading(line)}`;
    case 'heading-3':
      return `### ${stripHeading(line)}`;
    case 'bullet-list':
      return `- ${stripListMarker(line)}`;
    case 'numbered-list':
      return `${index + 1}. ${stripListMarker(line)}`;
    case 'quote':
      return `> ${line.replace(/^>\s?/, '')}`;
    case 'indent':
      return `  ${line}`;
    case 'outdent':
      return line.replace(/^( {1,2}|\t)/, '');
    default:
      return line;
  }
}

function stripHeading(line: string) {
  return line.replace(/^#{1,6}\s+/, '');
}

function stripListMarker(line: string) {
  return line.replace(/^(\s*)([-*+]|\d+\.)\s+/, '$1');
}

function stripBlockFormatting(line: string) {
  return stripListMarker(stripHeading(line.replace(/^>\s?/, '')));
}
