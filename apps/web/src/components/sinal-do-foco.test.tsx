// Os quatro controles da #44 tinham foco de teclado quase invisível. Cada um é
// renderizado como o app o monta, e o CSS real do app (index.css com o globals.css)
// é compilado pelo Tailwind com as classes que saem dele. O teste lê só as regras
// que casam com o foco de teclado e confere o sinal que o dono escolheu. A pílula
// acende por um irmão (:has e ~), que só um browser de verdade avalia: a navegação
// abre no Chromium headless, com o cursor e o foco forçados no link. Sem Chromium
// na máquina, só a suíte da pílula pula.

import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { LiberacaoNaTela } from "@cursos/api/dominio/liberacao";
import type {
  AulaId,
  CursoId,
  DiaISO,
  LiberacaoId,
} from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { sleep, spawn } from "bun";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "tailwindcss";

// Fora do App Router o usePathname não tem de onde ler e o useRouter lança; o teste
// diz o caminho, e o resto do módulo fica o de verdade.
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  usePathname: () => "/meus-cursos",
  useRouter: () => ({
    push: () => undefined,
    refresh: () => undefined,
    replace: () => undefined,
  }),
}));

const { AcessoDoAluno } = await import("./admin/acesso-do-aluno");
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

const HOJE = "2026-10-14" as DiaISO;
const pessoas = renderToStaticMarkup(
  <ListaDePessoas
    resultado={{
      hoje: HOJE,
      pessoas: [
        {
          email: "ana@exemplo.com",
          foto: null,
          nome: "Ana Exemplo",
          situacao: {
            desde: HOJE,
            numeros: { concluidos: 0, cursos: 1, liberacoes: 1 },
            tipo: "nunca_abriu",
          },
          userId: "user_exemplo",
        },
      ],
      total: 1,
    }}
    termo=""
  />
);

