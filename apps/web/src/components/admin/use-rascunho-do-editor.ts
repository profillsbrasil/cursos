"use client";

import {
  type DocumentoDoCurso,
  formularioDoCurso,
} from "@cursos/api/dominio/edicao-do-curso";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { focarOPrimeiro } from "@/lib/editor";
import { useAcao } from "@/lib/use-acao";
import { useGuardaDeSaida } from "@/lib/use-guarda-de-saida";
import { trpcClient } from "@/utils/trpc";

import {
  rascunhoDoEditor,
  rascunhoDoEditorEm,
  telaDo,
} from "./rascunho-do-editor";

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

/** Liga o rascunho do editor à página, ao servidor e ao foco do DOM. */
export function useRascunhoDoEditor(pagina: DocumentoDoCurso) {
  const router = useRouter();
  const { executar, pendente } = useAcao();
  const [estado, despachar] = useReducer(
    rascunhoDoEditor,
    pagina,
    rascunhoDoEditorEm
  );
  const tela = telaDo(estado);
  const titulo = useTituloComFoco<HTMLHeadingElement>();
  if (pagina !== estado.apoio.pagina) {
    despachar({ pagina, tipo: "pagina" });
  }
  useGuardaDeSaida(tela.sujo);
  // Depois do render: o campo marcado pode estar num bloco que abriu com o erro.
  useEffect(() => {
    if (estado.foco) {
      focarOPrimeiro(estado.foco);
    }
  }, [estado.foco]);

  const { envio } = tela;
  const salvar = useCallback(() => {
    despachar({ tipo: "salvar" });
    if (envio === null) {
      return;
    }
    executar(
      () =>
        trpcClient.admin.catalogo.salvarCurso.mutate(
          formularioDoCurso(envio.documento, envio.capa)
        ),
      {
        aoRecusar: (motivo) => despachar({ envio, motivo, tipo: "recusado" }),
        depois: ({ versao }) => {
          despachar({ envio, tipo: "salvo", versao });
          if (envio.novo) {
            router.replace(
              `/admin/catalogo/cursos/${envio.documento.id}` as Route
            );
          }
        },
        sucesso: "Curso salvo.",
      }
    );
  }, [envio, executar, router]);

  // O aviso sai do DOM com o botão Recarregar, e o foco cairia no <body>.
  const descartar = useCallback(() => {
    despachar({ tipo: "descartado" });
    router.refresh();
    titulo.current?.focus({ preventScroll: true });
  }, [router, titulo]);

  return { descartar, despachar, estado, pendente, salvar, tela, titulo };
}
