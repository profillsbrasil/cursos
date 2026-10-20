import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { MaterialDoDocumento } from "@cursos/api/dominio/edicao-do-curso";
import { documentoDeExemplo, uuidDeExemplo } from "@cursos/api/dominio/exemplo";
import type { MaterialId, Versao } from "@cursos/api/dominio/tipos";
import { build, sleep } from "bun";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";

const AQUI = import.meta.dir;
const ENTRADA = join(AQUI, "material.entrada.tsx");
const TRPC = join(AQUI, "trpc-falso.js");
const NAVEGACAO = join(AQUI, "navegacao-falsa.js");

const SUBSTITUTOS: [RegExp, string][] = [
  [/^@\/utils\/trpc$/, TRPC],
  [/^next\/navigation$/, NAVEGACAO],
];

const material = (n: number): MaterialDoDocumento => ({
  bytes: 1000 * n,
  chave: `${String(n).padStart(64, "0")}.pdf`,
  id: uuidDeExemplo(900 + n) as MaterialId,
  nomeDoArquivo: `arquivo-${n}.pdf`,
  tipo: "pdf",
  titulo: `Material ${n}`,
});

const DOCUMENTO = {
  ...documentoDeExemplo("v1" as Versao),
  materiais: [material(1), material(2), material(3)],
};

const TELA = `
  import { StrictMode, useReducer } from "react";
  import { flushSync } from "react-dom";
  import { createRoot } from "react-dom/client";
  import { MaterialDeApoio } from "./material-de-apoio";
  import { rascunhoDoEditor, rascunhoDoEditorEm } from "./rascunho-do-editor";

  function Tela() {
    const [estado, despachar] = useReducer(
      rascunhoDoEditor,
      ${JSON.stringify(DOCUMENTO)},
      rascunhoDoEditorEm
    );
    window.ordem = estado.rascunho.materiais.map((m) => m.titulo);
    return <MaterialDeApoio despachar={despachar} estado={estado} />;
  }

  const raiz = createRoot(document.getElementById("raiz"));
  flushSync(() => raiz.render(<StrictMode><Tela /></StrictMode>));
`;

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: TELA,
      [TRPC]: "export const trpcClient = {};",
      [NAVEGACAO]:
        "export const useRouter = () => ({ refresh: () => undefined });",
    },
    format: "iife",
    plugins: [
      {
        name: "servidor-falso",
        setup(construtor) {
          for (const [filtro, caminho] of SUBSTITUTOS) {
            construtor.onResolve({ filter: filtro }, () => ({ path: caminho }));
          }
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(`o pacote da seção não saiu: ${pacote.logs.join("\n")}`);
  }
  return saida.text();
}

const PALAVRA = /[\s"'`{}]+/;
const css = await cssDoApp(
  ["material-de-apoio.tsx", "partes.tsx"]
    .map((f) => readFileSync(join(AQUI, f), "utf8"))
    .flatMap((t) => t.split(PALAVRA))
);

let enviar: Enviar;

/** A ordem que a tela mostra, pelos campos de título de cima para baixo. */
const naTela = () =>
  avaliar<string[]>(
    enviar,
    `[...document.querySelectorAll("li input")].map((i) => i.value)`
  );

const ordemNoRascunho = () => avaliar<string[]>(enviar, "window.ordem");

/** O centro do elemento da linha n (a partir de 1) que o seletor acha dentro dela. */
const centroDe = (linha: number, seletor: string) =>
  avaliar<{ x: number; y: number }>(
    enviar,
    `(() => {
      const r = document.querySelectorAll("li")[${linha - 1}].querySelector(${JSON.stringify(seletor)}).getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`
  );

/** As linhas que, depois de soltas, ainda não voltaram ao lugar delas na lista. */
const deslocadas = () =>
  avaliar<string[]>(
    enviar,
    `[...document.querySelectorAll("li")].flatMap((li) => {
      const t = getComputedStyle(li).transform;
      return t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)" ? [] : [li.querySelector("input")?.value + " " + t];
    })`
  );

const alturaDaLinha = () =>
  avaliar<number>(
    enviar,
    `document.querySelector("li").getBoundingClientRect().height`
  );

/** Aperta em `de`, desce `distancia` px em passos de um quadro e solta. */
async function arrastar(de: { x: number; y: number }, distancia: number) {
  const ponto = { button: "left", x: de.x };
  await enviar("Input.dispatchMouseEvent", {
    ...ponto,
    clickCount: 1,
    type: "mousePressed",
    y: de.y,
  });
  const passos = 20;
  for (let i = 1; i <= passos; i += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: cada passo do ponteiro precisa chegar antes do seguinte, um quadro depois.
    await enviar("Input.dispatchMouseEvent", {
      ...ponto,
      type: "mouseMoved",
      y: de.y + (distancia * i) / passos,
    });
    await sleep(16);
  }
  await enviar("Input.dispatchMouseEvent", {
    ...ponto,
    clickCount: 1,
    type: "mouseReleased",
    y: de.y + distancia,
  });
  await sleep(300);
}

async function abrirTela(pacote: string) {
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body class="bg-background text-foreground" style="margin:0;padding:24px;width:720px"><div id="raiz"></div></body></html>`
    )}); document.close();`
  );
  await avaliar(enviar, pacote);
}

describe.skipIf(!existsSync(CHROMIUM))(
  "arrastar o material de apoio no browser",
  () => {
    let pacote: string;

    beforeAll(async () => {
      [enviar, pacote] = await Promise.all([
        abrirChromium("material-de-apoio"),
        empacotar(),
      ]);
    });

    afterAll(fecharChromium);

    test("a alça leva a primeira linha para o fim, na tela e no rascunho", async () => {
      await abrirTela(pacote);
      const altura = await alturaDaLinha();
      await arrastar(await centroDe(1, "[title]"), altura * 2.2);
      const esperado = ["Material 2", "Material 3", "Material 1"];
      expect(await naTela()).toEqual(esperado);
      expect(await ordemNoRascunho()).toEqual(esperado);
      expect(await deslocadas()).toEqual([]);
      expect(await avaliar<string>(enviar, "getSelection().toString()")).toBe(
        ""
      );
    });

    test("com movimento reduzido, a alça também leva a linha para o fim", async () => {
      await enviar("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await abrirTela(pacote);
      const altura = await alturaDaLinha();
      await arrastar(await centroDe(1, "[title]"), altura * 2.2);
      await enviar("Emulation.setEmulatedMedia", { features: [] });
      expect(await naTela()).toEqual([
        "Material 2",
        "Material 3",
        "Material 1",
      ]);
      expect(await deslocadas()).toEqual([]);
    });

    test("arrastar pelo campo de título seleciona o texto e não move a linha", async () => {
      await abrirTela(pacote);
      const altura = await alturaDaLinha();
      await arrastar(await centroDe(1, "input"), altura * 2.2);
      const antes = ["Material 1", "Material 2", "Material 3"];
      expect(await naTela()).toEqual(antes);
      expect(await ordemNoRascunho()).toEqual(antes);
    });
  }
);