// Uma liberação ativa, com Revogar, e uma revogada, que fica no summary recolhido.
const liberacao = (
  id: string,
  titulo: string,
  acao: LiberacaoNaTela["acao"]
): LiberacaoNaTela => ({
  acao,
  acompanhamento: {
    curso: {
      progresso: { feitas: 0, pct: 0, total: 2 },
      situacao: { tipo: "nunca_abriu" },
      titulo,
    },
    tipo: "curso",
  },
  alvo: { id: id as CursoId, tipo: "curso", titulo },
  id: id as LiberacaoId,
  liberadaEm: "2026-10-01T15:00:00.000Z",
  origem: "admin",
});
const acesso = renderToStaticMarkup(
  <AcessoDoAluno
    acesso={{
      cursos: [],
      hoje: HOJE,
      liberacoes: [
        liberacao("33333333-3333-4333-8333-333333333333", "Ativo", {
          tipo: "revogar",
        }),
        liberacao("44444444-4444-4444-8444-444444444444", "Antigo", {
          em: "2026-10-02T15:00:00.000Z",
          tipo: "revogada",
        }),
      ],
      pessoa: null,
      trilhas: [],
      userId: "user_exemplo",
    }}
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

const todos = [nav, coluna, pessoas, acesso].flatMap(elementos);
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

/** O que o afterAll desfaz, na ordem inversa: vale também se o setup cair no meio. */
const limpezas: (() => unknown)[] = [];

const TETO_DO_WEBSOCKET_MS = 5000;

function abrirWebSocket(url: string) {
  const ws = new WebSocket(url);
  limpezas.push(() => ws.close());
  return new Promise<WebSocket>((pronto, falhou) => {
    const teto = setTimeout(
      () =>
        falhou(
          new Error(
            `o WebSocket do DevTools não abriu em ${TETO_DO_WEBSOCKET_MS} ms`
          )
        ),
      TETO_DO_WEBSOCKET_MS
    );
    ws.addEventListener("open", () => {
      clearTimeout(teto);
      pronto(ws);
    });
    ws.addEventListener("error", () => {
      clearTimeout(teto);
      falhou(new Error(`o WebSocket do DevTools falhou em ${url}`));
    });
  });
}

async function abrirChromium() {
  const perfil = mkdtempSync(join(tmpdir(), "sinal-do-foco-"));
  limpezas.push(() => rmSync(perfil, { force: true, recursive: true }));
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
  limpezas.push(async () => {
    processo.kill();
    await processo.exited;
  });
  const navegador = new URL(await enderecoDoDevTools(processo.stderr));
  const alvos = (await (
    await fetch(`http://${navegador.host}/json/list`)
  ).json()) as { type: string; webSocketDebuggerUrl: string }[];
  const pagina = alvos.find((a) => a.type === "page");
  if (!pagina) {
    throw new Error("o Chromium abriu sem página");
  }
  const ws = await abrirWebSocket(pagina.webSocketDebuggerUrl);
  const pendentes = new Map<number, (r: Resposta) => void>();
  ws.addEventListener("message", (m) => {
    const resposta = JSON.parse(String(m.data)) as Resposta;
    if (resposta.id !== undefined) {
      pendentes.get(resposta.id)?.(resposta);
      pendentes.delete(resposta.id);
    }
  });
  let proximo = 0;
  return (method: string, params: Record<string, unknown> = {}) => {
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
  };
}

// Preenchidos pelo beforeAll da suíte do Chromium; sem Chromium, a suíte pula.
let enviar: Awaited<ReturnType<typeof abrirChromium>>;
let raiz: number;
let temCursor: boolean;
let solHover: string;
let repouso: { fundo: string; sombra: string };

async function avaliar<T>(expressao: string) {
  const { result } = (await enviar("Runtime.evaluate", {
    expression: expressao,
    returnByValue: true,
  })) as { result: { value: T } };
  return result.value;
}

async function noDe(seletor: string) {
  const { nodeId } = (await enviar("DOM.querySelector", {
    nodeId: raiz,
    selector: seletor,
  })) as { nodeId: number };
  expect(nodeId).toBeGreaterThan(0);
  return nodeId;
}

/** Aperta Tab, como a pessoa, até a condição valer ou acabarem as tentativas. */
async function tabAte(condicao: string, tentativas: number): Promise<void> {
  if (tentativas === 0 || (await avaliar<boolean>(condicao))) {
    return;
  }
  const tecla = { code: "Tab", key: "Tab", windowsVirtualKeyCode: 9 };
  await enviar("Input.dispatchKeyEvent", { ...tecla, type: "rawKeyDown" });
  await enviar("Input.dispatchKeyEvent", { ...tecla, type: "keyUp" });
  return tabAte(condicao, tentativas - 1);
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
  await enviar("CSS.forcePseudoState", {
    forcedPseudoClasses: [estado],
    nodeId,
  });
  const pilula = await lerPilula();
  await enviar("CSS.forcePseudoState", {
    forcedPseudoClasses: [],
    nodeId,
  });
  return pilula;
}

const BRILHO = "rgba(255, 204, 1, 0.28)";

describe("o foco de teclado aparece nos quatro controles da #44", () => {
  describe.skipIf(!existsSync(CHROMIUM))(
    "a pílula do link ativo acende para sol-hover, com o brilho do botão amarelo",
    () => {
      beforeAll(async () => {
        enviar = await abrirChromium();
        // Sem transição (motion-reduce:transition-none): a cor lida é a final.
        await enviar("Emulation.setEmulatedMedia", {
          features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        });
        await avaliar(
          `document.open(); document.write(${JSON.stringify(
            `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body>${nav}<div id="sonda" style="background-color: var(--sol-hover)"></div></body></html>`
          )}); document.close();`
        );
        await enviar("DOM.enable");
        await enviar("CSS.enable");
        const { root } = (await enviar("DOM.getDocument")) as {
          root: { nodeId: number };
        };
        raiz = root.nodeId;
        temCursor = await avaliar<boolean>(
          "matchMedia('(hover: hover)').matches"
        );
        solHover = await avaliar<string>(
          "getComputedStyle(document.getElementById('sonda')).backgroundColor"
        );
        repouso = await lerPilula();
      }, 20_000);

      // Uma limpeza por vez: o perfil só sai depois que o processo terminou.
      afterAll(async () => {
        await limpezas
          .splice(0)
          .reverse()
          .reduce<Promise<unknown>>(
            (anterior, limpar) => anterior.then(limpar),
            Promise.resolve()
          );
      });

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
    }
  );

  // A tabela de liberações tinha 640 px de largura mínima: em 390 px, o Tab até
  // Revogar rolava a tabela para o lado e o título da liberação saía da tela.
  describe.skipIf(!existsSync(CHROMIUM))(
    "com o foco de teclado em 390 px, Revogar aparece inteiro, sem rolar a lista para o lado",
    () => {
      let medida: {
        borda: string;
        direita: number;
        esquerda: number;
        focado: boolean;
        largura: number;
        rolagemLateral: number;
        titulo: string;
      };

      beforeAll(async () => {
        enviar = await abrirChromium();
        await enviar("Emulation.setDeviceMetricsOverride", {
          deviceScaleFactor: 1,
          height: 900,
          mobile: false,
          width: 390,
        });
        await enviar("Emulation.setEmulatedMedia", {
          features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        });
        // A moldura do conteúdo do app no celular: 16 px de cada lado.
        await avaliar(
          `document.open(); document.write(${JSON.stringify(
            `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><main style="padding:16px">${acesso}</main><div id="sonda" style="color: var(--titulo)"></div></body></html>`
          )}); document.close();`
        );
        // Tab de verdade, como a pessoa: o foco vem do teclado e o navegador
        // rola o que for preciso para mostrar o botão.
        await enviar("Emulation.setFocusEmulationEnabled", { enabled: true });
        await tabAte(
          `document.activeElement?.getAttribute("aria-label") === "Revogar Ativo"`,
          20
        );
        // A borda troca de cor com transição: lê depois que ela termina.
        await sleep(400);
        medida = await avaliar(`(() => {
          const revogar = document.activeElement;
          const r = revogar.getBoundingClientRect();
          let rolagemLateral = document.scrollingElement.scrollLeft;
          for (let e = revogar.parentElement; e; e = e.parentElement) {
            rolagemLateral = Math.max(rolagemLateral, e.scrollLeft);
          }
          return {
            borda: getComputedStyle(revogar).borderTopColor,
            direita: r.right,
            esquerda: r.left,
            focado:
              revogar.getAttribute("aria-label") === "Revogar Ativo" &&
              revogar.matches(":focus-visible"),
            largura: innerWidth,
            rolagemLateral,
            titulo: getComputedStyle(document.getElementById("sonda")).color,
          };
        })()`);
      }, 20_000);

      afterAll(async () => {
        await limpezas
          .splice(0)
          .reverse()
          .reduce<Promise<unknown>>(
            (anterior, limpar) => anterior.then(limpar),
            Promise.resolve()
          );
      });

      test("o foco é de teclado e a borda acende em titulo", () => {
        expect(medida.focado).toBe(true);
        expect(medida.titulo).toStartWith("rgb");
        expect(medida.borda).toBe(medida.titulo);
      });

      test("nada rola para o lado e o botão cabe na tela", () => {
        expect({
          cabe: medida.esquerda >= 0 && medida.direita <= medida.largura,
          rolagemLateral: medida.rolagemLateral,
        }).toEqual({ cabe: true, rolagemLateral: 0 });
      });
    }
  );

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

  test("o summary das revogadas ganha o fundo branco a 8% e o texto em titulo", () => {
    const resumo = unico(
      elementos(acesso).filter((e) => e.classes.includes("list-none")),
      "summary das revogadas"
    );
    expect(noFoco(resumo)).toContain(
      "background-color: color-mix(in srgb, #fff 8%, transparent)"
    );
    expect(noFoco(resumo)).toContain("color: var(--titulo)");
  });
});
