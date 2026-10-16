import { expect, test } from "bun:test";

import { acertosParaPassar, letraDa } from "./questionario";

test("70% arredonda para cima: 3 de 3, 3 de 4, 4 de 5, 7 de 10", () => {
  expect([1, 2, 3, 4, 5, 6, 7, 10, 20].map(acertosParaPassar)).toEqual([
    1, 2, 3, 3, 4, 5, 5, 7, 14,
  ]);
});

test("as cinco letras pela posição", () => {
  expect([0, 1, 4].map(letraDa)).toEqual(["A", "B", "E"]);
});
