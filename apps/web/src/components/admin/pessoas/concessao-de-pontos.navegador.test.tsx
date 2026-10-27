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

const ENTRADA = join(import.meta.dir, "concessao-de-pontos.entrada.tsx");
const TRPC = join(import.meta.dir, "trpc-concessao-falso.js");
const NAVEGACAO = join(import.meta.dir, "navegacao-concessao-falsa.js");

const UTILS_TRPC = /^@\/utils\/trpc$/;
const NEXT_NAVIGATION = /^next\/navigation$/;

const SALDO = 3130;

/**
 * A ficha de verdade lê o saldo do servidor; aqui o refresh do useAcao troca o
 * saldo pelo que o servidor devolveu. O falso grava cada chamada em
 * window.chamadas.
 */
async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { useState } from "react";
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { ConcessaoDePontos } from "./concessao-de-pontos";
        function Raiz() {
          const [saldo, trocar] = useState(${SALDO});
          window.atualizar = () => trocar(window.saldoNoServidor);
          return <ConcessaoDePontos nome="Carla Souza" saldo={saldo} userId="user_1" />;
        }
        window.chamadas = [];
        window.saldoNoServidor = ${SALDO};
        flushSync(() => createRoot(document.getElementById("raiz")).render(<Raiz />));
      `,
      [TRPC]: `
        export const trpcClient = { admin: { pessoas: { concederPontos: { mutate: async (dados) => {
          window.chamadas.push(dados);
          await new Promise((r) => setTimeout(r, 30));
          window.saldoNoServidor += dados.pontos;
          return { saldo: window.saldoNoServidor };
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

// Funções da página: clicam no rótulo como a pessoa, escrevem no campo pelo
// setter nativo (o React lê o evento input) e leem o botão de enviar.
const AJUDANTES = `
  window.clicar = (rotulo) => {
    const alvo = [...document.querySelectorAll("label")].find((l) => l.textContent.trim() === rotulo);
    if (!alvo) throw new Error("sem o rótulo " + rotulo);
    alvo.click();
  };
  window.escrever = (seletor, valor) => {
    const campo = document.querySelector(seletor);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(campo, valor);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  };
  window.botao = () => {
    const b = document.querySelector('button[type="submit"]');
    return { desligado: b.getAttribute("aria-disabled") === "true", texto: b.textContent.trim() };
  };
  window.esperar = (ms) => new Promise((r) => setTimeout(r, ms));
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

interface Botao {
  desligado: boolean;
  texto: string;
}

const botao = () => avaliar<Botao>(enviar, "window.botao()");
const rodar = (codigo: string) =>
  avaliar(enviar, `(async () => { ${codigo} })()`);

describe.skipIf(!existsSync(CHROMIUM))("concessão de pontos no browser", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("concessao-de-pontos");
    pacote = await empacotar();
  }, 20_000);

  afterAll(fecharChromium);

  test("dar 3.000 diz o saldo que fica", async () => {
    await abrir();
    expect(await botao()).toEqual({
      desligado: true,
      texto: "Escolha o valor",
    });
    await rodar(`clicar("3.000"); await esperar(0);`);
    expect(await botao()).toEqual({
      desligado: false,
      texto: "Dar 3.000 pts. Saldo vai a 6.130",
    });
  });

  test("tirar dentro do saldo diz o saldo que fica", async () => {
    await abrir();
    await rodar(`clicar("Tirar pontos"); clicar("1.000"); await esperar(0);`);
    expect(await botao()).toEqual({
      desligado: false,
      texto: "Tirar 1.000 pts. Saldo vai a 2.130",
    });
  });

  test("tirar além do saldo desliga o botão e não chama o servidor", async () => {
    await abrir();
    await rodar(`clicar("Tirar pontos"); clicar("5.000"); await esperar(0);`);
    expect(await botao()).toEqual({
      desligado: true,
      texto: "A pessoa tem só 3.130 pts",
    });
    await rodar(`
      document.querySelector('input[name="motivo"]').value = "Correção";
      document.querySelector('button[type="submit"]').click();
      await esperar(100);
    `);
    expect(await avaliar<number>(enviar, "window.chamadas.length")).toBe(0);
  });

  test("o campo Pontos só aparece com Outro valor e aceita 3.000 e 3000", async () => {
    await abrir();
    const temCampo = () =>
      avaliar<boolean>(
        enviar,
        `Boolean(document.querySelector('input[name="quantidade"]'))`
      );
    expect(await temCampo()).toBe(false);
    await rodar(`clicar("Outro valor"); await esperar(0);`);
    expect(await temCampo()).toBe(true);
    expect(await botao()).toEqual({
      desligado: true,
      texto: "Escolha o valor",
    });
    await rodar(
      `escrever('input[name="quantidade"]', "3.000"); await esperar(0);`
    );
    expect((await botao()).texto).toBe("Dar 3.000 pts. Saldo vai a 6.130");
    await rodar(
      `escrever('input[name="quantidade"]', "2500"); await esperar(0);`
    );
    expect((await botao()).texto).toBe("Dar 2.500 pts. Saldo vai a 5.630");
    await rodar(`clicar("500"); await esperar(0);`);
    expect(await temCampo()).toBe(false);
  });

  test("as setas andam entre Dar e Tirar", async () => {
    await abrir();
    await rodar(`clicar("500"); await esperar(0);`);
    await avaliar(
      enviar,
      `document.querySelector('input[value="dar"]').focus()`
    );
    await enviar("Input.dispatchKeyEvent", {
      code: "ArrowRight",
      key: "ArrowRight",
      type: "rawKeyDown",
      windowsVirtualKeyCode: 39,
    });
    await enviar("Input.dispatchKeyEvent", {
      code: "ArrowRight",
      key: "ArrowRight",
      type: "keyUp",
      windowsVirtualKeyCode: 39,
    });
    await rodar("await esperar(0);");
    expect((await botao()).texto).toBe("Tirar 500 pts. Saldo vai a 2.630");
  });

  test("depois de gravar, o formulário volta ao início e o saldo atualiza", async () => {
    await abrir();
    await rodar(`
      clicar("3.000");
      escrever('input[name="motivo"]', "Campanha de vendas");
      await esperar(0);
      document.querySelector('button[type="submit"]').click();
      await esperar(300);
    `);
    expect(await avaliar<unknown[]>(enviar, "window.chamadas")).toEqual([
      { motivo: "Campanha de vendas", pontos: 3000, userId: "user_1" },
    ]);
    expect(await botao()).toEqual({
      desligado: true,
      texto: "Escolha o valor",
    });
    expect(
      await avaliar<string>(
        enviar,
        `document.querySelector('input[name="motivo"]').value`
      )
    ).toBe("");
    await rodar(`clicar("500"); await esperar(0);`);
    expect((await botao()).texto).toBe("Dar 500 pts. Saldo vai a 6.630");
  });
});
