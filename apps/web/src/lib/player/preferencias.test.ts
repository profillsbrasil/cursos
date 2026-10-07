import { describe, expect, test } from "bun:test";

import {
  PREFERENCIAS_PADRAO,
  type Preferencias,
  paraPreferencias,
} from "./preferencias";

describe("paraPreferencias", () => {
  test("sem nada guardado, o padrão", () => {
    expect(paraPreferencias(null)).toEqual(PREFERENCIAS_PADRAO);
  });

  test("lê o que a sessão gravou", () => {
    const guardado: Preferencias = {
      velocidade: 1.5,
      volume: { mudo: true, nivel: 35 },
    };
    expect(paraPreferencias(JSON.stringify(guardado))).toEqual(guardado);
  });

  test("valor fora da lista ou quebrado volta ao padrão", () => {
    expect(
      paraPreferencias(
        JSON.stringify({ velocidade: 3, volume: { mudo: false, nivel: 50 } })
      )
    ).toEqual(PREFERENCIAS_PADRAO);
    expect(
      paraPreferencias(
        JSON.stringify({ velocidade: 1, volume: { mudo: false, nivel: 150 } })
      )
    ).toEqual(PREFERENCIAS_PADRAO);
    expect(paraPreferencias("{")).toEqual(PREFERENCIAS_PADRAO);
  });
});
