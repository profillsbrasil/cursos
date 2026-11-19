"use client";

import {
  type MaterialDaPagina,
  TIPOS_DE_MATERIAL,
  tamanhoDoArquivo,
} from "@cursos/api/dominio/material";
import { Download } from "lucide-react";
import { useCallback, useState } from "react";

import { SeloDoTipo } from "@/components/material-de-apoio/selo-do-tipo";
import { focarDepois } from "@/lib/editor";

const VISIVEIS_PARA_O_CARTAO_CABER_NA_JANELA = 3;

const idDoLink = (id: string) => `material-${id}`;

/**
 * A lista do material de apoio no cartão do curso: os 3 primeiros e, com mais,
 * "Ver todos (n)", que mostra o resto ali mesmo e leva o foco ao primeiro que
 * apareceu. O link é um download comum: a rota responde com attachment.
 */
export function MaterialDoCurso({
  materiais,
}: {
  materiais: readonly MaterialDaPagina[];
}) {
  const [todos, setTodos] = useState(false);

  const mostrados = todos
    ? materiais
    : materiais.slice(0, VISIVEIS_PARA_O_CARTAO_CABER_NA_JANELA);

  const escondidos = materiais.length - mostrados.length;

  const verTodos = useCallback(() => {
    setTodos(true);
    const primeiro = materiais[VISIVEIS_PARA_O_CARTAO_CABER_NA_JANELA];

    if (primeiro) {
      focarDepois(idDoLink(primeiro.id));
    }
  }, [materiais]);

  return (
    <section aria-labelledby="material-do-curso" className="grid gap-2">
      <h2
        className="text-muted-foreground flex items-baseline justify-between text-[13px]"
        id="material-do-curso"
      >
        Material de apoio
        <span className="tabular-nums">{materiais.length}</span>
      </h2>
      <ul className="-mx-2.5 grid gap-0.5">
        {mostrados.map((m) => (
          <li key={m.id}>
            <a
              className="group ease-forte grid grid-cols-[34px_minmax(0,1fr)_16px] items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 transition-colors duration-150 hover:bg-white/8"
              download={m.nomeDoArquivo}
              href={m.href}
              id={idDoLink(m.id)}
              title={`Baixar ${m.nomeDoArquivo}`}
            >
              <SeloDoTipo tamanho="pequeno" tipo={m.tipo} />
              <span className="grid min-w-0">
                <span className="text-titulo truncate text-[13px] font-medium">
                  {m.titulo}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  <span className="sr-only">
                    {TIPOS_DE_MATERIAL[m.tipo].rotulo},{" "}
                  </span>
                  {tamanhoDoArquivo(m.bytes)}
                </span>
              </span>
              <Download
                aria-hidden="true"
                className="text-muted-foreground ease-forte group-hover:text-titulo size-4 transition-colors duration-150"
              />
            </a>
          </li>
        ))}
      </ul>
      {escondidos > 0 ? (
        <button
          className="toque text-ceu ease-forte hover:text-titulo cursor-pointer justify-self-start text-[13px] font-semibold transition-colors duration-150"
          onClick={verTodos}
          type="button"
        >
          Ver todos ({materiais.length})
        </button>
      ) : null}
    </section>
  );
}
