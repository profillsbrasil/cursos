import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../../chromium-de-teste";
import {
  AJUDANTES_DO_CONVIDAR,
  empacotarConvidar,
} from "./convidar-no-browser";

let enviar: Enviar;
let pacote: string;
let css = "";

/** O diálogo aberto com duas fichas, uma delas ruim, para a frase de erro entrar na medida. */
async function abrir(largura: number) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 800,
    mobile: false,
    width: largura,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><div id="raiz"></div></body></html>`
    )}); document.close();`
  );
  await avaliar(enviar, pacote);
  await avaliar(enviar, AJUDANTES_DO_CONVIDAR);
  await avaliar(
    enviar,
    `(async () => { await abrir(); await escrever("ana.lima@exemplo.com carla@exemplo "); await esperar(250); })()`
  );
}

interface Medida {
  campoDeFichas: number;
  dialogo: { altura: number; direita: number; esquerda: number };
  menorLetra: number;
  pe: { direita: number; esquerda: number; linha: string };
  rolagemLateral: number;
}

const medir = () =>
  avaliar<Medida>(
    enviar,
    `(() => {
      const d = dialogo().getBoundingClientRect();
      const pe = dialogo().querySelector("footer");
      const p = pe.getBoundingClientRect();
      const letras = [...dialogo().querySelectorAll("*")]
        .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== ""))
        .map((e) => Number.parseFloat(getComputedStyle(e).fontSize));
      return {
        campoDeFichas: dialogo().querySelector("[data-campo]").getBoundingClientRect().height,
        dialogo: { altura: d.height, direita: d.right, esquerda: d.left },
        menorLetra: Math.min(...letras),
        pe: { direita: p.right, esquerda: p.left, linha: getComputedStyle(pe).borderTopWidth },
        rolagemLateral: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`
  );

describe.skipIf(!existsSync(CHROMIUM))(
  "o diálogo de convidar no browser",
  () => {
    beforeAll(async () => {
      enviar = await abrirChromium("convidar-medida");
      pacote = await empacotarConvidar();
      // As classes saem do diálogo aberto: ele só existe depois do clique.
      await abrir(1440);
      const classes = await avaliar<string[]>(
        enviar,
        `[...document.querySelectorAll("*")].flatMap((e) => [...e.classList])`
      );
      css = await cssDoApp(classes);
    }, 30_000);

    afterAll(fecharChromium);

    test("no desktop, o diálogo tem 34rem e a divisória do pé vai de uma borda à outra", async () => {
      await abrir(1440);
      const m = await medir();
      expect(m.dialogo.direita - m.dialogo.esquerda).toBe(544);
      expect(m.pe.linha).toBe("1px");
      expect([m.pe.esquerda, m.pe.direita]).toEqual([
        m.dialogo.esquerda,
        m.dialogo.direita,
      ]);
    });

    test("no celular, sobram 16 px de cada lado, sem rolagem lateral, e o diálogo cabe na altura", async () => {
      await abrir(390);
      const m = await medir();
      expect([m.dialogo.esquerda, m.dialogo.direita]).toEqual([16, 374]);
      expect(m.rolagemLateral).toBe(0);
      expect(m.dialogo.altura).toBeLessThanOrEqual(800 - 32);
      expect([m.pe.esquerda, m.pe.direita]).toEqual([16, 374]);
    });

    test("o campo de fichas tem a altura de um campo, e nenhum texto fica abaixo de 11 px", async () => {
      await abrir(1440);
      const m = await medir();
      expect(m.campoDeFichas).toBeGreaterThanOrEqual(44);
      expect(m.menorLetra).toBeGreaterThanOrEqual(11);
    });

    test("o foco no campo de e-mails acende a borda da moldura, sem contorno", async () => {
      await abrir(1440);
      // Sem a emulação, a janela do Chromium não tem foco e o :focus-visible não casa.
      await enviar("Emulation.setFocusEmulationEnabled", { enabled: true });
      const borda = (comFoco: boolean) =>
        avaliar<{ contorno: string; cor: string }>(
          enviar,
          `(async () => {
            const campo = dialogo().querySelector('input[inputmode="email"]');
            ${comFoco ? "campo.focus()" : "campo.blur()"};
            // A borda troca de cor numa transição de até 200 ms.
            await esperar(300);
            const moldura = getComputedStyle(dialogo().querySelector("[data-campo]"));
            return { contorno: getComputedStyle(campo).outlineStyle, cor: moldura.borderTopColor };
          })()`
        );
      // A ficha ruim marca o campo como inválido, e o inválido não acende: sai antes.
      await avaliar(
        enviar,
        `(async () => { botaoCom(dialogo(), "Tirar carla@exemplo").click(); await esperar(0); })()`
      );
      const solto = await borda(false);
      const focado = await borda(true);
      expect(focado.cor).not.toBe(solto.cor);
      expect(focado.contorno).toBe("none");
    });
  }
);
