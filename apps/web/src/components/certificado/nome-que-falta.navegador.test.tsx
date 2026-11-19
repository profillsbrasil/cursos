// O cartão de quem não tem nome na página do certificado, montado de verdade no
// Chromium headless, com o usuário do Clerk falso: o teste digita, salva, faz o
// Clerk recusar e confere o pedido, o toast e o depois. Sem Chromium, a suíte pula.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { build } from "bun";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium.test-utils";

const ENTRADA = join(import.meta.dir, "nome-que-falta.entrada.tsx");
const CLERK = join(import.meta.dir, "clerk-falso.js");
const SONNER = join(import.meta.dir, "sonner-falso.js");
const IMAGEM = join(import.meta.dir, "imagem-falsa.js");
const CLERK_NEXTJS = /^@clerk\/nextjs$/;
const SONNER_PACOTE = /^sonner$/;
const NEXT_IMAGE = /^next\/image$/;

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { ClerkAPIResponseError } from "@clerk/nextjs/errors";
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { useAcaoDaConta } from "../minha-conta/use-acao-da-conta";
        import { FormularioDoNome } from "./nome-que-falta";
        import { TelaDoCertificado } from "./tela-do-certificado";

        const SEM_NOME = {
          categoria: "Produção e montagem",
          certificado: {
            codigo: "7K3M-Q9TD",
            emitidoEm: "2026-10-14T15:00:00Z",
            horas: 2,
            nome: null,
            tituloDoCurso: "Fábrica e montagem",
          },
          slug: "fabrica-e-montagem",
          tipo: "emitido",
        };

        // O Clerk falso: grava o pedido e, com window.recusa, recusa como o Clerk recusa.
        window.pedidos = [];
        window.toasts = [];
        window.depois = 0;
        const user = {
          update: async (pedido) => {
            window.pedidos.push(pedido);
            if (window.recusa) {
              throw new ClerkAPIResponseError("recusado", { data: [window.recusa], status: 422 });
            }
          },
        };

        function Formulario() {
          const acao = useAcaoDaConta();
          return (
            <FormularioDoNome
              acao={acao}
              depois={() => { window.depois += 1; }}
              user={user}
            />
          );
        }

        flushSync(() =>
          createRoot(document.getElementById("raiz")).render(
            <TelaDoCertificado
              hoje="2026-10-16"
              origem="https://cursos.exemplo.com.br"
              pagina={SEM_NOME}
              pedirONome={<Formulario />}
            />
          )
        );
      `,
      [CLERK]: "export const useReverification = (fazer) => fazer;",
      [SONNER]: `export const toast = {
        error: (m) => window.toasts.push(["erro", m]),
        success: (m) => window.toasts.push(["ok", m]),
      };`,
      [IMAGEM]: `import { createElement } from "react";
        export default function Image({ alt, height, src, style, width }) {
          return createElement("img", { alt, height, src, style, width });
        }`,
    },
    format: "iife",
    plugins: [
      {
        name: "clerk-falso",
        setup(construtor) {
          construtor.onResolve({ filter: CLERK_NEXTJS }, () => ({
            path: CLERK,
          }));
          construtor.onResolve({ filter: SONNER_PACOTE }, () => ({
            path: SONNER,
          }));
          construtor.onResolve({ filter: NEXT_IMAGE }, () => ({
            path: IMAGEM,
          }));
        },
      },
    ],
    target: "browser",
  });

  const [saida] = pacote.outputs;

  if (!(pacote.success && saida)) {
    throw new Error(`o pacote do cartão não saiu: ${pacote.logs.join("\n")}`);
  }

  return await saida.text();
}

let enviar: Enviar;
let pacote: string;

/** A página de 1280 px com a casca aberta, como a do aluno. */
async function abrir() {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: false,
    width: 1280,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      '<!doctype html><html class="dark" lang="pt-BR"><head><style id="css"></style></head><body style="margin:0"><main style="margin-left:248px;padding:32px 48px"><div id="raiz"></div></main></body></html>'
    )}); document.close(); window.recusa = null;`
  );
  await avaliar(enviar, pacote);

  const classes = await avaliar<string[]>(
    enviar,
    `[...document.querySelectorAll("[class]")].flatMap((e) => [...e.classList])`
  );

  const css = await cssDoApp(classes);
  await avaliar(
    enviar,
    `document.getElementById("css").textContent = ${JSON.stringify(css)}`
  );
}

