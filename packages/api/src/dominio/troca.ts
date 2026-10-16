import {
  comoGanhar,
  type ItemDoExtrato,
  itemDoExtrato,
  type LinhaDoExtrato,
  type RegraDeGanho,
} from "./pontos";
import {
  type Capa,
  type CursoId,
  capaDe,
  type DiaISO,
  type LinhaDaCapa,
  type OrigemDaLiberacao,
  type StatusDoCurso,
} from "./tipos";

export type Acesso =
  | { tipo: "nenhum" }
  | { tipo: "trocado"; lancamentoId: string; pago: number }
  | { tipo: "liberado" };

export interface CursoDaTroca {
  acesso: Acesso;
  aulas: number;
  capa: Capa;
  categoria: string;
  duracaoSeg: number;
  id: CursoId;
  precoTroca: number | null;
  slug: string;
  status: StatusDoCurso;
  titulo: string;
}

export interface LinhaDoCursoDaTroca extends LinhaDaCapa {
  categoria: { nome: string };
  id: string;
  liberacoes: readonly {
    origem: OrigemDaLiberacao;
    trocaLancamento: { id: string; pontos: number } | null;
  }[];
  modulos: readonly { aulas: readonly { duracaoSeg: number }[] }[];
  precoTroca: number | null;
  slug: string;
  status: StatusDoCurso;
  titulo: string;
}

/** A origem decide, como no check liberacao_troca_nao_revoga; o lançamento só dá o id e o valor. */
function acessoDe(linha: LinhaDoCursoDaTroca): Acesso {
  const [ativa] = linha.liberacoes;
  if (ativa?.origem === "troca") {
    if (!ativa.trocaLancamento) {
      throw new Error(
        `Liberação de troca do curso ${linha.id} sem lançamento de troca.`
      );
    }
    return {
      lancamentoId: ativa.trocaLancamento.id,
      pago: -ativa.trocaLancamento.pontos,
      tipo: "trocado",
    };
  }
  return ativa ? { tipo: "liberado" } : { tipo: "nenhum" };
}

export function paraCursoDaTroca(linha: LinhaDoCursoDaTroca): CursoDaTroca {
  const aulas = linha.modulos.flatMap((m) => m.aulas);
  return {
    acesso: acessoDe(linha),
    aulas: aulas.length,
    capa: capaDe(linha),
    categoria: linha.categoria.nome,
    duracaoSeg: aulas.reduce((s, a) => s + a.duracaoSeg, 0),
    id: linha.id as CursoId,
    precoTroca: linha.precoTroca,
    slug: linha.slug,
    status: linha.status,
    titulo: linha.titulo,
  };
}

export type Situacao =
  | { tipo: "fora" }
  | { tipo: "ja_tem" }
  | { tipo: "trocado"; lancamentoId: string; pago: number }
  | { tipo: "a_venda"; preco: number; faltam: number };

export function situacao(c: CursoDaTroca, saldo: number): Situacao {
  switch (c.acesso.tipo) {
    case "trocado":
      return { ...c.acesso, tipo: "trocado" };
    case "liberado":
      return { tipo: "ja_tem" };
    case "nenhum":
      return c.precoTroca !== null && c.status === "publicado" && c.aulas > 0
        ? {
            faltam: Math.max(0, c.precoTroca - saldo),
            preco: c.precoTroca,
            tipo: "a_venda",
          }
        : { tipo: "fora" };
    default:
      return c.acesso satisfies never;
  }
}

/**
 * Se a vitrine deste aluno tem algum curso trocável, com saldo ou sem. Pelo
 * glossário, o curso trocável some da vitrine de quem já o alcança por
 * liberação, então false não quer dizer que nenhum curso tem preço. É o
 * fato que acende o saldo de Trocar pontos e mostra o botão de Sua semana. O
 * saldo só muda o `faltam` da situação, então o zero não muda a resposta.
 */
export const temCursoTrocavelNaVitrine = (
  cursos: readonly CursoDaTroca[]
): boolean => cursos.some((c) => situacao(c, 0).tipo === "a_venda");

type CursoNoCartao = Pick<
  CursoDaTroca,
  "aulas" | "capa" | "categoria" | "duracaoSeg" | "id" | "slug" | "titulo"
>;

export type CartaoDeTroca =
  | { tipo: "pode_trocar"; curso: CursoNoCartao; preco: number }
  | {
      tipo: "faltam";
      curso: CursoNoCartao;
      preco: number;
      faltam: number;
      saldo: number;
      pct: number;
    }
  | { tipo: "trocado"; curso: CursoNoCartao; pago: number };

