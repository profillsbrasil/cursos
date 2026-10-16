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
  window.criadas = [];
  window.refreshes = 0;
  window.versao = EDICAO.documento.versao;
  const raiz = createRoot(document.getElementById("raiz"));
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
});
