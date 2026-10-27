import type { Database } from "@cursos/db";
import { concessaoDePontos, pontoLancamento } from "@cursos/db/schema/index";

import type { LinhaDaConcessao } from "../dominio/concessao";
import { recusaDaConcessao } from "../dominio/concessao";
import { diaLocal, segundaDaSemana } from "../dominio/sequencia";
import type { AdminId } from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import type { Executor } from "./comum";
import { comSaldoTravado } from "./pontos";

export interface ResultadoDaConcessao {
  concessaoId: string;
  /** O saldo da pessoa depois da concessão. */
  saldo: number;
}

/**
 * Único escritor de concessao_de_pontos e do lançamento `concessao`. Dar e tirar
 * seguem o mesmo caminho: travam o aluno e leem o saldo (comSaldoTravado), e a
 * retirada maior que o saldo é recusada, então o saldo nunca fica negativo. A
 * concessão e o lançamento nascem na mesma transação, em série.
 */
export function concederPontos(
  db: Database,
  admin: AdminId,
  pedido: { motivo: string; pontos: number; userId: string },
  agora: Date
): Promise<ResultadoDaConcessao> {
  const segunda = segundaDaSemana(diaLocal(agora));
  return comSaldoTravado(db, pedido.userId, segunda, async (aluno, saldo) => {
    const recusa = recusaDaConcessao(saldo, pedido.pontos);
    if (recusa) {
      throw new ErroParaAPessoa({
        code: "PRECONDITION_FAILED",
        message: recusa,
      });
    }
    const [concessao] = await aluno.tx
      .insert(concessaoDePontos)
      .values({
        concedidaEm: agora,
        concedidaPor: admin,
        motivo: pedido.motivo,
        pontos: pedido.pontos,
        userId: aluno.userId,
      })
      .returning({ id: concessaoDePontos.id });
    if (!concessao) {
      throw new Error("O insert da concessão não devolveu a linha.");
    }
    await aluno.tx.insert(pontoLancamento).values({
      concessaoId: concessao.id,
      criadoEm: agora,
      motivo: "concessao",
      pontos: pedido.pontos,
      userId: aluno.userId,
    });
    return { concessaoId: concessao.id, saldo: saldo + pedido.pontos };
  });
}

/** As concessões da pessoa, da mais recente para a mais antiga. */
export function linhasDasConcessoes(
  exec: Executor,
  userId: string
): Promise<LinhaDaConcessao[]> {
  return exec.query.concessaoDePontos.findMany({
    columns: {
      concedidaEm: true,
      concedidaPor: true,
      id: true,
      motivo: true,
      pontos: true,
    },
    orderBy: { concedidaEm: "desc", id: "desc" },
    where: { userId },
  });
}
