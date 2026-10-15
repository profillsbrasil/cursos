// Os quatro controles da #44 tinham foco de teclado quase invisível. Cada um é
// renderizado como o app o monta, e o CSS real do app (index.css com o globals.css)
// é compilado pelo Tailwind com as classes que saem dele. O teste lê só as regras
// que casam com o foco de teclado e confere o sinal que o dono escolheu. A pílula
// acende por um irmão (:has e ~), que só um browser de verdade avalia: a navegação
// abre no Chromium headless, com o cursor e o foco forçados no link.

import { afterAll, describe, expect, mock, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { AulaId } from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { spawn } from "bun";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "tailwindcss";

// Fora do App Router o usePathname não tem de onde ler; o teste diz o caminho, e o
// resto do módulo fica o de verdade.
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  usePathname: () => "/meus-cursos",
}));

const { ListaDePessoas } = await import("./admin/lista-de-pessoas");
const { ITENS_DO_ALUNO } = await import("./aluno/menu");
const { NavPrincipal } = await import("./casca/nav-principal");
const { ProvedorDaCasca } = await import("./casca/provedor-da-casca");
const { ColunaDoCurso } = await import("./player/coluna-do-curso");

const APP = join(import.meta.dir, "../..");
const UI = join(APP, "../../packages/ui");
const INDEX = join(APP, "src/index.css");

const ESTILOS: Record<string, string> = {
  "@cursos/ui/globals.css": join(UI, "src/styles/globals.css"),
  "shadcn/tailwind.css": join(UI, "node_modules/shadcn/dist/tailwind.css"),
  tailwindcss: join(UI, "node_modules/tailwindcss/index.css"),
  "tw-animate-css": join(UI, "node_modules/tw-animate-css/dist/tw-animate.css"),
};

function lerEstilo(id: string, base: string) {
  const caminho = ESTILOS[id] ?? join(base, id);
  return Promise.resolve({
    base: dirname(caminho),
    content: readFileSync(caminho, "utf8"),
    path: caminho,
  });
}

// O HTML de cada controle, como o app o renderiza.
const nav = renderToStaticMarkup(
  <ProvedorDaCasca aberta>
    <NavPrincipal itens={ITENS_DO_ALUNO} rotulo="Navegação" />
  </ProvedorDaCasca>
);

const aula = (id: string, titulo: string, atual: boolean) => ({
  assistida: false,
  atual,
  duracaoSeg: 300,
  id: id as AulaId,
  titulo,
});
const PRIMEIRA = aula("11111111-1111-4111-8111-111111111111", "Abertura", true);
const coluna = renderToStaticMarkup(
  <ColunaDoCurso
    dados={
      {
        anterior: null,
        aula: {
          duracaoSeg: 300,
          id: PRIMEIRA.id,
          modulo: { numero: 1, titulo: "Primeiros passos" },
          numeroNoModulo: 1,
          titulo: PRIMEIRA.titulo,
          totalNoModulo: 1,
          video: null,
        },
        curso: {
          progresso: { feitas: 0, pct: 0, total: 2 },
          slug: "curso-de-exemplo",
          titulo: "Curso de exemplo",
        },
        estudo: { assistida: false, posicaoSeg: 0, trechos: SEM_TRECHOS },
        modulos: [
          {
            atual: true,
            aulas: [PRIMEIRA],
            feitas: 0,
            numero: 1,
            titulo: "Primeiros passos",
          },
          {
            atual: false,
            aulas: [
              aula("22222222-2222-4222-8222-222222222222", "Limpeza", false),
            ],
            feitas: 0,
            numero: 2,
            titulo: "Limpeza da envasadora",
          },
        ],
        proxima: null,
      } satisfies AulaNoPlayer
    }
  />
);

const pessoas = renderToStaticMarkup(
  <ListaDePessoas
    resultado={{
      pessoas: [
        {
          email: "ana@exemplo.com",
          foto: null,
          nome: "Ana Exemplo",
          userId: "user_exemplo",
        },
      ],
      total: 1,
    }}
    termo=""
  />
);

