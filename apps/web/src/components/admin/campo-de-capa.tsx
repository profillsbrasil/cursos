"use client";

import {
  LIMITE_DA_CAPA,
  type RecusaDaCapa,
  recusaDaMedida,
  recusaDoTamanho,
} from "@cursos/api/dominio/capa";
import type { Capa } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Field } from "@cursos/ui/components/field";
import { cn } from "@cursos/ui/lib/utils";
import { ImageUp } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type DragEvent,
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
}

const VAZIO: EstadoDaCapa = { erro: null, escolhida: null };

/**
 * O campo zera quando o editor deixa de guardar o arquivo que ele mostra, como
 * depois do salvar que o enviou. O recomeço do editor o remonta pela key.
 */
export const capaNoCampo = (
  e: EstadoDaCapa,
  arquivo: File | null
): EstadoDaCapa =>
  e.escolhida !== null && e.escolhida.arquivo !== arquivo ? VAZIO : e;

const AREA_DA_CAPA =
  "group relative grid aspect-[900/604] w-full cursor-pointer place-items-center overflow-hidden rounded-[14px] border-[1.5px] bg-background transition-colors data-arrastando:border-ceu";

/**
 * Sob o cursor e com o foco, a camada escura com a pílula no meio; numa tela sem
 * hover, só a pílula, sempre à vista no canto.
 */
const CAMADA =
  "absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:place-items-end [@media(hover:none)]:bg-transparent [@media(hover:none)]:p-2.5 [@media(hover:none)]:opacity-100";

const PILULA =
  "inline-flex h-9 items-center gap-2 rounded-full bg-popover px-3.5 font-semibold text-[13px] text-titulo shadow-sm";

export function CampoDeCapa({
  aoEscolher,
  arquivo: guardado,
  atual,
}: {
  aoEscolher: (arquivo: File | null) => void;
  /** O arquivo que o editor guarda para enviar no próximo salvar. */
  arquivo: File | null;
  atual: Capa | null;
}) {
  const id = useId();
  const [estado, guardar] = useState<EstadoDaCapa>(VAZIO);
  const ajustado = capaNoCampo(estado, guardado);
  if (ajustado !== estado) {
    guardar(ajustado);
  }
  const { erro, escolhida } = ajustado;
  const [arrastando, setArrastando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (escolhida) {
      return () => URL.revokeObjectURL(escolhida.url);
    }
    if (input.current) {
      input.current.value = "";
    }
  }, [escolhida]);

  const receber = useCallback(
    async (recebido: File) => {
      const r = await conferir(recebido);
      if ("erro" in r) {
        if (input.current) {
          input.current.value = "";
        }
        guardar({ erro: r.erro, escolhida: null });
        aoEscolher(null);
        return;
      }
      guardar({
        erro: null,
        escolhida: {
          arquivo: recebido,
          medida: r.medida,
          url: URL.createObjectURL(recebido),
        },
      });
      aoEscolher(recebido);
    },
    [aoEscolher]
  );

  const escolher = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const arquivo = e.currentTarget.files?.[0];
      if (arquivo) {
        receber(arquivo);
      }
    },
    [receber]
  );

  const arrastar = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setArrastando(true);
  }, []);
  const sair = useCallback((e: DragEvent<HTMLLabelElement>) => {
    // O dragleave dispara também ao passar de um filho para outro dentro da área.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setArrastando(false);
    }
  }, []);
  const soltar = useCallback(
    (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setArrastando(false);
      const [arquivo] = e.dataTransfer.files;
      if (arquivo) {
        receber(arquivo);
      }
    },
    [receber]
  );

  const desfazer = useCallback(() => {
    guardar(VAZIO);
    aoEscolher(null);
  }, [aoEscolher]);

  const imagem = escolhida
    ? { alt: "Nova capa", src: escolhida.url, unoptimized: true }
    : atual && { alt: atual.alt, src: atual.url };
  const temCapa = imagem !== null;
  const medida = escolhida?.medida ?? atual;
  const arquivo = ID.curso("capa");
  const daImagem = useErroDoCampo(arquivo, `${id}-regra`);
  const mensagemDaImagem = erro ?? daImagem.mensagem;
  const regra = (
    <span
      className="text-muted-foreground text-xs leading-normal"
      id={`${id}-regra`}
    >
      JPG, PNG ou WebP, até {LIMITE_DA_CAPA.bytes / 1024 / 1024} MB, com pelo
      menos {fmtNum(LIMITE_DA_CAPA.larguraMinima)} px de largura.
    </span>
  );
  return (
    <Field
      className="relative content-start gap-2"
      data-invalid={mensagemDaImagem ? true : undefined}
    >
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: soltar o arquivo é atalho do mouse; o teclado escolhe pelo input dentro do rótulo. */}
      <label
        className={cn(
          AREA_DA_CAPA,
          temCapa
            ? "border-border"
            : "border-trilho border-dashed has-[[aria-invalid=true]]:border-destructive"
        )}
        data-arrastando={arrastando ? true : undefined}
        data-campo={temCapa ? undefined : true}
        onDragEnter={arrastar}
        onDragLeave={sair}
        onDragOver={arrastar}
        onDrop={soltar}
      >
        <input
          accept={TIPOS.join(",")}
          aria-describedby={
            mensagemDaImagem ? `${id}-regra ${arquivo}-erro` : `${id}-regra`
          }
          aria-invalid={mensagemDaImagem ? true : undefined}
          aria-label={temCapa ? "Trocar capa" : "Escolher capa"}
          className="sr-only"
          id={arquivo}
          onChange={escolher}
          ref={input}
          required={!temCapa}
          type="file"
        />
        {imagem ? (
          <>
            <Image
              {...imagem}
              className="object-cover"
              fill
              sizes="(max-width: 768px) 100vw, 440px"
            />
            <span aria-hidden="true" className={CAMADA}>
              <span className={PILULA}>
                <ImageUp className="size-4" />
                Trocar capa
              </span>
            </span>
          </>
        ) : (
          <span className="grid justify-items-center gap-1.5 px-6 text-center">
            <ImageUp aria-hidden="true" className="mb-1 size-7 text-ceu" />
            <span
              aria-hidden="true"
              className="font-semibold text-sm text-titulo"
            >
              Escolher capa
            </span>
            {regra}
          </span>
        )}
      </label>
      {medida ? (
        <p className="text-muted-foreground text-xs tabular-nums">
          {escolhida ? "Nova capa, " : ""}
          {fmtNum(medida.largura)} × {fmtNum(medida.altura)} px
        </p>
      ) : null}
      {temCapa ? regra : null}
      <ErroDoCampo id={arquivo} mensagem={mensagemDaImagem} />
      {escolhida ? (
        <Button
          className={cn(BOTAO_CONTORNO, PEQUENO, "justify-self-start")}
          onClick={desfazer}
        >
          {atual ? "Manter a capa atual" : "Tirar a imagem"}
        </Button>
      ) : null}
    </Field>
  );
}