const noCartao = (c: CursoDaTroca): CursoNoCartao => ({
  aulas: c.aulas,
  capa: c.capa,
  categoria: c.categoria,
  duracaoSeg: c.duracaoSeg,
  id: c.id,
  slug: c.slug,
  titulo: c.titulo,
});

export function cartao(c: CursoDaTroca, saldo: number): CartaoDeTroca | null {
  const s = situacao(c, saldo);
  switch (s.tipo) {
    case "fora":
    case "ja_tem":
      return null;
    case "trocado":
      return { curso: noCartao(c), pago: s.pago, tipo: "trocado" };
    case "a_venda":
      return s.faltam === 0
        ? { curso: noCartao(c), preco: s.preco, tipo: "pode_trocar" }
        : {
            curso: noCartao(c),
            faltam: s.faltam,
            pct: Math.floor((saldo * 100) / s.preco),
            preco: s.preco,
            saldo,
            tipo: "faltam",
          };
    default:
      return s satisfies never;
  }
}

const precoParaOrdenar = (c: CartaoDeTroca): number =>
  c.tipo === "trocado" ? c.pago : c.preco;

export interface PainelDeTroca {
  cartoes: readonly CartaoDeTroca[];
  comoGanhar: readonly RegraDeGanho[];
  extrato: readonly ItemDoExtrato[];
  hoje: DiaISO;
  pontosSemana: number;
  saldo: number;
  /** false: nenhum curso à venda para este aluno (ver `temCursoTrocavelNaVitrine`). */
  temCursoTrocavelNaVitrine: boolean;
}

export interface LinhasDaTroca {
  cursos: readonly CursoDaTroca[];
  extrato: readonly LinhaDoExtrato[];
  pontos: { saldo: number; entradasDaSemana: number };
}

export function montarPainelDeTroca(
  linhas: LinhasDaTroca,
  hoje: DiaISO
): PainelDeTroca {
  const { saldo, entradasDaSemana } = linhas.pontos;
  const cartoes = linhas.cursos
    .flatMap((c) => cartao(c, saldo) ?? [])
    .sort(
      (a, b) =>
        precoParaOrdenar(a) - precoParaOrdenar(b) ||
        a.curso.titulo.localeCompare(b.curso.titulo, "pt-BR")
    );
  return {
    cartoes,
    comoGanhar: comoGanhar(),
    extrato: linhas.extrato.map(itemDoExtrato),
    hoje,
    pontosSemana: entradasDaSemana,
    saldo,
    temCursoTrocavelNaVitrine: temCursoTrocavelNaVitrine(linhas.cursos),
  };
}

export type RecusaDaTroca =
  | { tipo: "indisponivel" }
  | { tipo: "ja_tem" }
  | { tipo: "preco_mudou"; preco: number }
  | { tipo: "saldo_curto"; faltam: number };

export const CODIGO_DA_RECUSA = {
  indisponivel: "NOT_FOUND",
  ja_tem: "CONFLICT",
  preco_mudou: "CONFLICT",
  saldo_curto: "PRECONDITION_FAILED",
} as const satisfies Record<RecusaDaTroca["tipo"], string>;

export type Decisao =
  | { tipo: "debitar"; preco: number }
  | { tipo: "ja_trocado"; lancamentoId: string }
  | { tipo: "recusa"; recusa: RecusaDaTroca };

const recusa = (r: RecusaDaTroca): Decisao => ({ recusa: r, tipo: "recusa" });

export function decidirTroca(
  c: CursoDaTroca | null,
  saldo: number,
  precoVisto: number
): Decisao {
  if (!c) {
    return recusa({ tipo: "indisponivel" });
  }
  const s = situacao(c, saldo);
  switch (s.tipo) {
    case "fora":
      return recusa({ tipo: "indisponivel" });
    case "trocado":
      return { lancamentoId: s.lancamentoId, tipo: "ja_trocado" };
    case "ja_tem":
      return recusa({ tipo: "ja_tem" });
    case "a_venda":
      if (s.preco !== precoVisto) {
        return recusa({ preco: s.preco, tipo: "preco_mudou" });
      }
      if (s.faltam > 0) {
        return recusa({ faltam: s.faltam, tipo: "saldo_curto" });
      }
      return { preco: s.preco, tipo: "debitar" };
    default:
      return s satisfies never;
  }
}
