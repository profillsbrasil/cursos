import { describe, expect, test } from "bun:test";
import type { ModuloDaPagina } from "@cursos/api/dominio/pagina-do-curso";
import type { Route } from "next";

import {
  AUTO_1,
  BLOQUEIO,
  CRONOGRAMA,
  comercial,
  fabrica,
  HOJE,
  RISCOS,
} from "./exemplo-de-teste";
import {
  abertosDeSaida,
  cartaoDoCurso,
  linhasDoModulo,
  marcaDoModulo,
  paragrafos,
  parouEm,
  progressoDoCartao,
  resumoDoCurso,
  seloDoQuestionario,
  tempoDaPosicao,
} from "./textos";

const rota = (caminho: string) => caminho as Route;

describe("o cartão preso", () => {
  test("antes da primeira aula, sem níveis: começa pela aula 1 e diz que o curso não tem níveis", () => {
    expect(cartaoDoCurso(fabrica.naoIniciado, HOJE)).toEqual({
      botao: {
        href: rota(`/cursos/fabrica-e-montagem/aulas/${RISCOS}`),
        icone: "play",
        texto: "Começar curso",
        variante: "principal",
      },
      inclui: [
        { icone: "relogio", texto: "11 min na primeira aula" },
        { icone: "niveis", texto: "3 módulos, sem níveis" },
        { icone: "certificado", texto: "Certificado no fim do curso" },
      ],
      situacao: {
        rotulo: "Comece por: Módulo 1, Segurança do posto",
        titulo: "Aula 1 · Riscos do posto de montagem",
        ultimaTentativa: null,
      },
    });
  });

  test("antes da primeira aula, com níveis: o próximo nível é o primeiro", () => {
    const c = cartaoDoCurso(comercial.naoIniciado, HOJE);
    expect(c.situacao.rotulo).toBe(
      "Comece por: Módulo 0, Autoavaliação comercial"
    );
    expect(c.inclui.map((l) => l.texto)).toEqual([
      "10 min na primeira aula",
      "Próximo nível: Vendedor Profills Certificado",
      "Certificado no fim do curso",
    ]);
  });

  test("em andamento, com posição: continua no segundo em que a pessoa parou", () => {
    expect(cartaoDoCurso(fabrica.emAndamento, HOJE)).toEqual({
      botao: {
        href: rota(`/cursos/fabrica-e-montagem/aulas/${BLOQUEIO}`),
        icone: "play",
        texto: "Continuar em 3:42",
        variante: "principal",
      },
      inclui: [
        { icone: "relogio", texto: "Faltam 6 min desta aula" },
        { icone: "niveis", texto: "3 módulos, sem níveis" },
        { icone: "certificado", texto: "Certificado no fim do curso" },
      ],
      situacao: {
        rotulo: "Agora: Módulo 1, Segurança do posto",
        titulo: "Aula 2 · Bloqueio antes de mexer",
        ultimaTentativa: null,
      },
    });
  });

  test("em andamento, sem posição: o botão só diz Continuar, e falta a aula inteira", () => {
    const c = cartaoDoCurso(comercial.emAndamento, HOJE);
    expect([c.botao.texto, c.botao.href]).toEqual([
      "Continuar",
      `/cursos/comercial/aulas/${CRONOGRAMA}`,
    ]);
    expect(c.inclui.map((l) => l.texto)).toEqual([
      "Faltam 11 min desta aula",
      "Próximo nível: Consultor Comercial Profills",
      "Certificado no fim do curso",
    ]);
  });

  test("com as aulas assistidas e questionário por aprovar: o reprovado primeiro, com a nota e Tentar de novo", () => {
    expect(cartaoDoCurso(fabrica.questionarios, HOJE)).toEqual({
      botao: {
        href: rota(`/cursos/fabrica-e-montagem/aulas/${BLOQUEIO}#questionario`),
        icone: "questionario",
        texto: "Tentar de novo",
        variante: "principal",
      },
      inclui: [
        { icone: "check", texto: "4 de 4 aulas assistidas" },
        { icone: "questionario", texto: "Faltam 2 questionários, um por aula" },
        { icone: "certificado", texto: "Certificado quando todos passarem" },
      ],
      situacao: {
        rotulo: "Próximo questionário",
        titulo: "Módulo 1, aula 2 · Bloqueio antes de mexer",
        ultimaTentativa: "2 de 3 na última tentativa",
      },
    });
    expect(progressoDoCartao(fabrica.questionarios)).toEqual({
      linha: "1 de 3 questionários aprovados",
      progresso: { feitas: 1, pct: 33, total: 3 },
    });
  });

  test("com um questionário por fazer: sem última tentativa, Fazer o questionário e Falta 1", () => {
    const c = cartaoDoCurso(comercial.questionarios, HOJE);
    expect([c.botao.texto, c.situacao.ultimaTentativa]).toEqual([
      "Fazer o questionário",
      null,
    ]);
    expect(c.inclui.map((l) => l.texto)).toEqual([
      "7 de 7 aulas assistidas",
      "Falta 1 questionário",
      "Certificado quando todos passarem",
    ]);
    expect(progressoDoCartao(comercial.emAndamento)).toEqual({
      linha: "4 de 7 aulas assistidas",
      progresso: { feitas: 4, pct: 57, total: 7 },
    });
  });

  test("concluído: a data do certificado no dia de São Paulo, com o ano fora do ano de hoje", () => {
    expect(cartaoDoCurso(comercial.concluido, HOJE)).toEqual({
      botao: {
        href: rota(`/cursos/comercial/aulas/${AUTO_1}`),
        icone: "rever",
        texto: "Rever o curso",
        variante: "principal",
      },
      inclui: [
        {
          href: rota("/cursos/comercial/certificado"),
          icone: "certificado",
          texto: "Código do certificado: CERT-COM-7",
        },
      ],
      situacao: {
        rotulo: "Curso concluído",
        titulo: "Certificado emitido em 28 de dez. de 2025",
        ultimaTentativa: null,
      },
    });
    expect(cartaoDoCurso(fabrica.concluido, HOJE).situacao.titulo).toBe(
      "Certificado emitido em 8 de out."
    );
  });
});

