import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

import type { Route } from "next";
import { renderToStaticMarkup } from "react-dom/server";

import CarregandoLiberacoes from "@/app/(admin)/admin/liberacoes/loading";
import CarregandoPerfis from "@/app/(admin)/admin/liberacoes/perfis/loading";
import CarregandoPessoas from "@/app/(admin)/admin/pessoas/loading";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
  avaliarComo,
} from "../chromium.test-utils";
import {
  ehNumero,
  ehObjeto,
  ouNulo,
  type Predicado,
} from "../predicados.test-utils";
import { abasDasLiberacoes } from "./abas-das-liberacoes";
import { BarraDaLista, contagemDePessoas } from "./barra-da-lista";
import { ORDEM_DOS_PERFIS, SOBRE_O_PERFIL } from "./pessoas/perfis";

const PESSOAS = [
  {
    ativa: true,
    href: "/admin/pessoas" as Route,
    n: null,
    rotulo: "Todos",
  },
  ...ORDEM_DOS_PERFIS.map((p, i) => ({
    ativa: false,
    href: `/admin/pessoas?perfil=${p}` as Route,
    n: [3, 2, 9][i] ?? 0,
    rotulo: SOBRE_O_PERFIL[p].plural,
  })),
  {
    ativa: false,
    href: "/admin/pessoas?ver=convidados" as Route,
    n: 3,
    rotulo: "Convidados",
  },
];

const TERMO_NO_TETO_DA_BUSCA_SEM_ESPACO = "anabeatrizdesouzaelimadasilva"
  .repeat(4)
  .slice(0, 100);

const CONTEUDO_EM_1440_COM_SIDEBAR_ABERTA = 1086;
const CONTEUDO_EM_390_DE_JANELA = 358;

const TELAS = {
  liberacoes: {
    esqueleto: renderToStaticMarkup(<CarregandoLiberacoes />),
    pronta: renderToStaticMarkup(
      <BarraDaLista
        busca={{
          acao: "/admin/liberacoes" as Route,
          id: "busca-de-alunos",
          termo: "",
        }}
        contagem="14 pessoas"
        opcoes={abasDasLiberacoes("pessoa")}
        rotuloDasOpcoes="Liberar por"
      />
    ),
  },
  perfis: {
    esqueleto: renderToStaticMarkup(<CarregandoPerfis />),
    pronta: renderToStaticMarkup(
      <BarraDaLista
        contagem="3 cursos, 1 liberados a todos"
        opcoes={abasDasLiberacoes("perfil")}
        rotuloDasOpcoes="Liberar por"
      />
    ),
  },
  pessoas: {
    esqueleto: renderToStaticMarkup(<CarregandoPessoas />),
    pronta: renderToStaticMarkup(
      <BarraDaLista
        busca={{
          acao: "/admin/pessoas" as Route,
          id: "busca-de-pessoas",
          termo: "",
        }}
        contagem="14 pessoas"
        opcoes={PESSOAS}
        rotuloDasOpcoes="Filtrar por perfil"
      />
    ),
  },
  termoLongo: {
    esqueleto: renderToStaticMarkup(<CarregandoPessoas />),
    pronta: renderToStaticMarkup(
      <BarraDaLista
        busca={{
          acao: "/admin/pessoas" as Route,
          id: "busca-de-pessoas",
          termo: TERMO_NO_TETO_DA_BUSCA_SEM_ESPACO,
        }}
        contagem={contagemDePessoas(0, 0, TERMO_NO_TETO_DA_BUSCA_SEM_ESPACO)}
        opcoes={PESSOAS}
        rotuloDasOpcoes="Filtrar por perfil"
      />
    ),
  },
};

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;

const css = await cssDoApp(
  Object.values(TELAS).flatMap(({ esqueleto, pronta }) =>
    [esqueleto, pronta].flatMap((html) =>
      [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
    )
  )
);

let enviar: Enviar;

interface Medida {
  altura: number;
  alturaDoEsqueleto: number;
  busca: number | null;
  contagem: number;
  sobra: number;
}

const ehMedida: Predicado<Medida> = ehObjeto({
  altura: ehNumero,
  alturaDoEsqueleto: ehNumero,
  busca: ouNulo(ehNumero),
  contagem: ehNumero,
  sobra: ehNumero,
});

async function medir(tela: keyof typeof TELAS, largura: number) {
  const { esqueleto, pronta } = TELAS[tela];
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><div id="pronta" style="width:${largura}px">${pronta}</div><div id="esqueleto" style="width:${largura}px">${esqueleto}</div></body></html>`
    )}); document.close();`
  );

  return await avaliarComo(
    enviar,
    `new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => {
      const barra = document.querySelector("#pronta").firstElementChild;
      const busca = barra.querySelector("search");
      r({
        contagem: barra.querySelector("p").scrollWidth,
        altura: barra.getBoundingClientRect().height,
        alturaDoEsqueleto: document.querySelector("#esqueleto [aria-busy] > :nth-child(3)").getBoundingClientRect().height,
        busca: busca ? busca.getBoundingClientRect().width : null,
        sobra: barra.scrollWidth - barra.clientWidth,
      });
    })))`,
    ehMedida
  );
}

describe.skipIf(!existsSync(CHROMIUM))("a barra da lista no browser", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("barra-da-lista");
    await enviar("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height: 900,
      mobile: false,
      width: 1920,
    });
  }, 20_000);

  afterAll(fecharChromium);

  for (const tela of ["pessoas", "liberacoes"] as const) {
    test(`em ${tela}, na largura do desktop, a barra tem uma linha só, com a busca de 320 px`, async () => {
      const m = await medir(tela, CONTEUDO_EM_1440_COM_SIDEBAR_ABERTA);
      expect(m.altura).toBe(44);
      expect(m.busca).toBeGreaterThanOrEqual(320);
      expect(m.busca).toBeLessThan(321);
    });

    test(`em ${tela}, no celular, a busca desce para a linha de baixo na largura inteira, sem rolagem`, async () => {
      const m = await medir(tela, CONTEUDO_EM_390_DE_JANELA);
      expect(m.busca).toBe(358);
      expect(m.sobra).toBe(0);
    });
  }

  test("a contagem com um termo de 100 letras sem espaço quebra a palavra, sem rolagem lateral no celular", async () => {
    const m = await medir("termoLongo", 358);
    expect(m.sobra).toBe(0);
    expect(m.contagem).toBeLessThanOrEqual(358);
  });

  test("em perfis, sem busca, a barra tem uma linha só também no celular", async () => {
    expect((await medir("perfis", 358)).altura).toBe(44);
  });

  for (const tela of ["pessoas", "liberacoes", "perfis"] as const) {
    for (const largura of [358, 754, 1086]) {
      test(`o esqueleto de ${tela} tem a altura da barra com ${largura} px`, async () => {
        const m = await medir(tela, largura);
        expect(m.alturaDoEsqueleto).toBe(m.altura);
      });
    }
  }
});
