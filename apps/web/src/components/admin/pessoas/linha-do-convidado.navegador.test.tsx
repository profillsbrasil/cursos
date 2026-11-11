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
} from "../../chromium-de-teste";

const ENTRADA = join(import.meta.dir, "linha-do-convidado.entrada.tsx");
const TRPC = join(import.meta.dir, "trpc-convidado-falso.js");
const NAVEGACAO = join(import.meta.dir, "navegacao-convidado-falsa.js");
const LINK = join(import.meta.dir, "link-convidado-falso.jsx");
const TOAST = join(import.meta.dir, "toast-convidado-falso.js");

const FALSOS: [RegExp, string][] = [
  [/^@\/utils\/trpc$/, TRPC],
  [/^next\/navigation$/, NAVEGACAO],
  [/^next\/link$/, LINK],
  [/^sonner$/, TOAST],
];

/**
 * As linhas da opção Convidados com o servidor e o toast falsos. O falso grava
 * cada pedido em window.chamadas, com o nome do procedure, e o toast vai para
 * window.toasts.
 */
async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { LinhasDosConvidados } from "./linha-do-convidado";
        const CONVIDADOS = [
          {
            comoAdmin: false, convidadoEm: "2026-11-04", cursos: [], email: "ana@x.com",
            estado: { enviadoEm: "2026-11-10", expiraEm: "2026-12-10", tipo: "pendente" },
            id: "id-ana", perfil: "cliente",
          },
          {
            comoAdmin: true, convidadoEm: "2026-11-04", cursos: [], email: "bia@x.com",
            estado: { tipo: "nao_enviado" }, id: "id-bia", perfil: "funcionario",
          },
        ];
        window.chamadas = [];
        window.toasts = [];
        flushSync(() => createRoot(document.getElementById("raiz")).render(
          <LinhasDosConvidados convidados={CONVIDADOS} hoje="2026-11-11" />
        ));
      `,
      [TRPC]: `
        const pedir = (nome, resposta) => async (pedido) => {
          window.chamadas.push({ [nome]: pedido });
          await new Promise((r) => setTimeout(r, 30));
          return resposta;
        };
        export const trpcClient = { admin: { convites: {
          cancelar: { mutate: pedir("cancelar", { cancelado: true }) },
          reenviar: { mutate: pedir("reenviar", { enviadoEm: new Date().toISOString() }) },
        } } };
      `,
      [NAVEGACAO]:
        "export const useRouter = () => ({ refresh: () => undefined });",
      [LINK]: `
        export default function Link({ href, ...resto }) {
          return <a href={href} {...resto} />;
        }
      `,
      [TOAST]: `
        export const toast = {
          error: (texto) => window.toasts.push("erro: " + texto),
          success: (texto) => window.toasts.push(texto),
        };
      `,
    },
    format: "iife",
    plugins: [
      {
        name: "falsos",
        setup(b) {
          for (const [filtro, caminho] of FALSOS) {
            b.onResolve({ filter: filtro }, () => ({ path: caminho }));
          }
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

const AJUDANTES = `
  window.esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  window.clicar = async (nome) => {
    const alvo = [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent.trim()) === nome);
    if (!alvo) throw new Error("sem o botão " + nome);
    alvo.click();
    await esperar(150);
  };
  window.nomes = () => [...document.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") ?? b.textContent.trim());
`;

let enviar: Enviar;
let pacote: string;

async function abrir() {
  await avaliar(
    enviar,
    `document.open(); document.write('<!doctype html><html><body><div id="raiz"></div></body></html>'); document.close();`
  );
  await avaliar(enviar, pacote);
  await avaliar(enviar, AJUDANTES);
}

const clicar = (nome: string) =>
  avaliar(enviar, `window.clicar(${JSON.stringify(nome)})`);
const chamadas = () => avaliar<unknown[]>(enviar, "window.chamadas");
const toasts = () => avaliar<string[]>(enviar, "window.toasts");
const nomes = () => avaliar<string[]>(enviar, "window.nomes()");

describe.skipIf(!existsSync(CHROMIUM))(
  "a linha do convidado no browser",
  () => {
    beforeAll(async () => {
      enviar = await abrirChromium("linha-do-convidado");
      pacote = await empacotar();
    }, 20_000);

    afterAll(fecharChromium);

    test("Reenviar chama o servidor com o convite da linha e diz no toast", async () => {
      await abrir();
      await clicar("Reenviar o convite de ana@x.com");
      expect(await chamadas()).toEqual([{ reenviar: { id: "id-ana" } }]);
      expect(await toasts()).toEqual([
        "Convite enviado de novo para ana@x.com.",
      ]);
    });

    test("Enviar, na linha que nunca saiu, usa o mesmo caminho do Reenviar", async () => {
      await abrir();
      await clicar("Enviar o convite de bia@x.com");
      expect(await chamadas()).toEqual([{ reenviar: { id: "id-bia" } }]);
      expect(await toasts()).toEqual(["Convite enviado para bia@x.com."]);
    });

    test("Cancelar pede confirmação na linha, e só o Cancelar convite chama o servidor", async () => {
      await abrir();
      await clicar("Cancelar o convite de ana@x.com");
      expect(await chamadas()).toEqual([]);
      expect(await nomes()).toContain("Cancelar convite");

      await clicar("Cancelar convite");
      expect(await chamadas()).toEqual([{ cancelar: { id: "id-ana" } }]);
      expect(await toasts()).toEqual(["Convite de ana@x.com cancelado."]);
      expect(await nomes()).not.toContain("Cancelar convite");
    });
  }
);
