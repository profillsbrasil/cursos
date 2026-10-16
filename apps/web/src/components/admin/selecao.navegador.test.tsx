import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "bun";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";

const AQUI = import.meta.dir;
const ENTRADA = join(AQUI, "selecao.entrada.tsx");

const TELA = `
  import { useState } from "react";
  import { flushSync } from "react-dom";
  import { createRoot } from "react-dom/client";
  import { Megaphone } from "lucide-react";
  import { Selecao, SelecaoComBusca } from "./selecao";

  const STATUS = [
    { descricao: "Fora do ar para quem não tem certificado.", rotulo: "Em produção", valor: "em_producao" },
    { descricao: "Aberto para quem tem o curso liberado.", rotulo: "Publicado", valor: "publicado" },
  ];
  const PARA_QUEM = [
    { icone: <Megaphone aria-hidden="true" />, rotulo: "Todos os alunos", valor: "" },
    {
      grupo: "Quem tem acesso ao curso",
      opcoes: [
        { rotulo: "Fábrica e montagem", valor: "c1" },
        { rotulo: "Fundamentos do envase de líquidos", valor: "c2" },
        { rotulo: "Portfólio: envasadoras e embaladoras", valor: "c3" },
      ],
    },
  ];

  function Tela() {
    const [status, setStatus] = useState("em_producao");
    const [para, setPara] = useState("");
    return (
      <form id="formulario" style={{ display: "grid", gap: 24, width: 360 }}>
        <Selecao aoMudar={setStatus} id="status" opcoes={STATUS} valor={status} />
        <output id="status-escolhido">{status}</output>
        <Selecao
          aoMudar={setStatus}
          id="vazia"
          opcoes={[]}
          placeholder="Escolha a categoria"
          semOpcoes="Nenhuma categoria ainda."
          valor=""
        />
        <SelecaoComBusca
          aoMudar={setPara}
          id="para"
          name="cursoId"
          opcoes={PARA_QUEM}
          rotuloDaBusca="Buscar curso"
          semResultado="Nenhum curso com esse nome."
          valor={para}
        />
      </form>
    );
  }

  const raiz = createRoot(document.getElementById("raiz"));
  flushSync(() => raiz.render(<Tela />));
`;

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: { [ENTRADA]: TELA },
    format: "iife",
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(`o pacote da tela não saiu: ${pacote.logs.join("\n")}`);
  }
  return saida.text();
}

