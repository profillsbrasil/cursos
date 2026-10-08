import { liberacao } from "@cursos/db/schema/index";

import type { CursoId } from "../dominio/tipos";
import type { AlunoTravado } from "./trava";

/** Na troca o autor é o próprio aluno, e o alvo é sempre um curso (liberacao_troca_pelo_aluno). */
export interface NovaLiberacao {
  cursoId: CursoId;
  origem: "troca";
}

/**
 * Único INSERT em liberacao do app. Não decide nada: quem chama já decidiu com o
 * aluno travado. A violação de liberacao_curso_ativa_unica sobe como está.
 */
export async function inserirLiberacao(
  aluno: AlunoTravado,
  nova: NovaLiberacao,
  agora: Date
): Promise<string> {
  const [linha] = await aluno.tx
    .insert(liberacao)
    .values({
      cursoId: nova.cursoId,
      liberadaEm: agora,
      liberadaPor: aluno.userId,
      origem: nova.origem,
      userId: aluno.userId,
    })
    .returning({ id: liberacao.id });
  if (!linha) {
    throw new Error("O insert da liberação não devolveu a linha.");
  }
  return linha.id;
}
