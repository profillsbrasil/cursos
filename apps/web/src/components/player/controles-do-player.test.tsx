import { describe, expect, test } from "bun:test";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";

import { PREFERENCIAS_PADRAO } from "@/lib/player/preferencias";
import { estadoInicial } from "@/lib/player/sessao";

import { ControlesDoPlayer } from "./controles-do-player";

const nada = () => undefined;
const SLIDER_E_PAI = /<span class="([^"]*)"><div[^>]*data-slot="slider"/;

describe("controles do player", () => {
  test("o slider de volume mora numa caixa de 84 px, porque o w-full do slider vence a largura passada a ele", () => {
    const h = renderToStaticMarkup(
      <ControlesDoPlayer
        comandar={nada}
        estado={estadoInicial({
          duracaoSeg: 600,
          estudo: { assistida: false, trechos: SEM_TRECHOS },
          inicioSeg: 0,
          preferencias: PREFERENCIAS_PADRAO,
        })}
        podeTelaCheia={false}
        telaCheia={false}
      />
    );
    const caixa = h.match(SLIDER_E_PAI)?.[1].split(" ");
    expect(caixa).toContain("w-[84px]");
    expect(caixa).toContain("shrink-0");
  });
});
