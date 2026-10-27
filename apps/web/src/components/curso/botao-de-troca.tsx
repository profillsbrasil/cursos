"use client";

import type { CursoId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { Gift, Loader2 } from "lucide-react";
import { useCallback } from "react";

import { BOTAO, CONTORNO_DESLIGADO } from "@/components/casca/botoes";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import {
  ERRO_DA_TROCA,
  TROCOU,
  type TrocaDaAmostra,
} from "./textos-da-amostra";

/**
 * O botão que troca o curso da amostra, na coluna da página do curso e no fim do
 * vídeo. Troca pelo `troca.trocar` com o preço que a pessoa viu, e o refresh do
 * `useAcao` abre o curso inteiro. Sem saldo, fica desligado e focável, e o
 * `aria-describedby` aponta para a frase do saldo, que diz quanto falta.
 */
export function BotaoDeTroca({
  className,
  cursoId,
  idDaRazao,
  troca,
}: {
  className?: string;
  cursoId: CursoId;
  /** O id da frase do saldo, que explica o botão desligado. */
  idDaRazao: string;
  troca: Extract<TrocaDaAmostra, { tipo: "faltam" | "pode_trocar" }>;
}) {
  const { executar, pendente } = useAcao();
  const { preco } = troca;
  const trocar = useCallback(
    () =>
      executar(
        () => trpcClient.troca.trocar.mutate({ cursoId, precoVisto: preco }),
        { erro: ERRO_DA_TROCA, sucesso: TROCOU }
      ),
    [cursoId, executar, preco]
  );
  if (troca.tipo === "faltam") {
    return (
      <Button
        aria-describedby={idDaRazao}
        className={cn(CONTORNO_DESLIGADO, className)}
        disabled
        focusableWhenDisabled
      >
        {/* Um texto só: o espaço solto entre dois pedaços some do nome acessível. */}
        {troca.botao}
      </Button>
    );
  }
  return (
    <Button
      aria-busy={pendente}
      aria-describedby={idDaRazao}
      className={cn(BOTAO, className)}
      disabled={pendente}
      focusableWhenDisabled
      onClick={trocar}
    >
      {pendente ? (
        <Loader2
          aria-hidden="true"
          className="animate-spin motion-reduce:animate-none"
        />
      ) : (
        <Gift aria-hidden="true" />
      )}
      {troca.botao}
    </Button>
  );
}
