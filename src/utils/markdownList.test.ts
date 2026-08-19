import { describe, it, expect } from 'vitest';
import { continueMarkdownList } from './markdownList';

/**
 * Helper: place the caret with a "|" marker in the input string, run the
 * continuation, apply the returned range edit, and return the resulting string
 * with "|" reinserted at the new caret position (or null when no continuation
 * happens).
 */
function run(withCaret: string): string | null {
  const caret = withCaret.indexOf('|');
  const value = withCaret.replace('|', '');
  const edit = continueMarkdownList(value, caret, caret);
  if (!edit) return null;
  const applied = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  return applied.slice(0, edit.cursor) + '|' + applied.slice(edit.cursor);
}

describe('continueMarkdownList', () => {
  it('continues a dash bullet list', () => {
    expect(run('- first|')).toBe('- first\n- |');
  });

  it('continues asterisk and plus bullets', () => {
    expect(run('* item|')).toBe('* item\n* |');
    expect(run('+ item|')).toBe('+ item\n+ |');
  });

  it('continues an ordered list and increments the number', () => {
    expect(run('1. first|')).toBe('1. first\n2. |');
    expect(run('9. ninth|')).toBe('9. ninth\n10. |');
  });

  it('supports ordered lists with ) delimiter', () => {
    expect(run('1) first|')).toBe('1) first\n2) |');
  });

  it('preserves indentation for nested items', () => {
    expect(run('  - nested|')).toBe('  - nested\n  - |');
    expect(run('    1. deep|')).toBe('    1. deep\n    2. |');
  });

  it('continues a task list with a fresh unchecked checkbox', () => {
    expect(run('- [ ] todo|')).toBe('- [ ] todo\n- [ ] |');
    expect(run('- [x] done|')).toBe('- [x] done\n- [ ] |');
  });

  it('ends the list when the current bullet item is empty', () => {
    // Empty "- " item: marker removed, leaving a blank line.
    expect(run('- first\n- |')).toBe('- first\n|');
  });

  it('ends the list when the current ordered item is empty', () => {
    expect(run('1. first\n2. |')).toBe('1. first\n|');
  });

  it('ends the list when an empty task item is submitted', () => {
    expect(run('- [ ] |')).toBe('|');
  });

  it('returns null on a non-list line', () => {
    expect(run('just a paragraph|')).toBeNull();
    expect(run('|')).toBeNull();
  });

  it('returns null for a bare marker with no trailing space (not yet a list)', () => {
    expect(run('-|')).toBeNull();
  });

  it('returns null when there is a range selection', () => {
    expect(continueMarkdownList('- item', 2, 4)).toBeNull();
  });

  it('splits content when Enter is pressed mid-item, carrying text to the new item', () => {
    expect(run('- foo|bar')).toBe('- foo\n- |bar');
  });

  it('continues the correct line in a multi-line value', () => {
    expect(run('intro\n- one|\ntail')).toBe('intro\n- one\n- |\ntail');
  });
});
