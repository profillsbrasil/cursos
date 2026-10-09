import { describe, expect, test } from "bun:test";
import { documentoDeExemplo, EDICAO } from "@cursos/api/dominio/exemplo";
import { renderToStaticMarkup } from "react-dom/server";

import { BlocoDoModulo } from "./modulos-do-curso";
import { rascunhoDoCurso } from "./rascunho-do-curso";

const BOTAO = /<button[^>]*>[\s\S]*?<\/button>/g;

const botao = (html: string, rotulo: string) => {
  const achado = html.match(BOTAO)?.find((b) => b.includes(rotulo));
  if (!achado) {
    throw new Error(`sem botão "${rotulo}"`);
  }
  return achado;
};

const nada = () => undefined;
const LINHA_FECHADA = { chave: null, fechar: nada, pedir: nada };

const blocoComAulaAssistida = () => {
  const { modulos, niveis } = rascunhoDoCurso(documentoDeExemplo());
  return renderToStaticMarkup(
    <BlocoDoModulo
      assistidasPorAula={{ [EDICAO.A1]: 3 }}
      despachar={nada}
      indice={0}
      linhaAberta={LINHA_FECHADA}
      modulo={modulos[0]}
      modulos={modulos}
      niveis={niveis}
    />
  );
};

describe("Remover módulo com aula assistida", () => {
  const tag = botao(blocoComAulaAssistida(), "Remover módulo");

  test("fica desligado com o motivo ligado", () => {
    expect(tag).toContain('aria-disabled="true"');
    expect(tag).toContain("data-disabled");
    expect(tag).toContain(`aria-describedby="modulo-${EDICAO.M1}-uso"`);
  });

  test("tem o visual de desligado por data-disabled", () => {
    expect(tag).toContain("data-disabled:opacity-50");
    expect(tag).toContain("data-disabled:cursor-not-allowed");
    expect(tag).toContain("data-disabled:hover:border-muted-foreground");
  });
});
