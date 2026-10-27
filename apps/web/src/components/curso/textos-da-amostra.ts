// As frases da amostra, que o cartão de Meus cursos, a coluna de troca da página
// do curso e o fim do vídeo do player dividem. Puro, sem React.

import { faltam, fmtHoras, fmtPts, plural } from "@/lib/formato";

/** O que a troca da amostra mostra, pelo preço do curso e pelo saldo da pessoa. */
export type TrocaDaAmostra =
  | { tipo: "sem_preco"; frase: string }
  | { tipo: "pode_trocar"; botao: string; preco: number; saldo: string }
  /** Sem saldo: o botão diz quanto falta, e `saldo` é a razão do botão desligado. */
  | { tipo: "faltam"; botao: string; preco: number; saldo: string };

export const SEM_PRECO = "Este curso ainda não tem preço de troca.";

export function trocaDaAmostra({
  preco,
  saldo,
}: {
  preco: number | null;
  saldo: number;
}): TrocaDaAmostra {
  if (preco === null) {
    return { frase: SEM_PRECO, tipo: "sem_preco" };
  }
  const falta = preco - saldo;
  if (falta > 0) {
    return {
      botao: `${faltam(falta)} ${fmtPts(falta)}`,
      preco,
      saldo: `Seu saldo: ${fmtPts(saldo)}. ${faltam(falta)} ${fmtPts(falta)} para trocar.`,
      tipo: "faltam",
    };
  }
  return {
    botao: `Trocar por ${fmtPts(preco)}`,
    preco,
    saldo: `Seu saldo: ${fmtPts(saldo)}. Depois da troca: ${fmtPts(saldo - preco)}.`,
    tipo: "pode_trocar",
  };
}

/** A linha do cartão de Meus cursos: o tamanho e a amostra, ou que ela já foi vista. */
export function linhaDaAmostra(c: {
  aulas: number;
  duracaoSeg: number;
  vista: boolean;
}): string {
  return c.vista
    ? "Amostra vista"
    : `${plural(c.aulas, "aula", "aulas")} · ${fmtHoras(c.duracaoSeg)} · a primeira é aberta`;
}

/** O convite do fim do vídeo da aula de amostra, no lugar do "A seguir". */
export function conviteDaAmostra({
  preco,
  proxima,
  saldo,
}: {
  preco: number | null;
  proxima: { titulo: string } | null;
  saldo: number;
}): { detalhe: string; titulo: string } {
  return {
    detalhe:
      preco === null
        ? SEM_PRECO
        : `Troque o curso por ${fmtPts(preco)} e siga daqui. Seu saldo: ${fmtPts(saldo)}.`,
    titulo: proxima
      ? `Gostou? A próxima aula é "${proxima.titulo}".`
      : "Gostou? Troque o curso para seguir.",
  };
}

export const TROCOU = "Curso trocado. Ele é seu para sempre.";

export const ERRO_DA_TROCA =
  "Não deu para confirmar a troca. Confira seu saldo e o extrato antes de tentar de novo.";
