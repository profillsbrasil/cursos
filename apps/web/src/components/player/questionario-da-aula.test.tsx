import { describe, expect, mock, test } from "bun:test";
import type { QuestionarioDaAula as Questionario } from "@cursos/api/dominio/questionario";
import type { AulaId } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import {
  APROVADO_NA_PRIMEIRA,
  APROVADO_NA_SEGUNDA_COM_ERRO,
  BLOQUEIO,
  CRONOGRAMA,
  REPROVADO_NA_PRIMEIRA,
} from "./exemplo-do-questionario";
import {
  ENVIO_FALHOU,
  erradasDe,
  fraseDoResultado,
  textoDoEnvio,
} from "./textos-do-questionario";

// Fora do App Router o useRouter não tem de onde ler; o resto do módulo fica o de verdade.
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({ refresh: () => undefined }),
}));

const { QuestionarioDaAula } = await import("./questionario-da-aula");

const AULA = "00000000-0000-4000-8000-00000000aaaa" as AulaId;
const PROXIMA = {
  id: "00000000-0000-4000-8000-00000000bbbb" as AulaId,
  titulo: "Responsabilidades do cliente",
};

const render = (
  questionario: Questionario,
  o: { proxima?: typeof PROXIMA | null; temVideo?: boolean } = {}
) =>
  renderToStaticMarkup(
    <QuestionarioDaAula
      aulaId={AULA}
      proxima={o.proxima === undefined ? PROXIMA : o.proxima}
      questionario={questionario}
      slug="comercial"
      temVideo={o.temVideo ?? true}
    />
  );

const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STATUS = /<div[^>]*role="status".*?<\/div>/;
const topo = (html: string) => texto(html.match(STATUS)?.[0] ?? "");

