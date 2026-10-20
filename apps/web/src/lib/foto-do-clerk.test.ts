import { describe, expect, test } from "bun:test";

import { fotoNoLado } from "./foto-do-clerk";

describe("fotoNoLado", () => {
  test("pede ao Clerk o dobro do lado", () => {
    const url = new URL(fotoNoLado("https://img.clerk.com/eyJ0eXBlIjoi", 40));
    expect(url.origin + url.pathname).toBe(
      "https://img.clerk.com/eyJ0eXBlIjoi"
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({ width: "80" });
  });

  test("mantém a query que a URL já tinha", () => {
    const url = new URL(fotoNoLado("https://img.clerk.com/abc?v=2", 18));
    expect(url.searchParams.get("v")).toBe("2");
    expect(url.searchParams.get("width")).toBe("36");
  });

  test("foto de outra origem passa como veio", () => {
    expect(fotoNoLado("https://exemplo.com/foto.png", 40)).toBe(
      "https://exemplo.com/foto.png"
    );
  });
});
