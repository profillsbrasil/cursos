import { describe, expect, test } from "bun:test";

import { atalhoDe } from "./atalho";

// O Ctrl+B da sidebar também aceita a tecla Command. No Mac a dica mostra o
// atalho que a pessoa usa ali.
describe("a dica de recolher mostra o atalho da plataforma", () => {
  test("macOS pelo navigator.platform: ⌘ B", () => {
    expect(atalhoDe({ platform: "MacIntel" })).toBe("⌘ B");
  });

  test("macOS pelo userAgentData, que vence o platform: ⌘ B", () => {
    expect(
      atalhoDe({ platform: "", userAgentData: { platform: "macOS" } })
    ).toBe("⌘ B");
  });

  test("iPad e iPhone com teclado: ⌘ B", () => {
    expect(atalhoDe({ platform: "iPad" })).toBe("⌘ B");
    expect(atalhoDe({ platform: "iPhone" })).toBe("⌘ B");
  });

  test("Linux e Windows: Ctrl B", () => {
    expect(atalhoDe({ platform: "Linux x86_64" })).toBe("Ctrl B");
    expect(atalhoDe({ userAgentData: { platform: "Windows" } })).toBe("Ctrl B");
  });

  test("sem plataforma conhecida: Ctrl B", () => {
    expect(atalhoDe({})).toBe("Ctrl B");
  });
});
