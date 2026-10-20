import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CategoriaNaLista } from "@cursos/api/dominio/categoria";
import type { EdicaoDoCurso } from "@cursos/api/dominio/edicao-do-curso";
import { documentoDeExemplo, EDICAO } from "@cursos/api/dominio/exemplo";
import type { Versao } from "@cursos/api/dominio/tipos";
import { build, sleep } from "bun";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";

const AQUI = import.meta.dir;
const ENTRADA = join(AQUI, "editor.entrada.tsx");
const TRPC = join(AQUI, "trpc-falso.js");
const NAVEGACAO = join(AQUI, "navegacao-falsa.js");
const LINK = join(AQUI, "link-falso.jsx");
const IMAGEM = join(AQUI, "imagem-falsa.jsx");

const SUBSTITUTOS: [RegExp, string][] = [
  [/^@\/utils\/trpc$/, TRPC],
  [/^next\/navigation$/, NAVEGACAO],
  [/^next\/link$/, LINK],
  [/^next\/image$/, IMAGEM],
];

const REPETIDO = "Já existe uma categoria com este nome.";

const CAPA = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#2b5c8a"/></svg>'
)}`;

const documento = documentoDeExemplo("v1" as Versao);
const EDICAO_SALVA: EdicaoDoCurso = {
  capa: { alt: "Capa", altura: 720, largura: 1280, url: CAPA },
  codigo: "PE-001",
  documento: {
    ...documento,
    descricao:
      "Para o técnico que instala máquinas e quer gravar a instalação.",
    titulo: "Curso de Filmagem",
    topicos: ["Pedir a autorização do cliente", "Filmar o ciclo completo"],
  },
  podeApagar: true,
  slug: "curso-de-filmagem",
  uso: {
    assistidasPorAula: {},
    certificados: 0,
    liberacoes: 0,
    tentativasPorAula: {},
  },
};

const CATEGORIAS: CategoriaNaLista[] = [
  {
    cursos: ["Curso de Filmagem"],
    id: EDICAO.CATEGORIA,
    nome: "Processo de envase",
  },
  {
    cursos: ["Comercial", "Vendas"],
    id: "00000000-0000-4000-8000-0000000000c2" as CategoriaNaLista["id"],
    nome: "Vendas e negócios",
  },
];

const PAGINA = `
  import { flushSync } from "react-dom";
  import { createRoot } from "react-dom/client";
  import { EditorDoCurso } from "./editor-do-curso";

  const EDICAO = ${JSON.stringify(EDICAO_SALVA)};
  const CATEGORIAS = ${JSON.stringify(CATEGORIAS)};
  // O about:blank do headless não é contexto seguro, e lá o crypto.randomUUID não existe.
  let gerados = 0;
  crypto.randomUUID ??= () => {
    gerados += 1;
    return "00000000-0000-4000-8000-1" + String(gerados).padStart(11, "0");
  };
  // O document.open troca o documento e mantém a janela: o editor de antes sai com os ouvintes dele.
  window.desmontar?.();
  window.gravado = undefined;
  window.criadas = [];
  window.refreshes = 0;
  window.versao = EDICAO.documento.versao;
  const raiz = createRoot(document.getElementById("raiz"));
  window.desmontar = () => raiz.unmount();
  // O refresh do App Router: a página chega com objetos novos, na versão que o servidor tem.
  const desenhar = () =>
    flushSync(() =>
      raiz.render(
        <EditorDoCurso
          categorias={[...CATEGORIAS, ...window.criadas]}
          edicao={{ ...EDICAO, documento: { ...(window.gravado ?? EDICAO.documento), versao: window.versao } }}
        />
      )
    );
  window.atualizar = () => {
    window.refreshes += 1;
    desenhar();
  };
  desenhar();