const digitar = (campo: "nome" | "sobrenome", valor: string) =>
  avaliar(
    enviar,
    `(() => {
      const campo = document.querySelector('input[name="${campo}"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(campo, ${JSON.stringify(valor)});
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    })()`
  );

const BOTAO = `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Salvar nome")`;

const salvar = () => avaliar(enviar, `${BOTAO}.click()`);

const textoDe = (seletor: string) =>
  avaliar<string | null>(
    enviar,
    `document.querySelector(${JSON.stringify(seletor)})?.textContent.replace(/\\s+/g, " ").trim() ?? null`
  );

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

const RECUSA_DE_HTML = {
  code: "form_param_value_invalid",
  long_message: 'The first name "<b>" is invalid: contains HTML tags',
  message: "is invalid",
  meta: { param_name: "first_name" },
};

describe.skipIf(!existsSync(CHROMIUM))(
  "o nome que falta no certificado",
  () => {
    beforeAll(async () => {
      pacote = await empacotar();
      enviar = await abrirChromium("nome-que-falta");
    }, 30_000);

    afterAll(fecharChromium);

    test("salvar grava o nome aparado no Clerk, avisa e chama o depois", async () => {
      await abrir();
      await digitar("nome", "  Ana ");
      await digitar("sobrenome", " Souza  ");
      await salvar();
      await esperar("window.depois > 0");
      expect(await avaliar<unknown>(enviar, "window.pedidos")).toEqual([
        { firstName: "Ana", lastName: "Souza" },
      ]);
      expect(await avaliar<unknown>(enviar, "window.toasts")).toEqual([
        ["ok", "Nome salvo."],
      ]);
      expect(await avaliar<number>(enviar, "window.depois")).toBe(1);
    });

    test("o Clerk recusa: o toast diz a regra e o depois não roda", async () => {
      await abrir();
      await digitar("nome", "Bia");
      await avaliar(
        enviar,
        `window.recusa = ${JSON.stringify(RECUSA_DE_HTML)}`
      );
      await salvar();
      await esperar("window.toasts.length > 0");
      expect(await avaliar<unknown>(enviar, "window.toasts")).toEqual([
        ["erro", "O nome não pode ter os sinais <, > e &."],
      ]);
      expect(await avaliar<number>(enviar, "window.depois")).toBe(0);
    });

    test("antes de digitar, nada acusa erro, e o Salvar fica parado e diz por quê", async () => {
      await abrir();
      expect(await textoDe('[data-slot="field-error"]')).toBeNull();
      expect(
        await avaliar<{ desligado: boolean; motivo: string | null }>(
          enviar,
          `(() => {
          const botao = ${BOTAO};
          const motivo = document.getElementById(botao.getAttribute("aria-describedby") ?? "");
          return { desligado: botao.getAttribute("aria-disabled") === "true", motivo: motivo?.textContent ?? null };
        })()`
        )
      ).toEqual({ desligado: true, motivo: "Escreva o seu nome para salvar." });
      await salvar();
      expect(await avaliar<number>(enviar, "window.pedidos.length")).toBe(0);
    });

    test("o nome com os sinais de HTML: o campo avisa a regra e não envia", async () => {
      await abrir();
      await digitar("nome", "<b>Ana</b>");
      expect(await textoDe('[data-slot="field-error"]')).toBe(
        "O nome não pode ter os sinais <, > e &."
      );
      await salvar();
      expect(await avaliar<number>(enviar, "window.pedidos.length")).toBe(0);
    });

    test("os campos cabem no cartão, sem rolar a página", async () => {
      await abrir();

      const m = await avaliar<Record<string, number>>(
        enviar,
        `(() => {
        const cartao = document.querySelector('[aria-labelledby="falta-o-nome"]').getBoundingClientRect();
        const campos = [...document.querySelectorAll("input")].map((c) => c.getBoundingClientRect());
        return {
          direita: Math.max(...campos.map((c) => c.right)) - cartao.right,
          rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      })()`
      );

      expect(m.direita).toBeLessThan(0);
      expect(m.rolagem).toBe(0);
    });
  }
);
