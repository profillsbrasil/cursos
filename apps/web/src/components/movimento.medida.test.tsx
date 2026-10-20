// A curva e o tempo de cada transição no Chromium headless, com o CSS real do app
// e o do sonner: o que o movimento.test.ts não vê no código-fonte, porque a curva
// errada vem do padrão do Tailwind, do tw-animate e do sonner. Sem Chromium na
// máquina, tudo pula.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Button } from "@cursos/ui/components/button";
import { Switch } from "@cursos/ui/components/switch";
import { renderToStaticMarkup } from "react-dom/server";

import { BOTAO } from "./casca/botoes";
import { ALAVANCA } from "./casca/campos";
import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "./chromium-de-teste";
import { OPCOES_DO_TOAST } from "./opcoes-do-toast";

const EASE_FORTE = "cubic-bezier(0.23, 1, 0.32, 1)";
/** A vírgula entre os itens de uma lista do CSS, não a de dentro do cubic-bezier. */
const LISTA = /,\s(?![^(]*\))/;

const SONNER = readFileSync(
  join(
    import.meta.dir,
    "../../../../packages/ui/node_modules/sonner/dist/styles.css"
  ),
  "utf8"
);

// Os popups do Base UI só existem abertos, num portal: aqui ficam as classes que
// eles levam no packages/ui.
const corpo = renderToStaticMarkup(
  <>
    <span className="transition-colors" id="cor" />
    <div
      className="data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 duration-100 data-open:animate-in"
      data-open=""
      data-side="bottom"
      id="menu"
    />
    <div
      className="transition duration-200 ease-in-out data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-starting-style:opacity-0"
      data-mobile="true"
      data-side="left"
      data-slot="sidebar"
      data-starting-style=""
      id="gaveta"
    />
    <Button id="botao" variant="ghost">
      Botão
    </Button>
    <a className={BOTAO} href="/meus-cursos" id="link">
      Link com a cara de botão
    </a>
    <Switch className={ALAVANCA} />
    <ol data-sonner-toaster="">
      <li
        className={OPCOES_DO_TOAST.classNames.success}
        data-sonner-toast=""
        data-styled="true"
        data-type="success"
        id="toast"
      >
        <div data-icon="" />
        <div data-content="">Salvo</div>
      </li>
      <li
        className={OPCOES_DO_TOAST.classNames.error}
        data-sonner-toast=""
        data-styled="true"
        data-type="error"
        id="toast-de-erro"
      >
        <div data-icon="" />
      </li>
      <li
        data-expanded="false"
        data-front="false"
        data-removed="true"
        data-sonner-toast=""
        data-styled="true"
        data-swipe-out="false"
        id="toast-de-tras"
      >
        <div data-content="">Saindo de trás da pilha</div>
      </li>
    </ol>
  </>
);

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [...corpo.matchAll(CLASSES)].flatMap(([, c = ""]) =>
    c.replaceAll("&amp;", "&").split(ESPACO)
  )
);

let enviar: Enviar;

