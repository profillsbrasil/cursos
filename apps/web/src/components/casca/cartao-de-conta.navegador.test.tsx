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
import { ehLista, ehObjeto, ehTexto, ouNulo } from "../predicados.test-utils";

const ENTRADA = join(import.meta.dir, "cartao-de-conta.entrada.tsx");

async function empacotar() {
  const pacote = await build({
    define: {
      "process.env": "{}",
      "process.env.NODE_ENV": '"development"',
    },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { TooltipProvider } from "@cursos/ui/components/tooltip";
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { ComRoteador, roteadorDeTeste } from "../roteador.test-utils";
        import { MenuDaConta } from "./cartao-de-conta";
        import { ProvedorDaCasca } from "./provedor-da-casca";

        const ANA = { fullName: "Ana Souza", hasImage: false, imageUrl: "", primaryEmailAddress: null };
        const resolvida = (valor) =>
          Object.assign(Promise.resolve(valor), { status: "fulfilled", value: valor });

        window.montar = (sequenciaDias) => {
          const { chamadas, roteador } = roteadorDeTeste();
          window.chamadasDoRoteador = chamadas;
          window.saidas = 0;
          window.raizDoReact?.unmount();
          window.raizDoReact = createRoot(document.getElementById("raiz"));
          flushSync(() =>
            window.raizDoReact.render(
              <ComRoteador caminho="/meus-cursos" roteador={roteador}>
                <TooltipProvider>
                  <ProvedorDaCasca aberta>
                    <MenuDaConta
                      carregada
                      conta={ANA}
                      outraArea={null}
                      placar={sequenciaDias === null ? null : resolvida({ saldo: 610, sequenciaDias })}
                      sair={() => {
                        window.saidas += 1;
                        return Promise.resolve();
                      }}
                    />
                  </ProvedorDaCasca>
                </TooltipProvider>
              </ComRoteador>
            )
          );
        };
      `,
    },
    format: "iife",
    target: "browser",
  });

  const [saida] = pacote.outputs;

  if (!(pacote.success && saida)) {
    throw new Error(
      `o pacote do cartão de conta não saiu: ${pacote.logs.join("\n")}`
    );
  }

  return await saida.text();
}

let enviar: Enviar;

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

async function abrirOMenu(sequenciaDias: number | null) {
  await avaliar(enviar, `window.montar(${JSON.stringify(sequenciaDias)})`);
  await avaliar(
    enviar,
    `document.querySelector('[data-slot="dropdown-menu-trigger"]').click()`
  );
  await esperar(
    `document.querySelector('[data-slot="dropdown-menu-content"]')`
  );
}

const itensDoMenu = () =>
  avaliarComo(
    enviar,
    `[...document.querySelectorAll('[data-slot="dropdown-menu-content"] [data-slot="dropdown-menu-item"]')].map((i) => i.textContent.replace(/\\s+/g, " ").trim())`,
    ehLista(ehTexto)
  );

describe.skipIf(!existsSync(CHROMIUM))("o menu do cartão de conta", () => {
  beforeAll(async () => {
    const [aberto, pacote] = await Promise.all([
      abrirChromium("cartao-de-conta"),
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

  test("com sequência zero, o menu mostra só a placa do saldo", async () => {
    await abrirOMenu(0);
    expect(await itensDoMenu()).toEqual([
      "Saldo610 pts",
      "Minha conta",
      "Sair",
    ]);
  });

  test("com sequência, o menu mostra as duas placas", async () => {
    await abrirOMenu(3);
    expect(await itensDoMenu()).toEqual([
      "Saldo610 pts",
      "Sequência3 dias",
      "Minha conta",
      "Sair",
    ]);
  });

  test("no admin, sem placar, o menu não tem as placas", async () => {
    await abrirOMenu(null);
    expect(await itensDoMenu()).toEqual(["Minha conta", "Sair"]);
  });

  test("Minha conta é um link para a página da conta, não o modal do Clerk", async () => {
    await abrirOMenu(0);
    expect(
      await avaliarComo(
        enviar,
        `[...document.querySelectorAll('[data-slot="dropdown-menu-content"] a')].find((a) => a.textContent.includes("Minha conta"))?.getAttribute("href") ?? null`,
        ouNulo(ehTexto)
      )
    ).toBe("/minha-conta");
  });

  test("Sair chama a saída do Clerk uma vez", async () => {
    await abrirOMenu(0);
    await avaliar(
      enviar,
      `[...document.querySelectorAll('[data-slot="dropdown-menu-item"]')].find((i) => i.textContent.trim() === "Sair").click()`
    );
    await esperar("window.saidas === 1");
    expect(
      await avaliarComo(
        enviar,
        "window.chamadasDoRoteador",
        ehLista(ehObjeto({ metodo: ehTexto }))
      )
    ).toEqual([]);
  });
});
