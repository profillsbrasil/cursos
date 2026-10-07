import { describe, expect, test } from "bun:test";
import { canonizar, type Trecho } from "@cursos/api/dominio/trechos";

import {
  type Amostra,
  amostrar,
  cortar,
  fechar,
  MEDIDOR_PARADO,
  type Medidor,
} from "./medidor";

function tocar(
  m0: Medidor,
  deSeg: number,
  ateSeg: number,
  taxa: number,
  passoMs = 250,
  relogio0 = 0
) {
  let m = m0;
  const trechos: Trecho[] = [];
  const passos = Math.round(((ateSeg - deSeg) / taxa) * (1000 / passoMs));
  for (let i = 0; i <= passos; i += 1) {
    const a: Amostra = {
      relogioMs: relogio0 + i * passoMs,
      taxa,
      videoSeg: deSeg + (i * passoMs * taxa) / 1000,
    };
    const r = amostrar(m, a);
    m = r.medidor;
    trechos.push(...r.trechos);
  }
  return { m, trechos };
}

describe("medidor", () => {
  test("contínuo a 1x e a 2x vira um trecho só", () => {
    for (const taxa of [1, 2]) {
      const { m, trechos } = tocar(MEDIDOR_PARADO, 0, 60, taxa);
      expect(trechos).toEqual([]);
      expect(fechar(m).trechos).toEqual([{ fim: 60, inicio: 0 }]);
    }
  });

  test("salto para a frente fecha o trecho antes do salto", () => {
    const { m } = tocar(MEDIDOR_PARADO, 0, 30, 1);
    const r = amostrar(m, { relogioMs: 30_250, taxa: 1, videoSeg: 300 });
    expect(r.trechos).toEqual([{ fim: 30, inicio: 0 }]);
    expect(r.medidor.aberto?.inicioSeg).toBe(300);
  });

  test("salto para trás também fecha", () => {
    const { m } = tocar(MEDIDOR_PARADO, 100, 130, 1);
    const r = amostrar(m, { relogioMs: 30_250, taxa: 1, videoSeg: 50 });
    expect(r.trechos).toEqual([{ fim: 130, inicio: 100 }]);
  });

  test("amostra atrasada 60 s (aba em segundo plano) ainda estende", () => {
    const { m } = tocar(MEDIDOR_PARADO, 0, 10, 2);
    const r = amostrar(m, { relogioMs: 5000 + 60_000, taxa: 2, videoSeg: 130 });
    expect(r.trechos).toEqual([]);
    expect(fechar(r.medidor).trechos).toEqual([{ fim: 130, inicio: 0 }]);
  });

  test("cortar sucessivo não deixa buraco entre envios", () => {
    let { m } = tocar(MEDIDOR_PARADO, 0, 15.6, 1);
    const um = cortar(m);
    ({ m } = tocar(um.medidor, 15.6, 31.3, 1, 250, 15_600));
    const dois = cortar(m);
    expect(canonizar([...um.trechos, ...dois.trechos], 600)).toEqual([
      { fim: 31, inicio: 0 },
    ] as never);
  });

  test("parado, fechar e cortar não devolvem nada", () => {
    expect(fechar(MEDIDOR_PARADO).trechos).toEqual([]);
    expect(cortar(MEDIDOR_PARADO).trechos).toEqual([]);
  });
});
