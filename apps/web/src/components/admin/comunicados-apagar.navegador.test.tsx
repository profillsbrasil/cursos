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

const ENTRADA = join(import.meta.dir, "comunicados-apagar.entrada.tsx");
const TRPC = join(import.meta.dir, "trpc-comunicados-falso.js");
const NAVEGACAO = join(import.meta.dir, "navegacao-comunicados-falsa.js");

const UTILS_TRPC = /^@\/utils\/trpc$/;
const NEXT_NAVIGATION = /^next\/navigation$/;

const comunicado = (n: number, titulo: string) => ({
  curso: null,
  id: `00000000-0000-4000-8000-00000000000${n}`,
  publicadoEm: "2026-10-02T12:00:00.000Z",
  publicadoPor: "Ana Souza",
  texto: "O que mudou e onde o aluno encontra.",
  titulo,
});
const APAGADO = comunicado(1, "Módulo 13 atualizado");
const FICA = comunicado(2, "Nova aula de limpeza");

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { useState } from "react";
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { Comunicados } from "./comunicados";
        // O about:blank do headless não é contexto seguro, e lá o randomUUID não existe.
        crypto.randomUUID ??= () => "00000000-0000-4000-8000-100000000000";
        function Raiz() {
          const [lista, trocar] = useState(${JSON.stringify([APAGADO, FICA])});
          window.atualizar = () => trocar(${JSON.stringify([FICA])});
          return <Comunicados comunicados={lista} cursos={[]} />;
        }
        flushSync(() => createRoot(document.getElementById("raiz")).render(<Raiz />));
      `,
      [TRPC]: `
        export const trpcClient = { admin: { comunicados: { apagar: { mutate: async () => {
          await new Promise((r) => setTimeout(r, 30));
          return { apagado: true };
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

describe.skipIf(!existsSync(CHROMIUM))("apagar comunicado no browser", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("comunicados-apagar");
  }, 20_000);

  afterAll(fecharChromium);

  test("depois de apagar, o foco vai ao título da lista, não ao body", async () => {
    await avaliar(
      enviar,
      `document.open(); document.write('<!doctype html><html><body><div id="raiz"></div></body></html>'); document.close();`
    );
    await avaliar(enviar, await empacotar());
    await avaliar(
      enviar,
      `document.querySelector('button[aria-label="Apagar ${APAGADO.titulo}"]').click()`
    );
    await avaliar(
      enviar,
      `document.querySelector('button[aria-label="Confirmar: apagar ${APAGADO.titulo}"]').focus()`
    );
    await avaliar(
      enviar,
      `document.querySelector('button[aria-label="Confirmar: apagar ${APAGADO.titulo}"]').click()`
    );
    await avaliar(enviar, "new Promise((r) => setTimeout(r, 300))");
    expect(
      await avaliar<{ foco: string; itens: string[] }>(
        enviar,
        `({
          foco: document.activeElement.id || document.activeElement.tagName,
          itens: [...document.querySelectorAll("li h3")].map((h) => h.textContent),
        })`
      )
    ).toEqual({ foco: "publicados", itens: [FICA.titulo] });
  });
});
