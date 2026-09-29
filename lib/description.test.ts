import { describe, expect, it } from "vitest";
import { linkifyDescription } from "./description";

describe("linkifyDescription", () => {
  it("returns the whole string as one text segment when there is no URL", () => {
    expect(linkifyDescription("Just some notes\nwith a break")).toEqual([
      { type: "text", value: "Just some notes\nwith a break" },
    ]);
  });

  it("returns a single link segment for a bare URL", () => {
    expect(linkifyDescription("https://example.com")).toEqual([
      { type: "link", value: "https://example.com", href: "https://example.com" },
    ]);
  });

  it("splits surrounding text around a URL", () => {
    expect(linkifyDescription("see http://example.com/a for details")).toEqual([
      { type: "text", value: "see " },
      { type: "link", value: "http://example.com/a", href: "http://example.com/a" },
      { type: "text", value: " for details" },
    ]);
  });

  it("keeps trailing sentence punctuation out of the href", () => {
    expect(linkifyDescription("Read https://example.com/post.")).toEqual([
      { type: "text", value: "Read " },
      { type: "link", value: "https://example.com/post", href: "https://example.com/post" },
      { type: "text", value: "." },
    ]);
  });

  it("finds multiple URLs", () => {
    expect(linkifyDescription("https://a.test and https://b.test")).toEqual([
      { type: "link", value: "https://a.test", href: "https://a.test" },
      { type: "text", value: " and " },
      { type: "link", value: "https://b.test", href: "https://b.test" },
    ]);
  });

  it("ignores non-http(s) schemes", () => {
    expect(linkifyDescription("mailto:hi@example.com javascript:alert(1)")).toEqual([
      { type: "text", value: "mailto:hi@example.com javascript:alert(1)" },
    ]);
  });

  it("returns no segments for an empty string", () => {
    expect(linkifyDescription("")).toEqual([]);
  });
});