`;

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: PAGINA,
      [TRPC]: `
        import { TRPCClientError } from "@trpc/client";

        window.pedidos = [];
        const recusa = (message) =>
          new TRPCClientError(message, {
            result: {
              error: {
                code: -32000,
                data: { code: "CONFLICT", motivo: null, paraAPessoa: true },
                message,
              },
            },
          });
        export const trpcClient = {
          admin: {
            catalogo: {
              salvarCurso: {
                mutate: async (formulario) => {
                  const gravado = JSON.parse(formulario.get("documento"));
                  window.pedidos.push({ salvarCurso: gravado.titulo });
                  window.versao = "v" + (window.pedidos.length + 1);
                  window.gravado = gravado;
                  return { versao: window.versao };
                },
              },
            },
            categorias: {
              salvar: {
                mutate: async (entrada) => {
                  window.pedidos.push({ categoria: entrada.nome });
                  if (entrada.nome === "Repetida") {
                    throw recusa(${JSON.stringify(REPETIDO)});
                  }
                  window.criadas.push({ cursos: [], id: entrada.id, nome: entrada.nome });
                  return { id: entrada.id, novo: true };
                },
              },
            },
          },
        };
      `,
      [NAVEGACAO]: `
        export const useRouter = () => ({
          push: () => undefined,
          refresh: () => setTimeout(() => window.atualizar()),
          replace: () => undefined,
        });
      `,
      [LINK]: `
        export default function Link({ href, ...resto }) {
          return <a href={href} {...resto} />;
        }
      `,
      [IMAGEM]: `
        export default function Image({ fill, sizes, priority, ...resto }) {
          return <img {...resto} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
        }
      `,
    },
    format: "iife",
    plugins: [
      {
        name: "servidor-falso",
        setup(construtor) {
          for (const [filtro, caminho] of SUBSTITUTOS) {
            construtor.onResolve({ filter: filtro }, () => ({ path: caminho }));
          }
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(`o pacote do editor não saiu: ${pacote.logs.join("\n")}`);
  }
  return saida.text();
}

const UI = join(AQUI, "../../../../../packages/ui/src/components");
const FONTES = [
  ...readdirSync(AQUI).filter((f) => !f.includes(".test.")),
  "../casca/campos.ts",
  "../casca/botoes.ts",
].map((f) => join(AQUI, f));
const PALAVRA = /[\s"'`{}]+/;
const css = await cssDoApp(
  [
    ...FONTES.filter((f) => f.endsWith(".ts") || f.endsWith(".tsx")),
    ...readdirSync(UI).map((f) => join(UI, f)),
  ].flatMap((f) => readFileSync(f, "utf8").split(PALAVRA))
);

const GEIST = join(AQUI, "../certificado/fontes");
const fonte = ["Regular", "Medium", "SemiBold", "Bold"]
  .map(
    (peso, i) =>
      `@font-face{font-family:Geist;font-weight:${400 + i * 100};src:url(data:font/ttf;base64,${readFileSync(join(GEIST, `Geist-${peso}.ttf`)).toString("base64")}) format("truetype")}`
  )
  .join("");

let enviar: Enviar;
let pacote: string;

/** A casca: a sidebar aberta tira 248 px e a moldura 48 px de cada lado; no celular, 16 px. */
async function abrirEditor(janela: number) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: janela < 768,
    width: janela,
  });
  const conteudo =
    janela < 768
      ? "padding:24px 16px 64px"
      : "margin-left:15.5rem;padding:32px 48px 64px";
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR" style="--font-geist-sans:Geist"><head><meta name="viewport" content="width=device-width"><style>${fonte}${css}</style></head><body class="bg-background font-sans text-foreground" style="margin:0"><main style="${conteudo}"><div id="raiz"></div></main></body></html>`
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

const CODIGO_DA_TECLA = {
  ArrowDown: 40,
  Enter: 13,
  Escape: 27,
  s: 83,
} as const;

async function teclar(
  tecla: keyof typeof CODIGO_DA_TECLA,
  { ctrl = false }: { ctrl?: boolean } = {}
) {
  const evento = {
    code: tecla === "s" ? "KeyS" : tecla,
    key: tecla,
    modifiers: ctrl ? 2 : 0,
    windowsVirtualKeyCode: CODIGO_DA_TECLA[tecla],
  };
  await enviar("Input.dispatchKeyEvent", {
    ...evento,
    text: tecla === "Enter" ? "\r" : undefined,
    type: "keyDown",
  });
  await enviar("Input.dispatchKeyEvent", { ...evento, type: "keyUp" });
}

