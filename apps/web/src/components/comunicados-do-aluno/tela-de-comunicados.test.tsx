import { describe, expect, test } from "bun:test";
import type { ComunicadosDoAluno } from "@cursos/api/dominio/comunicado";
import { renderToStaticMarkup } from "react-dom/server";

import { UM_GERAL, UM_SO, VARIOS, VAZIO } from "./exemplo-de-teste";
import { TelaDeComunicados } from "./tela-de-comunicados";

const html = (c: ComunicadosDoAluno) =>
  renderToStaticMarkup(<TelaDeComunicados comunicados={c} />);

const texto = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const destaque = (h: string) => {
  const inicio = h.indexOf("<article");
  return h.slice(inicio, h.indexOf("</article>", inicio));
};

const linhas = (h: string) =>
  [...h.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map(([, li = ""]) => texto(li));

const meses = (h: string) =>
  [
    ...h.matchAll(
      /<h2[^>]*id="comunicados-[^"]+"[^>]*>(.*?)<\/h2>\s*<p[^>]*>(.*?)<\/p>/g
    ),
  ].map(([, titulo, contagem]) => `${titulo} ${contagem}`);

const links = (h: string) =>
  [...h.matchAll(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)].map(
    ([, href, nome]) => [href, texto(nome ?? "")]
  );

describe("vários comunicados", () => {
  const h = html(VARIOS);

  test("o cabeçalho diz de onde vêm e em que ordem", () => {
    expect(texto(h)).toStartWith(
      "Comunicados Gerais e dos seus cursos, do mais novo para o mais velho"
    );
  });

  test("o mais novo abre em destaque: a data longa, o autor, o título, cada parágrafo e o curso", () => {
    expect(texto(destaque(h))).toBe(
      "14 de outubro de 2026 por Marina Duarte Módulo 13 atualizado com o novo cadastro de atendimentos do CRM As aulas 2 e 4 do módulo 13 foram regravadas com a tela nova de cadastro de atendimentos. Quem já concluiu a versão anterior mantém o certificado. Sobre o curso Comercial"
    );
    expect(destaque(h)).toContain(
      "<p>As aulas 2 e 4 do módulo 13 foram regravadas com a tela nova de cadastro de atendimentos.</p><p>Quem já concluiu a versão anterior mantém o certificado.</p>"
    );
    expect(destaque(h)).toContain("<img");
  });

  test("os anteriores vão num cartão por mês, com a contagem", () => {
    expect(meses(h)).toEqual([
      "Outubro de 2026 2 comunicados",
      "Setembro de 2026 1 comunicado",
    ]);
  });

  test("cada anterior: o dia e a semana, o título, o texto e o pé com o curso ou Para todos e o autor", () => {
    expect(linhas(h)).toEqual([
      "9 sex. Dois cursos novos em Trocar pontos Atendimento pós-venda e Fundamentos do envase de líquidos entraram na vitrine, por 300 e 800 pontos. Para todos por Marina Duarte",
      "1 qui. Checklist de bloqueio para levar ao posto A aula Bloqueio antes de mexer, do módulo 1, ganhou o checklist da fábrica. Fábrica e montagem",
      "22 ter. Plataforma fora do ar no sábado, 27 de setembro, das 8h às 10h É a manutenção do servidor. O progresso das aulas fica salvo. Para todos",
    ]);
  });

  test("o curso é link para a página dele, no destaque e no pé", () => {
    expect(links(h)).toEqual([
      ["/cursos/comercial", "Comercial"],
      ["/cursos/fabrica", "Fábrica e montagem"],
    ]);
  });
});

describe("um comunicado só", () => {
  test("mostra só o destaque, sem mês nem lista", () => {
    const h = html(UM_SO);
    expect(texto(destaque(h))).toStartWith("14 de outubro de 2026");
    expect(meses(h)).toEqual([]);
    expect(h).not.toContain("<ol");
  });

  test("o geral leva o megafone e Para todos os alunos no lugar da capa", () => {
    const h = html(UM_GERAL);
    expect(texto(destaque(h))).toBe(
      "18 de agosto de 2026 por Othavio Quiliao Bem-vindo aos cursos da Profills A plataforma de capacitação da Profills abriu para os funcionários. Para todos os alunos"
    );
    expect(h).not.toContain("<img");
    expect(h).toContain("lucide-megaphone");
  });
});

describe("sem comunicado", () => {
  const h = html(VAZIO);

  test("diz que não há nenhum e leva para Meus cursos", () => {
    expect(texto(h)).toBe(
      "Comunicados Gerais e dos seus cursos Nenhum comunicado por enquanto Quando o admin publicar um aviso para todos ou sobre um dos seus cursos, ele aparece aqui, com o texto inteiro. Ir para Meus cursos"
    );
    expect(links(h)).toEqual([["/meus-cursos", "Ir para Meus cursos"]]);
  });
});
