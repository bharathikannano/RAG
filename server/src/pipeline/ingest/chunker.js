/**
 * Text chunker with configurable size and overlap.
 * Default: 600 chars, 100 char overlap — keeps RAM low on small machines.
 */

export function chunkText(text, {
  chunkSize = 600,
  chunkOverlap = 100,
} = {}) {
  // Normalize whitespace
  const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

  if (clean.length === 0) return [];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = start + chunkSize;

    // Try to break at a sentence boundary
    if (end < clean.length) {
      const boundary = findBreak(clean, end);
      end = boundary > start ? boundary : end;
    }

    const text = clean.slice(start, end).trim();
    if (text.length > 20) {
      chunks.push({
        text,
        meta: { charStart: start, charEnd: end },
      });
    }

    start = end - chunkOverlap;
    if (start >= clean.length) break;
  }

  return chunks;
}

function findBreak(text, pos) {
  // Look back up to 120 chars for sentence-ending punctuation
  const window = text.slice(Math.max(0, pos - 120), pos + 1);
  const sentenceEnd = /[.!?]\s/.exec(window);
  if (sentenceEnd) {
    return pos - (window.length - sentenceEnd.index - sentenceEnd[0].length);
  }
  // Fall back to paragraph break
  const paraBreak = window.lastIndexOf('\n\n');
  if (paraBreak !== -1) {
    return pos - (window.length - paraBreak - 2);
  }
  // Fall back to newline
  const lineBreak = window.lastIndexOf('\n');
  if (lineBreak !== -1) {
    return pos - (window.length - lineBreak - 1);
  }
  // Fall back to space
  const spaceBreak = window.lastIndexOf(' ');
  if (spaceBreak !== -1) {
    return pos - (window.length - spaceBreak - 1);
  }
  return pos;
}
