import { describe, it, expect } from "vitest";
import { parseYouTubeId } from "./youtube";

describe("parseYouTubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?list=PL1&v=dQw4w9WgXcQ&t=30s", "dQw4w9WgXcQ"],
  ])("%s → %s", (url, id) => {
    expect(parseYouTubeId(url)).toBe(id);
  });

  it("비유튜브·빈문자는 null", () => {
    expect(parseYouTubeId("https://vimeo.com/123456")).toBeNull();
    expect(parseYouTubeId("https://example.com/a.mp4")).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
  });
});
