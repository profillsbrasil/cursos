"use client";

import {
  LIMITE_DA_CAPA,
  type RecusaDaCapa,
  recusaDaMedida,
  recusaDoTamanho,
} from "@cursos/api/dominio/capa";
import type { Capa } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import { ImageUp } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { fmtNum } from "@/lib/formato";

import { CAMPO, ROTULO } from "./partes";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];

function mensagem(r: RecusaDaCapa, arquivo: File): string {
  switch (r.tipo) {
    case "formato":
      return "Use uma imagem JPG, PNG ou WebP.";
    case "pesada":
      return `A imagem tem ${(arquivo.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB, e o limite é ${r.limiteMb} MB.`;
    case "estreita":
      return `A imagem precisa de pelo menos ${fmtNum(r.larguraMinima)} px de largura.`;
    case "enorme":
      return `A imagem passa de ${fmtNum(r.ladoMaximo)} px num dos lados.`;
    case "desligado":
      return "O envio de capas está desligado neste ambiente.";
    default: {
      const nenhuma: never = r;
      return String(nenhuma);
    }
  }
}

interface Medida {
  altura: number;
  largura: number;
}

/** Tipo, tamanho e medida, na ordem barata primeiro. O servidor confere de novo. */
async function conferir(
  arquivo: File
): Promise<{ medida: Medida } | { erro: string }> {
  if (!TIPOS.includes(arquivo.type)) {
    return { erro: mensagem({ tipo: "formato" }, arquivo) };
  }
  const pesada = recusaDoTamanho(arquivo.size);
  if (pesada) {
    return { erro: mensagem(pesada, arquivo) };
  }
  let medida: Medida;
  try {
    // createImageBitmap aplica a orientação EXIF, como o servidor.
    const bitmap = await createImageBitmap(arquivo);
    medida = { altura: bitmap.height, largura: bitmap.width };
    bitmap.close();
  } catch {
    return { erro: mensagem({ tipo: "formato" }, arquivo) };
  }
  const recusa = recusaDaMedida(medida.largura, medida.altura);
  return recusa ? { erro: mensagem(recusa, arquivo) } : { medida };
}

interface Escolhida {
  arquivo: File;
  medida: Medida;
  url: string;
}

const MOLDURA =
  "relative grid aspect-video w-full place-items-center overflow-hidden rounded-[14px] bg-background ring-1 ring-border";

/**
 * A capa atual ou a prévia do arquivo escolhido, o botão de escolher e o texto
 * alternativo. Curso novo exige arquivo: o input fica required até haver um.
 */
function Previa({
  alt,
  atual,
  escolhida,
}: {
  alt: string;
  atual: Capa | null;
  escolhida: Escolhida | null;
}) {
  if (escolhida) {
    return (
      <Image
        alt={alt}
        className="object-cover"
        fill
        sizes="(max-width: 768px) 100vw, 40vw"
        src={escolhida.url}
        unoptimized
      />
    );
  }
  if (atual) {
    return (
      <Image
        alt={atual.alt}
        className="object-cover"
        fill
        sizes="(max-width: 768px) 100vw, 40vw"
        src={atual.url}
      />
    );
  }
  return (
    <p className="px-6 text-center text-muted-foreground text-sm">
      Sem capa ainda
    </p>
  );
}

export function CampoDeCapa({
  alt,
  aoEscolher,
  atual,
  mudarAlt,
}: {
  alt: string;
  aoEscolher: (arquivo: File | null) => void;
  atual: Capa | null;
  /** O input se chama capaAlt, o nome do campo no documento. */
  mudarAlt: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const id = useId();
  const [escolhida, setEscolhida] = useState<Escolhida | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (escolhida) {
        URL.revokeObjectURL(escolhida.url);
      }
    },
    [escolhida]
  );

  const escolher = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const campo = e.currentTarget;
      const arquivo = campo.files?.[0];
      if (!arquivo) {
        return;
      }
      const r = await conferir(arquivo);
      if ("erro" in r) {
        campo.value = "";
        setErro(r.erro);
        setEscolhida(null);
        aoEscolher(null);
        return;
      }
      setErro(null);
      setEscolhida({
        arquivo,
        medida: r.medida,
        url: URL.createObjectURL(arquivo),
      });
      aoEscolher(arquivo);
    },
    [aoEscolher]
  );

  const desfazer = useCallback(() => {
    if (input.current) {
      input.current.value = "";
    }
    setEscolhida(null);
    setErro(null);
    aoEscolher(null);
  }, [aoEscolher]);

  const medida = escolhida?.medida ?? atual;
  return (
    <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start">
      <div className="grid gap-2">
        <div className={MOLDURA}>
          <Previa alt={alt} atual={atual} escolhida={escolhida} />
        </div>
        {medida ? (
          <p className="text-muted-foreground text-xs tabular-nums">
            {escolhida ? "Nova capa, " : ""}
            {fmtNum(medida.largura)} × {fmtNum(medida.altura)} px
          </p>
        ) : null}
      </div>
      <div className="grid gap-5">
        <Field>
          <p className={ROTULO}>Imagem</p>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={cn(
                BOTAO_CONTORNO,
                PEQUENO,
                "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-ceu has-focus-visible:outline-solid has-focus-visible:outline-offset-3"
              )}
              htmlFor={`${id}-arquivo`}
            >
              <ImageUp aria-hidden="true" className="size-4" />
              {atual || escolhida ? "Trocar imagem" : "Escolher imagem"}
              <input
                accept={TIPOS.join(",")}
                aria-describedby={`${id}-regra`}
                aria-invalid={erro ? true : undefined}
                className="sr-only"
                id={`${id}-arquivo`}
                onChange={escolher}
                ref={input}
                required={!(atual || escolhida)}
                type="file"
              />
            </label>
            {escolhida ? (
              <Button
                className={cn(BOTAO_CONTORNO, PEQUENO)}
                onClick={desfazer}
              >
                {atual ? "Manter a capa atual" : "Tirar a imagem"}
              </Button>
            ) : null}
          </div>
          <FieldDescription className="text-xs" id={`${id}-regra`}>
            JPG, PNG ou WebP, até {LIMITE_DA_CAPA.bytes / 1024 / 1024} MB, com
            pelo menos {fmtNum(LIMITE_DA_CAPA.larguraMinima)} px de largura.
          </FieldDescription>
          {erro ? <FieldError className="text-sm">{erro}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel className={ROTULO} htmlFor={`${id}-alt`}>
            Descrição da capa
          </FieldLabel>
          <Input
            autoComplete="off"
            className={cn(CAMPO, "h-11")}
            id={`${id}-alt`}
            maxLength={300}
            name="capaAlt"
            onChange={mudarAlt}
            placeholder="Envasadora de líquidos com o painel aberto"
            required
            value={alt}
          />
          <FieldDescription className="text-xs">
            Quem usa leitor de tela ouve este texto no lugar da imagem.
          </FieldDescription>
        </Field>
      </div>
    </div>
  );
}
