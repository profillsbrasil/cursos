import type { Database } from "@cursos/db";

import type { Context, Papel } from "./context";
import type { Aluno, Perfil } from "./dominio/perfil";
import type { Conta, Pessoa } from "./dominio/tipos";
import { type Capas, capasDesligadas } from "./externos/capas";
import { type Materiais, materiaisDesligados } from "./externos/materiais";
import { LIMITE, type Pessoas } from "./externos/pessoas";
import { sessaoDe } from "./sessao";

export interface OpcoesDeTeste {
  /** Sem a porta, o envio de capa recusa como num ambiente sem Storage. */
  capas?: Capas;
  db: Database;
  /** Sem a porta, o envio de material recusa como num ambiente sem Storage. */
  materiais?: Materiais;
  papel?: Papel;
  /**
   * As pessoas que o Clerk falso conhece. Sem a lista, ele não conhece ninguém.
   * Sem emailVerificado, o e-mail conta como verificado.
   */
  pessoas?: readonly (Pessoa & Partial<Conta>)[];
  /** null: sem sessão. */
  userId: string | null;
}

/**
 * Clerk falso: busca por trecho de nome, e-mail ou userId, sem caixa, e corta em
 * LIMITE. A Conta sem os campos da ficha sai com o e-mail verificado, criada no
 * dia 0, sem jeito de entrar, como aluno e sem acesso. definirPapel grava aqui.
 */
export function pessoasDeTeste(
  lista: readonly (Pessoa & Partial<Conta>)[]
): Pessoas {
  const papeis = new Map<string, Papel>();
  const paraConta = (p: Pessoa & Partial<Conta>): Conta => ({
    criadaEm: p.criadaEm ?? new Date(0),
    email: p.email,
    emailVerificado: p.emailVerificado ?? true,
    foto: p.foto,
    jeitosDeEntrar: p.jeitosDeEntrar ?? [],
    nome: p.nome,
    papel: papeis.get(p.userId) ?? p.papel ?? "aluno",
    ultimoAcesso: p.ultimoAcesso ?? null,
    userId: p.userId,
  });
  const achar = (userId: string) => lista.find((p) => p.userId === userId);
  return {
    buscar: (termo, entre) => {
      const t = termo.toLowerCase();
      const casadas = lista.filter(
        (p) =>
          (entre === undefined || entre.includes(p.userId)) &&
          [p.nome, p.email ?? "", p.userId].some((campo) =>
            campo.toLowerCase().includes(t)
          )
      );
      return Promise.resolve({
        pessoas: casadas.slice(0, LIMITE).map(paraConta),
        total: casadas.length,
      });
    },
    conta: (userId) => {
      const p = achar(userId);
      return Promise.resolve(p ? paraConta(p) : null);
    },
    definirPapel: (userId, papel) => {
      papeis.set(userId, papel);
      return Promise.resolve();
    },
    porId: (userId) => {
      const p = achar(userId);
      return Promise.resolve(
        p
          ? { email: p.email, foto: p.foto, nome: p.nome, userId: p.userId }
          : null
      );
    },
  };
}

/** O aluno que as consultas recebem do alunoProcedure. Sem perfil, Público aberto. */
export const alunoDeTeste = (
  userId: string,
  perfil: Perfil = "publico"
): Aluno => ({ perfil, userId });

/** Context dos testes. Quando Servicos ganha um campo, só este arquivo muda nos testes. */
export function contextoDeTeste(o: OpcoesDeTeste): Context {
  return {
    auth: o.userId ? sessaoDe(o.papel ?? "aluno", o.userId) : null,
    capas: o.capas ?? capasDesligadas,
    db: o.db,
    materiais: o.materiais ?? materiaisDesligados,
    pessoas: pessoasDeTeste(o.pessoas ?? []),
  };
}
