import { describe, expect, test } from "bun:test";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { AulaId } from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";
import CarregandoAula from "@/app/(aluno)/cursos/[slug]/aulas/[aulaId]/loading";

import {
  CabecalhoDaAula,
  DescricaoDaAula,
  LINHA_DO_MODULO,
  TITULO_DA_AULA,
} from "./cabecalho-da-aula";
import { ALTURA_DA_BARRA, CAIXA_DO_VIDEO } from "./partes";

// O esqueleto desenha cada linha do cabeçalho com 1lh dentro de um bloco com a mesma
// tipografia do cabeçalho real: a altura bate em toda largura, e o vídeo não pula
// quando a página chega.
describe("esqueleto da aula", () => {
  test("o título e a linha do módulo do esqueleto usam a tipografia do cabeçalho", () => {
    const h = renderToStaticMarkup(<CarregandoAula />);
    expect(h).toContain(`class="${TITULO_DA_AULA}"`);
    expect(h).toContain(`class="${LINHA_DO_MODULO}"`);
    expect(h.match(/h-\[1lh\]/g)?.length).toBe(2);
  });

  // A altura de cada largura, contra o player de verdade, se mede no Chromium
  // (player-da-aula.navegador.test.tsx).
  test("o vídeo do esqueleto tem a caixa do vídeo real e a barra que lê a própria largura", () => {
    const h = renderToStaticMarkup(<CarregandoAula />);
    expect(h).toContain(`class="${CAIXA_DO_VIDEO.replaceAll("&", "&amp;")}"`);
    expect(h).toContain(
      `<div class="@container/barra"><div class="${ALTURA_DA_BARRA}"></div></div>`
    );
  });
});

const DADOS: AulaNoPlayer = {
  anterior: null,
  aula: {
    descricao: "",
    duracaoSeg: 634,
    id: "a4" as AulaId,
    modulo: { numero: 8, titulo: "Pilar Urgência" },
    numeroNoModulo: 4,
    titulo: "Cronograma reverso",
    totalNoModulo: 8,
    video: null,
  },
  curso: {
    progresso: { feitas: 0, pct: 0, total: 8 },
    slug: "comercial",
    titulo: "Profills School Comercial",
  },
  estudo: { assistida: false, posicaoSeg: 0, trechos: SEM_TRECHOS },
  modulos: [],
  proxima: null,
  questionario: null,
};

const PARAGRAFO_DA_DESCRICAO = /<p class="([^"]*)">Por que filmar/;

const comDescricao = (descricao: string) => {
  const dados = { ...DADOS, aula: { ...DADOS.aula, descricao } };
  return {
    cabecalho: renderToStaticMarkup(<CabecalhoDaAula dados={dados} />),
    descricao: renderToStaticMarkup(<DescricaoDaAula dados={dados} />),
  };
};

describe("descrição da aula", () => {
  test("fica fora do cabeçalho, em 14 px texto, na largura toda e cortada em 3 linhas, com as quebras do admin", () => {
    const h = comDescricao("Por que filmar.\nO que o cliente vê.");
    expect(h.cabecalho).not.toContain("Por que filmar.");
    expect(h.descricao).toContain("Sobre esta aula");
    const classes = h.descricao.match(PARAGRAFO_DA_DESCRICAO)?.[1].split(" ");
    expect(classes).toEqual(
      expect.arrayContaining([
        "line-clamp-3",
        "whitespace-pre-line",
        "text-foreground",
        "text-sm",
      ])
    );
  });

  test("vazia ou só com espaços, não aparece", () => {
    for (const descricao of ["", "  \n "]) {
      expect(comDescricao(descricao).descricao).toBe("");
    }
  });
});
