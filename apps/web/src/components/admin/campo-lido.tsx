"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  useCallback,
  useState,
} from "react";

import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";
import { CAMPO, ROTULO } from "./partes";
import type { Leitura } from "./rascunho-do-curso";

/** Campo de texto do editor: rótulo, input, ajuda opcional e o erro do salvar. */
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
 * Campo de texto que vira outro tipo (duração, vídeo, número, preço). O texto
 * mora no rascunho; aqui só se decide quando mostrar o erro da leitura: depois
 * que a pessoa sai do campo, ou quando o salvar marca o campo.
 */
export function CampoLido<T>({
  aoMudar,
  aoSair,
  id,
  ler,
  rotulo,
  rotuloClasse,
  texto,
  ...input
}: {
  aoMudar: (texto: string) => void;
  aoSair?: () => void;
  id: string;
  ler: (texto: string) => Leitura<T>;
  rotulo: ReactNode;
  rotuloClasse?: string;
  texto: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "id" | "onBlur" | "onChange" | "value"
>) {
  const [tocado, setTocado] = useState(false);
  const doSalvar = useErroDoCampo(id);
  const lido = ler(texto);
  const mensagem =
    doSalvar.mensagem ?? (tocado && "erro" in lido ? lido.erro : null);

  const mudar = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => aoMudar(e.target.value),
    [aoMudar]
  );
  const sair = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      setTocado(true);
      if (aoSair) {
        const proximo = e.relatedTarget;
        aoSair();
        // O React move o bloco na lista, e o foco que ia para ele se perde.
        if (proximo instanceof HTMLElement) {
          requestAnimationFrame(() => proximo.focus());
        }
      }
    },
    [aoSair]
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
