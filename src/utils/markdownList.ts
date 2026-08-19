/**
 * Markdown list auto-continuation for textareas.
 *
 * Mirrors the behaviour of editors like GitHub and Trello: pressing Enter on a
 * markdown list item continues the list with the next marker, and pressing
 * Enter on an *empty* item ends the list by removing the marker.
 */

export interface ListEdit {
  /** Start offset of the range to replace. */
  start: number;
  /** End offset of the range to replace. */
  end: number;
  /** Text to insert in place of the range. */
  text: string;
  /** Where the caret should be placed after applying the edit. */
  cursor: number;
}

// Unordered list item, optionally a GFM task-list checkbox: "- ", "* [ ] foo", ...
const UNORDERED_RE = /^(\s*)([-*+])[ \t]+(\[[ xX]\][ \t]+)?(.*)$/;
// Ordered list item: "1. foo", "2) bar", ...
const ORDERED_RE = /^(\s*)(\d+)([.)])[ \t]+(.*)$/;

/**
 * Given the current textarea value and caret selection, decide what should
 * happen when Enter is pressed on a markdown list line.
 *
 * The result is expressed as a range replacement so the caller can apply it
 * synchronously (e.g. via `textarea.setRangeText`) without a caret race.
 *
 * @param value - Current textarea value
 * @param selectionStart - Caret start offset
 * @param selectionEnd - Caret end offset
 * @returns The edit to apply, or `null` when the caret is not on a list item
 *   (the caller should let the default newline happen).
 */
export function continueMarkdownList(
  value: string,
  selectionStart: number,
  selectionEnd: number
): ListEdit | null {
  // Only act on a collapsed caret; a range selection uses the default behaviour.
  if (selectionStart !== selectionEnd) {
    return null;
  }

  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const nextNewline = value.indexOf('\n', selectionStart);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;
  const line = value.slice(lineStart, lineEnd);

  let indent: string;
  let marker: string;
  let contentEmpty: boolean;

  const unordered = line.match(UNORDERED_RE);
  const ordered = unordered ? null : line.match(ORDERED_RE);

  if (unordered) {
    const [, ind, bullet, checkbox, content] = unordered;
    indent = ind;
    // Continue task lists with a fresh, unchecked checkbox.
    marker = checkbox ? `${bullet} [ ] ` : `${bullet} `;
    contentEmpty = content.trim() === '';
  } else if (ordered) {
    const [, ind, num, delim, content] = ordered;
    indent = ind;
    marker = `${parseInt(num, 10) + 1}${delim} `;
    contentEmpty = content.trim() === '';
  } else {
    return null;
  }

  // Empty item: end the list by clearing the marker on the current line.
  if (contentEmpty) {
    return { start: lineStart, end: lineEnd, text: '', cursor: lineStart };
  }

  // Continue the list: insert a newline plus the next marker at the caret.
  const text = `\n${indent}${marker}`;
  return {
    start: selectionStart,
    end: selectionEnd,
    text,
    cursor: selectionStart + text.length,
  };
}
