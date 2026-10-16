import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
const ENTRADA = join(AQUI, "lote.entrada.tsx");
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

const COMERCIAL = "00000000-0000-4000-8000-00000000c001";
const FABRICA = "00000000-0000-4000-8000-00000000c002";
const CAPA = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="604"><rect width="900" height="604" fill="#2b5c8a"/></svg>'
)}`;
const CURSOS = [
  { aulas: 90, id: COMERCIAL, titulo: "Profills School Comercial" },
  { aulas: 7, id: FABRICA, titulo: "Fábrica e montagem" },
].map((c) => ({
  ...c,
  capa: { alt: "", altura: 604, largura: 900, url: CAPA },
  precoTroca: null,
  status: "publicado",
}));

const SEM_LIBERACAO = {
  revogadas: 0,
  tipo: "sem_liberacao",
  ultimaRevogacao: null,
};
const pessoa = (
  userId: string,
  nome: string,
  ativas: { cursoId: string; origem: string }[] = []
) => ({
  ativas,
  email: `${userId.slice(5)}@profills.com.br`,
  foto: null,
  nome,
  situacao: SEM_LIBERACAO,
  userId,
});
const busca = (pessoas: unknown[]) => ({
  hoje: "2026-10-16",
  pessoas,
  total: pessoas.length,
});
const BUSCAS = {
  lima: busca([
    pessoa("user_ana", "Ana Beatriz Lima"),
    pessoa("user_mariana", "Mariana Lima Castro"),
    pessoa("user_roberto", "Roberto Lima", [
      { cursoId: FABRICA, origem: "admin" },
    ]),
  ]),
  rocha: busca([
    pessoa("user_camila", "Camila Rocha"),
    pessoa("user_carla", "Carla Rocha", [
      { cursoId: COMERCIAL, origem: "troca" },
    ]),
  ]),
  zzz: busca([]),
};

const PAGINA = `
        import { useState } from "react";
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { ProvedorDoLote } from "./provedor-do-lote";
        import { TelaDeAlunos } from "./tela-de-alunos";

        const BUSCAS = ${JSON.stringify(BUSCAS)};
        const CURSOS = ${JSON.stringify(CURSOS)};

        // Uma busca nova troca a página e não o layout, como no app.
        function Pagina() {
          const [termo, setTermo] = useState("lima");
          window.buscar = (t) => flushSync(() => setTermo(t));
          return (
            <>
              <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
                <h1 className="font-bold text-3xl text-titulo tracking-tight">Alunos</h1>
                <p className="text-muted-foreground">Marque pessoas para liberar um curso, ou abra uma para ver o acesso</p>
              </header>
              <div className="mb-8 h-11 rounded-full bg-card ring-1 ring-muted-foreground" />
              <TelaDeAlunos cursos={CURSOS} resultado={BUSCAS[termo]} termo={termo} />
            </>
          );
        }
        const raiz = createRoot(document.getElementById("raiz"));
        flushSync(() => raiz.render(<ProvedorDoLote><Pagina /></ProvedorDoLote>));
      `;

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: PAGINA,
      [TRPC]: `
        const tentativas = {};
        window.pedidos = [];
        const naPessoa = (userId) => {
          tentativas[userId] = (tentativas[userId] ?? 0) + 1;
          if (userId === "user_camila" && tentativas[userId] === 1) {
            return { mensagem: "Não deu para liberar agora. Nada mudou para esta pessoa.", tipo: "nao_liberou", userId };
          }
          if (userId === "user_roberto") {
            return { liberadaEm: "2026-08-20", origem: "admin", tipo: "ja_tinha", userId };
          }
          return { tipo: "liberada_agora", userId };
        };
        export const trpcClient = {
          admin: {
            alunos: {
              liberarVarios: {
                mutate: async (entrada) => {
                  window.pedidos.push(entrada);
                  return { hoje: "2026-10-16", pessoas: entrada.userIds.map(naPessoa) };
                },
              },
            },
          },
        };
      `,
      [NAVEGACAO]: `
        export const useRouter = () => ({ refresh: () => undefined });
      `,
      [LINK]: `
        export default function Link({ href, ...resto }) {
          return <a href={href} {...resto} />;
        }
      `,
      [IMAGEM]: `
        export default function Image({ fill, sizes, ...resto }) {
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
    throw new Error(`o pacote da tela não saiu: ${pacote.logs.join("\n")}`);
  }
  return saida.text();
}

