// A liberação de um curso para várias pessoas, na tela de Alunos: quem está
// marcado, o curso escolhido e o resultado por pessoa. Sem "use client": o
// reducer e as frases são puros, e o teste os chama sem React.

import type { PessoaComSituacao } from "@cursos/api/dominio/acompanhamento";
import {
  type LiberacaoNaPessoa,
  type ResultadoDoLote,
  TETO_DO_LOTE,
} from "@cursos/api/dominio/liberacao";
import type { CursoId, DiaISO, Pessoa } from "@cursos/api/dominio/tipos";

import { diaCurto, fmtNum, plural } from "@/lib/formato";

export interface CursoDoLote {
  id: CursoId;
  titulo: string;
}

export interface LinhaDoResultado {
  liberacao: LiberacaoNaPessoa;
  pessoa: Pessoa;
}

/**
 * A coluna mostra o formulário (as marcadas e o curso) ou o resultado da última
 * liberação. As marcadas valem nas duas: o admin marca a próxima leva enquanto lê
 * o resultado.
 */
export type FaseDoLote =
  | { curso: CursoDoLote | null; tipo: "marcando" }
  | {
      curso: CursoDoLote;
      hoje: DiaISO;
      linhas: readonly LinhaDoResultado[];
      tipo: "resultado";
    };

export interface EstadoDoLote {
  fase: FaseDoLote;
  /** Na ordem em que o admin marcou, de qualquer busca. */
  marcadas: readonly Pessoa[];
}

export type EventoDoLote =
  | { pessoa: Pessoa; tipo: "marcar" }
  | { tipo: "desmarcar"; userId: string }
  | { tipo: "desmarcar_todas" }
  | { curso: CursoDoLote; tipo: "escolher" }
  | {
      curso: CursoDoLote;
      enviadas: readonly Pessoa[];
      resultado: ResultadoDoLote;
      tipo: "liberou";
    }
  | { resultado: ResultadoDoLote; tipo: "repetiu" }
  | { tipo: "nova_liberacao" };

export const LOTE_VAZIO: EstadoDoLote = {
  fase: { curso: null, tipo: "marcando" },
  marcadas: [],
};

function doServidor(
  resultado: ResultadoDoLote,
  userId: string
): LiberacaoNaPessoa {
  const r = resultado.pessoas.find((p) => p.userId === userId);
  if (!r) {
    throw new Error(`O lote não respondeu por ${userId}.`);
  }
  return r;
}

export function lote(estado: EstadoDoLote, e: EventoDoLote): EstadoDoLote {
  switch (e.tipo) {
    case "marcar":
      return estado.marcadas.some((p) => p.userId === e.pessoa.userId)
        ? estado
        : { ...estado, marcadas: [...estado.marcadas, e.pessoa] };
    case "desmarcar":
      return {
        ...estado,
        marcadas: estado.marcadas.filter((p) => p.userId !== e.userId),
      };
    case "desmarcar_todas":
      return { ...estado, marcadas: [] };
    case "escolher":
      return estado.fase.tipo === "marcando"
        ? { ...estado, fase: { curso: e.curso, tipo: "marcando" } }
        : estado;
    case "liberou": {
      const enviadas = new Set(e.enviadas.map((p) => p.userId));
      return {
        fase: {
          curso: e.curso,
          hoje: e.resultado.hoje,
          linhas: e.enviadas.map((pessoa) => ({
            liberacao: doServidor(e.resultado, pessoa.userId),
            pessoa,
          })),
          tipo: "resultado",
        },
        marcadas: estado.marcadas.filter((p) => !enviadas.has(p.userId)),
      };
    }
    case "repetiu": {
      const { fase } = estado;
      if (fase.tipo !== "resultado") {
        return estado;
      }
      const respondidas = new Set(e.resultado.pessoas.map((p) => p.userId));
      return {
        ...estado,
        fase: {
          ...fase,
          hoje: e.resultado.hoje,
          linhas: fase.linhas.map((l) =>
            respondidas.has(l.pessoa.userId)
              ? { ...l, liberacao: doServidor(e.resultado, l.pessoa.userId) }
              : l
          ),
        },
      };
    }
    case "nova_liberacao":
      return { ...estado, fase: { curso: null, tipo: "marcando" } };
    default:
      return e satisfies never;
  }
}

