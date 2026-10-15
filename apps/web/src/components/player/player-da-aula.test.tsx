import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { AulaId, VideoDaAula } from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";

// Fora do App Router o useRouter não tem de onde ler; o resto do módulo fica o de verdade.
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({ refresh: () => undefined }),
}));

const { PlayerDaAula } = await import("./player-da-aula");
const { AulaSemVideo } = await import("./aula-sem-video");
const { NavegacaoEntreAulas } = await import("./cabecalho-da-aula");

const VIDEO = { id: "aqz-KE-bpKQ", provedor: "youtube" } as VideoDaAula;

const DADOS: AulaNoPlayer = {
  anterior: { id: "a3" as AulaId, titulo: "O custo do atraso para o cliente" },
  aula: {
    duracaoSeg: 634,
    id: "a4" as AulaId,
    modulo: { numero: 8, titulo: "Pilar Urgência" },
    numeroNoModulo: 4,
    titulo: "Cronograma reverso",
    totalNoModulo: 8,
    video: VIDEO,
  },
  curso: {
    progresso: { feitas: 46, pct: 51, total: 90 },
    slug: "comercial",
    titulo: "Profills School Comercial",
  },
  estudo: { assistida: false, posicaoSeg: 222, trechos: SEM_TRECHOS },
  modulos: [],
  proxima: { id: "a5" as AulaId, titulo: "Prazo que o cliente aceita" },
};

const TITULO = "<h1";
const LINHA_DO_MODULO = "Módulo 8 · Pilar Urgência · aula 4 de 8";
const NAVEGACAO = 'aria-label="Navegação entre aulas"';

function posicoes(h: string, marcas: string[]) {
  return marcas.map((m) => {
    const i = h.indexOf(m);
    expect(i, `"${m}" não apareceu`).toBeGreaterThanOrEqual(0);
    return i;
  });
}

describe("ordem da página da aula", () => {
  test("no player, o título e a linha do módulo vêm antes do vídeo, e Anterior e Próxima depois dos controles", () => {
    const h = renderToStaticMarkup(
      <PlayerDaAula dados={DADOS} inicioSeg={222} video={VIDEO} />
    );
    const ordem = posicoes(h, [
      TITULO,
      LINHA_DO_MODULO,
      'aria-label="Player da aula"',
      'role="status"',
      NAVEGACAO,
    ]);
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
  });

  test("num curso de uma aula só, a página não tem landmark de navegação vazio", () => {
    const sozinha = { ...DADOS, anterior: null, proxima: null };
    const comVideo = renderToStaticMarkup(
      <PlayerDaAula dados={sozinha} inicioSeg={222} video={VIDEO} />
    );
    const semVideo = renderToStaticMarkup(
      <AulaSemVideo
        dados={{ ...sozinha, aula: { ...DADOS.aula, video: null } }}
      />
    );
    expect(comVideo).not.toContain("<nav");
    expect(semVideo).not.toContain("<nav");
  });

  test("na aula sem vídeo, o título vem antes do aviso e a navegação depois", () => {
    const h = renderToStaticMarkup(
      <AulaSemVideo
        dados={{ ...DADOS, aula: { ...DADOS.aula, video: null } }}
      />
    );
    const ordem = posicoes(h, [
      TITULO,
      LINHA_DO_MODULO,
      "O vídeo desta aula ainda não foi publicado.",
      NAVEGACAO,
    ]);
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
  });
});

// Os tokens do tema, lidos do CSS que o app carrega: "--muted-foreground: #a8acb0;".
const TOKENS = new Map(
  [
    ...readFileSync(
      join(
        import.meta.dir,
        "../../../../../packages/ui/src/styles/globals.css"
      ),
      "utf8"
    ).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6});/g),
  ].map(([, nome, hex]) => [nome, hex])
);
const BORDA_DARK = /^dark:border-[a-z]/;

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

describe("Anterior e Próxima em repouso", () => {
  test("a borda do botão em contorno passa de 3:1 contra o fundo (WCAG 1.4.11)", () => {
    const h = renderToStaticMarkup(
      <NavegacaoEntreAulas dados={DADOS} destacarProxima={false} />
    );
    const classes = [...h.matchAll(/<a [^>]*class="([^"]+)"/g)].map(
      ([, c]) => c
    );
    expect(classes).toHaveLength(2);
    const fundo = TOKENS.get("background");
    expect(fundo).toBeDefined();
    for (const c of classes) {
      // O html tem .dark fixo: a última borda dark: sem estado é a que pinta em repouso.
      const borda = c
        .split(" ")
        .filter((k) => BORDA_DARK.test(k))
        .at(-1)
        ?.slice("dark:border-".length);
      const cor = borda ? TOKENS.get(borda) : undefined;
      expect(cor, `borda ${borda} sem token`).toBeDefined();
      expect(contraste(cor as string, fundo as string)).toBeGreaterThanOrEqual(
        3
      );
    }
  });
});
