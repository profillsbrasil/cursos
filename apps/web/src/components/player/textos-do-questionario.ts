import type { ResultadoDoQuestionario } from "@cursos/api/dominio/questionario";
import { PONTOS } from "@cursos/api/dominio/regras";

import { fmtPts, plural } from "@/lib/formato";

const POR_ACERTO = `${PONTOS.questionario} por acerto`;
const SO_NA_PRIMEIRA = "O questionário pontua só na primeira tentativa";
const PTS_POR_ACERTO = `${PONTOS.questionario} pts por acerto na primeira tentativa.`;

export const pctDe = (acertos: number, total: number) =>
  Math.round((acertos * 100) / total);

const nota = (r: ResultadoDoQuestionario) =>
  `${r.acertos} de ${r.total} (${pctDe(r.acertos, r.total)}%)`;

export const PREFIXO_DA_REGRA = "Para passar, ";

export const regraDaNota = (paraPassar: number, total: number) =>
  `${PREFIXO_DA_REGRA}${paraPassar} de ${total}`;

export const ganhoDe = (pontos: number) => `+${fmtPts(pontos)}`;

/** "a pergunta 2", "as perguntas 2 e 3", na ordem das perguntas. */
export function erradasDe(r: ResultadoDoQuestionario): string | null {
  const numeros = r.respostas.flatMap((x, i) => (x.certa ? [] : [i + 1]));
  if (numeros.length === 0) {
    return null;
  }
  if (numeros.length === 1) {
    return `a pergunta ${numeros[0]}`;
  }
  const ultimo = numeros.at(-1);
  return `as perguntas ${numeros.slice(0, -1).join(", ")} e ${ultimo}`;
}

export interface FraseDoResultado {
  texto: string;
  titulo: string;
}

/** O topo do cartão depois do envio. Na reprovação, as perguntas erradas vêm primeiro. */
export function fraseDoResultado(r: ResultadoDoQuestionario): FraseDoResultado {
  if (r.aprovada && r.tentativa === 1) {
    return {
      texto: `${ganhoDe(r.pontos)}, ${POR_ACERTO}. O questionário desta aula está feito.`,
      titulo: `Aprovado: ${nota(r)}`,
    };
  }
  if (r.aprovada) {
    return {
      texto: `Esta tentativa não vale pontos: eles contam só na primeira, em que você ganhou ${ganhoDe(r.pontosDaPrimeira)}.`,
      titulo: `Aprovado na ${r.tentativa}ª tentativa: ${nota(r)}`,
    };
  }
  const erradas = erradasDe(r);
  const errou = erradas ? `Você errou ${erradas}. ` : "";
  const regra = regraDaNota(r.paraPassar, r.total);
  // A regra fala do questionário: a aula assistida e a sequência pontuam à parte.
  const pontos =
    r.pontos > 0
      ? `${SO_NA_PRIMEIRA}: você ganhou ${ganhoDe(r.pontos)} pelos acertos dela.`
      : `${SO_NA_PRIMEIRA}.`;
  return {
    texto:
      r.tentativa === 1
        ? `${errou}${regra}. ${pontos}`
        : `${errou}${regra}. Tente de novo quantas vezes quiser.`,
    titulo: `Ainda não: ${nota(r)}`,
  };
}

export const ENVIO_FALHOU =
  "Não deu para enviar. Suas respostas continuam marcadas; tente de novo.";

export function textoDoEnvio(respondidas: number, total: number): string {
  const faltam = total - respondidas;
  const conta =
    faltam === 0
      ? `${plural(total, "pergunta respondida", "perguntas respondidas")}.`
      : `${faltam === 1 ? "Falta" : "Faltam"} ${plural(faltam, "pergunta", "perguntas")}.`;
  return `${conta} ${PTS_POR_ACERTO}`;
}
