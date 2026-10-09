"use client";

import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { Loader2 } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useId,
  useRef,
} from "react";

import { BOTAO, BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";

export function Carregando({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <Loader2
      aria-hidden="true"
      className="animate-spin motion-reduce:animate-none"
    />
  ) : null;
}

/** A linha da tela com a confirmação aberta; uma por vez. */
export interface LinhaAberta {
  chave: string | null;
  /** Fecha só se a confirmação aberta ainda for esta: outra linha pode ter aberto a dela no meio do envio. */
  fechar: (chave: string) => void;
  pedir: (chave: string | null) => void;
}

/**
 * Um botão que abre, na própria linha, uma pergunta com "confirmar" e
 * "Cancelar". Escape e "Cancelar" fecham e devolvem o foco ao botão que abriu.
 * Enquanto envia, a confirmação fica aberta e o foco fica no botão de confirmar.
 */
export function ConfirmacaoNaLinha({
  botao,
  chave,
  className,
  confirmar,
  enviando,
  gatilho,
  linhaAberta,
  pergunta,
}: {
  /** O botão de confirmar. */
  botao: { nome?: string; rotulo: string };
  chave: string;
  /** Layout do grupo aberto: em linha na tabela, em bloco embaixo do título. */
  className: string;
  confirmar: () => void;
  enviando: boolean;
  /** O botão que abre a confirmação. */
  gatilho: { nome: string; rotulo: string };
  linhaAberta: LinhaAberta;
  pergunta: ReactNode;
}) {
  const id = useId();
  const voltaOFoco = useRef(false);
  const { pedir } = linhaAberta;
  const abrir = useCallback(() => pedir(chave), [pedir, chave]);
  const cancelar = useCallback(() => {
    voltaOFoco.current = true;
    pedir(null);
  }, [pedir]);
  const focarAoVoltar = useCallback(
    (gatilhoNaTela: HTMLButtonElement | null) => {
      if (gatilhoNaTela && voltaOFoco.current) {
        voltaOFoco.current = false;
        gatilhoNaTela.focus();
      }
    },
    []
  );
  const aoTeclar = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) {
        e.preventDefault();
        cancelar();
      }
    },
    [cancelar, enviando]
  );

  if (!(linhaAberta.chave === chave || enviando)) {
    return (
      <Button
        aria-label={gatilho.nome}
        className={cn(BOTAO_CONTORNO, PEQUENO)}
        onClick={abrir}
        ref={focarAoVoltar}
      >
        {gatilho.rotulo}
      </Button>
    );
  }
  return (
    <fieldset aria-labelledby={id} className={cn("min-w-0", className)}>
      <div id={id}>{pergunta}</div>
      <div className="flex flex-wrap gap-2">
        <Button
          aria-busy={enviando}
          aria-label={botao.nome}
          autoFocus
          className={cn(BOTAO, PEQUENO)}
          disabled={enviando}
          focusableWhenDisabled
          onClick={confirmar}
          onKeyDown={aoTeclar}
        >
          <Carregando ativo={enviando} />
          {botao.rotulo}
        </Button>
        <Button
          className={cn(BOTAO_CONTORNO, PEQUENO)}
          disabled={enviando}
          onClick={cancelar}
          onKeyDown={aoTeclar}
        >
          Cancelar
        </Button>
      </div>
    </fieldset>
  );
}