describe("respondendo", () => {
  const html = render(CRONOGRAMA);

  test("o cabeçalho diz quantas perguntas e a regra, e o envio espera as três", () => {
    expect(texto(html)).toContain(
      "Questionário 3 perguntas · Para passar, 3 de 3"
    );
    expect(texto(html)).toContain(
      "Faltam 3 perguntas. 5 pts por acerto na primeira tentativa."
    );
    expect(html).toContain('aria-disabled="true"');
    expect(texto(html)).toContain("Enviar respostas");
  });

  test("cada alternativa é um rádio num rótulo com a letra, agrupado pela pergunta", () => {
    expect(html.match(/type="radio"/g)).toHaveLength(10);
    expect(html.match(/name="pergunta-/g)).toHaveLength(10);
    expect(texto(html)).toContain(
      "1. Por onde o cronograma reverso começa? A Pela data do pedido B Pela data em que a linha do cliente precisa rodar"
    );
    expect(html).not.toContain("Sua resposta");
    expect(html).not.toContain("A certa");
  });

  test("a seção tem a âncora do questionário e nenhum resultado", () => {
    expect(html).toContain('id="questionario"');
    expect(html).not.toContain('role="status"');
  });
});

describe("não aprovado na primeira", () => {
  const html = render({ ...BLOQUEIO, ultima: REPROVADO_NA_PRIMEIRA });

  test("o topo diz a nota, as perguntas erradas, a regra e os pontos da primeira, com Tentar de novo e Rever o vídeo", () => {
    expect(topo(html)).toBe(
      "Ainda não: 2 de 4 (50%) +10 pts Você errou as perguntas 2 e 3. Para passar, 3 de 4. Você ganhou +10 pts pelos acertos desta primeira tentativa; as próximas não valem pontos. Tentar de novo Rever o vídeo"
    );
    expect(html).toContain('href="#video"');
  });

  test("cada pergunta diz se acertou, a marcada leva Sua resposta e a certa não aparece", () => {
    const t = texto(html);
    expect(t).toContain(
      "1. Antes de abrir o painel elétrico da envasadora, o que vem primeiro? Certa"
    );
    expect(t).toContain(
      "2. Quem retira o cadeado de bloqueio? Você errou esta"
    );
    expect(t).toContain("Qualquer pessoa do turno Sua resposta");
    expect(html).not.toContain("A certa");
    expect(html.match(/Sua resposta/g)).toHaveLength(4);
    expect(html).not.toContain('type="radio"');
  });

  test("sem vídeo na aula, não há Rever o vídeo", () => {
    const semVideo = render(
      { ...BLOQUEIO, ultima: REPROVADO_NA_PRIMEIRA },
      { temVideo: false }
    );
    expect(semVideo).not.toContain("Rever o vídeo");
    expect(texto(semVideo)).toContain("Tentar de novo");
  });
});

describe("aprovado", () => {
  test("na primeira: os pontos, o questionário feito e a Próxima aula", () => {
    const html = render({ ...CRONOGRAMA, ultima: APROVADO_NA_PRIMEIRA });
    expect(topo(html)).toBe(
      "Aprovado: 3 de 3 (100%) +15 pts +15 pts, 5 por acerto. O questionário desta aula está feito. Próxima aula"
    );
    expect(html).toContain(`href="/cursos/comercial/aulas/${PROXIMA.id}"`);
  });

  test("na segunda: sem pontos agora, os da primeira na frase, e a certa aparece onde a pessoa errou", () => {
    const html = render({ ...BLOQUEIO, ultima: APROVADO_NA_SEGUNDA_COM_ERRO });
    expect(topo(html)).toBe(
      "Aprovado na 2ª tentativa: 3 de 4 (75%) +0 pts Esta tentativa não vale pontos: eles contam só na primeira, em que você ganhou +10 pts. Próxima aula"
    );
    expect(texto(html)).toContain("Quem colocou o cadeado Sua resposta");
    expect(texto(html)).toContain("O supervisor da linha A certa");
    expect(html.match(/A certa/g)).toHaveLength(1);
  });

  test("na última aula do curso, o botão leva à página do curso", () => {
    const html = render(
      { ...CRONOGRAMA, ultima: APROVADO_NA_PRIMEIRA },
      { proxima: null }
    );
    expect(texto(html)).toContain("Ver o curso");
    expect(html).toContain('href="/cursos/comercial"');
  });
});

describe("os textos", () => {
  test("as perguntas erradas, no singular e no plural", () => {
    expect(erradasDe(REPROVADO_NA_PRIMEIRA)).toBe("as perguntas 2 e 3");
    expect(erradasDe(APROVADO_NA_SEGUNDA_COM_ERRO)).toBe("a pergunta 2");
    expect(erradasDe(APROVADO_NA_PRIMEIRA)).toBeNull();
    expect(
      erradasDe({
        ...REPROVADO_NA_PRIMEIRA,
        respostas: REPROVADO_NA_PRIMEIRA.respostas.map((r) => ({
          ...r,
          certa: false,
        })),
      })
    ).toBe("as perguntas 1, 2, 3 e 4");
  });

  test("reprovado de novo: sem pontos na frase, e tente quantas vezes quiser", () => {
    expect(
      fraseDoResultado(
        { ...REPROVADO_NA_PRIMEIRA, pontos: 0, tentativa: 2 },
        false
      )
    ).toEqual({
      texto:
        "Você errou as perguntas 2 e 3. Para passar, 3 de 4. Tente de novo quantas vezes quiser.",
      titulo: "Ainda não: 2 de 4 (50%)",
    });
  });

  test("o questionário que concluiu o curso diz isso na frase", () => {
    expect(fraseDoResultado(APROVADO_NA_PRIMEIRA, true).texto).toBe(
      "+15 pts, 5 por acerto. O questionário desta aula está feito. Você concluiu o curso: o certificado já está na página dele."
    );
  });

  test("a ajuda do envio conta o que falta, e o envio que falhou tem a frase do protótipo", () => {
    expect(textoDoEnvio(0, 3)).toBe(
      "Faltam 3 perguntas. 5 pts por acerto na primeira tentativa."
    );
    expect(textoDoEnvio(2, 3)).toBe(
      "Falta 1 pergunta. 5 pts por acerto na primeira tentativa."
    );
    expect(textoDoEnvio(3, 3)).toBe(
      "3 perguntas respondidas. 5 pts por acerto na primeira tentativa."
    );
    expect(ENVIO_FALHOU).toBe(
      "Não deu para enviar. Suas respostas continuam marcadas; tente de novo."
    );
  });
});