async function abrirPagina(reduzido: boolean) {
  await enviar("Emulation.setEmulatedMedia", {
    features: [
      {
        name: "prefers-reduced-motion",
        value: reduzido ? "reduce" : "no-preference",
      },
    ],
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style><style>${SONNER}</style></head><body>${corpo}</body></html>`
    )}); document.close();`
  );
}

const estilo = (seletor: string, propriedades: string[]) =>
  avaliar<string[]>(
    enviar,
    `(() => {
      const e = getComputedStyle(document.querySelector(${JSON.stringify(seletor)}));
      return ${JSON.stringify(propriedades)}.map((p) => e.getPropertyValue(p).trim());
    })()`
  );

describe.skipIf(!existsSync(CHROMIUM))("movimento no browser", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("movimento");
  });
  afterAll(fecharChromium);

  test("a transição sem curva própria anda no ease-forte", async () => {
    await abrirPagina(false);
    expect(await estilo("#cor", ["transition-timing-function"])).toEqual([
      EASE_FORTE,
    ]);
  });

  test("o menu, a dica e o diálogo entram no ease-forte", async () => {
    await abrirPagina(false);
    expect(
      await estilo("#menu", ["animation-timing-function", "animation-duration"])
    ).toEqual([EASE_FORTE, "0.1s"]);
  });

  test("com movimento reduzido, o menu entra só pela opacidade", async () => {
    await abrirPagina(true);
    expect(
      await estilo("#menu", [
        "--tw-enter-opacity",
        "--tw-enter-scale",
        "--tw-enter-translate-y",
      ])
    ).toEqual(["0", "1", "0"]);
  });

  test("a gaveta do celular desliza no ease-forte, e não desliza no reduzido", async () => {
    await abrirPagina(false);
    expect(
      await estilo("#gaveta", ["transition-timing-function", "translate"])
    ).toEqual([EASE_FORTE, "-40px"]);
    await abrirPagina(true);
    expect(await estilo("#gaveta", ["translate", "opacity"])).toEqual([
      "none",
      "0",
    ]);
  });

  test("botão e alavanca não animam tudo, e o polegar não desliza no reduzido", async () => {
    await abrirPagina(false);
    const transicoes = await Promise.all(
      ["#botao", "#link", '[data-slot="switch"]'].map((seletor) =>
        estilo(seletor, ["transition-property", "transition-timing-function"])
      )
    );
    for (const [propriedade = "", curva] of transicoes) {
      expect(propriedade).not.toContain("all");
      expect(curva).toBe(EASE_FORTE);
    }
    const polegar = () =>
      estilo('[data-slot="switch-thumb"]', ["transition-property"]);
    expect((await polegar())[0]).toContain("translate");
    await abrirPagina(true);
    expect(await polegar()).toEqual(["none"]);
  });

  test("o toast entra e sai em 200 ms no ease-forte, sem animar a altura", async () => {
    await abrirPagina(false);
    const [propriedade = "", duracao = "", curva = ""] = await estilo(
      "#toast",
      [
        "transition-property",
        "transition-duration",
        "transition-timing-function",
      ]
    );
    expect(propriedade).not.toContain("height");
    expect(new Set(duracao.split(LISTA))).toEqual(new Set(["0.2s"]));
    expect(new Set(curva.split(LISTA))).toEqual(new Set([EASE_FORTE]));
  });

  test("o toast de trás da pilha sai em 200 ms no ease-forte", async () => {
    await abrirPagina(false);
    const [duracao = "", curva = ""] = await estilo("#toast-de-tras", [
      "transition-duration",
      "transition-timing-function",
    ]);
    expect(new Set(duracao.split(LISTA))).toEqual(new Set(["0.2s"]));
    expect(new Set(curva.split(LISTA))).toEqual(new Set([EASE_FORTE]));
  });

  test("com movimento reduzido, o toast não desliza e segue no fade", async () => {
    await abrirPagina(true);
    const transicoes = await Promise.all(
      ["#toast", "#toast-de-tras", "#toast [data-content]"].map((seletor) =>
        estilo(seletor, [
          "transition-property",
          "transition-duration",
          "transition-timing-function",
        ])
      )
    );
    for (const [propriedade = "", duracao = "", curva = ""] of transicoes) {
      expect(propriedade.split(LISTA)).toContain("opacity");
      expect(propriedade).not.toContain("transform");
      expect(new Set(duracao.split(LISTA))).toEqual(new Set(["0.2s"]));
      expect(new Set(curva.split(LISTA))).toEqual(new Set([EASE_FORTE]));
    }
  });

  test("o ícone do toast leva a cor da paleta: Céu no sucesso, erro no erro", async () => {
    await abrirPagina(false);
    const cor = (seletor: string, variavel: string) =>
      avaliar<string[]>(
        enviar,
        `(() => {
          const sonda = document.createElement("i");
          sonda.style.color = "var(${variavel})";
          document.body.append(sonda);
          return [getComputedStyle(document.querySelector(${JSON.stringify(seletor)})).color, getComputedStyle(sonda).color];
        })()`
      );
    const [sucesso, ceu] = await cor("#toast [data-icon]", "--ceu");
    expect(sucesso).toBe(ceu);
    const [erro, destructive] = await cor(
      "#toast-de-erro [data-icon]",
      "--destructive"
    );
    expect(erro).toBe(destructive);
  });
});
