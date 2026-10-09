"use client";

import type { Motivo } from "@cursos/api";
import type { Versao } from "@cursos/api/dominio/tipos";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  type Apoio,
  apoioEm,
  apoioSalvo,
  sincronizarComAPagina,
} from "./editor";
import { useAcao } from "./use-acao";
import { useGuardaDeSaida } from "./use-guarda-de-saida";

interface Documento {
  versao: Versao | null;
}

export interface RegrasDoRascunho<D extends Documento, R, M> {
  deDocumento: (d: D) => R;
  mesmo: (a: R, b: R) => boolean;
  mudar: (r: R, m: M, base: D) => R;
}

export interface EstadoApoiado<D extends Documento, R> {
  apoio: Apoio<D>;
  /** Cresce a cada recomeço: o estado próprio do editor volta ao início com ela. */
  geracao: number;
  rascunho: R;
}

export type AcaoApoiada<D extends Documento, R, M> =
  | { tipo: "mudou"; mudanca: M }
  | { tipo: "pagina"; pagina: D; limpo: boolean }
  /** O admin clicou Recarregar: o rascunho recomeça da última página, e o refresh traz a seguinte. */
  | { tipo: "descartado" }
  /** O servidor gravou `enviado` como `gravado`; o que o admin editou depois fica. */
  | { tipo: "salvo"; gravado: D; enviado: R }
  /**
   * O servidor recusou o salvar. versao_mudou liga o aviso já, antes de o
   * refresh trazer a página; a página que chega decide se ele fica.
   */
  | { tipo: "recusado"; motivo: Motivo | null };

export const estadoApoiadoEm = <D extends Documento, R, M>(
  regras: RegrasDoRascunho<D, R, M>,
  pagina: D
): EstadoApoiado<D, R> => ({
  apoio: apoioEm(pagina),
  geracao: 0,
  rascunho: regras.deDocumento(pagina),
});

export function apoiado<D extends Documento, R, M>(
  regras: RegrasDoRascunho<D, R, M>,
  e: EstadoApoiado<D, R>,
  a: AcaoApoiada<D, R, M>
): EstadoApoiado<D, R> {
  switch (a.tipo) {
    case "mudou":
      return {
        ...e,
        rascunho: regras.mudar(e.rascunho, a.mudanca, e.apoio.base),
      };
    case "pagina": {
      const s = sincronizarComAPagina(e.apoio, a);
      return s.recomecar
        ? {
            apoio: s.apoio,
            geracao: e.geracao + 1,
            rascunho: regras.deDocumento(s.apoio.base),
          }
        : { ...e, apoio: s.apoio };
    }
    case "descartado":
      return {
        apoio: apoioEm(e.apoio.pagina),
        geracao: e.geracao + 1,
        rascunho: regras.deDocumento(e.apoio.pagina),
      };
    case "salvo":
      return {
        ...e,
        apoio: apoioSalvo(e.apoio, a.gravado),
        rascunho: regras.mesmo(e.rascunho, a.enviado)
          ? regras.deDocumento(a.gravado)
          : e.rascunho,
      };
    case "recusado":
      return a.motivo === "versao_mudou"
        ? { ...e, apoio: { ...e.apoio, versaoDeFora: true } }
        : e;
    default: {
      const nenhuma: never = a;
      throw new Error(`Ação sem regra: ${JSON.stringify(nenhuma)}`);
    }
  }
}

export const rascunhoSujo = <D extends Documento, R, M>(
  regras: RegrasDoRascunho<D, R, M>,
  e: EstadoApoiado<D, R>
) => !regras.mesmo(regras.deDocumento(e.apoio.base), e.rascunho);

/** O documento novo abre com ?novo=1 e o perde no primeiro salvar. */
export const urlDepoisDoSalvar = (
  base: Documento,
  caminho: Route
): Route | null => (base.versao === null ? caminho : null);

export interface OpcoesDoSalvar {
  aoRecusar?: (motivo: Motivo | null) => void;
  aoSalvar?: () => void;
  sucesso: string;
}

/**
 * Na navegação do App Router, o link clicado sai do DOM e o foco cai no
 * <body>; o editor que abre assim põe o foco no título.
 */
function useTituloComFoco<T extends HTMLElement>() {
  const titulo = useRef<T>(null);
  useEffect(() => {
    const ativo = document.activeElement;
    if (ativo === null || ativo === document.body) {
      titulo.current?.focus({ preventScroll: true });
    }
  }, []);
  return titulo;
}

export function useRascunhoApoiado<D extends Documento, R, M>({
  caminho,
  pagina,
  regras,
  sujoAlem,
}: {
  caminho: Route;
  pagina: D;
  regras: RegrasDoRascunho<D, R, M>;
  /** O que o editor guarda fora do rascunho e ainda não salvou, nesta geração. */
  sujoAlem?: (geracao: number) => boolean;
}) {
  const router = useRouter();
  const { executar, pendente } = useAcao();
  const [estado, despachar] = useReducer(
    (e: EstadoApoiado<D, R>, a: AcaoApoiada<D, R, M>) => apoiado(regras, e, a),
    pagina,
    (p) => estadoApoiadoEm(regras, p)
  );
  const { apoio, geracao, rascunho } = estado;
  const novo = apoio.base.versao === null;
  const titulo = useTituloComFoco<HTMLHeadingElement>();
  const sujo = (sujoAlem?.(geracao) ?? false) || rascunhoSujo(regras, estado);
  if (pagina !== apoio.pagina) {
    despachar({ limpo: !sujo, pagina, tipo: "pagina" });
  }
  useGuardaDeSaida(sujo);

  const mudar = useCallback(
    (mudanca: M) => despachar({ mudanca, tipo: "mudou" }),
    []
  );

  const salvar = useCallback(
    (
      documento: D,
      fazer: () => Promise<{ versao: Versao }>,
      opcoes: OpcoesDoSalvar
    ) => {
      const enviado = rascunho;
      const url = urlDepoisDoSalvar(apoio.base, caminho);
      executar(fazer, {
        aoRecusar: (motivo) => {
          despachar({ motivo, tipo: "recusado" });
          opcoes.aoRecusar?.(motivo);
        },
        depois: ({ versao }) => {
          despachar({
            enviado,
            gravado: { ...documento, versao },
            tipo: "salvo",
          });
          opcoes.aoSalvar?.();
          if (url) {
            router.replace(url);
          }
        },
        sucesso: opcoes.sucesso,
      });
    },
    [apoio.base, caminho, executar, rascunho, router]
  );

  // O aviso sai do DOM com o botão Recarregar, e o foco cairia no <body>.
  const descartar = useCallback(() => {
    despachar({ tipo: "descartado" });
    router.refresh();
    titulo.current?.focus({ preventScroll: true });
  }, [router, titulo]);

  return {
    base: apoio.base,
    descartar,
    geracao,
    mudar,
    novo,
    pendente,
    rascunho,
    salvar,
    sujo,
    titulo,
    versaoMudou: apoio.versaoDeFora,
  };
}

export function useDaGeracao<T>(
  geracao: number,
  inicial: T
): [T, Dispatch<SetStateAction<T>>] {
  const [guardado, guardar] = useState({ geracao, valor: inicial });
  const valor = guardado.geracao === geracao ? guardado.valor : inicial;
  const mudar = useCallback(
    (v: SetStateAction<T>) =>
      guardar((atual) => {
        const antes = atual.geracao === geracao ? atual.valor : inicial;
        return {
          geracao,
          valor: v instanceof Function ? v(antes) : v,
        };
      }),
    [geracao, inicial]
  );
  return [valor, mudar];
}