async function escrever(seletor: string, valor: string) {
  await avaliar(
    enviar,
    `(() => { const c = document.querySelector(${JSON.stringify(seletor)}); c.focus(); c.select?.(); })()`
  );
  await enviar("Input.insertText", { text: valor });
}

const pedidos = () =>
  avaliar<Record<string, string>[]>(enviar, "window.pedidos");
const textoDe = (seletor: string) =>
  avaliar<string | null>(
    enviar,
    `document.querySelector(${JSON.stringify(seletor)})?.textContent ?? null`
  );

const GATILHO = "#curso-categoriaId";
const BUSCA = 'input[aria-label="Buscar ou criar categoria"]';

async function abrirCategoriaEDigitar(nome: string) {
  await avaliar(enviar, `document.querySelector("${GATILHO}").click()`);
  await esperar(`document.querySelector('${BUSCA}')`);
  await enviar("Input.insertText", { text: nome });
  if (nome) {
    await esperar(
      `[...document.querySelectorAll('[role="option"]')].some((o) => o.textContent.includes(${JSON.stringify(`"${nome}"`)}))`
    );
  }
}

const FOTOS = process.env.FOTOS_DO_EDITOR;
async function foto(nome: string) {
  if (!FOTOS) {
    return;
  }
  await sleep(300);
  const { data } = (await enviar("Page.captureScreenshot", {
    format: "png",
  })) as { data: string };
  writeFileSync(join(FOTOS, `${nome}.png`), Buffer.from(data, "base64"));
}

