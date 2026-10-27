import type { PERFIS } from "@cursos/db/schema/formatos";

import type { Papel } from "../context";
import type { ConcessaoNaFicha } from "./concessao";
import { type Perfil, perfilDoCadastro } from "./perfil";
import type { BuscaDeContas, Conta, Pessoa } from "./tipos";

export interface LinhaDoPerfil {
  definidoEm: Date;
  /** null: o perfil do cadastro, sem mudança do admin. */
  definidoPor: string | null;
  perfil: Perfil;
  userId: string;
}

/**
 * O perfil como o admin o lê. Sem linha, a pessoa ainda não entrou no app, e o
 * perfil é o que ela ganha no primeiro acesso (`doCadastro`).
 */
export interface PerfilNaTela {
  doCadastro: boolean;
  perfil: Perfil;
}

export const perfilNaTela = (
  conta: Conta,
  linha: LinhaDoPerfil | undefined
): PerfilNaTela =>
  linha
    ? { doCadastro: false, perfil: linha.perfil }
    : { doCadastro: true, perfil: perfilDoCadastro(conta) };

export interface PessoaNaLista extends Pessoa {
  papel: Papel;
  perfil: PerfilNaTela;
  /** A soma dos lançamentos; 0 para quem não tem nenhum. */
  saldo: number;
  ultimoAcesso: Date | null;
}

export interface SaldoDaPessoa {
  saldo: number;
  userId: string;
}

export type ContagemPorPerfil = Record<(typeof PERFIS)[number], number>;

export interface ListaDePessoas {
  /** Quem já entrou no app, por perfil: os números dos filtros. */
  contagem: ContagemPorPerfil;
  filtro: Perfil | null;
  pessoas: readonly PessoaNaLista[];
  total: number;
}

export function montarListaDePessoas(
  busca: BuscaDeContas,
  linhas: readonly LinhaDoPerfil[],
  saldos: readonly SaldoDaPessoa[],
  contagem: ContagemPorPerfil,
  filtro: Perfil | null
): ListaDePessoas {
  const porId = new Map(linhas.map((l) => [l.userId, l]));
  const saldoPorId = new Map(saldos.map((s) => [s.userId, s.saldo]));
  return {
    contagem,
    filtro,
    pessoas: busca.pessoas.map((c) => ({
      email: c.email,
      foto: c.foto,
      nome: c.nome,
      papel: c.papel,
      perfil: perfilNaTela(c, porId.get(c.userId)),
      saldo: saldoPorId.get(c.userId) ?? 0,
      ultimoAcesso: c.ultimoAcesso,
      userId: c.userId,
    })),
    total: busca.total,
  };
}

export interface FichaDaPessoa {
  conta: Conta;
  /** A última mudança do admin; null enquanto vale o perfil do cadastro. */
  mudanca: { em: Date; por: string } | null;
  perfil: PerfilNaTela;
  /** O saldo da pessoa e as concessões do admin, da mais recente à mais antiga. */
  pontos: PontosNaFicha;
  /** O admin está na própria ficha: o papel dele não muda por aqui. */
  souEu: boolean;
}

export interface PontosNaFicha {
  concessoes: readonly ConcessaoNaFicha[];
  saldo: number;
}

export function montarFicha(
  conta: Conta,
  linha: LinhaDoPerfil | undefined,
  quemMudou: Pessoa | null,
  adminId: string,
  pontos: PontosNaFicha
): FichaDaPessoa {
  return {
    conta,
    mudanca: linha?.definidoPor
      ? { em: linha.definidoEm, por: quemMudou?.nome ?? linha.definidoPor }
      : null,
    perfil: perfilNaTela(conta, linha),
    pontos,
    souEu: conta.userId === adminId,
  };
}
