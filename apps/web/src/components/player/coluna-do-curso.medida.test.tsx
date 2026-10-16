// A coluna do curso no Chromium headless, numa janela de 1440 x 710, com o CSS
// real do app. Acima de 1080 px ela rola sozinha e precisa abrir com a aula
// atual no meio. Três caminhos chegam a ela: a carga direta (F5, link, PWA
// reaberto), em que o HTML do servidor pinta antes do JS; o streaming do
// loading.tsx, em que a coluna chega escondida e o React a revela depois; e a
// navegação no cliente, em que o React monta a coluna e troca a aula. Sem
// Chromium na máquina, tudo pula.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { AulaId } from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { build } from "bun";
import { renderToString } from "react-dom/server";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import { ColunaDoCurso } from "./coluna-do-curso";

const MODULOS = 16;
const AULAS_POR_MODULO = 8;

const idDaAula = (modulo: number, aula: number) =>
  `00000000-0000-4000-8000-${String(modulo * 100 + aula).padStart(12, "0")}` as AulaId;

/** O curso de 16 módulos de 8 aulas, com a aula atual onde o teste pedir. */
function cursoNaAula(modulo: number, aula: number): AulaNoPlayer {
  const atual = idDaAula(modulo, aula);
  return {
    anterior: null,
    aula: {
      descricao: "",
      duracaoSeg: 660,
      id: atual,
      modulo: { numero: modulo, titulo: `Módulo ${modulo}` },
      numeroNoModulo: aula + 1,
      titulo: `Aula ${modulo}.${aula + 1}`,
      totalNoModulo: AULAS_POR_MODULO,
      video: null,
    },
    curso: {
      progresso: { feitas: 0, pct: 0, total: MODULOS * AULAS_POR_MODULO },
      slug: "profills-school-comercial",
      titulo: "Profills School Comercial",
    },
    estudo: { assistida: false, posicaoSeg: 0, trechos: SEM_TRECHOS },
    modulos: [...new Array(MODULOS).keys()].map((m) => ({
      atual: m === modulo,
      aulas: [...new Array(AULAS_POR_MODULO).keys()].map((a) => ({
        assistida: false,
        atual: m === modulo && a === aula,
        duracaoSeg: 660,
        id: idDaAula(m, a),
        questionario: { tipo: "sem" },
        titulo: `Aula ${m}.${a + 1}`,
      })),
      feitas: 0,
      numero: m,
      titulo: `Módulo ${m}`,
    })),
    proxima: null,
    questionario: null,
  };
}