const PALAVRA = /[\s"'`{}]+/;
const css = await cssDoApp(
  [
    TELA,
    ...["selecao.tsx", "partes.tsx"].map((f) =>
      readFileSync(join(AQUI, f), "utf8")
    ),
  ]
    .flatMap((t) => t.split(PALAVRA))
    .concat("bg-popover")
);

let enviar: Enviar;
let pacote: string;

async function abrirTela() {
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body class="bg-background text-foreground" style="margin:0;padding:24px"><div id="raiz"></div><div id="token" class="bg-popover"></div></body></html>`
    )}); document.close();`
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

const transicoesTerminadas = () =>
  avaliar(
    enviar,
    "Promise.all(document.getAnimations().map((a) => a.finished)).then(() => true)"
  );

const CODIGO_DA_TECLA = { ArrowDown: 40, Enter: 13, Escape: 27 } as const;

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

const LISTA = '[role="listbox"]';
const listaAberta = `document.querySelector('${LISTA}')?.closest("[data-open]")`;
const fechada = (id: string) =>
  `document.getElementById("${id}").getAttribute("aria-expanded") === "false"`;
const opcoesVisiveis = `[...document.querySelectorAll('[role="option"]')].map((o) => o.textContent.trim())`;

describe.skipIf(!existsSync(CHROMIUM))("a seleção no browser", () => {
  beforeAll(async () => {
    [enviar, pacote] = await Promise.all([
      abrirChromium("selecao"),
      empacotar(),
    ]);
  }, 20_000);

  afterAll(fecharChromium);

  test("a lista abre abaixo do campo, no fundo do token popover, com a descrição de cada opção", async () => {
    await abrirTela();
    await avaliar(enviar, `document.getElementById("status").click()`);
    await esperar(listaAberta);
    await transicoesTerminadas();
    const medida = await avaliar<{
      abaixo: boolean;
      fundo: string;
      largura: boolean;
      opcoes: string[];
      seta: string;
      token: string;
    }>(
      enviar,
      `(() => {
        const gatilho = document.getElementById("status");
        const lista = document.querySelector('${LISTA}').closest("[data-open]");
        const g = gatilho.getBoundingClientRect();
        const l = lista.getBoundingClientRect();
        return {
          abaixo: Math.round(l.top - g.bottom) === 6,
          fundo: getComputedStyle(lista).backgroundColor,
          largura: l.width >= g.width,
          opcoes: ${opcoesVisiveis},
          seta: getComputedStyle(gatilho.querySelector("svg")).rotate,
          token: getComputedStyle(document.getElementById("token")).backgroundColor,
        };
      })()`
    );
    expect(medida.fundo).toBe(medida.token);
    expect(medida).toMatchObject({
      abaixo: true,
      largura: true,
      opcoes: [
        "Em produçãoFora do ar para quem não tem certificado.",
        "PublicadoAberto para quem tem o curso liberado.",
      ],
      seta: "180deg",
    });
  });

  test("sem opção, a lista aberta diz que não há nenhuma", async () => {
    await abrirTela();
    await avaliar(enviar, `document.getElementById("vazia").click()`);
    await esperar(fechada("vazia").replace("false", "true"));
    await transicoesTerminadas();
    expect(
      await avaliar<string | undefined>(
        enviar,
        `document.querySelector('[data-slot="lista-da-selecao"]')?.textContent`
      )
    ).toBe("Nenhuma categoria ainda.");
    await teclar("Escape");
    await esperar(fechada("vazia"));
    await transicoesTerminadas();
  });

  test("setas e Enter escolhem a outra opção, e a lista fecha", async () => {
    await abrirTela();
    await avaliar(enviar, `document.getElementById("status").focus()`);
    await teclar("ArrowDown");
    await esperar(listaAberta);
    await teclar("ArrowDown");
    await teclar("Enter");
    await esperar(fechada("status"));
    // A tela seguinte reescreve o documento, e uma saída ainda em voo engoliria o clique dela.
    await transicoesTerminadas();
    expect(
      await avaliar<string[]>(
        enviar,
        `[document.getElementById("status-escolhido").textContent, document.getElementById("status").textContent]`
      )
    ).toEqual(["publicado", "Publicado"]);
  });

  test("a lista abre em 150 ms, e sem transição com movimento reduzido", async () => {
    const transicao = async () => {
      await abrirTela();
      await avaliar(enviar, `document.getElementById("status").click()`);
      await esperar(listaAberta);
      await transicoesTerminadas();
      return avaliar<string[]>(
        enviar,
        `(() => {
          const estilo = getComputedStyle(${listaAberta});
          return [estilo.transitionProperty, estilo.transitionDuration, estilo.transitionTimingFunction];
        })()`
      );
    };
    expect(await transicao()).toEqual([
      "opacity, transform",
      "0.15s",
      "cubic-bezier(0.23, 1, 0.32, 1)",
    ]);
    await enviar("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    expect((await transicao())[0]).toBe("none");
    await enviar("Emulation.setEmulatedMedia", { features: [] });
  });

  test("a busca do Para quem filtra os cursos e diz quando nenhum casa", async () => {
    await abrirTela();
    await avaliar(enviar, `document.getElementById("para").click()`);
    await esperar(
      `document.activeElement?.getAttribute("aria-label") === "Buscar curso"`
    );
    expect(await avaliar<string[]>(enviar, opcoesVisiveis)).toEqual([
      "Todos os alunos",
      "Fábrica e montagem",
      "Fundamentos do envase de líquidos",
      "Portfólio: envasadoras e embaladoras",
    ]);
    await enviar("Input.insertText", { text: "envas" });
    await esperar(`${opcoesVisiveis}.length === 2`);
    expect(await avaliar<string[]>(enviar, opcoesVisiveis)).toEqual([
      "Fundamentos do envase de líquidos",
      "Portfólio: envasadoras e embaladoras",
    ]);
    await enviar("Input.insertText", { text: "xyz" });
    await esperar(`${opcoesVisiveis}.length === 0`);
    expect(
      await avaliar<string>(enviar, "document.body.textContent")
    ).toContain("Nenhum curso com esse nome.");
  });

  test("escolher pelo teclado na busca põe o curso no formulário", async () => {
    await abrirTela();
    await avaliar(enviar, `document.getElementById("para").click()`);
    await esperar(
      `document.activeElement?.getAttribute("aria-label") === "Buscar curso"`
    );
    await enviar("Input.insertText", { text: "fábrica" });
    await esperar(`${opcoesVisiveis}.length === 1`);
    await teclar("ArrowDown");
    await teclar("Enter");
    await esperar(`!document.querySelector('[aria-label="Buscar curso"]')`);
    expect(
      await avaliar<[string | null, string]>(
        enviar,
        `[new FormData(document.getElementById("formulario")).get("cursoId"), document.getElementById("para").textContent]`
      )
    ).toEqual(["c1", "Fábrica e montagem"]);
  });
});
