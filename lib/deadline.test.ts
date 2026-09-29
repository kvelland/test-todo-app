import { describe, expect, it } from "vitest";

import {
  combineDeadline,
  deadlineState,
  formatDeadline,
  isDateOnlyDeadline,
  parseDeadline,
  splitDeadline,
} from "./deadline";

const OSLO = "Europe/Oslo";
const NYC = "America/New_York";

describe("combineDeadline", () => {
  it("resolves a date with no time to the end of that local day, in UTC", () => {
    expect(combineDeadline("2026-10-03", null, OSLO)).toBe("2026-10-03T21:59:59.999Z");
  });

  it("resolves a date with a time to that local instant, in UTC", () => {
    expect(combineDeadline("2026-10-03", "14:00", OSLO)).toBe("2026-10-03T12:00:00.000Z");
  });

  it("returns null when there is no date", () => {
    expect(combineDeadline("", "14:00", OSLO)).toBeNull();
    expect(combineDeadline("", null, OSLO)).toBeNull();
  });

  it("honours the offset on a spring-forward day", () => {
    // 29 March 2026 is the DST start in Oslo: 14:00 is CEST (UTC+2).
    expect(combineDeadline("2026-03-29", "14:00", OSLO)).toBe("2026-03-29T12:00:00.000Z");
  });

  it("honours the offset on a fall-back day", () => {
    // 25 October 2026 is the DST end in Oslo: 14:00 is CET (UTC+1).
    expect(combineDeadline("2026-10-25", "14:00", OSLO)).toBe("2026-10-25T13:00:00.000Z");
  });

  it("works for a negative-offset zone", () => {
    // New York is EDT (UTC-4) on 3 October 2026.
    expect(combineDeadline("2026-10-03", "14:00", NYC)).toBe("2026-10-03T18:00:00.000Z");
  });
});

describe("parseDeadline", () => {
  it("parses PocketBase's space-separated date string", () => {
    expect(parseDeadline("2026-10-03 21:59:59.999Z")?.toISOString()).toBe(
      "2026-10-03T21:59:59.999Z",
    );
  });

  it("parses a standard ISO string", () => {
    expect(parseDeadline("2026-10-03T21:59:59.999Z")?.toISOString()).toBe(
      "2026-10-03T21:59:59.999Z",
    );
  });

  it("returns null for missing or unparseable values", () => {
    expect(parseDeadline("")).toBeNull();
    expect(parseDeadline("not a date")).toBeNull();
  });
});

describe("isDateOnlyDeadline", () => {
  it("is true for an end-of-day deadline", () => {
    expect(isDateOnlyDeadline("2026-10-03T21:59:59.999Z", OSLO)).toBe(true);
  });

  it("is false when a time was set", () => {
    expect(isDateOnlyDeadline("2026-10-03T12:00:00.000Z", OSLO)).toBe(false);
  });

  it("is false for a missing deadline", () => {
    expect(isDateOnlyDeadline("", OSLO)).toBe(false);
  });
});

describe("splitDeadline", () => {
  it("round-trips a date-only deadline", () => {
    const stored = combineDeadline("2026-10-03", null, OSLO);
    expect(splitDeadline(stored as string, OSLO)).toEqual({ date: "2026-10-03", time: "" });
  });

  it("round-trips a deadline with a time", () => {
    const stored = combineDeadline("2026-10-03", "14:00", OSLO);
    expect(splitDeadline(stored as string, OSLO)).toEqual({ date: "2026-10-03", time: "14:00" });
  });

  it("returns null for a missing deadline", () => {
    expect(splitDeadline("", OSLO)).toBeNull();
  });
});

describe("deadlineState", () => {
  const deadline = "2026-10-03T21:59:59.999Z"; // 3 Oct, end of day in Oslo

  it("is none without a deadline", () => {
    expect(deadlineState("", new Date("2026-10-03T10:00:00Z"), OSLO)).toBe("none");
  });

  it("is today when the local day matches", () => {
    expect(deadlineState(deadline, new Date("2026-10-03T10:00:00Z"), OSLO)).toBe("today");
  });

  it("is overdue once the local day has passed", () => {
    expect(deadlineState(deadline, new Date("2026-10-04T10:00:00Z"), OSLO)).toBe("overdue");
  });

  it("is upcoming before the local day", () => {
    expect(deadlineState(deadline, new Date("2026-10-02T10:00:00Z"), OSLO)).toBe("upcoming");
  });

  it("compares local days, not raw UTC days", () => {
    // 22:30Z is already 00:30 on 4 Oct in Oslo, so the 3 Oct deadline is overdue.
    expect(deadlineState(deadline, new Date("2026-10-03T22:30:00Z"), OSLO)).toBe("overdue");
  });
});

describe("formatDeadline", () => {
  const now = new Date("2026-10-03T10:00:00Z"); // 3 Oct, midday in Oslo

  it("formats a future date-only deadline without a time", () => {
    const stored = combineDeadline("2026-10-06", null, OSLO) as string;
    expect(formatDeadline(stored, { now, locale: "en-GB", timeZone: OSLO })).toBe("Due 6 Oct");
  });

  it("formats a future deadline with a time", () => {
    const stored = combineDeadline("2026-10-06", "14:00", OSLO) as string;
    expect(formatDeadline(stored, { now, locale: "en-GB", timeZone: OSLO })).toBe(
      "Due 6 Oct 14:00",
    );
  });

  it("says today for a deadline due today", () => {
    const stored = combineDeadline("2026-10-03", null, OSLO) as string;
    expect(formatDeadline(stored, { now, locale: "en-GB", timeZone: OSLO })).toBe("Due today");
  });

  it("includes the time for a deadline due today with a time", () => {
    const stored = combineDeadline("2026-10-03", "14:00", OSLO) as string;
    expect(formatDeadline(stored, { now, locale: "en-GB", timeZone: OSLO })).toBe(
      "Due today 14:00",
    );
  });

  it("returns an empty string without a deadline", () => {
    expect(formatDeadline("", { now, timeZone: OSLO })).toBe("");
  });
});
