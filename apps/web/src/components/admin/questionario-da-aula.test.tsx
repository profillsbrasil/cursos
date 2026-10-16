import { describe, expect, test } from "bun:test";
import {
  aulaDeExemplo,
  EDICAO,
  perguntaDeExemplo,
  uuidDeExemplo,
} from "@cursos/api/dominio/exemplo";
import type { AlternativaId, PerguntaId } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import { ErrosDoEditor } from "./erros-do-editor";
import { QuestionarioDaAula } from "./questionario-da-aula";
import { ID } from "./rascunho-do-curso";

const nada = () => undefined;
const TAG = /<[^>]+>/g;
const texto = (html: string) => html.replace(TAG, " ").replace(/\s+/g, " ");

const pergunta = (n: number) =>
  perguntaDeExemplo(uuidDeExemplo(40 + n) as PerguntaId, [
    uuidDeExemplo(50 + n) as AlternativaId,
    uuidDeExemplo(60 + n) as AlternativaId,
  ]);

const aulaCom = (perguntas: number) => ({
  ...aulaDeExemplo(EDICAO.A1, "Aula 1"),
  duracao: "05:00",
  perguntas: Array.from({ length: perguntas }, (_, i) => pergunta(i + 1)),
  video: "",
});

const render = (perguntas: number, marcados = new Map<string, string>()) => {
  const aula = aulaCom(perguntas);
  return renderToStaticMarkup(
    <ErrosDoEditor value={marcados}>
      <QuestionarioDaAula
        aula={aula}
        despachar={nada}
        escolhida={aula.perguntas[0] ?? null}
        marcados={marcados}
        mudarEscolhas={nada}
      />
    </ErrosDoEditor>
  );
};

describe("questionário da aula", () => {
  test("com 3 perguntas, 70% exige 3 acertos; com 4, bastam 3", () => {
    expect(texto(render(3))).toContain("Para passar: 3 de 3 acertos");
    expect(texto(render(3))).toContain("70% de 3 é 2,1");
    expect(texto(render(4))).toContain("Para passar: 3 de 4 acertos");
    expect(texto(render(4))).toContain("pode errar uma");
  });

  test("a aula sem pergunta mostra o vazio e o Criar questionário, sem a regra", () => {
    const html = render(0);
    expect(texto(html)).toContain("Esta aula ainda não tem questionário.");
    expect(texto(html)).toContain("Criar questionário");
    expect(texto(html)).not.toContain("Para passar");
  });

  test("a letra da certa é um rádio marcado, e a linha diz qual é", () => {
    const html = render(1);
    const letra = (n: number) =>
      html.match(
        new RegExp(
          `<input[^>]*id="${ID.alternativa(uuidDeExemplo(n) as AlternativaId)}-letra"[^>]*>`
        )
      )?.[0] ?? "";
    for (const trecho of [
      'type="radio"',
      `name="certa-${uuidDeExemplo(41)}"`,
    ]) {
      expect(letra(51)).toContain(trecho);
      expect(letra(61)).toContain(trecho);
    }
    expect(letra(51)).not.toContain("checked");
    expect(letra(61)).toContain('checked=""');
    expect(texto(html)).toContain("Certa: B · Certa");
    expect(texto(html)).toContain("2 de 5 alternativas");
  });

  test("o erro do grupo das letras aparece sob as alternativas e na lista", () => {
    const grupo = ID.pergunta(uuidDeExemplo(41) as PerguntaId, "alternativas");
    const html = render(2, new Map([[grupo, "Marque a alternativa certa."]]));
    expect(html).toContain(`id="${grupo}" role="radiogroup"`);
    expect(html).toContain(`aria-invalid="true" aria-labelledby`);
    expect(texto(html)).toContain("Marque a alternativa certa.");
    expect(texto(html)).toContain("1 campo para corrigir");
  });
});
