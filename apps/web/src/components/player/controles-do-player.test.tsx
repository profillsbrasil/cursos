import { describe, expect, test } from "bun:test";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";

import { PREFERENCIAS_PADRAO } from "@/lib/player/preferencias";
import { estadoInicial } from "@/lib/player/sessao";

import { ControlesDoPlayer } from "./controles-do-player";

const nada = () => undefined;
const SLIDER_E_PAI = /<span class="([^"]*)"><div[^>]*data-slot="slider"/;
const BOTAO_DA_LEGENDA = /<button[^>]*aria-label="Legendas"[^>]*>/;
const CLASSE = /class="([^"]*)"/;
const POLEGAR = /data-slot="slider-thumb"/g;
const PRESSIONADO = /aria-pressed="([^"]*)"/;
const ABRE_OS_AJUSTES =
  /aria-haspopup="dialog"[^>]*aria-label="Ajustes"|aria-label="Ajustes"[^>]*aria-haspopup="dialog"/;

const html = (legenda = false) =>
  renderToStaticMarkup(
    <ControlesDoPlayer
      aoMudarAtalhos={nada}
      atalhosAbertos={false}
      avisoAparente={false}
      comandar={nada}
      conquista={null}
      estado={estadoInicial({
        duracaoSeg: 600,
        estudo: { assistida: false, trechos: SEM_TRECHOS },
        inicioSeg: 0,
        preferencias: { ...PREFERENCIAS_PADRAO, legenda },
      })}
      podeTelaCheia
      portal={{ current: null }}
      telaCheia={false}
    />
  );

function botaoDaLegenda(h: string) {
  const tag = h.match(BOTAO_DA_LEGENDA)?.[0] ?? "";
  return {
    classes: (tag.match(CLASSE)?.[1] ?? "").split(" "),
    pressionado: tag.match(PRESSIONADO)?.[1],
  };
}

describe("controles do player", () => {
  test("o slider de volume mora numa caixa de 84 px, porque o w-full do slider vence a largura passada a ele", () => {
    const caixa = html().match(SLIDER_E_PAI)?.[1].split(" ");
    expect(caixa).toContain("w-[84px]");
    expect(caixa).toContain("shrink-0");
  });

  test("o volume tem um polegar só, então uma parada de Tab só", () => {
    expect(html().match(POLEGAR)).toHaveLength(1);
  });

  test("a legenda desligada é o botão solto, com o ícone apagado e sem a barra Sol", () => {
    const b = botaoDaLegenda(html(false));
    expect(b.pressionado).toBe("false");
    expect(b.classes).toContain("text-muted-foreground");
    expect(b.classes).not.toContain("after:bg-sol");
  });

  test("a legenda ligada é o botão pressionado, com a barra Sol de 2 px sob o ícone", () => {
    const b = botaoDaLegenda(html(true));
    expect(b.pressionado).toBe("true");
    expect(b.classes).toContain("after:bg-sol");
    expect(b.classes).toContain("after:h-0.5");
    expect(b.classes).not.toContain("text-muted-foreground");
  });

  test("a velocidade sai da barra e mora nos Ajustes, depois da legenda e antes da tela cheia", () => {
    const h = html();
    expect(h).not.toContain("Velocidade 1×");
    expect(h).not.toContain(">1×<");
    const ordem = [
      'aria-label="Legendas"',
      'aria-label="Ajustes"',
      'aria-label="Tela cheia"',
    ].map((m) => h.indexOf(m));
    expect(ordem.every((i) => i >= 0)).toBe(true);
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
    expect(h).toMatch(ABRE_OS_AJUSTES);
  });

  test("sem a linha de atalhos escrita sob a barra", () => {
    const h = html();
    expect(h).not.toContain("reproduz ·");
    expect(h).not.toContain("<kbd");
  });
});
