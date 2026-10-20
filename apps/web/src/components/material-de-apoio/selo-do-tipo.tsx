// O selo do tipo do arquivo, que o editor do curso e o cartão da página do curso
// dividem. Sem "use client" nem hook: roda dos dois lados da fronteira.

import {
  TIPOS_DE_MATERIAL,
  type TipoDoMaterial,
} from "@cursos/api/dominio/material";
import { cn } from "@cursos/ui/lib/utils";

/** O PDF em Canela, a planilha em Céu e os slides em Sol, a 14%; o resto, neutro. */
const COR: Partial<Record<TipoDoMaterial, string>> = {
  pdf: "bg-canela/14 text-canela",
  ppt: "bg-sol/14 text-sol",
  pptx: "bg-sol/14 text-sol",
  xls: "bg-ceu/14 text-ceu",
  xlsx: "bg-ceu/14 text-ceu",
};

const TAMANHO = {
  grande: "h-11 w-[38px] rounded-[8px] text-[10px]",
  pequeno: "h-[34px] w-[30px] rounded-[7px] text-[9px]",
} as const;

/**
 * Uma folha com a ponta dobrada e a sigla do tipo. O recusado vai em `erro`, e
 * o arquivo sem tipo aceito mostra "?".
 */
export function SeloDoTipo({
  recusado = false,
  tamanho = "grande",
  tipo,
}: {
  recusado?: boolean;
  tamanho?: keyof typeof TAMANHO;
  tipo: TipoDoMaterial | null;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center font-mono font-semibold leading-none tracking-[0.04em]",
        "after:absolute after:top-0 after:right-0 after:size-2.5 after:rounded-bl-[4px] after:bg-background/55",
        TAMANHO[tamanho],
        recusado
          ? "bg-destructive/14 text-destructive"
          : ((tipo && COR[tipo]) ?? "bg-popover text-foreground")
      )}
    >
      {tipo ? TIPOS_DE_MATERIAL[tipo].rotulo : "?"}
    </span>
  );
}
