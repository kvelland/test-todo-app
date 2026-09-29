export type DescriptionSegment =
  { type: "text"; value: string } | { type: "link"; value: string; href: string };

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"]+/gi;
const TRAILING_PUNCTUATION = ".,;:!?'";
const CLOSING_BRACKETS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}

/**
 * Drops characters that end a match but belong to the surrounding prose:
 * sentence punctuation, and closing brackets with no opening partner inside
 * the URL (so `(https://a.test)` loses its `)` but `/wiki/Foo_(bar)` keeps it).
 */
function trimUrl(raw: string): string {
  let url = raw;
  while (url.length > 0) {
    const last = url[url.length - 1];
    const opening = CLOSING_BRACKETS[last];
    if (TRAILING_PUNCTUATION.includes(last)) {
      url = url.slice(0, -1);
    } else if (opening && count(url, last) > count(url, opening)) {
      url = url.slice(0, -1);
    } else {
      break;
    }
  }
  return url;
}

/**
 * Splits a description into plain-text and link segments. Only http/https URLs
 * are recognised; everything is returned as data so the renderer can build React
 * elements instead of injecting HTML. Sentence punctuation, quotes and unbalanced
 * closing brackets around a URL are left in the surrounding text rather than
 * swallowed into the href.
 */
export function linkifyDescription(text: string): DescriptionSegment[] {
  const segments: DescriptionSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    const url = trimUrl(match[0]);

    if (url.length === 0) continue;

    if (index > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, index) });
    }
    segments.push({ type: "link", value: url, href: url });
    cursor = index + url.length;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  return segments;
}