/** "Cronograma reverso", a aula 4 do módulo 8, a da prova do PR #59. */
const NO_MEIO = cursoNaAula(8, 3);
/** Longe o bastante do fim da lista para caber no meio da coluna. */
const MAIS_ABAIXO = cursoNaAula(10, 2);

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [NO_MEIO, MAIS_ABAIXO].flatMap((dados) =>
    [
      ...renderToString(<ColunaDoCurso dados={dados} />).matchAll(CLASSES),
    ].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

// O componente de verdade, empacotado para o browser. O next/link vira um <a>,
// porque fora do App Router ele não tem roteador. Os dois arquivos só existem
// na memória do empacotador.
const ENTRADA = join(import.meta.dir, "coluna-do-curso.entrada.tsx");
const LINK = join(import.meta.dir, "link-sem-roteador.js");
const NEXT_LINK = /^next\/link$/;
async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [LINK]: `import { createElement } from "react";
        export default function Link(props) { return createElement("a", props); }`,
      [ENTRADA]: `
        import { useEffect } from "react";
        import { flushSync } from "react-dom";
        import { createRoot, hydrateRoot } from "react-dom/client";
        import { ColunaDoCurso } from "./coluna-do-curso";

        function Hidratada({ aoHidratar, children }) {
          useEffect(aoHidratar, []);
          return children;
        }

        // O que o React reclama no console: hidratação que não bate, script
        // criado no cliente. No app, o modo dev do Next mostra isso como erro.
        window.errosDoReact = [];
        const erro = console.error;
        console.error = (...partes) => {
          window.errosDoReact.push(partes.map(String).join(" "));
          erro(...partes);
        };

        let raiz;
        window.coluna = {
          hidratar: (dados) =>
            new Promise((pronto) => {
              raiz = hydrateRoot(
                document.getElementById("raiz"),
                <Hidratada aoHidratar={() => pronto()}>
                  <ColunaDoCurso dados={dados} />
                </Hidratada>
              );
            }),
          montar: (dados) => {
            raiz = createRoot(document.getElementById("raiz"));
            flushSync(() => raiz.render(<ColunaDoCurso dados={dados} />));
          },
          trocar: (dados) =>
            flushSync(() => raiz.render(<ColunaDoCurso dados={dados} />)),
        };
      `,
    },
    plugins: [
      {
        name: "link-sem-roteador",
        setup(construtor) {
          construtor.onResolve({ filter: NEXT_LINK }, () => ({ path: LINK }));
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(`o pacote da coluna não saiu: ${pacote.logs.join("\n")}`);
  }
  return saida.text();
}

let enviar: Enviar;
let pacote: string;

/** A página com o CSS do app e a coluna na largura que ela tem no player. */
async function abrirPagina(corpo: string) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 710,
    mobile: false,
    width: 1440,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0;padding:16px">${corpo}</body></html>`
    )}); document.close();`
  );
}

interface Medida {
  centroDaAula: number;
  centroDaColuna: number;
  rolagem: number;
  rolagemDaPagina: number;
}

const MEDIR = `(() => {
  const coluna = document.querySelector("aside");
  const aula = coluna.querySelector('[aria-current="page"]').getBoundingClientRect();
  const caixa = coluna.getBoundingClientRect();
  return {
    centroDaAula: aula.top + aula.height / 2,
    centroDaColuna: caixa.top + coluna.clientTop + coluna.clientHeight / 2,
    rolagem: coluna.scrollTop,
    rolagemDaPagina: window.scrollY,
  };
})()`;

const DEPOIS_DO_RENDER =
  "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))";

function esperarCentrada(medida: Medida) {
  expect(medida.rolagem).toBeGreaterThan(0);
  expect(Math.abs(medida.centroDaAula - medida.centroDaColuna)).toBeLessThan(1);
  expect(medida.rolagemDaPagina).toBe(0);
}

async function esperarSemErroDoReact() {
  expect(await avaliar<string[]>(enviar, "window.errosDoReact")).toEqual([]);
}

const RAIZ = (html: string) =>
  `<div id="raiz" style="width:360px">${html}</div><div style="height:1200px"></div>`;

describe.skipIf(!existsSync(CHROMIUM))(
  "a coluna abre na aula atual, a 1440 x 710",
  () => {
    beforeAll(async () => {
      [enviar, pacote] = await Promise.all([
        abrirChromium("coluna-do-curso"),
        empacotar(),
      ]);
    }, 30_000);

    afterAll(fecharChromium);

    test("na carga direta, o HTML do servidor já pinta a coluna centrada, antes do JS", async () => {
      await abrirPagina(
        RAIZ(renderToString(<ColunaDoCurso dados={NO_MEIO} />))
      );
      // Sem esperar quadro nenhum: a medida sai na mesma tarefa que escreveu o HTML.
      esperarCentrada(await avaliar<Medida>(enviar, MEDIR));
    });

    test("no streaming do loading.tsx, a coluna centra no quadro em que o React a revela", async () => {
      await abrirPagina(
        `<div hidden id="escondida">${renderToString(
          <ColunaDoCurso dados={NO_MEIO} />
        )}</div>${RAIZ("")}`
      );
      await avaliar(enviar, DEPOIS_DO_RENDER);
      // O $RC do React: move o conteúdo da caixa escondida para o lugar.
      const medida = await avaliar<Medida>(
        enviar,
        `(async () => {
          const escondida = document.getElementById("escondida");
          document.getElementById("raiz").append(...escondida.childNodes);
          await new Promise((r) => requestAnimationFrame(r));
          return ${MEDIR};
        })()`
      );
      esperarCentrada(medida);
    });

    test("montada pelo React, na navegação no cliente, a coluna abre centrada", async () => {
      await abrirPagina(RAIZ(""));
      await avaliar(enviar, pacote);
      await avaliar(enviar, `window.coluna.montar(${JSON.stringify(NO_MEIO)})`);
      esperarCentrada(await avaliar<Medida>(enviar, MEDIR));
      await esperarSemErroDoReact();
    });

    test("a cada aula nova, a coluna centra de novo", async () => {
      await abrirPagina(RAIZ(""));
      await avaliar(enviar, pacote);
      await avaliar(enviar, `window.coluna.montar(${JSON.stringify(NO_MEIO)})`);
      const antes = await avaliar<Medida>(enviar, MEDIR);
      await avaliar(
        enviar,
        `window.coluna.trocar(${JSON.stringify(MAIS_ABAIXO)})`
      );
      const depois = await avaliar<Medida>(enviar, MEDIR);
      esperarCentrada(depois);
      expect(depois.rolagem).toBeGreaterThan(antes.rolagem);
      await esperarSemErroDoReact();
    });

    test("a hidratação não desfaz a rolagem que a pessoa fez antes do JS chegar", async () => {
      await abrirPagina(
        RAIZ(renderToString(<ColunaDoCurso dados={NO_MEIO} />))
      );
      await avaliar(enviar, 'document.querySelector("aside").scrollTop = 40');
      await avaliar(enviar, pacote);
      await avaliar(
        enviar,
        `window.coluna.hidratar(${JSON.stringify(NO_MEIO)})`
      );
      await avaliar(enviar, DEPOIS_DO_RENDER);
      const medida = await avaliar<Medida>(enviar, MEDIR);
      expect(medida.rolagem).toBe(40);
      await esperarSemErroDoReact();
    });
  }
);
