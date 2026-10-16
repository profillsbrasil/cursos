import { PONTOS } from "./regras";
import type { AlternativaId, EstudoDoQuestionario, PerguntaId } from "./tipos";

export const ALTERNATIVAS = { max: 5, min: 2 } as const;

export const LETRAS = ["A", "B", "C", "D", "E"] as const;

export const letraDa = (indice: number) => LETRAS[indice] ?? String(indice + 1);

/** Em por cento, para a conta ficar em inteiros: 3 × 70 / 100 é 2,1 exato. */
export const NOTA_MINIMA = 70;

export const acertosParaPassar = (perguntas: number) =>
  Math.ceil((perguntas * NOTA_MINIMA) / 100);

// ---------- o questionário como o aluno o vê e o servidor o corrige ----------

export interface AlternativaDaAula {
  id: AlternativaId;
  texto: string;
}

/** A pergunta sem a certa: o que vai ao browser antes da aprovação. */
export interface PerguntaDaAula {
  alternativas: readonly AlternativaDaAula[];
  enunciado: string;
  id: PerguntaId;
}

/** A pergunta com a certa. Só o servidor monta uma. */
export interface PerguntaComGabarito extends PerguntaDaAula {
  certa: AlternativaId;
}

export interface RespostaEnviada {
  alternativaId: AlternativaId;
  perguntaId: PerguntaId;
}

export interface RespostaCorrigida extends RespostaEnviada {
  certa: boolean;
  /** A alternativa certa, só depois da aprovação; antes, null. */
  certaId: AlternativaId | null;
}

export type Correcao =
  | { tipo: "incompleta"; faltam: number }
  | {
      tipo: "corrigida";
      acertos: number;
      aprovada: boolean;
      respostas: readonly Omit<RespostaCorrigida, "certaId">[];
      total: number;
    };

/**
 * Corrige um envio contra o gabarito. Cada pergunta precisa de uma resposta com
 * uma alternativa dela; resposta a mais, repetida ou de outra pergunta não
 * conta. A aprovação é `acertosParaPassar`.
 */
export function corrigir(
  perguntas: readonly PerguntaComGabarito[],
  respostas: readonly RespostaEnviada[]
): Correcao {
  const marcadas = new Map(
    respostas.map((r) => [r.perguntaId, r.alternativaId])
  );
  const corrigidas: Omit<RespostaCorrigida, "certaId">[] = [];
  for (const p of perguntas) {
    const alternativaId = marcadas.get(p.id);
    if (
      alternativaId !== undefined &&
      p.alternativas.some((a) => a.id === alternativaId)
    ) {
      corrigidas.push({
        alternativaId,
        certa: alternativaId === p.certa,
        perguntaId: p.id,
      });
    }
  }
  const faltam = perguntas.length - corrigidas.length;
  if (faltam > 0) {
    return { faltam, tipo: "incompleta" };
  }
  const acertos = corrigidas.filter((r) => r.certa).length;
  const total = perguntas.length;
  return {
    acertos,
    aprovada: acertos >= acertosParaPassar(total),
    respostas: corrigidas,
    tipo: "corrigida",
    total,
  };
}

/** Só a primeira tentativa vale pontos, aprovada ou não. */
export const pontosDaTentativa = (numero: number, acertos: number): number =>
  numero === 1 ? acertos * PONTOS.questionario : 0;

export interface ResultadoDoQuestionario {
  acertos: number;
  aprovada: boolean;
  paraPassar: number;
  /** Os pontos desta tentativa: 0 fora da primeira. */
  pontos: number;
  pontosDaPrimeira: number;
  respostas: readonly RespostaCorrigida[];
  /** 1 na primeira tentativa. */
  tentativa: number;
  total: number;
}

export interface QuestionarioDaAula {
  paraPassar: number;
  perguntas: readonly PerguntaDaAula[];
  /** A última tentativa da pessoa, ou null antes da primeira. */
  ultima: ResultadoDoQuestionario | null;
}

/** Uma tentativa como fica gravada. */
export interface TentativaGravada {
  acertos: number;
  aprovada: boolean;
  numero: number;
  respostas: readonly {
    alternativaId: string;
    certa: boolean;
    perguntaId: string;
  }[];
  total: number;
}

const semGabarito = (p: PerguntaComGabarito): PerguntaDaAula => ({
  alternativas: p.alternativas,
  enunciado: p.enunciado,
  id: p.id,
});

/**
 * O resultado de uma tentativa gravada, com a certa de cada pergunta só se a
 * tentativa aprovou. As respostas saem na ordem das perguntas, e a pergunta que
 * o admin apagou depois fica de fora. A primeira tentativa diz os pontos que a
 * pessoa ganhou.
 */
export function resultadoDaTentativa(
  perguntas: readonly PerguntaComGabarito[],
  tentativa: TentativaGravada,
  primeira: Pick<TentativaGravada, "acertos">
): ResultadoDoQuestionario {
  const respostaDe = new Map(
    tentativa.respostas.map((r) => [r.perguntaId, r])
  );
  return {
    acertos: tentativa.acertos,
    aprovada: tentativa.aprovada,
    paraPassar: acertosParaPassar(tentativa.total),
    pontos: pontosDaTentativa(tentativa.numero, tentativa.acertos),
    pontosDaPrimeira: pontosDaTentativa(1, primeira.acertos),
    respostas: perguntas.flatMap((p) => {
      const r = respostaDe.get(p.id);
      return r
        ? [
            {
              alternativaId: r.alternativaId as AlternativaId,
              certa: r.certa,
              certaId: tentativa.aprovada ? p.certa : null,
              perguntaId: p.id,
            },
          ]
        : [];
    }),
    tentativa: tentativa.numero,
    total: tentativa.total,
  };
}

/** null na aula sem pergunta. `tentativas` em ordem de número. */
export function montarQuestionarioDaAula(
  perguntas: readonly PerguntaComGabarito[],
  tentativas: readonly TentativaGravada[]
): QuestionarioDaAula | null {
  if (perguntas.length === 0) {
    return null;
  }
  const [primeira] = tentativas;
  const ultima = tentativas.at(-1);
  return {
    paraPassar: acertosParaPassar(perguntas.length),
    perguntas: perguntas.map(semGabarito),
    ultima:
      primeira && ultima
        ? resultadoDaTentativa(perguntas, ultima, primeira)
        : null,
  };
}

/** O que a lista de aulas (coluna do player, página do curso) diz do questionário. */
export type MarcaDoQuestionario =
  | { tipo: "sem" }
  | { tipo: "a_fazer" }
  | { tipo: "reprovado"; ultima: { acertos: number; total: number } }
  | { tipo: "aprovado" };

export function marcaDoQuestionario(
  perguntas: number,
  estudo: EstudoDoQuestionario | undefined
): MarcaDoQuestionario {
  if (perguntas === 0) {
    return { tipo: "sem" };
  }
  if (!estudo) {
    return { tipo: "a_fazer" };
  }
  return estudo.aprovada
    ? { tipo: "aprovado" }
    : { tipo: "reprovado", ultima: estudo.ultima };
}
