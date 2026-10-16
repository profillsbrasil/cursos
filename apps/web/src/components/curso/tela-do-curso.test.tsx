import { describe, expect, test } from "bun:test";
import type { PaginaDoCurso } from "@cursos/api/dominio/pagina-do-curso";
import { renderToStaticMarkup } from "react-dom/server";

import {
  BLOQUEIO,
  CRONOGRAMA,
  comercial,
  fabrica,
  HOJE,
  RISCOS,
} from "./exemplo-de-teste";
import { TelaDoCurso } from "./tela-do-curso";

const CARTAO = /<aside aria-label="Seu progresso".*?<\/aside>/;
const BOTAO = /<button[^>]*>(.*?)<\/button>/;
const CABECALHO = /<header.*?<\/header>/;
const AULA_ATUAL = /<a aria-current="step"[^>]*href="([^"]+)"/;

const render = (p: PaginaDoCurso) =>
  renderToStaticMarkup(<TelaDoCurso hoje={HOJE} pagina={p} />);

const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cartao = (html: string) => texto(html.match(CARTAO)?.[0] ?? "");

const textoDoLeitorDeTela = (html: string) =>
  texto(html.replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>.*?<\/\1>/g, " "));

const modulos = (html: string) =>
  [...html.matchAll(/<details([^>]*)><summary[^>]*>(.*?)<\/summary>/g)].map(
    ([, atributos = "", resumo = ""]) => ({
      aberto: atributos.includes("open"),
      resumo: textoDoLeitorDeTela(resumo),
    })
  );

const botaoDosModulos = (html: string) => texto(html.match(BOTAO)?.[1] ?? "");

describe("o cartão em cada estado", () => {
  const casos: [string, PaginaDoCurso, string][] = [
    [
      "não iniciado, sem níveis",
      fabrica.naoIniciado,
      "Não iniciado 0% 0 de 4 aulas assistidas Comece por: Módulo 1, Segurança do posto Aula 1 · Riscos do posto de montagem Começar o curso 11 min na primeira aula 3 módulos, sem níveis Prova e certificado no fim do curso",
    ],
    [
      "não iniciado, com níveis",
      comercial.naoIniciado,
      "Não iniciado 0% 0 de 7 aulas assistidas Comece por: Módulo 0, Autoavaliação comercial Aula 1 · Autoavaliação, parte 1 Começar o curso 10 min na primeira aula Próximo nível: Vendedor Profills Certificado Prova e certificado no fim do curso",
    ],
    [
      "em andamento, sem níveis",
      fabrica.emAndamento,
      "Em andamento 25% 1 de 4 aulas assistidas Agora: Módulo 1, Segurança do posto Aula 2 · Bloqueio antes de mexer Continuar em 3:42 Faltam 6 min desta aula 3 módulos, sem níveis Prova e certificado no fim do curso",
    ],
    [
      "em andamento, com níveis",
      comercial.emAndamento,
      "Em andamento 57% 4 de 7 aulas assistidas Agora: Módulo 2, Pilar Urgência Aula 2 · Cronograma reverso Continuar Faltam 11 min desta aula Próximo nível: Consultor Comercial Profills Prova e certificado no fim do curso",
    ],
    [
      "prova, sem níveis",
      fabrica.prova,
      "Falta a prova 100% 4 de 4 aulas assistidas Você assistiu a todas as aulas Prova e certificado Rever aulas A prova abre em breve nesta página",
    ],
    [
      "prova, com níveis",
      comercial.prova,
      "Falta a prova 100% 7 de 7 aulas assistidas Você assistiu a todas as aulas Prova e certificado Rever aulas A prova abre em breve nesta página",
    ],
    [
      "concluído, sem níveis",
      fabrica.concluido,
      "Concluído 100% 4 de 4 aulas assistidas Curso concluído Certificado emitido em 8 de out. Rever o curso Código do certificado: CERT-FAB-1",
    ],
    [
      "concluído, com níveis",
      comercial.concluido,
      "Concluído 100% 7 de 7 aulas assistidas Curso concluído Certificado emitido em 28 de dez. de 2025 Rever o curso Código do certificado: CERT-COM-7",
    ],
  ];

  for (const [nome, pagina, esperado] of casos) {
    test(nome, () => {
      expect(cartao(render(pagina))).toBe(esperado);
    });
  }
});

