import { describe, expect, test } from "bun:test";

import { codigoDigitado } from "./conferencia";

describe("codigoDigitado", () => {
  test.each([
    "7K3M-Q9TD",
    "7k3m-q9td",
    "7K3MQ9TD",
    "7k3mq9td",
    " 7K3M Q9TD ",
    "7K3M – Q9TD",
  ])("lê %p como 7K3M-Q9TD", (texto) => {
    expect(String(codigoDigitado(texto))).toBe("7K3M-Q9TD");
  });

  test.each([
    "",
    "7K3M-Q9T",
    "7K3M-Q9TDX",
    "7K3M-Q9T0",
    "7K3M-Q9TO",
    "7K3M-Q9T1",
    "7K3M-Q9TI",
    "7K3M-Q9TL",
    "7K3M/Q9TD",
    "PS-M0-2026-A1B2C3",
  ])("recusa %p", (texto) => {
    expect(codigoDigitado(texto)).toBeNull();
  });
});
