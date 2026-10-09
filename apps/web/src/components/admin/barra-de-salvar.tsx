import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import type { ReactNode } from "react";

import { BOTAO } from "@/components/casca/botoes";
import { plural } from "@/lib/formato";

import { AvisoDeVersaoMudou } from "./aviso-de-versao-mudou";
import { Carregando } from "./confirmacao-na-linha";
import type { Problema } from "./problemas";

function Situacao({
  novo,
  problemas,
  sujo,
}: {
  novo: boolean;
  problemas: readonly Problema[];
  sujo: boolean;
}) {
  const marcados = problemas.filter((p) => p.campo !== null).length;
  const frases = problemas
    .filter((p) => p.campo === null)
    .map((p) => p.mensagem);
  if (marcados > 0 || frases.length > 0) {
    return (
      <ul className="grid gap-0.5 text-destructive">
        {marcados > 0 ? (
          <li>
            Confira {plural(marcados, "campo marcado", "campos marcados")}.
          </li>
        ) : null}
        {frases.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    );
  }
  let texto = "Tudo salvo.";
  if (novo) {
    texto = "Rascunho. Os alunos não veem nada até você salvar.";
  } else if (sujo) {
    texto = "Alterações não salvas.";
  }
  return <p className="text-muted-foreground">{texto}</p>;
}

export function BarraDeSalvar({
  children,
  novo,
  oQue,
  pendente,
  problemas,
  recarregar,
  sujo,
  versaoMudou,
}: {
  children?: ReactNode;
  novo: boolean;
  oQue: string;
  pendente: boolean;
  problemas: readonly Problema[];
  recarregar: () => void;
  sujo: boolean;
  versaoMudou: boolean;
}) {
  return (
    <div className="sticky bottom-3 z-10 grid gap-3 rounded-[20px] bg-card/95 px-4 py-3 shadow-[0_10px_30px_rgb(0_0_0/0.45)] ring-1 ring-border backdrop-blur-sm md:px-5">
      {versaoMudou ? (
        <AvisoDeVersaoMudou oQue={oQue} recarregar={recarregar} />
      ) : null}
      {children}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" className="min-w-0 flex-1 text-sm">
          <Situacao novo={novo} problemas={problemas} sujo={sujo} />
        </div>
        <Button
          aria-busy={pendente}
          className={cn(BOTAO, "disabled:opacity-100")}
          disabled={pendente}
          focusableWhenDisabled
          type="submit"
        >
          <Carregando ativo={pendente} />
          Salvar
        </Button>
      </div>
    </div>
  );
}
