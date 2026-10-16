import { caminhoDoCurso } from "./rotas";
import { diaLocal } from "./sequencia";
import {
  type Capa,
  type ComunicadoId,
  type CursoId,
  capaDe,
  type DiaISO,
  type LinhaDaCapa,
  type Pessoa,
} from "./tipos";

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
  /** O nome do Clerk; null quando o Clerk não conhece a pessoa. */
  publicadoPor: string | null;
  texto: string;
  titulo: string;
}

export interface ComunicadosDoAdmin {
  /** Do mais recente para o mais antigo. */
  comunicados: readonly ComunicadoNaTela[];
  /** Os cursos que um comunicado pode ter como alvo, por título. */
  cursos: readonly CursoDoComunicado[];
}

function nomesDosAutores(
  autores: readonly (Pessoa | null)[]
): ReadonlyMap<string, string> {
  return new Map(
    autores.flatMap((p) =>
      p && p.nome !== p.userId ? [[p.userId, p.nome] as const] : []
    )
  );
}

export function montarComunicados(
  linhas: LinhasDosComunicados,
  autores: readonly (Pessoa | null)[]
): ComunicadosDoAdmin {
  const nomes = nomesDosAutores(autores);
  return {
    comunicados: linhas.comunicados.map((c) => ({
      curso: c.curso,
      id: c.id,
      publicadoEm: c.publicadoEm.toISOString(),
      publicadoPor: nomes.get(c.publicadoPor) ?? null,
      texto: c.texto,
      titulo: c.titulo,
    })),
    cursos: linhas.cursos,
  };
}

export interface LinhaDoComunicadoDoAluno {
  curso: (LinhaDaCapa & { slug: string; titulo: string }) | null;
  id: ComunicadoId;
  publicadoEm: Date;
  publicadoPor: string;
  texto: string;
  titulo: string;
}

export type AlvoDoComunicado =
  | { tipo: "geral" }
  | { capa: Capa; href: string; tipo: "curso"; titulo: string };

export interface ComunicadoDoAluno {
  alvo: AlvoDoComunicado;
  /** O dia de São Paulo em que saiu. */
  dia: DiaISO;
  id: ComunicadoId;
  publicadoEm: string;
  publicadoPor: string | null;
  texto: string;
  titulo: string;
}

export interface MesDeComunicados {
  comunicados: readonly ComunicadoDoAluno[];
  /** "2026-10", pelo dia de São Paulo. */
  mes: string;
}

export type ComunicadosDoAluno =
  | { tipo: "vazio" }
  | {
      anteriores: readonly MesDeComunicados[];
      destaque: ComunicadoDoAluno;
      tipo: "com_comunicados";
    };

export function montarComunicadosDoAluno(
  linhas: readonly LinhaDoComunicadoDoAluno[],
  autores: readonly (Pessoa | null)[]
): ComunicadosDoAluno {
  const nomes = nomesDosAutores(autores);
  const [destaque, ...resto] = linhas.map(
    (c): ComunicadoDoAluno => ({
      alvo: c.curso
        ? {
            capa: capaDe(c.curso),
            href: caminhoDoCurso(c.curso.slug),
            tipo: "curso",
            titulo: c.curso.titulo,
          }
        : { tipo: "geral" },
      dia: diaLocal(c.publicadoEm),
      id: c.id,
      publicadoEm: c.publicadoEm.toISOString(),
      publicadoPor: nomes.get(c.publicadoPor) ?? null,
      texto: c.texto,
      titulo: c.titulo,
    })
  );
  if (!destaque) {
    return { tipo: "vazio" };
  }
  const anteriores: { comunicados: ComunicadoDoAluno[]; mes: string }[] = [];
  for (const c of resto) {
    const mes = c.dia.slice(0, 7);
    const ultimo = anteriores.at(-1);
    if (ultimo?.mes === mes) {
      ultimo.comunicados.push(c);
    } else {
      anteriores.push({ comunicados: [c], mes });
    }
  }
  return { anteriores, destaque, tipo: "com_comunicados" };
}
