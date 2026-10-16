import type { ResultadoDoQuestionario } from "@cursos/api/dominio/questionario";

import { fmtPts, plural } from "@/lib/formato";

export const pctDe = (acertos: number, total: number) =>
  Math.round((acertos * 100) / total);

const nota = (r: ResultadoDoQuestionario) =>
  `${r.acertos} de ${r.total} (${pctDe(r.acertos, r.total)}%)`;

export const PREFIXO_DA_REGRA = "Para passar, ";

export const regraDaNota = (paraPassar: number, total: number) =>
  `${PREFIXO_DA_REGRA}${paraPassar} de ${total}`;

/** "+10 pts" em Sol; "+0 pts" apagado. */
export const ganhoDe = (pontos: number) => `+${fmtPts(pontos)}`;

/** Os números, a partir de 1, das perguntas erradas: "a pergunta 2", "as perguntas 2 e 3". */
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

/**
 * O topo do cartão depois do envio. Na reprovação, a linha das perguntas erradas
 * vem primeiro, e a certa de cada uma fica escondida.
 */
export function fraseDoResultado(
  r: ResultadoDoQuestionario,
  concluiuOCurso: boolean
): FraseDoResultado {
  const concluiu = concluiuOCurso
    ? " Você concluiu o curso: o certificado já está na página dele."
    : "";
  if (r.aprovada && r.tentativa === 1) {
    return {
      texto: `${ganhoDe(r.pontos)}, 5 por acerto. O questionário desta aula está feito.${concluiu}`,
      titulo: `Aprovado: ${nota(r)}`,
    };
  }
  if (r.aprovada) {
    return {
      texto: `Esta tentativa não vale pontos: eles contam só na primeira, em que você ganhou ${ganhoDe(r.pontosDaPrimeira)}.${concluiu}`,
      titulo: `Aprovado na ${r.tentativa}ª tentativa: ${nota(r)}`,
    };
  }
  const erradas = erradasDe(r);
  const errou = erradas ? `Você errou ${erradas}. ` : "";
  const regra = regraDaNota(r.paraPassar, r.total);
  return {
    texto:
      r.tentativa === 1
        ? `${errou}${regra}. Você ganhou ${ganhoDe(r.pontos)} pelos acertos desta primeira tentativa; as próximas não valem pontos.`
        : `${errou}${regra}. Tente de novo quantas vezes quiser.`,
    titulo: `Ainda não: ${nota(r)}`,
  };
}

export const ENVIO_FALHOU =
  "Não deu para enviar. Suas respostas continuam marcadas; tente de novo.";

/** A ajuda ao lado do botão de enviar. */
export function textoDoEnvio(respondidas: number, total: number): string {
  const faltam = total - respondidas;
  const conta =
    faltam === 0
      ? `${plural(total, "pergunta respondida", "perguntas respondidas")}.`
      : `${faltam === 1 ? "Falta" : "Faltam"} ${plural(faltam, "pergunta", "perguntas")}.`;
  return `${conta} 5 pts por acerto na primeira tentativa.`;
}
