// A virada dos pontos: o acerto único de quem já é Funcionário antes de a
// liberação do perfil passar a abrir só a amostra. Cada Funcionário ganha o
// bônus, se ainda não tem, e troca pelo preço atual cada curso que já estudou e
// que hoje vê só pela liberação do perfil. O script scripts/virada-dos-pontos.ts
// lê, chama planejarVirada e grava pelos escritores de consultas/.

import {
  type CursoDaBusca,
  catalogoDo,
  type LinhasDaPessoa,
  ultimoEstudo,
} from "./acompanhamento";
import { estudoDe } from "./historico";
import type { Perfil } from "./perfil";
import { BONUS_DE_FUNCIONARIO } from "./regras";
import type { CursoId } from "./tipos";

/** O que a virada lê de uma pessoa: as linhas da busca do admin, mais pontos e preços. */
export interface PessoaNaVirada extends LinhasDaPessoa {
  /** Os cursos que a pessoa alcança por liberação ativa, como a busca os lê. */
  cursos: readonly CursoDaBusca[];
  perfil: Perfil;
  /** O preço de troca de cada curso de `cursos`; null é curso sem preço. */
  precos: ReadonlyMap<string, number | null>;
  saldo: number;
  temBonus: boolean;
}

export type MotivoDoPulo =
  | { tipo: "sem_preco" }
  | { tipo: "em_producao" }
  | { tipo: "saldo_curto"; faltam: number };

export interface CursoNaVirada {
  cursoId: CursoId;
  titulo: string;
}

export interface PlanoDaVirada {
  /** Os pontos do bônus que entram: BONUS_DE_FUNCIONARIO ou 0. */
  bonus: number;
  pulados: readonly (CursoNaVirada & { motivo: MotivoDoPulo })[];
  /** Na ordem em que se gravam: do mais barato ao mais caro. */
  trocas: readonly (CursoNaVirada & { preco: number })[];
  userId: string;
}

const NADA = (userId: string): PlanoDaVirada => ({
  bonus: 0,
  pulados: [],
  trocas: [],
  userId,
});

/**
 * Os cursos que a pessoa vê só pela liberação do perfil e que já estudou. "Já
 * estudou" é o contrário de Nunca abriu na Situação da pessoa: ultimoEstudo
 * acha aula assistida, posição acima de 0 s, questionário ou certificado.
 */
function estudadosSoPeloPerfil(p: PessoaNaVirada) {
  const ativas = p.liberacoes.filter((l) => l.revogadaEm === null);
  const proprias = new Set(
    ativas.filter((l) => l.origem !== "perfil").map((l) => l.cursoId)
  );
  const doPerfil = new Set(
    ativas
      .filter((l) => l.origem === "perfil" && !proprias.has(l.cursoId))
      .map((l) => l.cursoId)
  );
  const curso = catalogoDo({ cursos: p.cursos, pessoas: [] });
  const e = estudoDe(p);
  return [...doPerfil].map(curso).filter((c) => ultimoEstudo(c, e) !== null);
}

/**
 * O plano de uma pessoa. Cliente e Público aberto não mudam. O saldo com o
 * bônus paga as trocas do curso mais barato ao mais caro; o que não cabe pula.
 */
export function planejarVirada(p: PessoaNaVirada): PlanoDaVirada {
  if (p.perfil !== "funcionario") {
    return NADA(p.userId);
  }
  const bonus = p.temBonus ? 0 : BONUS_DE_FUNCIONARIO;
  const pulados: (CursoNaVirada & { motivo: MotivoDoPulo })[] = [];
  const aVenda: (CursoNaVirada & { preco: number })[] = [];
  for (const c of estudadosSoPeloPerfil(p)) {
    const base = { cursoId: c.id, titulo: c.titulo };
    const preco = p.precos.get(c.id) ?? null;
    if (preco === null) {
      pulados.push({ ...base, motivo: { tipo: "sem_preco" } });
    } else if (c.status === "publicado") {
      aVenda.push({ ...base, preco });
    } else {
      pulados.push({ ...base, motivo: { tipo: "em_producao" } });
    }
  }
  aVenda.sort(
    (a, b) => a.preco - b.preco || a.titulo.localeCompare(b.titulo, "pt-BR")
  );
  let saldo = p.saldo + bonus;
  const trocas: (CursoNaVirada & { preco: number })[] = [];
  for (const t of aVenda) {
    if (t.preco <= saldo) {
      trocas.push(t);
      saldo -= t.preco;
    } else {
      pulados.push({
        cursoId: t.cursoId,
        motivo: { faltam: t.preco - saldo, tipo: "saldo_curto" },
        titulo: t.titulo,
      });
    }
  }
  return { bonus, pulados, trocas, userId: p.userId };
}

/** Nada a gravar: sem bônus e sem troca. Os pulados seguem no relatório. */
export const nadaAFazer = (plano: PlanoDaVirada): boolean =>
  plano.bonus === 0 && plano.trocas.length === 0;

export interface TotaisDaVirada {
  /** Quantas pessoas ganham o bônus. */
  bonus: number;
  entram: number;
  nadaAFazer: number;
  pulados: number;
  saem: number;
  trocas: number;
}

export function totaisDaVirada(
  planos: readonly PlanoDaVirada[]
): TotaisDaVirada {
  const trocas = planos.flatMap((p) => p.trocas);
  return {
    bonus: planos.filter((p) => p.bonus > 0).length,
    entram: planos.reduce((s, p) => s + p.bonus, 0),
    nadaAFazer: planos.filter(nadaAFazer).length,
    pulados: planos.reduce((s, p) => s + p.pulados.length, 0),
    saem: trocas.reduce((s, t) => s + t.preco, 0),
    trocas: trocas.length,
  };
}

/**
 * Banco sem nenhuma linha de perfil é o que um DATABASE_URL vazio ou de outro
 * ambiente produz: a gravação recusa em vez de rodar no banco errado.
 */
export function recusaDaGravacao(linhasDePerfil: number): string | null {
  return linhasDePerfil === 0
    ? "O banco não tem nenhuma linha em perfil_da_pessoa. Confira o DATABASE_URL antes de gravar."
    : null;
}
