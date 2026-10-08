import { describe, expect, test } from "bun:test";

import type { VideoId } from "./tipos";
import { videoDoTexto } from "./video";

const ID = "aqz-KE-bpKQ";

describe("videoDoTexto", () => {
  test.each([
    ID,
    `  ${ID}  `,
    `https://www.youtube.com/watch?v=${ID}&t=30s`,
    `https://youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `http://www.youtube.com/watch?feature=share&v=${ID}`,
  ])("aceita %s", (texto) => {
    expect(videoDoTexto(texto)).toEqual({
      id: ID as VideoId,
      provedor: "youtube",
    });
  });

  test.each([
    "",
    "aqz-KE-bpK",
    "aqz-KE-bpKQQ",
    "aqz KE bpKQ",
    `https://vimeo.com/${ID}`,
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://evil.com/watch?v=${ID}`,
    `https://youtu.be.evil.com/${ID}`,
    "https://www.youtube.com/watch?v=curto",
    "https://www.youtube.com/watch",
    `https://www.youtube.com/playlist?list=${ID}`,
    `javascript:${ID}`,
  ])("recusa %s", (texto) => {
    expect(videoDoTexto(texto)).toBeNull();
  });
});