describe("a página", () => {
  test("o cabeçalho leva o título, o primeiro parágrafo, a categoria e o resumo", () => {
    const html = render(comercial.emAndamento);
    const cabecalho = texto(html.match(CABECALHO)?.[0] ?? "");
    expect(cabecalho).toBe(
      "Método comercial O método comercial da Profills, do primeiro contato ao pós-venda. Vendas e negócios 4 módulos 7 aulas 1 h 13 min 2 níveis"
    );
  });

  test("a ordem no DOM é cabeçalho, cartão, o que você vai aprender, conteúdo e sobre", () => {
    const html = render(fabrica.naoIniciado);
    const marcos = [
      "<h1",
      'aria-label="Seu progresso"',
      "O que você vai aprender",
      "Conteúdo do curso",
      "Sobre o curso",
    ].map((m) => html.indexOf(m));
    expect(marcos.every((m) => m >= 0)).toBe(true);
    expect([...marcos].sort((a, b) => a - b)).toEqual(marcos);
  });

  test("Sobre o curso leva os parágrafos depois do primeiro, e some sem eles", () => {
    expect(texto(render(fabrica.naoIniciado))).toContain(
      "Sobre o curso No último módulo, você lê um esquema pneumático."
    );
    expect(render(comercial.naoIniciado)).not.toContain("Sobre o curso");
  });

  test("no curso de até 3 módulos, todos abrem, e o botão diz Fechar todos", () => {
    const html = render(fabrica.naoIniciado);
    expect(modulos(html)).toEqual([
      {
        aberto: true,
        resumo: "Módulo 1 · Segurança do posto 2 aulas · 21 min",
      },
      { aberto: true, resumo: "Módulo 2 · Envasadora 1 aula · 9 min" },
      {
        aberto: true,
        resumo: "Módulo 3 · Montagem pneumática 1 aula · 12 min",
      },
    ]);
    expect(botaoDosModulos(html)).toBe("Fechar todos");
  });

  test("com mais de 3 módulos, só o da aula atual abre, com a contagem de cada um", () => {
    const html = render(comercial.emAndamento);
    expect(modulos(html)).toEqual([
      {
        aberto: false,
        resumo:
          "Concluído. Módulo 0 · Autoavaliação comercial Nível 1 · Vendedor Profills Certificado 2 de 2 · 21 min",
      },
      {
        aberto: false,
        resumo:
          "Concluído. Módulo 1 · História e posicionamento Nível 1 · Vendedor Profills Certificado 1 de 1 · 12 min",
      },
      {
        aberto: true,
        resumo:
          "Módulo 2 · Pilar Urgência Nível 2 · Consultor Comercial Profills 1 de 3 · 30 min",
      },
      {
        aberto: false,
        resumo:
          "Módulo 3 · Pilar Confiança Nível 2 · Consultor Comercial Profills 0 de 1 · 10 min",
      },
    ]);
    expect(botaoDosModulos(html)).toBe("Abrir todos");
  });

  test("Você parou em m:ss fica na linha da aula atual, só com posição acima de 0", () => {
    const comPosicao = render(fabrica.emAndamento);
    const linha = comPosicao.match(
      new RegExp(`<li[\\s>](?:(?!</li>).)*${BLOQUEIO}.*?</li>`)
    )?.[0];
    expect(textoDoLeitorDeTela(linha ?? "")).toBe(
      "2. Bloqueio antes de mexer Você parou em 3:42 10 min"
    );
    expect(texto(comPosicao).match(/Você parou em/g)).toHaveLength(1);
    expect(render(comercial.emAndamento)).not.toContain("Você parou em");
  });

  test("cada aula do índice leva a ela, com a descrição inteira, e a atual é marcada", () => {
    const html = render(comercial.emAndamento);
    expect(html).toContain(`<a aria-current="step" class="`);
    const atual = html.match(AULA_ATUAL)?.[1];
    expect(atual).toBe(`/cursos/comercial/aulas/${CRONOGRAMA}`);
    expect(texto(html)).toContain(
      "2. Cronograma reverso Partir da data em que a linha precisa rodar e voltar até o pedido. 11 min"
    );
    const fab = render(fabrica.naoIniciado);
    expect(fab).toContain(`href="/cursos/fabrica-e-montagem/aulas/${RISCOS}"`);
    expect(fab).not.toContain("aria-current");
  });

  test("a aula assistida tem o check e o leitor de tela ouve Assistida", () => {
    const linha = render(fabrica.emAndamento).match(
      new RegExp(`<li[\\s>](?:(?!</li>).)*${RISCOS}.*?</li>`)
    )?.[0];
    expect(texto(linha ?? "")).toBe(
      "Assistida. 1. Riscos do posto de montagem Os pontos de esmagamento, corte e choque que aparecem na bancada. 11 min"
    );
  });
});