// As classes que a tela pode usar: o Tailwind ignora o que não for classe.
const FONTES = [
  "tela-de-alunos.tsx",
  "lista-de-pessoas.tsx",
  "coluna-do-lote.tsx",
  "acompanhamento.tsx",
  "partes.tsx",
  "foto-da-pessoa.tsx",
  "confirmacao-na-linha.tsx",
  "../casca/botoes.ts",
  "../../../../../packages/ui/src/components/button.tsx",
  "../../../../../packages/ui/src/components/checkbox.tsx",
  "../../../../../packages/ui/src/components/avatar.tsx",
  "../../../../../packages/ui/src/components/badge.tsx",
].map((f) => join(AQUI, f));
const PALAVRA = /[\s"'`{}]+/;
const css = await cssDoApp(
  [PAGINA, ...FONTES.map((f) => readFileSync(f, "utf8"))].flatMap((t) =>
    t.split(PALAVRA)
  )
);

// Só para as fotos: a Geist de um diretório local, embutida, como o next/font a serve.
const GEIST = process.env.GEIST_DO_LOTE;
const fonte = GEIST
  ? ["Regular", "Medium", "SemiBold", "Bold"]
      .map(
        (peso, i) =>
          `@font-face{font-family:Geist;font-weight:${400 + i * 100};src:url(data:font/woff2;base64,${readFileSync(join(GEIST, `Geist-${peso}.woff2`)).toString("base64")}) format("woff2")}`
      )
      .join("")
  : "";

let enviar: Enviar;
let pacote: string;

async function abrirTela(largura: number) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: largura < 768,
    width: largura,
  });
  const conteudo =
    largura < 768
      ? "padding:32px 16px 64px"
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

const clicar = (seletor: string) =>
  avaliar(enviar, `document.querySelector(${JSON.stringify(seletor)}).click()`);
const clicarNoTexto = (rotulo: string) =>
  avaliar(
    enviar,
    `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(rotulo)}).click()`
  );
const buscar = (termo: string) =>
  avaliar(enviar, `window.buscar(${JSON.stringify(termo)})`);
const marcar = (nome: string) => clicar(`[aria-label="Marcar ${nome}"]`);
const texto = (seletor: string) =>
  avaliar<string>(
    enviar,
    `document.querySelector(${JSON.stringify(seletor)})?.textContent ?? null`
  );
const marcadas = () =>
  avaliar<string[]>(
    enviar,
    `[...document.querySelectorAll('aside li strong')].map((s) => s.textContent)`
  );
const focado = () =>
  avaliar<string>(
    enviar,
    "document.activeElement?.id || document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName"
  );

const FOTOS = process.env.FOTOS_DO_LOTE;
async function foto(nome: string) {
  if (!FOTOS) {
    return;
  }
  // As transições de cor da tela duram até 200 ms.
  await sleep(300);
  const { data } = (await enviar("Page.captureScreenshot", {
    captureBeyondViewport: true,
    format: "png",
  })) as { data: string };
  writeFileSync(join(FOTOS, `${nome}.png`), Buffer.from(data, "base64"));
}

interface Caixa {
  direita: number;
  esquerda: number;
  largura: number;
  topo: number;
}
const MEDIR = `(() => {
  const caixa = (el) => {
    const r = el.getBoundingClientRect();
    return { direita: Math.round(r.right), esquerda: Math.round(r.left), largura: Math.round(r.width), topo: Math.round(r.top) };
  };
  const coluna = document.querySelector("aside");
  return {
    coluna: caixa(coluna),
    lista: caixa(document.querySelector('section[aria-labelledby="pessoas"]')),
    posicao: getComputedStyle(coluna).position,
  };
})()`;
const medir = () =>
  avaliar<{ coluna: Caixa; lista: Caixa; posicao: string }>(enviar, MEDIR);

/** Marca três pessoas em duas buscas e escolhe o Comercial. */
async function prontoParaLiberar() {
  await marcar("Ana Beatriz Lima");
  await marcar("Roberto Lima");
  await buscar("rocha");
  await marcar("Camila Rocha");
  await clicar(`input[value="${COMERCIAL}"]`);
}

