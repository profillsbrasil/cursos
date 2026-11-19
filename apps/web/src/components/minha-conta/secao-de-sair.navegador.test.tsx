import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { build } from "bun";

import {
  abrirChromium,
  avaliar,
  avaliarComo,
  CHROMIUM,
  type Enviar,
  fecharChromium,
} from "../chromium.test-utils";
import { ehNumero } from "../predicados.test-utils";

const ENTRADA = join(import.meta.dir, "secao-de-sair.entrada.tsx");

async function empacotar() {
  const pacote = await build({
    define: {
      "process.env": "{}",
      "process.env.NODE_ENV": '"development"',
    },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { BotoesDeSair } from "./secao-de-sair";

        window.saidas = 0;
        window.exclusoes = 0;
        const raiz = createRoot(document.getElementById("raiz"));
        flushSync(() =>
          raiz.render(
            <BotoesDeSair
              acao={{ executar: () => undefined, pendente: false }}
              certificados={0}
              sair={() => {
                window.saidas += 1;
                return Promise.resolve();
              }}
              user={{
                delete: () => {
                  window.exclusoes += 1;
                  return Promise.resolve();
                },
              }}
            />
          )
        );
      `,
    },
    format: "iife",
    target: "browser",
  });

  const [saida] = pacote.outputs;

  if (!(pacote.success && saida)) {
    throw new Error(
      `o pacote do Sair de Minha conta não saiu: ${pacote.logs.join("\n")}`
    );
  }

  return await saida.text();
}

let enviar: Enviar;

describe.skipIf(!existsSync(CHROMIUM))("o Sair de Minha conta", () => {
  beforeAll(async () => {
    const [aberto, pacote] = await Promise.all([
      abrirChromium("secao-de-sair"),
      empacotar(),
    ]);

    enviar = aberto;
    await avaliar(
      enviar,
      `document.open(); document.write('<!doctype html><html lang="pt-BR"><body><div id="raiz"></div></body></html>'); document.close();`
    );
    await avaliar(enviar, pacote);
  }, 20_000);

  afterAll(fecharChromium);

  test("Sair da conta chama a saída do Clerk uma vez e não exclui a conta", async () => {
    await avaliar(
      enviar,
      `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Sair da conta").click()`
    );
    expect(await avaliarComo(enviar, "window.saidas", ehNumero)).toBe(1);
    expect(await avaliarComo(enviar, "window.exclusoes", ehNumero)).toBe(0);
  });
});