/** Por que o Liberar está desligado, ou o curso e as pessoas que ele manda. */
export type ProntoParaLiberar =
  | { curso: CursoDoLote; pessoas: readonly Pessoa[]; tipo: "pronto" }
  | { tipo: "falta_marcar" }
  | { tipo: "falta_curso" }
  | { sobram: number; tipo: "passou_do_teto" };

export function prontoParaLiberar(estado: EstadoDoLote): ProntoParaLiberar {
  const { fase, marcadas } = estado;
  if (marcadas.length === 0) {
    return { tipo: "falta_marcar" };
  }
  if (fase.tipo !== "marcando" || fase.curso === null) {
    return { tipo: "falta_curso" };
  }
  if (marcadas.length > TETO_DO_LOTE) {
    return { sobram: marcadas.length - TETO_DO_LOTE, tipo: "passou_do_teto" };
  }
  return { curso: fase.curso, pessoas: marcadas, tipo: "pronto" };
}

export const rotuloDoLiberar = (marcadas: number) =>
  marcadas === 0
    ? "Liberar"
    : `Liberar para ${plural(marcadas, "pessoa", "pessoas")}`;

export const avisoDoTeto = (sobram: number) =>
  `Libere para até ${fmtNum(TETO_DO_LOTE)} pessoas por vez. Desmarque ${fmtNum(sobram)}.`;

const ORDEM: Record<LiberacaoNaPessoa["tipo"], number> = {
  ja_tinha: 2,
  liberada_agora: 1,
  nao_liberou: 0,
};

/** Quem não liberou primeiro, para o Tentar de novo ficar à vista; depois as liberadas e as que já tinham. */
export const emOrdemDoResultado = (linhas: readonly LinhaDoResultado[]) =>
  [...linhas].sort((a, b) => ORDEM[a.liberacao.tipo] - ORDEM[b.liberacao.tipo]);

/** "2 liberadas agora, 1 já tinha, 1 não liberou". */
export function resumoDoResultado(linhas: readonly LinhaDoResultado[]) {
  const conta = (tipo: LiberacaoNaPessoa["tipo"]) =>
    linhas.filter((l) => l.liberacao.tipo === tipo).length;
  const novas = conta("liberada_agora");
  const jaTinham = conta("ja_tinha");
  const falharam = conta("nao_liberou");
  return [
    novas
      ? `${fmtNum(novas)} ${novas === 1 ? "liberada agora" : "liberadas agora"}`
      : null,
    jaTinham
      ? `${fmtNum(jaTinham)} já ${jaTinham === 1 ? "tinha" : "tinham"}`
      : null,
    falharam
      ? `${fmtNum(falharam)} não ${falharam === 1 ? "liberou" : "liberaram"}`
      : null,
  ]
    .filter((parte) => parte !== null)
    .join(", ");
}

/** A linha de baixo de cada pessoa no resultado. */
export function detalheDoResultado(l: LinhaDoResultado, hoje: DiaISO): string {
  const { liberacao, pessoa } = l;
  switch (liberacao.tipo) {
    case "liberada_agora":
      return pessoa.email ?? pessoa.userId;
    case "ja_tinha": {
      const dia = diaCurto(liberacao.liberadaEm, hoje);
      return liberacao.origem === "troca"
        ? `Trocou por pontos em ${dia}`
        : `Liberada em ${dia}`;
    }
    case "nao_liberou":
      return liberacao.mensagem;
    default:
      return liberacao satisfies never;
  }
}

/** Com o curso escolhido, a linha de quem já o tem perde a caixa e diz como chegou. */
export function jaTem(
  pessoa: PessoaComSituacao,
  curso: CursoDoLote | null
): string | null {
  const ativa = curso
    ? pessoa.ativas.find((l) => l.cursoId === curso.id)
    : undefined;
  if (!(curso && ativa)) {
    return null;
  }
  return `Já tem ${curso.titulo}, ${ativa.origem === "troca" ? "por troca" : "liberado pelo admin"}`;
}