interface Elemento {
  atributos: Record<string, string>;
  classes: string[];
  /** O texto que vem logo depois da tag, até a próxima tag. */
  texto: string;
}

const TAG = /<([a-z]+)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*\/?>([^<]*)/g;
const ATRIBUTO = /([\w:-]+)(?:="([^"]*)")?/g;
const ESPACO = /\s+/;

function elementos(html: string): Elemento[] {
  return [...html.matchAll(TAG)].map(([, , attrs = "", texto = ""]) => {
    const atributos = Object.fromEntries(
      [...attrs.matchAll(ATRIBUTO)].map(([, nome = "", valor = ""]) => [
        nome,
        valor.replaceAll("&amp;", "&"),
      ])
    );
    return {
      atributos,
      classes: (atributos.class ?? "").split(ESPACO).filter(Boolean),
      texto,
    };
  });
}

const todos = [nav, coluna, pessoas].flatMap(elementos);
const compilador = await compile(readFileSync(INDEX, "utf8"), {
  base: dirname(INDEX),
  loadStylesheet: lerEstilo,
});
const css = compilador.build([...new Set(todos.flatMap((e) => e.classes))]);

interface Regra {
  declaracoes: string[];
  seletor: string;
}

/** Cada regra com as declarações dela; o @media e o @supports não contam como seletor. */
function regrasDoCss(texto: string): Regra[] {
  const regras: Regra[] = [];
  const pilha: string[] = [];
  let trecho = "";
  for (const c of texto) {
    if (c === "{") {
      pilha.push(trecho.trim());
      trecho = "";
    } else if (c === "}" || c === ";") {
      const declaracao = trecho.trim().replace(/\s+/g, " ");
      const seletor = pilha.findLast((p) => !p.startsWith("@"));
      if (declaracao && seletor) {
        regras.push({ declaracoes: [declaracao], seletor });
      }
      if (c === "}") {
        pilha.pop();
      }
      trecho = "";
    } else {
      trecho += c;
    }
  }
  return regras;
}

const regras = regrasDoCss(css.slice(css.indexOf("@layer utilities")));

/** As regras da classe: `hover:bg-x` é escrita `.hover\:bg-x` no começo do seletor. */
function regrasDe(classe: string) {
  const escapada = `.${classe.replace(/[^\w-]/g, (c) => `\\${c}`)}`;
  return regras.filter(
    (r) =>
      r.seletor.startsWith(escapada) &&
      !CONTINUA_A_CLASSE.test(r.seletor.slice(escapada.length))
  );
}
const CONTINUA_A_CLASSE = /^(?:\\.|[\w-])/;
const NOME_DE_CLASSE = /\.(?:\\.|[\w-])+/g;
const casaComFoco = (r: Regra) =>
  r.seletor.replace(NOME_DE_CLASSE, "").includes(":focus-visible");

/**
 * O que muda no elemento com o foco de teclado: as declarações das regras das
 * classes dele que só casam com um :focus-visible, no próprio elemento, num grupo
 * ou num irmão.
 */
const noFoco = (e: Elemento) =>
  e.classes.flatMap((classe) =>
    regrasDe(classe)
      .filter(casaComFoco)
      .flatMap((r) => r.declaracoes)
  );

function unico(lista: Elemento[], descricao: string) {
  expect(lista.map(() => descricao)).toEqual([descricao]);
  return lista[0] as Elemento;
}

const COR = /^color:/;
const FUNDO = /^background-color:/;

// O Chromium da máquina, guiado pelo protocolo do DevTools. Ele avalia o seletor da
// variante ativo-aceso (:has com ~) contra o HTML renderizado, com o CSS compilado.
const CHROMIUM = process.env.CHROMIUM ?? "/usr/bin/chromium";
const DEVTOOLS = /DevTools listening on (ws:\/\/\S+)/;

interface Resposta {
  error?: { message: string };
  id?: number;
  result?: Record<string, unknown>;
}

async function enderecoDoDevTools(saida: ReadableStream<Uint8Array>) {
  const decodificador = new TextDecoder();
  let lido = "";
  for await (const pedaco of saida) {
    lido += decodificador.decode(pedaco);
    const achado = DEVTOOLS.exec(lido)?.[1];
    if (achado) {
      return achado;
    }
  }
  throw new Error(`o Chromium não abriu o DevTools:\n${lido}`);
}

