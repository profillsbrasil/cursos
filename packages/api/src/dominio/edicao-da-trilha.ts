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

export const CURSOS_POR_TRILHA = 100;

const texto = (max: number) => z.string().trim().min(1).max(max);

/** O Postgres devolve uuid em minúscula; o mesmo id em outra caixa seria outra linha. */
const uuid = z.uuid().transform((id) => id.toLowerCase());

export const documentoDaTrilha = z
  .object({
    /** Em ordem: o primeiro é a posição 1. */
    cursos: z
      .array(uuid.transform((id) => id as CursoId))
      .max(CURSOS_POR_TRILHA),
    descricao: texto(600),
    id: uuid.transform((id) => id as TrilhaId),
    slug: z.string().regex(new RegExp(SLUG)).max(80),
    titulo: texto(120),
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
  /** Lançamentos de trilha concluída. */
  conclusoes: number;
  /** Liberações da trilha, ativas ou revogadas: a FK restrict conta as duas. */
  liberacoes: number;
}

export interface EdicaoDaTrilha {
  documento: DocumentoDaTrilha;
  podeApagar: boolean;
  uso: UsoDaTrilha;
}

/** Única regra de "dá para apagar a trilha". A tela e apagarTrilha usam esta. */
export const podeApagarTrilha = (u: UsoDaTrilha): boolean =>
  u.liberacoes === 0 && u.conclusoes === 0;

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
    uso: { alunosComATrilha: 0, conclusoes: 0, liberacoes: 0 },
  };
}
