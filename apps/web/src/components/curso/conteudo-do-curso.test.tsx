// A sanfona de "Conteúdo do curso" no Chromium headless: o HTML do servidor,
// hidratado pelo componente de verdade, e os cliques da pessoa. Sem Chromium na
// máquina, tudo pula.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { build } from "bun";
import { renderToString } from "react-dom/server";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import { ConteudoDoCurso } from "./conteudo-do-curso";
import { comercial } from "./exemplo";

const PAGINA = comercial.emAndamento;

// O next/link vira um <a>, porque fora do App Router ele não tem roteador. Os
// dois arquivos só existem na memória do empacotador.
const ENTRADA = join(import.meta.dir, "conteudo-do-curso.entrada.tsx");
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
        import { hydrateRoot } from "react-dom/client";
        import { ConteudoDoCurso } from "./conteudo-do-curso";

        function Hidratada({ aoHidratar, children }) {
          useEffect(aoHidratar, []);
          return children;
        }

        window.errosDoReact = [];
        const erro = console.error;
        console.error = (...partes) => {
          window.errosDoReact.push(partes.map(String).join(" "));
          erro(...partes);
        };

        window.hidratar = (pagina) =>
          new Promise((pronto) => {
            hydrateRoot(
              document.getElementById("raiz"),
              <Hidratada aoHidratar={() => pronto()}>
                <ConteudoDoCurso pagina={pagina} />
              </Hidratada>
            );
          });
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
    throw new Error(`o pacote da sanfona não saiu: ${pacote.logs.join("\n")}`);
  }
  return saida.text();
}

let enviar: Enviar;
let pacote: string;

interface Estado {
  abertos: boolean[];
  botao: string;
}

const ESTADO = `(() => ({
  abertos: [...document.querySelectorAll("details")].map((d) => d.open),
  botao: document.querySelector("section button").textContent,
}))()`;

const DEPOIS_DO_RENDER =
  "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))";

async function clicar(seletor: string) {
  await avaliar(
    enviar,
    `document.querySelector(${JSON.stringify(seletor)}).click()`
  );
  await avaliar(enviar, DEPOIS_DO_RENDER);
  return avaliar<Estado>(enviar, ESTADO);
}

describe.skipIf(!existsSync(CHROMIUM))("a sanfona dos módulos", () => {
  beforeAll(async () => {
    [enviar, pacote] = await Promise.all([
      abrirChromium("conteudo-do-curso"),
      empacotar(),
    ]);
  }, 30_000);

  afterAll(fecharChromium);

  test("hidrata com o módulo da aula atual aberto, e Abrir todos e Fechar todos alternam", async () => {
    await avaliar(
      enviar,
      `document.open(); document.write(${JSON.stringify(
        `<!doctype html><html lang="pt-BR"><body><div id="raiz">${renderToString(
          <ConteudoDoCurso pagina={PAGINA} />
        )}</div></body></html>`
      )}); document.close();`
    );
    await avaliar(enviar, pacote);
    await avaliar(enviar, `window.hidratar(${JSON.stringify(PAGINA)})`);
    expect(await avaliar<Estado>(enviar, ESTADO)).toEqual({
      abertos: [false, false, true, false],
      botao: "Abrir todos",
    });

    expect(await clicar("section button")).toEqual({
      abertos: [true, true, true, true],
      botao: "Fechar todos",
    });
    expect(await clicar("section button")).toEqual({
      abertos: [false, false, false, false],
      botao: "Abrir todos",
    });
    expect(await avaliar<string[]>(enviar, "window.errosDoReact")).toEqual([]);
  });

  test("abrir os módulos um a um também troca o botão para Fechar todos", async () => {
    await avaliar(
      enviar,
      'document.querySelectorAll("details:not([open]) > summary").forEach((s) => s.click())'
    );
    await avaliar(enviar, DEPOIS_DO_RENDER);
    expect(await avaliar<Estado>(enviar, ESTADO)).toEqual({
      abertos: [true, true, true, true],
      botao: "Fechar todos",
    });
    expect(await clicar("details:nth-of-type(2) > summary")).toEqual({
      abertos: [true, false, true, true],
      botao: "Abrir todos",
    });
  });
});