async function abrirChromium() {
  if (!existsSync(CHROMIUM)) {
    throw new Error(`sem Chromium em ${CHROMIUM}; aponte CHROMIUM para ele`);
  }
  const perfil = mkdtempSync(join(tmpdir(), "sinal-do-foco-"));
  const processo = spawn(
    [
      CHROMIUM,
      "--headless",
      "--remote-debugging-port=0",
      `--user-data-dir=${perfil}`,
      "--no-first-run",
      // O headless se declara sem cursor; aqui ele tem um mouse (hover: hover).
      "--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4",
      "about:blank",
    ],
    { stderr: "pipe", stdout: "ignore" }
  );
  const navegador = new URL(await enderecoDoDevTools(processo.stderr));
  const alvos = (await (
    await fetch(`http://${navegador.host}/json/list`)
  ).json()) as { type: string; webSocketDebuggerUrl: string }[];
  const pagina = alvos.find((a) => a.type === "page");
  if (!pagina) {
    throw new Error("o Chromium abriu sem página");
  }
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((pronto) => ws.addEventListener("open", pronto));
  const pendentes = new Map<number, (r: Resposta) => void>();
  ws.addEventListener("message", (m) => {
    const resposta = JSON.parse(String(m.data)) as Resposta;
    if (resposta.id !== undefined) {
      pendentes.get(resposta.id)?.(resposta);
      pendentes.delete(resposta.id);
    }
  });
  let proximo = 0;
  function enviar(method: string, params: Record<string, unknown> = {}) {
    proximo += 1;
    const id = proximo;
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      pendentes.set(id, (r) =>
        r.error
          ? reject(new Error(`${method}: ${r.error.message}`))
          : resolve(r.result ?? {})
      );
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  return {
    enviar,
    fechar() {
      ws.close();
      processo.kill();
      rmSync(perfil, { force: true, recursive: true });
    },
  };
}

const chromium = await abrirChromium();
afterAll(() => chromium.fechar());

async function avaliar<T>(expressao: string) {
  const { result } = (await chromium.enviar("Runtime.evaluate", {
    expression: expressao,
    returnByValue: true,
  })) as { result: { value: T } };
  return result.value;
}

// Sem transição (motion-reduce:transition-none): a cor lida é a final.
await chromium.enviar("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await avaliar(
  `document.open(); document.write(${JSON.stringify(
    `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body>${nav}<div id="sonda" style="background-color: var(--sol-hover)"></div></body></html>`
  )}); document.close();`
);
await chromium.enviar("DOM.enable");
await chromium.enviar("CSS.enable");
const { root } = (await chromium.enviar("DOM.getDocument")) as {
  root: { nodeId: number };
};

async function noDe(seletor: string) {
  const { nodeId } = (await chromium.enviar("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: seletor,
  })) as { nodeId: number };
  expect(nodeId).toBeGreaterThan(0);
  return nodeId;
}

const LINK_ATIVO = 'nav a[aria-current="page"]';
const OUTRO_LINK = "nav a[href]:not([aria-current])";

const lerPilula = () =>
  avaliar<{ fundo: string; sombra: string }>(
    `(() => { const p = getComputedStyle(document.querySelector('nav li[aria-hidden="true"]')); return { fundo: p.backgroundColor, sombra: p.boxShadow }; })()`
  );

/** A cor e a sombra da pílula com o cursor ou o foco forçado num link. */
async function pilulaCom(link: string, estado: "hover" | "focus-visible") {
  const nodeId = await noDe(link);
  await chromium.enviar("CSS.forcePseudoState", {
    forcedPseudoClasses: [estado],
    nodeId,
  });
  const pilula = await lerPilula();
  await chromium.enviar("CSS.forcePseudoState", {
    forcedPseudoClasses: [],
    nodeId,
  });
  return pilula;
}

