import { describe, expect, test } from "bun:test";

import { type Agendar, AVISO_MS, criarSinal } from "./sinal";

function relogioFalso() {
  let agora = 0;
  const fila = new Set<{ em: number; fn: () => void }>();
  const agendar: Agendar = (fn, ms) => {
    const item = { em: agora + ms, fn };
    fila.add(item);
    return () => {
      fila.delete(item);
    };
  };
  const avancar = (ms: number) => {
    agora += ms;
    for (const item of [...fila].sort((a, b) => a.em - b.em)) {
      if (item.em <= agora) {
        fila.delete(item);
        item.fn();
      }
    }
  };
  return { agendar, avancar };
}

describe("sinal com prazo", () => {
  test("o aviso da conquista some sozinho depois de 5,2 s", () => {
    const relogio = relogioFalso();
    const aviso = criarSinal(relogio.agendar, AVISO_MS);
    expect(AVISO_MS).toBe(5200);
    aviso.acender();
    relogio.avancar(5199);
    expect(aviso.aceso()).toBe(true);
    relogio.avancar(1);
    expect(aviso.aceso()).toBe(false);
  });

  test("acender de novo reinicia o prazo", () => {
    const relogio = relogioFalso();
    const sinal = criarSinal(relogio.agendar, 1000);
    sinal.acender();
    relogio.avancar(800);
    sinal.acender();
    relogio.avancar(800);
    expect(sinal.aceso()).toBe(true);
    relogio.avancar(200);
    expect(sinal.aceso()).toBe(false);
  });

  test("avisa quem assinou ao acender e ao apagar", () => {
    const relogio = relogioFalso();
    const sinal = criarSinal(relogio.agendar, 1000);
    const vistos: boolean[] = [];
    sinal.assinar(() => vistos.push(sinal.aceso()));
    sinal.acender();
    relogio.avancar(1000);
    expect(vistos).toEqual([true, false]);
  });
});
