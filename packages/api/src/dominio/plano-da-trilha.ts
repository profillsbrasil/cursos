// O que um salvamento da trilha faz, decidido sem banco. Só o servidor importa este
// arquivo (versao.ts usa node:crypto). O único escritor do plano é gravarTrilha, em
// consultas/edicao-da-trilha.ts.

import type { DocumentoDaTrilha } from "./edicao-da-trilha";
import type { CursoId, TrilhaId, Versao } from "./tipos";
import { versaoDe } from "./versao";

export function versaoDaTrilha(documento: DocumentoDaTrilha): Versao {
  const { versao: _, ...conteudo } = documento;
  return versaoDe(conteudo);
}

/** Um curso da lista desejada como está no banco agora. */
export interface CursoDaLista {
  id: CursoId;
  titulo: string;
  trilha: { id: TrilhaId; titulo: string } | null;
}

export type RecusaDaTrilha =
  | { tipo: "versao_mudou" }
  | { tipo: "sumiu" }
  | { tipo: "curso_desconhecido"; id: CursoId }
  | { tipo: "curso_em_outra_trilha"; curso: string; trilha: string };

/** `versao` é a do estado depois do salvamento, a que lerDocumento vai ler. */
export type PlanoDaTrilha =
  | { tipo: "nada_mudou"; versao: Versao }
  | { tipo: "recusa"; recusa: RecusaDaTrilha }
  | {
      tipo: "gravar";
      criar: boolean;
      documento: DocumentoDaTrilha;
      versao: Versao;
    };

const recusa = (r: RecusaDaTrilha): PlanoDaTrilha => ({
  recusa: r,
  tipo: "recusa",
});

/**
 * `atual` é o documento que lerDocumento leu com a trilha travada (null: a trilha
 * não existe); só a versão dele decide, e o uso nunca chega aqui. `cursos`, os
 * cursos da lista desejada lidos na mesma transação. Tirar curso da trilha é
 * permitido: quem só o alcançava pela trilha perde o acesso na hora, e a tela
 * avisa antes. Pela regra "começou abre", inserir e reordenar não trancam curso
 * começado de ninguém.
 */
export function planejarTrilha(
  atual: DocumentoDaTrilha | null,
  desejado: DocumentoDaTrilha,
  cursos: ReadonlyMap<CursoId, CursoDaLista>
): PlanoDaTrilha {
  const versao = versaoDaTrilha(desejado);
  if (atual === null) {
    if (desejado.versao !== null) {
      return recusa({ tipo: "sumiu" });
    }
  } else {
    // Antes da versão: duplo clique e reenvio depois de resposta perdida, inclusive
    // da criação, são sucesso.
    if (versao === atual.versao) {
      return { tipo: "nada_mudou", versao };
    }
    if (desejado.versao !== atual.versao) {
      return recusa({ tipo: "versao_mudou" });
    }
  }
  for (const id of desejado.cursos) {
    const c = cursos.get(id);
    if (!c) {
      return recusa({ id, tipo: "curso_desconhecido" });
    }
    if (c.trilha && c.trilha.id !== desejado.id) {
      return recusa({
        curso: c.titulo,
        tipo: "curso_em_outra_trilha",
        trilha: c.trilha.titulo,
      });
    }
  }
  return { criar: atual === null, documento: desejado, tipo: "gravar", versao };
}
