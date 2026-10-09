import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { TriangleAlert } from "lucide-react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";

import { AVISO } from "./partes";

/**
 * O salvar voltou com versao_mudou: alguém salvou o mesmo documento depois que
 * esta aba abriu. O rascunho fica na tela até a pessoa escolher recarregar.
 */
export function AvisoDeVersaoMudou({
  className,
  oQue,
  recarregar,
}: {
  className?: string;
  /** "este curso", "esta trilha". */
  oQue: string;
  recarregar: () => void;
}) {
  return (
    <div className={cn(AVISO, className)} role="status">
      <TriangleAlert
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-sol"
      />
      <div className="grid gap-3">
        <p>
          Outra pessoa salvou {oQue} depois que você abriu. O que você mudou
          continua aqui. Recarregar traz a versão nova e descarta as suas
          mudanças.
        </p>
        <Button
          className={cn(BOTAO_CONTORNO, PEQUENO, "w-fit")}
          onClick={recarregar}
        >
          Recarregar
        </Button>
      </div>
    </div>
  );
}
