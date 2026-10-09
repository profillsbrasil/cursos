// A trilha como o admin edita: campos e a lista ordenada de cursos, salvos de uma
// vez. Roda no editor e no servidor, então nada aqui importa node:crypto nem banco.
// O planejador, que só roda no servidor, mora em plano-da-trilha.ts.
//
// A lista é o estado desejado: acrescentar, tirar e reordenar cursos são a mesma
// operação. O admin nunca escolhe uma posição numérica.

// formatos.ts, não comum.ts: este módulo vai para o bundle do browser.
import { SLUG } from "@cursos/db/schema/formatos";
import { z } from "zod";

import type { CursoId, TrilhaId, Versao } from "./tipos";

/** Tetos do documento: o schema, os maxLength do editor e as frases dele usam estes. */
export const LIMITES_DA_TRILHA = {
  cursos: 100,
  descricao: 600,
  slug: 80,
  titulo: 120,
} as const;

/** A recusa de apagarTrilha, e a frase que o editor mostra antes de tentar. */
export const TRILHA_EM_USO =
  "Esta trilha já foi liberada para alguém, mesmo que depois revogada, ou já foi concluída, e por isso não se apaga. Para tirá-la de uso, tire os cursos dela.";

const texto = (max: number) => z.string().trim().min(1).max(max);

/** O Postgres devolve uuid em minúscula; o mesmo id em outra caixa seria outra linha. */
const uuid = z.uuid().transform((id) => id.toLowerCase());

export const documentoDaTrilha = z
  .object({
    /** Em ordem: o primeiro é a posição 1. */
    cursos: z
      .array(uuid.transform((id) => id as CursoId))
      .max(LIMITES_DA_TRILHA.cursos),
    descricao: texto(LIMITES_DA_TRILHA.descricao),
    id: uuid.transform((id) => id as TrilhaId),
    slug: z.string().regex(new RegExp(SLUG)).max(LIMITES_DA_TRILHA.slug),
    titulo: texto(LIMITES_DA_TRILHA.titulo),
    /** null: o editor acha que a trilha é nova. Senão, a versão que ele abriu. */
    versao: z
      .string()
      .nullable()
      .transform((v) => v as Versao | null),
  })
  .superRefine((d, ctx) => {
    const vistos = new Set<string>();
    d.cursos.forEach((id, i) => {
      if (vistos.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `O curso ${id} aparece duas vezes.`,
          path: ["cursos", i],
        });
      }
      vistos.add(id);
    });
  });

export type DocumentoDaTrilha = z.output<typeof documentoDaTrilha>;

export interface UsoDaTrilha {
  /** Pessoas com liberação ativa da trilha: a mudança vale para elas na hora. */
  alunosComATrilha: number;
  /**
   * Um item por curso da trilha, na ordem dela: pessoas que alcançam o curso só
   * por esta trilha (nenhuma liberação ativa do próprio curso) e já o começaram
   * (aula assistida ou posição acima de 0 s) ou concluíram (certificado). Tirar
   * o curso tira o acesso delas. É o retrato da leitura: o salvar não reconta.
   */
  comecaramSoPelaTrilha: readonly PessoasNoCurso[];
  /** Lançamentos de trilha concluída. */
  conclusoes: number;
  /** Liberações da trilha, ativas ou revogadas: a FK restrict conta as duas. */
  liberacoes: number;
}

export interface PessoasNoCurso {
  cursoId: CursoId;
  pessoas: number;
}

export interface EdicaoDaTrilha {
  documento: DocumentoDaTrilha;
  podeApagar: boolean;
  uso: UsoDaTrilha;
}

/** Única regra de "dá para apagar a trilha". A tela e apagarTrilha usam esta. */
export const podeApagarTrilha = (
  u: Pick<UsoDaTrilha, "conclusoes" | "liberacoes">
): boolean => u.liberacoes === 0 && u.conclusoes === 0;

/**
 * O rascunho de uma trilha que ainda não existe. O id vem de quem chama e não
 * pode mudar enquanto o rascunho vive: a trava trilha:<id> e o reenvio sem
 * duplicar dependem dele.
 */
export function edicaoDeTrilhaNova(id: TrilhaId): EdicaoDaTrilha {
  return {
    documento: {
      cursos: [],
      descricao: "",
      id,
      slug: "",
      titulo: "",
      versao: null,
    },
    podeApagar: false,
    uso: {
      alunosComATrilha: 0,
      comecaramSoPelaTrilha: [],
      conclusoes: 0,
      liberacoes: 0,
    },
  };
}
