import { describe, expect, test } from "bun:test";
import type { Trecho } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";

import { BarraDeTrechos } from "./barra-de-trechos";

const AMARELO =
  /class="absolute inset-y-0 bg-sol" style="left:([\d.]+)%;width:([\d.]+)%"/g;
const POLEGAR = /rounded-full bg-titulo[^"]*" style="left:([\d.]+)%"/;

const nada = () => undefined;

// Com 100 s de vídeo, 1% da barra é 1 s.
const barra = (trechos: Trecho[], tempoSeg: number) => {
  const html = renderToStaticMarkup(
    <BarraDeTrechos
      aoBuscar={nada}
      duracaoSeg={100}
      tempoSeg={tempoSeg}
      trechos={trechos}
    />
  );
  return {
    amarelos: [...html.matchAll(AMARELO)].map(([, l, w]) => [
      Number(l),
      Number(l) + Number(w),
    ]),
    polegar: Number(html.match(POLEGAR)?.[1]),
  };
};

describe("o amarelo da barra e o polegar", () => {
  test("o trecho que acaba no segundo do polegar vai até ele, com a fração", () => {
    const b = barra([{ fim: 2, inicio: 0 }], 2.6);
    expect(b.polegar).toBe(2.6);
    expect(b.amarelos).toEqual([[0, 2.6]]);
  });

  test("com o polegar dentro de um trecho, o trecho fica como está", () => {
    expect(barra([{ fim: 8, inicio: 0 }], 3.4).amarelos).toEqual([[0, 8]]);
  });

  test("um segundo ou mais depois do fim, o amarelo não segue o polegar", () => {
    expect(barra([{ fim: 2, inicio: 0 }], 3).amarelos).toEqual([[0, 2]]);
    expect(barra([{ fim: 2, inicio: 0 }], 40).amarelos).toEqual([[0, 2]]);
  });
});
