"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { Textarea } from "@cursos/ui/components/textarea";
import { cn } from "@cursos/ui/lib/utils";
import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useCallback,
  useContext,
} from "react";
import { AREA, CAMPO } from "@/components/casca/campos";
import { fmtNum } from "@/lib/formato";
import { ErroDoCampo, SaiuDoCampo, useErroDoCampo } from "./erros-do-editor";

import { ROTULO } from "./partes";

export function CampoDeTexto({
  ajuda,
  campoClasse,
  id,
  rotulo,
  rotuloClasse,
  ...input
}: {
  ajuda?: ReactNode;
  campoClasse?: string;
  id: string;
  rotulo: ReactNode;
  rotuloClasse?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">) {
  const { aria, mensagem } = useErroDoCampo(
    id,
    ajuda ? `${id}-ajuda` : undefined
  );
  return (
    <Field className={campoClasse} data-invalid={mensagem ? true : undefined}>
      <FieldLabel className={cn(ROTULO, rotuloClasse)} htmlFor={id}>
        {rotulo}
      </FieldLabel>
      <Input
        {...input}
        {...aria}
        autoComplete="off"
        className={cn(CAMPO, "h-11", input.className)}
        id={id}
      />
      {ajuda ? (
        <FieldDescription className="text-xs" id={`${id}-ajuda`}>
          {ajuda}
        </FieldDescription>
      ) : null}
      <ErroDoCampo id={id} mensagem={mensagem} />
    </Field>
  );
}

/**
 * Campo de texto que o editor lê (duração, vídeo, número, preço). O erro de
 * leitura aparece quando o admin sai do campo: o editor guarda quem saiu e
 * marca o campo pelo ErrosDoEditor, como o Salvar.
 */
export function CampoLido({
  aoMudar,
  aoSair,
  id,
  rotulo,
  rotuloClasse,
  texto,
  ...input
}: {
  aoMudar: (texto: string) => void;
  aoSair?: () => void;
  id: string;
  rotulo: ReactNode;
  rotuloClasse?: string;
  texto: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "id" | "onBlur" | "onChange" | "value"
>) {
  const saiuDoCampo = useContext(SaiuDoCampo);
  const { mensagem } = useErroDoCampo(id);

  const mudar = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => aoMudar(e.target.value),
    [aoMudar]
  );
  const sair = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      saiuDoCampo(id);
      if (aoSair) {
        const proximo = e.relatedTarget;
        aoSair();
        // O React move o bloco na lista, e o foco que ia para ele se perde.
        if (proximo instanceof HTMLElement) {
          requestAnimationFrame(() => proximo.focus());
        }
      }
    },
    [aoSair, id, saiuDoCampo]
  );

  return (
    <Field className="gap-1.5" data-invalid={mensagem ? true : undefined}>
      <FieldLabel className={cn(ROTULO, rotuloClasse)} htmlFor={id}>
        {rotulo}
      </FieldLabel>
      <Input
        {...input}
        aria-describedby={mensagem ? `${id}-erro` : undefined}
        aria-invalid={mensagem ? true : undefined}
        autoComplete="off"
        className={cn(CAMPO, "h-11 md:h-10", input.className)}
        id={id}
        onBlur={sair}
        onChange={mudar}
        value={texto}
      />
      <ErroDoCampo id={id} mensagem={mensagem} />
    </Field>
  );
}

export function AreaDeTexto({
  ajuda,
  aoMudar,
  campoClasse,
  id,
  maximo,
  rotulo,
  rotuloClasse,
  texto,
  ...area
}: {
  ajuda?: ReactNode;
  aoMudar: (texto: string) => void;
  campoClasse?: string;
  id: string;
  maximo?: number;
  rotulo: ReactNode;
  rotuloClasse?: string;
  texto: string;
} & Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "defaultValue" | "id" | "onBlur" | "onChange" | "value"
>) {
  const saiuDoCampo = useContext(SaiuDoCampo);
  const pe = ajuda || maximo !== undefined;
  const { aria, mensagem } = useErroDoCampo(id, pe ? `${id}-pe` : undefined);
  const mudar = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => aoMudar(e.target.value),
    [aoMudar]
  );
  const sair = useCallback(() => saiuDoCampo(id), [id, saiuDoCampo]);
  return (
    <Field
      // relative: o rótulo sr-only é absolute e, sem isto, escapa para fora do painel.
      className={cn("relative gap-1.5", campoClasse)}
      data-invalid={mensagem ? true : undefined}
    >
      <FieldLabel className={cn(ROTULO, rotuloClasse)} htmlFor={id}>
        {rotulo}
      </FieldLabel>
      <Textarea
        {...area}
        {...aria}
        className={cn(AREA, area.className)}
        id={id}
        maxLength={maximo}
        onBlur={sair}
        onChange={mudar}
        value={texto}
      />
      {pe ? (
        <FieldDescription
          className="flex justify-between gap-3 text-xs tabular-nums"
          id={`${id}-pe`}
        >
          <span>{ajuda}</span>
          {maximo === undefined ? null : (
            <span className="whitespace-nowrap">
              {fmtNum(texto.length)} de {fmtNum(maximo)}
            </span>
          )}
        </FieldDescription>
      ) : null}
      <ErroDoCampo id={id} mensagem={mensagem} />
    </Field>
  );
}
