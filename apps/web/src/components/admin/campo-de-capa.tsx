"use client";

import {
  LIMITE_DA_CAPA,
  type RecusaDaCapa,
  recusaDaMedida,
  recusaDoTamanho,
} from "@cursos/api/dominio/capa";
import type { Capa } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldDescription } from "@cursos/ui/components/field";
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
import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";

import { ID } from "./rascunho-do-curso";

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

export interface EstadoDaCapa {
  erro: string | null;
  escolhida: Escolhida | null;
  geracao: number;
}

/**
 * O campo zera sem remontar, porque o texto alternativo mora nele e perderia
 * o foco. Ele zera no recomeço do editor e quando o editor deixa de guardar o
 * arquivo que o campo mostra, como depois do salvar que o enviou.
 */
export const capaNoCampo = (
  e: EstadoDaCapa,
  arquivo: File | null,
  geracao: number
): EstadoDaCapa =>
  e.geracao !== geracao ||
  (e.escolhida !== null && e.escolhida.arquivo !== arquivo)
    ? { erro: null, escolhida: null, geracao }
    : e;

const MOLDURA =
  "relative grid aspect-[900/604] w-full place-items-center overflow-hidden rounded-[14px] bg-background ring-1 ring-border";

function Previa({
  atual,
  escolhida,
}: {
  atual: Capa | null;
  escolhida: Escolhida | null;
}) {
  if (escolhida) {
    return (
      <Image
        alt="Nova capa"
        className="object-cover"
        fill
        sizes="(max-width: 768px) 100vw, 280px"
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
        sizes="(max-width: 768px) 100vw, 280px"
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
  aoEscolher,
  arquivo: guardado,
  atual,
  geracao,
}: {
  aoEscolher: (arquivo: File | null) => void;
  /** O arquivo que o editor guarda para enviar no próximo salvar. */
  arquivo: File | null;
  atual: Capa | null;
  geracao: number;
}) {
  const id = useId();
  const [estado, guardar] = useState<EstadoDaCapa>({
    erro: null,
    escolhida: null,
    geracao,
  });
  const ajustado = capaNoCampo(estado, guardado, geracao);
  if (ajustado !== estado) {
    guardar(ajustado);
  }
  const { erro, escolhida } = ajustado;
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (escolhida) {
      return () => URL.revokeObjectURL(escolhida.url);
    }
    if (input.current) {
      input.current.value = "";
    }
  }, [escolhida]);

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
        guardar({ erro: r.erro, escolhida: null, geracao });
        aoEscolher(null);
        return;
      }
      guardar({
        erro: null,
        escolhida: {
          arquivo,
          medida: r.medida,
          url: URL.createObjectURL(arquivo),
        },
        geracao,
      });
      aoEscolher(arquivo);
    },
    [aoEscolher, geracao]
  );

  const desfazer = useCallback(() => {
    guardar({ erro: null, escolhida: null, geracao });
    aoEscolher(null);
  }, [aoEscolher, geracao]);

  const medida = escolhida?.medida ?? atual;
  const arquivo = ID.curso("capa");
  const daImagem = useErroDoCampo(arquivo, `${id}-regra`);
  const mensagemDaImagem = erro ?? daImagem.mensagem;
  return (
    <div className="grid content-start gap-4">
      <div className="grid gap-2">
        <div className={MOLDURA}>
          <Previa atual={atual} escolhida={escolhida} />
        </div>
        {medida ? (
          <p className="text-muted-foreground text-xs tabular-nums">
            {escolhida ? "Nova capa, " : ""}
            {fmtNum(medida.largura)} × {fmtNum(medida.altura)} px
          </p>
        ) : null}
      </div>
      <Field
        className="relative"
        data-invalid={mensagemDaImagem ? true : undefined}
      >
        <p className="sr-only">Imagem da capa</p>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(BOTAO_CONTORNO, PEQUENO, "cursor-pointer")}
            htmlFor={arquivo}
          >
            <ImageUp aria-hidden="true" className="size-4" />
            {atual || escolhida ? "Trocar capa" : "Escolher capa"}
            <input
              accept={TIPOS.join(",")}
              aria-describedby={
                mensagemDaImagem ? `${id}-regra ${arquivo}-erro` : `${id}-regra`
              }
              aria-invalid={mensagemDaImagem ? true : undefined}
              className="sr-only"
              id={arquivo}
              onChange={escolher}
              ref={input}
              required={!(atual || escolhida)}
              type="file"
            />
          </label>
          {escolhida ? (
            <Button className={cn(BOTAO_CONTORNO, PEQUENO)} onClick={desfazer}>
              {atual ? "Manter a capa atual" : "Tirar a imagem"}
            </Button>
          ) : null}
        </div>
        <FieldDescription className="text-xs" id={`${id}-regra`}>
          JPG, PNG ou WebP, até {LIMITE_DA_CAPA.bytes / 1024 / 1024} MB, com
          pelo menos {fmtNum(LIMITE_DA_CAPA.larguraMinima)} px de largura.
        </FieldDescription>
        <ErroDoCampo id={arquivo} mensagem={mensagemDaImagem} />
      </Field>
    </div>
  );
}
