import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { build } from "bun";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";

const ENTRADA = join(import.meta.dir, "categorias-apagar.entrada.tsx");
const TRPC = join(import.meta.dir, "trpc-apagar-falso.js");
const NAVEGACAO = join(import.meta.dir, "navegacao-apagar-falsa.js");

const UTILS_TRPC = /^@\/utils\/trpc$/;
const NEXT_NAVIGATION = /^next\/navigation$/;

const LIVRE = {
  cursos: [],
  id: "00000000-0000-4000-8000-000000000001",
  nome: "Processo de envase",
};
const EM_USO = {
  cursos: ["Fábrica e montagem"],
  id: "00000000-0000-4000-8000-000000000002",
  nome: "Vendas e negócios",
};

const RESPOSTA = {
  aceita: "return { apagado: true };",
  recusada: `throw new TRPCClientError("Esta categoria está em 1 curso.", {
    result: { error: { code: -32000, data: { code: "PRECONDITION_FAILED", motivo: null, paraAPessoa: true }, message: "Esta categoria está em 1 curso." } },
  });`,
};

/** O refresh troca a lista pelo que o servidor teria devolvido depois da resposta. */
const DEPOIS = {
  aceita: JSON.stringify([EM_USO]),
  recusada: JSON.stringify([{ ...LIVRE, cursos: ["Curso novo"] }, EM_USO]),
};

async function empacotar(resposta: keyof typeof RESPOSTA) {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { useState } from "react";
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { Categorias } from "./categorias";
        let n = 0;
        // O about:blank do headless não é contexto seguro, e lá o randomUUID não existe.
        crypto.randomUUID ??= () => "00000000-0000-4000-8000-1" + String(++n).padStart(11, "0");
        function Raiz() {
          const [lista, trocar] = useState(${JSON.stringify([LIVRE, EM_USO])});
          window.atualizar = () => trocar(${DEPOIS[resposta]});
          return <Categorias categorias={lista} />;
        }
        flushSync(() => createRoot(document.getElementById("raiz")).render(<Raiz />));
      `,
      [TRPC]: `
        import { TRPCClientError } from "@trpc/client";
        export const trpcClient = { admin: { categorias: { apagar: { mutate: async () => {
          await new Promise((r) => setTimeout(r, 30));
          ${RESPOSTA[resposta]}
        } } } } };
      `,
      [NAVEGACAO]:
        "export const useRouter = () => ({ refresh: () => window.atualizar() });",
    },
    format: "iife",
    plugins: [
      {
        name: "falsos",
        setup(b) {
          b.onResolve({ filter: UTILS_TRPC }, () => ({ path: TRPC }));
          b.onResolve({ filter: NEXT_NAVIGATION }, () => ({ path: NAVEGACAO }));
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(pacote.logs.join("\n"));
  }
  return saida.text();
}

let enviar: Enviar;

async function apagarALivre(pacote: string) {
  await avaliar(
    enviar,
    `document.open(); document.write('<!doctype html><html><body><div id="raiz"></div></body></html>'); document.close();`
  );
  await avaliar(enviar, pacote);
  await avaliar(
    enviar,
    `document.querySelector('button[aria-label="Apagar ${LIVRE.nome}"]').click()`
  );
  await avaliar(
    enviar,
    `document.querySelector('button[aria-label="Confirmar: apagar ${LIVRE.nome}"]').click()`
  );
  await avaliar(enviar, "new Promise((r) => setTimeout(r, 300))");
}

describe.skipIf(!existsSync(CHROMIUM))("apagar categoria no browser", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("categorias-apagar");
  }, 20_000);

  afterAll(fecharChromium);

  test("depois de apagar, o foco vai ao título da lista", async () => {
    await apagarALivre(await empacotar("aceita"));
    expect(await avaliar<string>(enviar, "document.activeElement.id")).toBe(
      "todas"
    );
  });

  test("depois da recusa, a linha volta com o nome e o Renomear, e o foco fica no nome", async () => {
    await apagarALivre(await empacotar("recusada"));
    expect(
      await avaliar<{ foco: string; nome: boolean; renomear: boolean }>(
        enviar,
        `(() => {
          const linha = document.querySelector("li");
          return {
            foco: document.activeElement.textContent,
            nome: linha.querySelector("h3")?.textContent === ${JSON.stringify(LIVRE.nome)},
            renomear: Boolean(linha.querySelector('button[aria-label="Renomear ${LIVRE.nome}"]')),
          };
        })()`
      )
    ).toEqual({ foco: LIVRE.nome, nome: true, renomear: true });
  });
});