const BRILHO = "rgba(255, 204, 1, 0.28)";
const temCursor = await avaliar<boolean>(
  "matchMedia('(hover: hover)').matches"
);
const solHover = await avaliar<string>(
  "getComputedStyle(document.getElementById('sonda')).backgroundColor"
);
const repouso = await lerPilula();

describe("o foco de teclado aparece nos quatro controles da #44", () => {
  describe("a pílula do link ativo acende para sol-hover, com o brilho do botão amarelo", () => {
    test("o HTML tem um link ativo e uma pílula", () => {
      const daNav = elementos(nav);
      unico(
        daNav.filter((e) => e.atributos["aria-current"] === "page"),
        "link ativo"
      );
      unico(
        daNav.filter(
          (e) =>
            e.atributos["aria-hidden"] === "true" &&
            e.classes.includes("bg-sidebar-primary")
        ),
        "pílula"
      );
    });

    test("em repouso, a pílula fica no amarelo de sempre, sem brilho", () => {
      // O ramo do cursor mora num @media (hover: hover): sem cursor, ele não vale.
      expect(temCursor).toBe(true);
      expect(solHover).toStartWith("rgb");
      expect(repouso.fundo).not.toBe(solHover);
      expect(repouso.sombra).not.toContain(BRILHO);
    });

    for (const estado of ["focus-visible", "hover"] as const) {
      test(`com ${estado} no link ativo, a pílula acende`, async () => {
        const aceso = await pilulaCom(LINK_ATIVO, estado);
        expect(aceso.fundo).toBe(solHover);
        expect(aceso.sombra).toContain(BRILHO);
      });

      test(`com ${estado} em outro link, a pílula não acende`, async () => {
        expect(await pilulaCom(OUTRO_LINK, estado)).toEqual(repouso);
      });
    }
  });

  test('"Em breve" clareia o nome e o ícone para foreground, sem fundo', () => {
    const emBreve = elementos(nav).filter(
      (e) => e.atributos["aria-disabled"] === "true"
    );
    expect(emBreve.map((e) => e.texto || "item")).toHaveLength(3);
    for (const item of emBreve) {
      const foco = noFoco(item);
      expect(foco.filter((d) => COR.test(d))).toEqual([
        "color: var(--foreground)",
        "color: var(--foreground)",
      ]);
      expect(foco.filter((d) => FUNDO.test(d))).toEqual([]);
    }
  });

  test("o módulo da coluna do player ganha fundo branco a 8% e o título em titulo", () => {
    const daColuna = elementos(coluna);
    // O módulo 2 está fechado: o título não vem claro do group-open.
    const resumos = daColuna.filter((e) => e.classes.includes("list-none"));
    expect(resumos).toHaveLength(2);
    const resumo = resumos[1] as Elemento;
    expect(noFoco(resumo).filter((d) => FUNDO.test(d))).toContain(
      "background-color: color-mix(in srgb, #fff 8%, transparent)"
    );
    const titulo = unico(
      daColuna.filter((e) => e.texto === "Limpeza da envasadora"),
      "título do módulo 2"
    );
    expect(noFoco(titulo)).toContain("color: var(--titulo)");
    // O título acende pelo grupo do summary, que precisa existir.
    expect(resumo.classes).toContain("group/modulo");
  });

  test("a linha da busca de pessoas mantém o fundo, clareia o nome e pinta a seta de Céu", () => {
    const daLista = elementos(pessoas);
    const linha = unico(
      daLista.filter((e) => e.atributos.href === "/admin/alunos/user_exemplo"),
      "linha"
    );
    expect(noFoco(linha).filter((d) => FUNDO.test(d)).length).toBeGreaterThan(
      0
    );
    const nome = unico(
      daLista.filter((e) => e.texto === "Ana Exemplo"),
      "nome"
    );
    expect(noFoco(nome)).toContain("color: var(--titulo)");
    const seta = unico(
      daLista.filter((e) => e.classes.includes("lucide-chevron-right")),
      "seta"
    );
    expect(noFoco(seta)).toContain("color: var(--ceu)");
    // O nome e a seta acendem pelo grupo da linha, que precisa existir.
    expect(linha.classes).toContain("group/pessoa");
  });
});
