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

function doServidor(resultado: ResultadoDoLote, userId: string) {
  const r = resultado.pessoas.find((p) => p.userId === userId);

  if (!r) {
    throw new Error(`O lote não respondeu por ${userId}.`);
  }

  return r;
}

export function lote(estado: EstadoDoLote, e: EventoDoLote) {
  switch (e.tipo) {
    case "marcar": {
      const estadoDoLote: EstadoDoLote = estado.marcadas.some(
        (p) => p.userId === e.pessoa.userId
      )
        ? estado
        : { ...estado, marcadas: [...estado.marcadas, e.pessoa] };

      return estadoDoLote;
    }

    case "desmarcar": {
      const estadoDoLote: EstadoDoLote = {
        ...estado,
        marcadas: estado.marcadas.filter((p) => p.userId !== e.userId),
      };

      return estadoDoLote;
    }

    case "desmarcar_todas": {
      const estadoDoLote: EstadoDoLote = { ...estado, marcadas: [] };

      return estadoDoLote;
    }

    case "escolher": {
      const estadoDoLote: EstadoDoLote =
        estado.fase.tipo === "marcando"
          ? { ...estado, fase: { curso: e.curso, tipo: "marcando" } }
          : estado;

      return estadoDoLote;
    }

    case "liberou": {
      const enviadas = new Set(e.enviadas.map((p) => p.userId));

      const estadoDoLote: EstadoDoLote = {
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

      return estadoDoLote;
    }

    case "repetiu": {
      const { fase } = estado;

      if (fase.tipo !== "resultado") {
        const estadoDoLote: EstadoDoLote = estado;

        return estadoDoLote;
      }

      const respondidas = new Set(e.resultado.pessoas.map((p) => p.userId));

      const estadoDoLote: EstadoDoLote = {
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

      return estadoDoLote;
    }

    case "nova_liberacao": {
      const estadoDoLote: EstadoDoLote = {
        ...estado,
        fase: { curso: null, tipo: "marcando" },
      };

      return estadoDoLote;
    }

    default: {
      const estadoDoLote: EstadoDoLote = e satisfies never;

      return estadoDoLote;
    }
  }
}

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

export const emOrdemDoResultado = (linhas: readonly LinhaDoResultado[]) =>
  [...linhas].sort((a, b) => ORDEM[a.liberacao.tipo] - ORDEM[b.liberacao.tipo]);

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

export function detalheDoResultado(l: LinhaDoResultado, hoje: DiaISO) {
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

export function jaTem(pessoa: PessoaComSituacao, curso: CursoDoLote | null) {
  // O curso aberto ao perfil ainda se libera à pessoa: a liberação dela fica se o perfil mudar.
  const ativa = curso
    ? pessoa.ativas.find((l) => l.cursoId === curso.id && l.origem !== "perfil")
    : undefined;

  if (!(curso && ativa)) {
    return null;
  }

  return `Já tem ${curso.titulo}, ${ativa.origem === "troca" ? "por troca" : "liberado pelo admin"}`;
}
