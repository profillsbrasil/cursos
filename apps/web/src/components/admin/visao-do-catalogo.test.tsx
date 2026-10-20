import { describe, expect, test } from "bun:test";
import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";
import type { CursoId } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import { STATUS } from "./coluna-de-publicacao";
import { VisaoDoCatalogo } from "./visao-do-catalogo";

const TAG = /<[^>]+>/g;
const TITULO_DO_CURSO =
  /<h2[^>]*><a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/g;
const ICONE_DO_SELO =
  /<svg[^>]*class="lucide (lucide-[a-z-]+)[^>]*>(?:(?!<\/svg>).)*<\/svg>(Publicado|Em produção)</g;
const NOME_DO_ICONE = /lucide (lucide-[a-z-]+)/;
const SELO_EM_PRODUCAO =
  /<span class="([^"]*)"><svg[^>]*lucide-clock[^>]*>.*?<\/svg>Em produção<\/span>/;
const texto = (html: string) =>
  html.replace(TAG, " ").replace(/\s+/g, " ").trim();

const CAPA = { alt: "Capa", altura: 604, largura: 900, url: "/capas/x.jpg" };

const curso = (
  titulo: string,
  extra: Partial<CursoNaVisao> = {}
): CursoNaVisao => ({
  aulas: 0,
  capa: CAPA,
  categoria: "Vendas e negócios",
  codigo: "VN-001",
  id: titulo.toLowerCase().replaceAll(" ", "-") as CursoId,
  modulos: 0,
  precoTroca: null,
  segundosDeVideo: 0,
  status: "publicado",
  titulo,
  ...extra,
});

const COMERCIAL = curso("Profills School Comercial", {
  aulas: 90,
  modulos: 16,
  segundosDeVideo: 15 * 3600 + 51 * 60,
});
const LIMPEZA = curso("Limpeza CIP e troca de formato", {
  categoria: "Operação de linha",
  codigo: "OL-001",
  modulos: 2,
  precoTroca: 1000,
  status: "em_producao",
});
const ROTINA = curso("Nova Rotina de Fechamento", {
  aulas: 9,
  codigo: "POP-COM-001",
  modulos: 2,
  segundosDeVideo: 58 * 60,
});

const tela = (cursos: CursoNaVisao[]) =>
  renderToStaticMarkup(<VisaoDoCatalogo visao={{ cursos }} />);

const titulos = (html: string) =>
  [...html.matchAll(TITULO_DO_CURSO)].map(([, href, titulo]) => ({
    href,
    titulo,
  }));

const NOVO = 'href="/admin/catalogo/cursos/novo"';
const vezes = (html: string, trecho: string) => html.split(trecho).length - 1;

describe("catálogo do admin", () => {
  test("cada curso aparece na ordem do servidor, com o título como link para o editor", () => {
    expect(titulos(tela([COMERCIAL, LIMPEZA, ROTINA]))).toEqual([
      {
        href: "/admin/catalogo/cursos/profills-school-comercial",
        titulo: "Profills School Comercial",
      },
      {
        href: "/admin/catalogo/cursos/limpeza-cip-e-troca-de-formato",
        titulo: "Limpeza CIP e troca de formato",
      },
      {
        href: "/admin/catalogo/cursos/nova-rotina-de-fechamento",
        titulo: "Nova Rotina de Fechamento",
      },
    ]);
  });

  test("o cabeçalho conta os cursos, publicados e em produção", () => {
    expect(texto(tela([COMERCIAL, LIMPEZA, ROTINA]))).toContain(
      "Catálogo 3 cursos, 2 publicados, 1 em produção"
    );
  });

  test("o cartão mostra status, preço, categoria, código e tamanho do curso", () => {
    const t = texto(tela([COMERCIAL, LIMPEZA, ROTINA]));
    expect(t).toContain(
      "Publicado Profills School Comercial Vendas e negócios · VN-001 16 módulos 90 aulas · 15 h 51 min"
    );
    expect(t).toContain(
      "Em produção 1.000 pts Limpeza CIP e troca de formato Operação de linha · OL-001 2 módulos Nenhuma aula ainda"
    );
    expect(t).toContain(
      "Nova Rotina de Fechamento Vendas e negócios · POP-COM-001 2 módulos 9 aulas · 58 min"
    );
  });

  test("o botão do topo e o atalho no fim da grade abrem um curso novo", () => {
    const html = tela([COMERCIAL]);
    expect(vezes(html, NOVO)).toBe(2);
    expect(texto(html)).toContain(
      "Novo curso Começa em produção: o aluno vê na lista, sem abrir aula"
    );
  });

  test("catálogo vazio mostra só o convite para criar, sem o botão do topo", () => {
    const html = tela([]);
    const t = texto(html);
    expect(t).toContain("Catálogo Nenhum curso ainda");
    expect(t).toContain(
      "Nenhum curso no catálogo Crie o primeiro curso. Ele nasce em produção: o aluno vê na lista e só abre aula quando você publicar. Criar o primeiro curso"
    );
    expect(vezes(html, NOVO)).toBe(1);
    expect(t).not.toContain("Novo curso");
  });

  test("até 3 cursos, a grade vem sem filtros nem busca", () => {
    const html = tela([COMERCIAL, LIMPEZA, ROTINA]);
    expect(html).not.toContain("aria-pressed");
    expect(html).not.toContain('type="search"');
  });

  test("de 4 a 6 cursos, os filtros de status aparecem com a contagem, ainda sem busca", () => {
    const html = tela([COMERCIAL, LIMPEZA, ROTINA, curso("Fábrica")]);
    expect(texto(html)).toContain("Todos 4 Publicados 3 Em produção 1");
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('type="search"');
  });

  test("acima de 6 cursos, a busca pelo título aparece antes dos filtros", () => {
    const html = tela([1, 2, 3, 4, 5, 6, 7].map((n) => curso(`Curso ${n}`)));
    expect(html).toContain('placeholder="Buscar curso pelo título"');
    expect(html.indexOf('type="search"')).toBeLessThan(
      html.indexOf("aria-pressed")
    );
  });

  test("Em produção é o selo do resto do admin, em contorno Céu com o relógio", () => {
    const selo = SELO_EM_PRODUCAO.exec(tela([LIMPEZA]))?.[1];
    expect(selo).toContain("text-ceu");
    expect(selo).toContain("ring-ceu");
  });
});

describe("ícone do status", () => {
  test("o selo do cartão usa o ícone da opção do status no editor", () => {
    const doEditor = Object.fromEntries(
      Object.values(STATUS).map((s) => [
        s.rotulo,
        renderToStaticMarkup(s.icone).match(NOME_DO_ICONE)?.[1] ?? "",
      ])
    );
    const doCatalogo = Object.fromEntries(
      [...tela([COMERCIAL, LIMPEZA]).matchAll(ICONE_DO_SELO)].map(
        ([, icone, rotulo]) => [rotulo, icone]
      )
    );
    expect(doCatalogo).toEqual(doEditor);
  });
});