describe.skipIf(!existsSync(CHROMIUM))("editor do curso no browser", () => {
  beforeAll(async () => {
    [enviar, pacote] = await Promise.all([
      abrirChromium("editor-navegador"),
      empacotar(),
    ]);
  }, 30_000);

  afterAll(fecharChromium);

  describe("categoria criada na seleção", () => {
    test("o nome que não existe vira Criar categoria, e escolher cria, escolhe e guarda o rascunho", async () => {
      await abrirEditor(1280);
      await escrever("#curso-titulo", "Curso de Filmagem 2");
      await abrirCategoriaEDigitar("Filmagem");
      const opcoes = await avaliar<string[]>(
        enviar,
        `[...document.querySelectorAll('[role="option"]')].map((o) => o.textContent.trim())`
      );
      expect(opcoes).toEqual(['Criar categoria "Filmagem"']);
      await foto("categoria-criar-1280");
      await teclar("ArrowDown");
      await teclar("Enter");
      await esperar("window.refreshes > 0");
      await esperar(
        `document.querySelector("${GATILHO}").textContent.includes("Filmagem")`
      );
      expect(await pedidos()).toEqual([{ categoria: "Filmagem" }]);
      expect(await textoDe("#curso-categoriaId-criada")).toBe(
        'Categoria "Filmagem" criada.'
      );
      // O refresh trouxe a página na mesma versão: o título editado fica.
      expect(
        await avaliar<string>(
          enviar,
          `document.getElementById("curso-titulo").value`
        )
      ).toBe("Curso de Filmagem 2");
    });

    test("a lista mostra a contagem de cursos e o link de gerenciar no pé", async () => {
      await abrirEditor(1280);
      await abrirCategoriaEDigitar("");
      const lista = await avaliar<string[]>(
        enviar,
        `[...document.querySelectorAll('[role="option"]')].map((o) => o.textContent.trim())`
      );
      expect(lista).toEqual([
        "Processo de envase1 curso",
        "Vendas e negócios2 cursos",
      ]);
      expect(
        await avaliar<string | null>(
          enviar,
          `document.querySelector('a[href="/admin/categorias"]')?.textContent ?? null`
        )
      ).toBe("Gerenciar");
    });

    test("a recusa do servidor fica embaixo do campo, com a frase dele", async () => {
      await abrirEditor(1280);
      await abrirCategoriaEDigitar("Repetida");
      await teclar("ArrowDown");
      await teclar("Enter");
      await esperar(`document.getElementById("curso-categoriaId-erro")`);
      expect(await textoDe("#curso-categoriaId-erro")).toBe(REPETIDO);
      expect(
        await avaliar<[string | null, string | null]>(
          enviar,
          `(() => { const g = document.querySelector("${GATILHO}"); return [g.getAttribute("aria-invalid"), g.getAttribute("aria-describedby")]; })()`
        )
      ).toEqual(["true", "curso-categoriaId-erro"]);
    });
  });

  describe("coluna de publicação", () => {
    interface Disposicao {
      barra: string;
      coluna: { esquerda: number; largura: number; topo: number };
      conteudo: { direita: number; fundo: number };
      lista: boolean;
    }
    const disposicao = () =>
      avaliar<Disposicao>(
        enviar,
        `(() => {
          const coluna = document.querySelector('aside[aria-label="Publicação do curso"]').getBoundingClientRect();
          const conteudo = document.querySelector("h1").parentElement.getBoundingClientRect();
          const barra = document.querySelector(".sticky.bottom-3");
          const lista = [...document.querySelectorAll("h2")].find((h) => h.textContent === "Antes de publicar");
          return {
            barra: getComputedStyle(barra).display,
            coluna: { esquerda: coluna.left, largura: coluna.width, topo: coluna.top },
            conteudo: { direita: conteudo.right, fundo: conteudo.bottom },
            lista: lista ? lista.getClientRects().length > 0 : false,
          };
        })()`
      );

    test("com 960 px de editor ou mais, a coluna de 300 px fica à direita, a 32 px, e a barra do pé some", async () => {
      // 1920 px de janela: 1576 px de editor.
      await abrirEditor(1920);
      const d = await disposicao();
      expect(Math.round(d.coluna.largura)).toBe(300);
      expect(Math.round(d.coluna.esquerda - d.conteudo.direita)).toBe(32);
      expect(d.barra).toBe("none");
      expect(d.lista).toBe(true);
      await foto("limpo-1920");
    });

    test("ao rolar, a coluna fica presa a 24 px do topo", async () => {
      await abrirEditor(1920);
      // No meio da página: no fim, o curso de exemplo acaba antes da coluna e a empurra.
      await avaliar(enviar, "window.scrollTo(0, 600)");
      await avaliar(
        enviar,
        "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))"
      );
      expect(Math.round((await disposicao()).coluna.topo)).toBe(24);
    });

    test("abaixo de 960 px de editor, a barra do pé volta e a coluna desce sem a lista", async () => {
      // 1280 px de janela com a sidebar aberta: 936 px de editor.
      await abrirEditor(1280);
      const d = await disposicao();
      expect(d.barra).not.toBe("none");
      expect(d.coluna.topo).toBeGreaterThanOrEqual(d.conteudo.fundo);
      expect(d.lista).toBe(false);
      await foto("limpo-1280");
    });

    test("Antes de publicar lê o rascunho: a descrição apagada passa a faltar", async () => {
      await abrirEditor(1920);
      const marca = () =>
        avaliar<string>(
          enviar,
          `[...document.querySelectorAll("li")].find((l) => l.textContent.startsWith("Descrição")).textContent`
        );
      expect(await marca()).toBe("Descrição: pronto.");
      await escrever("#curso-descricao", "");
      await enviar("Input.dispatchKeyEvent", {
        code: "Backspace",
        key: "Backspace",
        type: "keyDown",
        windowsVirtualKeyCode: 8,
      });
      await esperar(
        `[...document.querySelectorAll("li")].find((l) => l.textContent.startsWith("Descrição")).textContent === "Descrição: falta."`
      );
      expect(await textoDe('aside [aria-live="polite"]')).toBe(
        "Mudanças não salvas."
      );
      await foto("sujo-1920");
    });
  });

  describe("título e tópico longos", () => {
    const LONGO =
      "Gravar a visão geral, cada etapa e a embalagem final, na horizontal e na vertical, sem cortar a máquina";
    const inteiro = (seletor: string) =>
      avaliar<{ alto: boolean; cabe: boolean; valor: string }>(
        enviar,
        `(() => {
          const c = document.querySelector(${JSON.stringify(seletor)});
          return {
            alto: c.getBoundingClientRect().height > 50,
            cabe: c.scrollWidth <= c.clientWidth && c.scrollHeight <= c.clientHeight,
            valor: c.value,
          };
        })()`
      );

    for (const janela of [1280, 390]) {
      test(`em ${janela} px, o campo quebra a linha e mostra o texto inteiro`, async () => {
        await abrirEditor(janela);
        await escrever("#curso-titulo", LONGO);
        await escrever("#topico-1", LONGO);
        expect(await inteiro("#curso-titulo")).toEqual({
          alto: true,
          cabe: true,
          valor: LONGO,
        });
        expect(await inteiro("#topico-1")).toEqual({
          alto: true,
          cabe: true,
          valor: LONGO,
        });
      });
    }

    test("a quebra colada vira espaço, e o Enter salva sem quebrar", async () => {
      await abrirEditor(1280);
      await escrever("#curso-titulo", "Curso de\nFilmagem");
      expect((await inteiro("#curso-titulo")).valor).toBe("Curso de Filmagem");
      await teclar("Enter");
      await esperar("window.pedidos.length === 1");
      expect(await pedidos()).toEqual([{ salvarCurso: "Curso de Filmagem" }]);
    });
  });

  describe("Ctrl+S", () => {
    // O navegador abriria o "salvar página" no Ctrl+S que ninguém impediu.
    const vigiar = () =>
      avaliar(
        enviar,
        `window.impedidos = []; window.addEventListener("keydown", (e) => { if (e.key === "s") window.impedidos.push(e); });`
      );

    for (const janela of [1920, 1280]) {
      test(`em ${janela} px, sem mudança não salva nem abre o salvar do navegador; com mudança, salva`, async () => {
        await abrirEditor(janela);
        await vigiar();
        await teclar("s", { ctrl: true });
        await sleep(100);
        expect(await pedidos()).toEqual([]);
        await escrever("#curso-titulo", "Curso de Filmagem revisto");
        await teclar("s", { ctrl: true });
        await esperar("window.pedidos.length === 1");
        expect(await pedidos()).toEqual([
          { salvarCurso: "Curso de Filmagem revisto" },
        ]);
        expect(
          await avaliar<boolean[]>(
            enviar,
            "window.impedidos.map((e) => e.defaultPrevented)"
          )
        ).toEqual([true, true]);
      });
    }
  });

  describe.skipIf(!FOTOS)("fotos", () => {
    const rolarAoFim = () =>
      avaliar(enviar, "window.scrollTo(0, document.body.scrollHeight)");
    for (const janela of [1280, 1920, 390]) {
      test(`em ${janela} px, limpo e sujo`, async () => {
        await abrirEditor(janela);
        await foto(`${janela}-limpo-topo`);
        await rolarAoFim();
        await foto(`${janela}-limpo-fim`);
        await escrever("#curso-titulo", "Curso de Filmagem revisto");
        await avaliar(
          enviar,
          "document.activeElement.blur(); window.scrollTo(0, 0)"
        );
        await foto(`${janela}-sujo-topo`);
        await rolarAoFim();
        await foto(`${janela}-sujo-fim`);
      });
    }

    test("a lista da categoria com Criar categoria e a categoria criada", async () => {
      await abrirEditor(1280);
      await abrirCategoriaEDigitar("Filmagem");
      await foto("1280-categoria-criar");
      await teclar("ArrowDown");
      await teclar("Enter");
      await esperar(`document.getElementById("curso-categoriaId-criada")`);
      await avaliar(enviar, "document.activeElement.blur()");
      await foto("1280-categoria-criada");
      await abrirCategoriaEDigitar("");
      await foto("1280-categoria-lista");
    });
  });
});
