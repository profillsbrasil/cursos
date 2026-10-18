"use client";

import { CARACTERES, LIMITES } from "@cursos/api/dominio/edicao-do-curso";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldLabel } from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import { Check, Plus, X } from "lucide-react";
import { type ChangeEvent, type Dispatch, useCallback } from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { CAMPO } from "@/components/casca/campos";
import { focarDepois, vizinhoQueFica } from "@/lib/editor";
import { plural } from "@/lib/formato";
import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";
import { ICONE, ROTULO, Secao } from "./partes";
import { ID } from "./rascunho-do-curso";
import type { Mudanca } from "./rascunho-do-editor";

const NOVO_TOPICO = "topico-novo";

function LinhaDoTopico({
  indice,
  mudar,
  remover,
  texto,
}: {
  indice: number;
  mudar: (indice: number, texto: string) => void;
  remover: (indice: number) => void;
  texto: string;
}) {
  const id = ID.topico(indice);
  const { aria, mensagem } = useErroDoCampo(id);
  const editar = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => mudar(indice, e.target.value),
    [indice, mudar]
  );
  const tirar = useCallback(() => remover(indice), [indice, remover]);
  return (
    <li>
      <Field
        className="relative gap-1.5"
        data-invalid={mensagem ? true : undefined}
      >
        <FieldLabel className={cn(ROTULO, "sr-only")} htmlFor={id}>
          Tópico {indice + 1}
        </FieldLabel>
        <div className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5">
          <Check
            aria-hidden="true"
            className="size-[18px] text-ceu"
            strokeWidth={2.5}
          />
          <Input
            {...aria}
            autoComplete="off"
            className={CAMPO}
            id={id}
            maxLength={CARACTERES.topico}
            onChange={editar}
            placeholder="Qualificar uma oportunidade com o diagnóstico consultivo"
            required
            value={texto}
          />
          <Button
            aria-label={`Tirar o tópico ${indice + 1}`}
            className={ICONE}
            id={`${id}-tirar`}
            onClick={tirar}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <ErroDoCampo id={id} mensagem={mensagem} />
      </Field>
    </li>
  );
}

export function TopicosDoCurso({
  despachar,
  topicos,
}: {
  despachar: Dispatch<Mudanca>;
  topicos: readonly string[];
}) {
  const trocar = useCallback(
    (novos: string[]) =>
      despachar({ mudanca: { topicos: novos }, tipo: "campos" }),
    [despachar]
  );
  const mudar = useCallback(
    (indice: number, texto: string) =>
      trocar(topicos.map((t, i) => (i === indice ? texto : t))),
    [topicos, trocar]
  );
  const remover = useCallback(
    (indice: number) => {
      trocar(topicos.filter((_, i) => i !== indice));
      const fica = vizinhoQueFica(topicos, indice);
      focarDepois(
        fica === null
          ? NOVO_TOPICO
          : ID.topico(Math.min(indice, topicos.length - 2))
      );
    },
    [topicos, trocar]
  );
  const adicionar = useCallback(() => {
    trocar([...topicos, ""]);
    focarDepois(ID.topico(topicos.length));
  }, [topicos, trocar]);
  const cheio = topicos.length >= LIMITES.topicos;
  return (
    <Secao
      id="topicos"
      resumo={`${topicos.length} de ${LIMITES.topicos} tópicos`}
      titulo="O que você vai aprender"
    >
      <div className="grid gap-4 p-5">
        {topicos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sem tópicos, a página do curso não mostra esta seção.
          </p>
        ) : (
          <ul className="grid gap-x-7 gap-y-2.5 md:grid-cols-2">
            {topicos.map((t, i) => (
              <LinhaDoTopico
                indice={i}
                // biome-ignore lint/suspicious/noArrayIndexKey: o tópico é só texto; o índice é a identidade e o id do campo.
                key={i}
                mudar={mudar}
                remover={remover}
                texto={t}
              />
            ))}
          </ul>
        )}
        {cheio ? (
          <p className="text-muted-foreground text-xs">
            {plural(
              LIMITES.topicos,
              "tópico é o limite",
              "tópicos são o limite"
            )}
            .
          </p>
        ) : (
          <div>
            <Button
              className={cn(BOTAO_CONTORNO, PEQUENO)}
              id={NOVO_TOPICO}
              onClick={adicionar}
            >
              <Plus aria-hidden="true" className="size-4" />
              Adicionar tópico
            </Button>
          </div>
        )}
      </div>
    </Secao>
  );
}