describe("os textos da página", () => {
  test("o resumo conta módulos, aulas e duração, e os níveis só quando há", () => {
    expect(resumoDoCurso(fabrica.naoIniciado)).toEqual([
      "3 módulos",
      "4 aulas",
      "42 min",
    ]);
    expect(resumoDoCurso(comercial.naoIniciado)).toEqual([
      "4 módulos",
      "7 aulas",
      "1 h 13 min",
      "2 níveis",
    ]);
  });

  test("a descrição se divide em parágrafos, sem linha vazia", () => {
    expect(paragrafos("Um.\n\n  Dois.\nTrês.\n")).toEqual([
      "Um.",
      "Dois.",
      "Três.",
    ]);
    expect(paragrafos("")).toEqual([]);
  });

  test("o tempo da posição: m:ss, e h:mm:ss depois de uma hora", () => {
    expect([
      tempoDaPosicao(222),
      tempoDaPosicao(59),
      tempoDaPosicao(3725),
    ]).toEqual(["3:42", "0:59", "1:02:05"]);
  });

  test("'Você parou em' só com posição acima de 0", () => {
    expect(parouEm(fabrica.emAndamento)).toBe("Você parou em 3:42");
    expect(parouEm(comercial.emAndamento)).toBeNull();
    expect(parouEm(fabrica.naoIniciado)).toBeNull();
  });

  test("o módulo mostra o nível ou o tamanho, e a contagem de aulas depois de começar", () => {
    const [m1] = fabrica.emAndamento.modulos;
    const [, , urgencia] = comercial.emAndamento.modulos;
    expect(m1 && linhasDoModulo(m1, true)).toEqual({
      direita: "1 de 2 · 21 min",
      questionarios: null,
      sob: "2 aulas · 21 min",
    });
    expect(m1 && linhasDoModulo(m1, false)).toEqual({
      direita: null,
      questionarios: null,
      sob: "2 aulas · 21 min",
    });
    expect(urgencia && linhasDoModulo(urgencia, false)).toEqual({
      direita: "3 aulas · 30 min",
      questionarios: null,
      sob: "Nível 2 · Consultor Comercial Profills",
    });
  });

  test("com as aulas do módulo assistidas e questionário por aprovar, a marca é questionario e a linha conta os pendentes", () => {
    const [seguranca, envasadora, pneumatica] = fabrica.questionarios.modulos;
    if (!(seguranca && envasadora && pneumatica)) {
      throw new Error("o exemplo tem três módulos");
    }
    expect(marcaDoModulo(seguranca, null)).toBe("questionario");
    expect(linhasDoModulo(seguranca, true).questionarios).toBe(
      "1 questionário"
    );
    expect(marcaDoModulo(pneumatica, null)).toBe("feito");
    expect(linhasDoModulo(pneumatica, true).questionarios).toBeNull();
    expect(seguranca.aulas.map(seloDoQuestionario)).toEqual([
      null,
      {
        texto: "Questionário: 2 de 3 na última tentativa",
        tipo: "reprovado",
      },
    ]);
    expect(envasadora.aulas.map(seloDoQuestionario)).toEqual([
      { texto: "Falta o questionário", tipo: "a_fazer" },
    ]);
    const [primeiro] = comercial.emAndamento.modulos;
    expect(primeiro?.aulas.map(seloDoQuestionario)).toEqual([null, null]);
  });
});

describe("os módulos abertos de saída", () => {
  test("no curso de até 3 módulos, todos", () => {
    expect(abertosDeSaida(fabrica.questionarios)).toEqual([1, 2, 3]);
  });

  test("com mais de 3, o da aula para onde o botão leva", () => {
    expect(abertosDeSaida(comercial.emAndamento)).toEqual([2]);
    expect(abertosDeSaida(comercial.naoIniciado)).toEqual([0]);
  });

  test("com mais de 3 e questionário por aprovar, os módulos que o devem; no concluído, nenhum", () => {
    expect(abertosDeSaida(comercial.questionarios)).toEqual([2]);
    expect(abertosDeSaida(comercial.concluido)).toEqual([]);
  });
});

describe("o módulo ainda sem aula", () => {
  const vazio: ModuloDaPagina = {
    aulas: [],
    nivel: null,
    numero: 0,
    titulo: "Boas-vindas",
  };

  test("na frente do curso, o concluído ainda leva à primeira aula que existe", () => {
    const p = {
      ...fabrica.concluido,
      modulos: [vazio, ...fabrica.concluido.modulos],
    };
    expect(cartaoDoCurso(p, HOJE).botao.href).toBe(
      rota(`/cursos/fabrica-e-montagem/aulas/${RISCOS}`)
    );
  });

  test("não aparece como concluído e diz que não tem aula", () => {
    expect(marcaDoModulo(vazio, null)).toBe("pendente");
    expect(linhasDoModulo(vazio, false)).toEqual({
      direita: null,
      questionarios: null,
      sob: "Nenhuma aula ainda",
    });
    expect(linhasDoModulo(vazio, true)).toEqual({
      direita: null,
      questionarios: null,
      sob: "Nenhuma aula ainda",
    });
  });
});
