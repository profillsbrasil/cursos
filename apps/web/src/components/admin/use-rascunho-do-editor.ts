"use client";

import {
  type DocumentoDoCurso,
  formularioDoCurso,
} from "@cursos/api/dominio/edicao-do-curso";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { focarOPrimeiro } from "@/lib/editor";
import { rota } from "@/lib/rotas";
import { useAcao } from "@/lib/use-acao";
import { useGuardaDeSaida } from "@/lib/use-guarda-de-saida";
import { trpcClient } from "@/utils/trpc";

import {
  rascunhoDoEditor,
  rascunhoDoEditorEm,
  telaDo,
} from "./rascunho-do-editor";

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
              rota(`/admin/catalogo/cursos/${envio.documento.id}`)
            );
          }
        },
        sucesso: "Curso salvo.",
      }
    );
  }, [envio, executar, router]);

  const descartar = useCallback(() => {
    despachar({ tipo: "descartado" });
    router.refresh();
    titulo.current?.focus({ preventScroll: true });
  }, [router, titulo]);

  return { descartar, despachar, estado, pendente, salvar, tela, titulo };
}
