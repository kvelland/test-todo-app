export type DescriptionSegment =
  { type: "text"; value: string } | { type: "link"; value: string; href: string };

const URL_PATTERN = /\bhttps?:\/\/[^\s<>()]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/**
 * Splits a description into plain-text and link segments. Only http/https URLs
 * are recognised; everything is returned as data so the renderer can build React
 * elements instead of injecting HTML. Sentence punctuation that trails a URL is
 * left in the surrounding text rather than swallowed into the href.
 */
export function linkifyDescription(text: string): DescriptionSegment[] {
  const segments: DescriptionSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const trailing = raw.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const url = raw.slice(0, raw.length - trailing.length);

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
