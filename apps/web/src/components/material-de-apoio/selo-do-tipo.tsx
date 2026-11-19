import {
  TIPOS_DE_MATERIAL,
  type TipoDoMaterial,
} from "@cursos/api/dominio/material";
import { cn } from "@cursos/ui/lib/utils";

const COR: Partial<Record<TipoDoMaterial, string>> = {
  pdf: "bg-canela/14 text-canela",
  ppt: "bg-sol/14 text-sol",
  pptx: "bg-sol/14 text-sol",
  xls: "bg-ceu/14 text-ceu",
  xlsx: "bg-ceu/14 text-ceu",
};

const TAMANHO = {
  grande: "h-11 w-[38px] rounded-[8px] text-[11px]",
  pequeno: "h-[38px] w-[34px] rounded-[8px] text-[11px]",
} as const;

/**
 * O selo do tipo do arquivo, que o editor do curso e o cartão da página do curso
 * dividem: uma folha com a ponta dobrada e a sigla do tipo. O recusado vai em
 * `recusado`, e o arquivo sem tipo aceito mostra "?". Sem "use client" nem hook:
 * roda dos dois lados da fronteira.
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
        "relative grid shrink-0 place-items-center font-mono leading-none font-semibold tracking-[0.04em]",
        "after:bg-background/55 after:absolute after:top-0 after:right-0 after:size-2.5 after:rounded-bl-[4px]",
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
