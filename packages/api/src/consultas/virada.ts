// A virada dos pontos (scripts/virada-dos-pontos.ts): lê cada Funcionário, pede o
// plano a dominio/virada.ts e grava pelos escritores de perfil.ts (o bônus) e de
// troca.ts (a troca). Este arquivo não escreve em tabela nenhuma.

import type { Database } from "@cursos/db";

import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import { type PlanoDaVirada, planejarVirada } from "../dominio/virada";
import { linhasDaBusca } from "./acompanhamento";
import type { Executor } from "./comum";
import { darBonusDaVirada } from "./perfil";
import { linhasDoSaldo } from "./pontos";
import { comAlunoTravado } from "./trava";
import { trocarNaVirada } from "./troca";

export interface OpcoesDaVirada {
  agora: Date;
  /** Só estes userIds, como no teste de integração; sem `entre`, todo Funcionário. */
  entre?: readonly string[];
  gravar: boolean;
}

async function funcionarios(
  db: Database,
  entre: readonly string[] | undefined
): Promise<string[]> {
  if (entre?.length === 0) {
    return [];
  }
  const linhas = await db.query.perfilDaPessoa.findMany({
    columns: { userId: true },
    orderBy: { userId: "asc" },
    where: entre
      ? { perfil: "funcionario", userId: { in: [...entre] } }
      : { perfil: "funcionario" },
  });
  return linhas.map((l) => l.userId);
}

/** O que planejarVirada pede de uma pessoa, em série, como toda leitura numa transação. */
async function planoDe(
  exec: Executor,
  userId: string,
  agora: Date
): Promise<PlanoDaVirada> {
  const perfil = await exec.query.perfilDaPessoa.findFirst({
    columns: { perfil: true },
    where: { userId },
  });
  if (!perfil) {
    throw new Error(`${userId} não tem linha em perfil_da_pessoa.`);
  }
  const busca = await linhasDaBusca(exec, [userId]);
  const [linhas] = busca.pessoas;
  if (!linhas) {
    throw new Error(`O statement da busca não trouxe ${userId}.`);
  }
  const precos =
    busca.cursos.length === 0
      ? []
      : await exec.query.curso.findMany({
          columns: { id: true, precoTroca: true },
          where: { id: { in: busca.cursos.map((c) => c.id) } },
        });
  const bonus = await exec.query.pontoLancamento.findFirst({
    columns: { id: true },
    where: { motivo: "bonus_funcionario", userId },
  });
  const { saldo } = await linhasDoSaldo(
    exec,
    userId,
    segundaDaSemana(diaLocal(agora))
  );
  return planejarVirada({
    ...linhas,
    cursos: busca.cursos,
    perfil: perfil.perfil,
    precos: new Map(precos.map((c) => [c.id, c.precoTroca])),
    saldo,
    temBonus: bonus !== undefined,
  });
}

/**
 * Uma pessoa, na transação dela. No ensaio, a transação é read only. Gravando,
 * o aluno fica travado antes da leitura, como na troca e no bônus do admin: o
 * plano lê o saldo e as liberações que outra transação dele já comitou.
 */
export function virarPessoa(
  db: Database,
  userId: string,
  { agora, gravar }: Pick<OpcoesDaVirada, "agora" | "gravar">
): Promise<PlanoDaVirada> {
  if (!gravar) {
    return db.transaction((tx) => planoDe(tx, userId, agora), {
      accessMode: "read only",
    });
  }
  return comAlunoTravado(db, userId, async (aluno) => {
    const plano = await planoDe(aluno.tx, aluno.userId, agora);
    const nasceu = plano.bonus > 0 && (await darBonusDaVirada(aluno, agora));
    for (const t of plano.trocas) {
      // biome-ignore lint/performance/noAwaitInLoops: na transação, as escritas rodam em série.
      await trocarNaVirada(aluno, t.cursoId, t.preco, agora);
    }
    return { ...plano, bonus: nasceu ? plano.bonus : 0 };
  });
}

/** Todo Funcionário (ou os de `entre`), uma pessoa por vez. */
export async function rodarVirada(
  db: Database,
  opcoes: OpcoesDaVirada
): Promise<PlanoDaVirada[]> {
  const planos: PlanoDaVirada[] = [];
  for (const userId of await funcionarios(db, opcoes.entre)) {
    // biome-ignore lint/performance/noAwaitInLoops: uma pessoa por vez, cada uma na transação dela.
    planos.push(await virarPessoa(db, userId, opcoes));
  }
  return planos;
}
