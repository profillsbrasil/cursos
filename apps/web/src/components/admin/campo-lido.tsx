"use client";

import type { AulaDoDocumento } from "@cursos/api/dominio/edicao-do-curso";
import { videoDoTexto } from "@cursos/api/dominio/video";
import { Field, FieldError, FieldLabel } from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { duracaoDoTexto } from "@/lib/formato";

import { CAMPO, ROTULO } from "./partes";

export type Leitura<T> = { valor: T } | { erro: string };

/**
 * Campo de texto que vira outro tipo (duração, vídeo, número). Guarda o texto
 * enquanto ele não lê, marca o campo inválido para o formulário não enviar e
 * mostra o erro depois que a pessoa sai do campo ou tenta salvar.
 */
export function CampoLido<T>({
  aoLer,
  aoSair,
  inicial,
  ler,
  rotulo,
  rotuloClasse,
  ...input
}: {
  aoLer: (valor: T) => void;
  aoSair?: () => void;
  /** O valor do documento como texto; quando ele muda por fora, o campo acompanha. */
  inicial: string;
  ler: (texto: string) => Leitura<T>;
  rotulo: ReactNode;
  rotuloClasse?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "onBlur" | "onChange" | "value"
>) {
  const id = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(inicial);
  const [base, setBase] = useState(inicial);
  const [tocado, setTocado] = useState(false);
  // Subir e descer o módulo trocam o número sem passar pelo campo. O texto que a
  // pessoa digitou e que já lê como o valor novo fica como está.
  if (inicial !== base) {
    setBase(inicial);
    if (JSON.stringify(ler(texto)) !== JSON.stringify(ler(inicial))) {
      setTexto(inicial);
    }
  }
  const lido = ler(texto);
  const erro = "erro" in lido ? lido.erro : null;

  useEffect(() => {
    campo.current?.setCustomValidity(erro ?? "");
  }, [erro]);

  const mudar = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setTexto(e.target.value);
      const r = ler(e.target.value);
      if ("valor" in r) {
        aoLer(r.valor);
      }
    },
    [ler, aoLer]
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
  const marcar = useCallback(() => setTocado(true), []);

  return (
    <Field className="gap-1.5">
      <FieldLabel className={cn(ROTULO, rotuloClasse)} htmlFor={id}>
        {rotulo}
      </FieldLabel>
      <Input
        {...input}
        aria-describedby={erro && tocado ? `${id}-erro` : undefined}
        aria-invalid={tocado && erro ? true : undefined}
        autoComplete="off"
        className={cn(CAMPO, "h-11 md:h-10", input.className)}
        id={id}
        onBlur={sair}
        onChange={mudar}
        onInvalid={marcar}
        ref={campo}
        value={texto}
      />
      {tocado && erro ? (
        <FieldError className="text-xs" id={`${id}-erro`}>
          {erro}
        </FieldError>
      ) : null}
    </Field>
  );
}

export function lerDuracao(texto: string): Leitura<number> {
  const seg = duracaoDoTexto(texto);
  return seg === null
    ? { erro: "Escreva a duração em mm:ss, como 12:30." }
    : { valor: seg };
}

export function lerVideo(texto: string): Leitura<AulaDoDocumento["video"]> {
  if (texto.trim() === "") {
    return { valor: null };
  }
  const video = videoDoTexto(texto);
  return video
    ? { valor: video }
    : { erro: "Cole um link do YouTube ou o id do vídeo." };
}

const lerInteiro =
  (min: number, max: number, erro: string) =>
  (texto: string): Leitura<number> => {
    const n = Number(texto.trim());
    return texto.trim() !== "" && Number.isInteger(n) && n >= min && n <= max
      ? { valor: n }
      : { erro };
  };

export const lerNumeroDoModulo = lerInteiro(
  0,
  999,
  "Use um número de 0 a 999."
);
export const lerPreco = lerInteiro(
  1,
  1_000_000,
  "Use um preço de 1 a 1.000.000 pontos."
);
