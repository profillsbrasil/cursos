import { describe, expect, test } from "bun:test";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { AulaId } from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";
import CarregandoAula from "@/app/(aluno)/cursos/[slug]/aulas/[aulaId]/loading";

import {
  CabecalhoDaAula,
  LINHA_DO_MODULO,
  TITULO_DA_AULA,
} from "./cabecalho-da-aula";
import { CAIXA_DO_VIDEO } from "./partes";

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

  test("o vídeo do esqueleto tem a caixa do vídeo real e a altura dos controles", () => {
    const h = renderToStaticMarkup(<CarregandoAula />);
    expect(h).toContain(`class="${CAIXA_DO_VIDEO.replaceAll("&", "&amp;")}"`);
    expect(h).toContain('class="h-[94px]"');
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
const PARAGRAFO = /<p/g;

const comDescricao = (descricao: string) =>
  renderToStaticMarkup(
    <CabecalhoDaAula dados={{ ...DADOS, aula: { ...DADOS.aula, descricao } }} />
  );

describe("descrição da aula", () => {
  test("aparece sob a linha do módulo, em 14 px texto, até 72ch, com as quebras do admin", () => {
    const h = comDescricao("Por que filmar.\nO que o cliente vê.");
    const modulo = h.indexOf("Módulo 8");
    const descricao = h.indexOf("Por que filmar.");
    expect(modulo).toBeGreaterThanOrEqual(0);
    expect(descricao).toBeGreaterThan(modulo);
    const classes = h.match(PARAGRAFO_DA_DESCRICAO)?.[1].split(" ");
    expect(classes).toEqual(
      expect.arrayContaining([
        "max-w-[72ch]",
        "whitespace-pre-line",
        "text-foreground",
        "text-sm",
      ])
    );
  });

  test("vazia ou só com espaços, não deixa parágrafo", () => {
    for (const descricao of ["", "  \n "]) {
      expect(comDescricao(descricao).match(PARAGRAFO)).toHaveLength(1);
    }
  });
});