describe.skipIf(!existsSync(CHROMIUM))("liberar para várias pessoas", () => {
  beforeAll(async () => {
    [enviar, pacote] = await Promise.all([abrirChromium("lote"), empacotar()]);
  }, 20_000);

  afterAll(fecharChromium);

  test("1280 px: a coluna de 320 px fica à direita da lista, a 28 px, presa ao topo", async () => {
    await abrirTela(1280);
    await foto("1280-vazio");
    const m = await medir();
    expect(m.coluna.largura).toBe(320);
    expect(m.coluna.esquerda - m.lista.direita).toBe(28);
    expect(m.coluna.topo).toBe(m.lista.topo);
    expect(m.posicao).toBe("sticky");
  });

  test("a seleção continua depois de outra busca, na ordem em que o admin marcou", async () => {
    await abrirTela(1280);
    await marcar("Ana Beatriz Lima");
    await marcar("Roberto Lima");
    await foto("1280-marcando");
    await buscar("rocha");
    expect(await marcadas()).toEqual(["Ana Beatriz Lima", "Roberto Lima"]);
    await marcar("Camila Rocha");
    expect(await marcadas()).toEqual([
      "Ana Beatriz Lima",
      "Roberto Lima",
      "Camila Rocha",
    ]);
    expect(await texto("aside h2 small")).toBe("3");
  });

  test("com o curso escolhido, quem já o tem perde a caixa e diz como chegou", async () => {
    await abrirTela(1280);
    await prontoParaLiberar();
    await foto("1280-pronto");
    const carla = await avaliar<{ caixa: boolean; texto: string }>(
      enviar,
      `(() => {
        const li = [...document.querySelectorAll("section li")].find((l) => l.textContent.includes("Carla Rocha"));
        return { caixa: li.querySelector('[role="checkbox"]') !== null, texto: li.textContent };
      })()`
    );
    expect(carla.caixa).toBe(false);
    expect(carla.texto).toContain(
      "Já tem Profills School Comercial, por troca"
    );
    expect(await texto('[aria-label="Marcar Camila Rocha"]')).not.toBeNull();
  });

  test("Liberar manda o curso e as três pessoas, e o resultado sai por pessoa na coluna", async () => {
    await abrirTela(1280);
    await prontoParaLiberar();
    await clicarNoTexto("Liberar para 3 pessoas");
    await esperar(
      `document.querySelector("aside h2")?.textContent === "Liberado"`
    );
    expect(await avaliar<unknown>(enviar, "window.pedidos")).toEqual([
      {
        cursoId: COMERCIAL,
        userIds: ["user_ana", "user_roberto", "user_camila"],
      },
    ]);
    expect(await focado()).toBe("lote");
    expect(await texto('aside [role="status"]')).toBe(
      "1 liberada agora, 1 já tinha, 1 não liberou"
    );
    expect(
      await avaliar<string[]>(
        enviar,
        `[...document.querySelectorAll("aside li")].map((l) => l.innerText.replace(/\\s+/g, " ").trim())`
      )
    ).toEqual([
      "CR Camila Rocha Não deu para liberar agora. Nada mudou para esta pessoa. Não liberou Tentar de novo",
      "AL Ana Beatriz Lima ana@profills.com.br Liberada agora",
      "RL Roberto Lima Liberada em 20 de ago. Já tinha",
    ]);
    await foto("1280-erro");

    await clicar('[aria-label="Tentar de novo para Camila Rocha"]');
    await esperar(
      `document.querySelector('aside [role="status"]')?.textContent === "2 liberadas agora, 1 já tinha"`
    );
    expect(await focado()).toBe("lote-resultado-user_camila");
    await foto("1280-resultado");

    await clicarNoTexto("Nova liberação");
    expect(await texto("aside h2")).toBe("Marcadas0");
    expect(await focado()).toBe("lote");
  });

  test("busca sem ninguém lembra que as marcadas continuam marcadas", async () => {
    await abrirTela(1280);
    await marcar("Ana Beatriz Lima");
    await marcar("Mariana Lima Castro");
    await buscar("zzz");
    expect(
      await texto('section[aria-labelledby="pessoas"] > div:last-child > p')
    ).toBe(
      `Ninguém com "zzz" no nome ou no e-mail. A pessoa precisa ter entrado na plataforma uma vez. As 2 marcadas continuam marcadas.`
    );
    await foto("1280-nada");
  });

  test("o X tira a pessoa e o foco vai para a vizinha; sem vizinha, para o título", async () => {
    await abrirTela(1280);
    await marcar("Ana Beatriz Lima");
    await marcar("Mariana Lima Castro");
    await clicar('[aria-label="Desmarcar Ana Beatriz Lima"]');
    expect(await marcadas()).toEqual(["Mariana Lima Castro"]);
    expect(await focado()).toBe("lote-desmarcar-user_mariana");
    await clicar('[aria-label="Desmarcar Mariana Lima Castro"]');
    expect(await focado()).toBe("lote");
  });

  test("390 px: a coluna vem antes da lista, na largura dela, e rola com a página", async () => {
    await abrirTela(390);
    await prontoParaLiberar();
    await foto("390-pronto");
    const m = await medir();
    expect(m.coluna.topo).toBeLessThan(m.lista.topo);
    expect(m.coluna.largura).toBe(m.lista.largura);
    expect(m.posicao).toBe("static");
    await clicarNoTexto("Liberar para 3 pessoas");
    await esperar(
      `document.querySelector("aside h2")?.textContent === "Liberado"`
    );
    await foto("390-erro");
  });
});
