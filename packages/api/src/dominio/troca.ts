import {
  comoGanhar,
  type ItemDoExtrato,
  itemDoExtrato,
  type LinhaDoExtrato,
} from "./pontos";
import type { CursoId, DiaISO } from "./tipos";

/** Como o aluno alcança o curso hoje. Vem das liberações ativas dele. */
export type Acesso =
  | { tipo: "nenhum" }
  | { tipo: "trocado"; lancamentoId: string; pago: number }
  | { tipo: "liberado" } // liberação direta do admin
  | { tipo: "na_trilha" }; // uma trilha liberada contém o curso (aberto ou bloqueado)

/** Curso visto pela troca, já parseado na borda. */
export interface CursoDaTroca {
  acesso: Acesso;
  aulas: number;
  capa: { alt: string; url: string };
  duracaoSeg: number;
  id: CursoId;
  precoTroca: number | null;
  slug: string;
  status: "em_producao" | "publicado";
  tema: string;
  titulo: string;
}

/** Linha da relational query, só com liberações ativas do aluno. */
export interface LinhaDoCursoDaTroca {
  capaAlt: string;
  capaUrl: string;
  id: string;
  liberacoes: readonly {
    trocaLancamento: { id: string; pontos: number } | null;
  }[];
  modulos: readonly { aulas: readonly { duracaoSeg: number }[] }[];
  naTrilha: { trilha: { liberacoes: readonly unknown[] } } | null;
  precoTroca: number | null;
  slug: string;
  status: "em_producao" | "publicado";
  tema: string;
  titulo: string;
}

function acessoDe(linha: LinhaDoCursoDaTroca): Acesso {
  const [direta] = linha.liberacoes;
  if (direta?.trocaLancamento) {
    return {
      lancamentoId: direta.trocaLancamento.id,
      pago: -direta.trocaLancamento.pontos,
      tipo: "trocado",
    };
  }
  if (direta) {
    return { tipo: "liberado" };
  }
  if (linha.naTrilha && linha.naTrilha.trilha.liberacoes.length > 0) {
    return { tipo: "na_trilha" };
  }
  return { tipo: "nenhum" };
}

export function paraCursoDaTroca(linha: LinhaDoCursoDaTroca): CursoDaTroca {
  const aulas = linha.modulos.flatMap((m) => m.aulas);
  return {
    acesso: acessoDe(linha),
    aulas: aulas.length,
    capa: { alt: linha.capaAlt, url: linha.capaUrl },
    duracaoSeg: aulas.reduce((s, a) => s + a.duracaoSeg, 0),
    id: linha.id as CursoId,
    precoTroca: linha.precoTroca,
    slug: linha.slug,
    status: linha.status,
    tema: linha.tema,
    titulo: linha.titulo,
  };
}

/** A regra inteira em um lugar: a tela e a mutação chamam esta função. */
export type Situacao =
  | { tipo: "fora" } // sem preço, em produção ou sem aula
  | { tipo: "ja_tem" } // liberado pelo admin ou na trilha
  | { tipo: "trocado"; lancamentoId: string; pago: number }
  | { tipo: "a_venda"; preco: number; faltam: number }; // faltam 0: o saldo cobre

export function situacao(c: CursoDaTroca, saldo: number): Situacao {
  switch (c.acesso.tipo) {
    case "trocado":
      // vence o preço: o admin pode ter tirado o curso da troca depois
      return { ...c.acesso, tipo: "trocado" };
    case "liberado":
    case "na_trilha":
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

type CursoNoCartao = Pick<
  CursoDaTroca,
  "aulas" | "capa" | "duracaoSeg" | "id" | "slug" | "tema" | "titulo"
>;

/** Estados do card. "Confirmando" é estado da tela, não do servidor, e fica no cliente. */
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
  duracaoSeg: c.duracaoSeg,
  id: c.id,
  slug: c.slug,
  tema: c.tema,
  titulo: c.titulo,
});

/** null: o curso não entra na vitrine (fora ou ja_tem). */
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

/** Preço atual, ou o pago se o curso já foi trocado: o card trocado não pula de lugar. */
const precoDoCartao = (c: CartaoDeTroca): number =>
  c.tipo === "trocado" ? c.pago : c.preco;

export interface PainelDeTroca {
  /** Ordem: preço e título. */
  cartoes: readonly CartaoDeTroca[];
  comoGanhar: readonly { pontos: number; rotulo: string }[];
  /** Mais recente primeiro. */
  extrato: readonly ItemDoExtrato[];
  hoje: DiaISO;
  pontosSemana: number;
  saldo: number;
}

export interface LinhasDaTroca {
  cursos: readonly CursoDaTroca[];
  extrato: readonly LinhaDoExtrato[];
  pontos: { saldo: number; semana: number };
}

export function montarPainelDeTroca(
  linhas: LinhasDaTroca,
  hoje: DiaISO
): PainelDeTroca {
  const { saldo, semana } = linhas.pontos;
  const cartoes = linhas.cursos
    .flatMap((c) => cartao(c, saldo) ?? [])
    .sort(
      (a, b) =>
        precoDoCartao(a) - precoDoCartao(b) ||
        a.curso.titulo.localeCompare(b.curso.titulo, "pt-BR")
    );
  return {
    cartoes,
    comoGanhar: comoGanhar(),
    extrato: linhas.extrato.map(itemDoExtrato),
    hoje,
    pontosSemana: semana,
    saldo,
  };
}

export type RecusaDaTroca =
  | { tipo: "indisponivel" }
  | { tipo: "ja_tem" }
  | { tipo: "preco_mudou"; preco: number }
  | { tipo: "saldo_curto"; faltam: number };

export type Decisao =
  | { tipo: "debitar"; preco: number }
  | { tipo: "ja_trocado"; lancamentoId: string } // duplo clique ou retry: sucesso de novo
  | { tipo: "recusa"; recusa: RecusaDaTroca };

const recusa = (r: RecusaDaTroca): Decisao => ({ recusa: r, tipo: "recusa" });

/** curso null: o id não existe. */
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
