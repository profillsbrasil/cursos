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
} from "../components/chromium.test-utils";
import { ehTexto, ouNulo } from "../components/predicados.test-utils";

const ENTRADA = join(import.meta.dir, "editor.entrada.ts");

async function empacotar() {
  const pacote = await build({
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { focarOPrimeiro } from "./editor";

        window.focarDepoisDoRender = () =>
          new Promise((pronto) => {
            document.body.replaceChildren();
            focarOPrimeiro(["aula-duracao"]);
            const campo = document.createElement("input");
            campo.id = "aula-duracao";
            queueMicrotask(() => document.body.append(campo));
            requestAnimationFrame(() =>
              pronto(document.activeElement?.id || null)
            );
          });
      `,
    },
    format: "iife",
    target: "browser",
  });

  const [saida] = pacote.outputs;

  if (!(pacote.success && saida)) {
    throw new Error(`o pacote do editor não saiu: ${pacote.logs.join("\n")}`);
  }

  return await saida.text();
}

let enviar: Enviar;

describe.skipIf(!existsSync(CHROMIUM))("focarOPrimeiro no Chromium", () => {
  beforeAll(async () => {
    const [aberto, pacote] = await Promise.all([
      abrirChromium("editor"),
      empacotar(),
    ]);

    enviar = aberto;
    await avaliar(
      enviar,
      `document.open(); document.write('<!doctype html><html lang="pt-BR"><body></body></html>'); document.close();`
    );
    await avaliar(enviar, pacote);
  }, 20_000);

  afterAll(fecharChromium);

  test("procura o campo só depois do render: o Salvar recusado abre o bloco do campo no mesmo render que marca o erro, e procurar antes do quadro seguinte não o acha", async () => {
    expect(
      await avaliarComo(enviar, "window.focarDepoisDoRender()", ouNulo(ehTexto))
    ).toBe("aula-duracao");
  });
});
