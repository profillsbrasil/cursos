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

const ENTRADA = join(import.meta.dir, "categorias.entrada.tsx");
const TRPC = join(import.meta.dir, "trpc-falso.js");
const NAVEGACAO = join(import.meta.dir, "navegacao-falsa.js");

const UTILS_TRPC = /^@\/utils\/trpc$/;
const NEXT_NAVIGATION = /^next\/navigation$/;

const REPETIDO = "Já existe uma categoria com este nome.";

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { Categorias } from "./categorias";

        const categorias = [
          { cursos: [], id: "00000000-0000-4000-8000-000000000001", nome: "Processo de envase" },
          {
            cursos: ["Profills School Comercial"],
            id: "00000000-0000-4000-8000-000000000002",
            nome: "Vendas e negócios",
          },
        ];
        // O about:blank do headless não é contexto seguro, e lá o crypto.randomUUID não existe.
        let gerados = 0;
        crypto.randomUUID ??= () => {
          gerados += 1;
          return "00000000-0000-4000-8000-1" + String(gerados).padStart(11, "0");
        };
        const raiz = createRoot(document.getElementById("raiz"));
        flushSync(() => raiz.render(<Categorias categorias={categorias} />));
      `,
      [TRPC]: `
        import { TRPCClientError } from "@trpc/client";

        const existentes = ["processo de envase", "vendas e negócios"];
        window.pedidos = [];
        const recusa = (message) =>
          new TRPCClientError(message, {
            result: {
              error: {
                code: -32000,
                data: { code: "CONFLICT", motivo: null, paraAPessoa: true },
                message,
              },
            },
          });
        export const trpcClient = {
          admin: {
            categorias: {
              salvar: {
                mutate: async (entrada) => {
                  window.pedidos.push(entrada.nome);
                  if (existentes.includes(entrada.nome.toLocaleLowerCase("pt-BR"))) {
                    throw recusa(${JSON.stringify(REPETIDO)});
                  }
                  return { id: entrada.id, novo: true };
                },
              },
            },
          },
        };
      `,
      [NAVEGACAO]: `
        export const useRouter = () => ({ refresh: () => undefined });
      `,
    },
    format: "iife",
    plugins: [
      {
        name: "servidor-falso",
        setup(construtor) {
          construtor.onResolve({ filter: UTILS_TRPC }, () => ({
            path: TRPC,
          }));
          construtor.onResolve({ filter: NEXT_NAVIGATION }, () => ({
            path: NAVEGACAO,
          }));
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(`o pacote da tela não saiu: ${pacote.logs.join("\n")}`);
  }
  return saida.text();
}

let enviar: Enviar;

async function abrirTela(pacote: string) {
  await avaliar(
    enviar,
    `document.open(); document.write('<!doctype html><html class="dark" lang="pt-BR"><body><div id="raiz"></div></body></html>'); document.close();`
  );
  await avaliar(enviar, pacote);
}

function esperar(condicao: string) {
  return avaliar(
    enviar,
    `new Promise((pronto, falhou) => {
      const inicio = performance.now();
      const olhar = () => {
        if (${condicao}) return pronto(true);
        if (performance.now() - inicio > 2000) return falhou(new Error("não aconteceu: " + ${JSON.stringify(condicao)}));
        setTimeout(olhar, 20);
      };
      olhar();
    })`
  );
}

async function escrever(seletor: string, valor: string) {
  await avaliar(
    enviar,
    `(() => { const c = document.querySelector(${JSON.stringify(seletor)}); c.focus(); c.select(); })()`
  );
  await enviar("Input.insertText", { text: valor });
}

const CODIGO_DA_TECLA = { Enter: 13, Escape: 27 } as const;

async function teclar(tecla: keyof typeof CODIGO_DA_TECLA) {
  const evento = {
    code: tecla,
    key: tecla,
    windowsVirtualKeyCode: CODIGO_DA_TECLA[tecla],
  };
  await enviar("Input.dispatchKeyEvent", {
    ...evento,
    text: tecla === "Enter" ? "\r" : undefined,
    type: "keyDown",
  });
  await enviar("Input.dispatchKeyEvent", { ...evento, type: "keyUp" });
}

const esperarAAcaoTerminar = () =>
  esperar(`!document.querySelector('[aria-busy="true"]')`);

interface EstadoDoCampo {
  descricao: string[];
  focado: boolean;
  invalido: string | null;
}

const estadoDoCampo = (seletor: string) => `(() => {
  const campo = document.querySelector(${JSON.stringify(seletor)});
  const descricao = (campo.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);
  return {
    descricao,
    focado: document.activeElement === campo,
    invalido: campo.getAttribute("aria-invalid"),
  };
})()`;

const NOVA = 'input[aria-label="Nome da nova categoria"]';
const RENOMEAR = 'input[aria-label="Nome da categoria"]';

describe.skipIf(!existsSync(CHROMIUM))("nome repetido no browser", () => {
  let pacote: string;

  beforeAll(async () => {
    [enviar, pacote] = await Promise.all([
      abrirChromium("categorias"),
      empacotar(),
    ]);
  }, 20_000);

  afterAll(fecharChromium);

  test("ao criar, a frase do servidor fica embaixo do campo, que volta a ter o foco", async () => {
    await abrirTela(pacote);
    await escrever(NOVA, "Vendas e Negócios");
    await avaliar(
      enviar,
      `[...document.querySelectorAll("button")].find((b) => b.textContent === "Criar categoria").click()`
    );
    await esperar(`document.querySelector('${NOVA}[aria-invalid="true"]')`);
    expect(await avaliar<EstadoDoCampo>(enviar, estadoDoCampo(NOVA))).toEqual({
      descricao: [REPETIDO],
      focado: true,
      invalido: "true",
    });
    expect(await avaliar<string[]>(enviar, "window.pedidos")).toEqual([
      "Vendas e Negócios",
    ]);
  });

  test("mudar o nome tira a marca do campo", async () => {
    await enviar("Input.insertText", { text: "s" });
    expect(await avaliar<EstadoDoCampo>(enviar, estadoDoCampo(NOVA))).toEqual({
      descricao: [],
      focado: true,
      invalido: null,
    });
  });

  test("o campo vazio não vai ao servidor", async () => {
    await abrirTela(pacote);
    await escrever(NOVA, "   ");
    await teclar("Enter");
    await esperar(`document.querySelector('${NOVA}[aria-invalid="true"]')`);
    expect(
      await avaliar<EstadoDoCampo>(enviar, estadoDoCampo(NOVA))
    ).toMatchObject({
      descricao: ["Escreva o nome da categoria."],
      focado: true,
    });
    expect(await avaliar<string[]>(enviar, "window.pedidos")).toEqual([]);
  });

  test("ao renomear, a frase do servidor fica embaixo do campo da linha", async () => {
    await abrirTela(pacote);
    await avaliar(
      enviar,
      `document.querySelector('[aria-label="Renomear Processo de envase"]').click()`
    );
    await esperar(`document.activeElement?.matches('${RENOMEAR}')`);
    expect(
      await avaliar<string>(
        enviar,
        `document.querySelector('${RENOMEAR}').value`
      )
    ).toBe("Processo de envase");
    await escrever(RENOMEAR, "Vendas e negócios");
    await teclar("Enter");
    await esperar(`document.querySelector('${RENOMEAR}[aria-invalid="true"]')`);
    await esperarAAcaoTerminar();
    expect(
      await avaliar<EstadoDoCampo>(enviar, estadoDoCampo(RENOMEAR))
    ).toEqual({
      descricao: [REPETIDO],
      focado: true,
      invalido: "true",
    });
  });

  test("Escape fecha o renomear, e o foco volta ao nome da categoria", async () => {
    await teclar("Escape");
    await esperar(`!document.querySelector('${RENOMEAR}')`);
    expect(
      await avaliar<string[]>(
        enviar,
        "[document.activeElement.tagName, document.activeElement.textContent]"
      )
    ).toEqual(["H3", "Processo de envase"]);
  });

  test("a linha em uso avisa, no renomear, quantos cursos mudam de nome", async () => {
    await avaliar(
      enviar,
      `document.querySelector('[aria-label="Renomear Vendas e negócios"]').click()`
    );
    await esperar(`document.querySelector('${RENOMEAR}')`);
    expect(
      await avaliar<EstadoDoCampo>(enviar, estadoDoCampo(RENOMEAR))
    ).toMatchObject({
      descricao: ["O nome novo vale na hora para 1 curso."],
    });
  });
});
