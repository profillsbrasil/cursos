import type { ComunicadoId, CursoId, Pessoa } from "./tipos";

/** O router recusa acima disso, e o formulário não deixa digitar mais. */
export const TITULO_MAX = 200;
export const TEXTO_MAX = 2000;

export interface CursoDoComunicado {
  id: CursoId;
  titulo: string;
}

/** Uma linha de comunicado como o banco a devolve, com o curso já unido. */
export interface LinhaDeComunicado {
  curso: CursoDoComunicado | null;
  id: ComunicadoId;
  publicadoEm: Date;
  publicadoPor: string;
  texto: string;
  titulo: string;
}

export interface LinhasDosComunicados {
  comunicados: readonly LinhaDeComunicado[];
  cursos: readonly CursoDoComunicado[];
}

export interface ComunicadoNaTela {
  /** null: geral, todo aluno vê. */
  curso: CursoDoComunicado | null;
  id: ComunicadoId;
  publicadoEm: string;
  /** O nome do Clerk, ou o userId quando o Clerk não conhece mais a pessoa. */
  publicadoPor: string;
  texto: string;
  titulo: string;
}

export interface ComunicadosDoAdmin {
  /** Do mais recente para o mais antigo. */
  comunicados: readonly ComunicadoNaTela[];
  /** Os cursos que um comunicado pode ter como alvo, por título. */
  cursos: readonly CursoDoComunicado[];
}

export function montarComunicados(
  linhas: LinhasDosComunicados,
  autores: readonly (Pessoa | null)[]
): ComunicadosDoAdmin {
  const nomes = new Map(
    autores.flatMap((p) => (p ? [[p.userId, p.nome] as const] : []))
  );
  return {
    comunicados: linhas.comunicados.map((c) => ({
      curso: c.curso,
      id: c.id,
      publicadoEm: c.publicadoEm.toISOString(),
      publicadoPor: nomes.get(c.publicadoPor) ?? c.publicadoPor,
      texto: c.texto,
      titulo: c.titulo,
    })),
    cursos: linhas.cursos,
  };
}
