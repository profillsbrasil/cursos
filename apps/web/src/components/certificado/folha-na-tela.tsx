import { cn } from "@cursos/ui/lib/utils";
import Image from "next/image";
import type { CSSProperties } from "react";

import { LOCKUP, PRODUTO } from "@/lib/marca";

import { FOLHA_EM_PX, type FolhaDoCertificado } from "./medidas-da-folha";

const pxDaFolha = (px: number) => `calc(var(--px-da-folha) * ${px})`;

const { cor } = FOLHA_EM_PX;

const DA_FOLHA = {
  "--px-da-folha": `calc(100cqw / ${FOLHA_EM_PX.largura})`,
  backgroundColor: cor.papel,
  color: cor.tinta,
  fontSize: pxDaFolha(FOLHA_EM_PX.frase.tamanho),
  lineHeight: FOLHA_EM_PX.entrelinha,
} as CSSProperties;

export function FolhaNaTela({
  className,
  folha,
}: {
  className?: string;
  folha: FolhaDoCertificado;
}) {
  const { centro, confere, faixa, nome, pe, quem, traco } = FOLHA_EM_PX;
  return (
    <figure
      aria-label={`Prévia da folha do certificado de ${folha.nome}`}
      className={cn(
        "@container relative aspect-[1123/794] overflow-hidden rounded-[6px] ring-1 ring-border",
        className
      )}
    >
      <div className="absolute inset-0 font-sans" style={DA_FOLHA}>
        <div
          className="flex items-center justify-between"
          style={{
            backgroundColor: cor.faixa,
            height: pxDaFolha(faixa.altura),
            paddingInline: pxDaFolha(faixa.recuo),
          }}
        >
          <Image
            alt={PRODUTO}
            height={LOCKUP.altura}
            src={LOCKUP.src}
            style={{
              height: pxDaFolha(faixa.lockup.altura),
              width: pxDaFolha(faixa.lockup.largura),
            }}
            width={LOCKUP.largura}
          />
          <p
            className="font-medium"
            style={{ color: cor.faixaTexto, fontSize: pxDaFolha(faixa.rotulo) }}
          >
            {folha.rotulo}
          </p>
        </div>
        <div
          className="absolute grid content-center justify-items-center text-center"
          style={{
            bottom: pxDaFolha(centro.pe),
            left: pxDaFolha(centro.lado),
            right: pxDaFolha(centro.lado),
            top: pxDaFolha(centro.topo),
          }}
        >
          <p
            className="font-semibold"
            style={{
              color: cor.tintaClara,
              fontSize: pxDaFolha(FOLHA_EM_PX.abre),
            }}
          >
            Certificamos que
          </p>
          <p
            className="text-balance font-bold"
            style={{
              fontSize: pxDaFolha(folha.nomeEmTamanho),
              letterSpacing: `${nome.espacamento}em`,
              lineHeight: nome.entrelinha,
              marginTop: pxDaFolha(nome.acima),
            }}
          >
            {folha.nome}
          </p>
          <span
            aria-hidden="true"
            className="rounded-full"
            style={{
              backgroundColor: cor.traco,
              height: pxDaFolha(traco.altura),
              marginBottom: pxDaFolha(traco.abaixo),
              marginTop: pxDaFolha(traco.acima),
              width: pxDaFolha(traco.largura),
            }}
          />
          <p
            style={{
              color: cor.tintaClara,
              lineHeight: FOLHA_EM_PX.frase.entrelinha,
            }}
          >
            concluiu o curso
          </p>
          <p
            className="text-balance font-bold"
            style={{
              fontSize: pxDaFolha(folha.cursoEmTamanho),
              letterSpacing: `${FOLHA_EM_PX.curso.espacamento}em`,
              marginBottom: pxDaFolha(FOLHA_EM_PX.curso.abaixo),
              marginTop: pxDaFolha(FOLHA_EM_PX.curso.acima),
            }}
          >
            {folha.curso}
          </p>
          <p
            style={{
              color: cor.tintaClara,
              lineHeight: FOLHA_EM_PX.frase.entrelinha,
            }}
          >
            com carga horária de{" "}
            <b className="font-bold" style={{ color: cor.tinta }}>
              {folha.carga}
            </b>
            , em {folha.data}.
          </p>
        </div>
        <div
          className="absolute flex items-end justify-between"
          style={{
            borderTop: `1px solid ${cor.linha}`,
            bottom: pxDaFolha(pe.baixo),
            left: pxDaFolha(pe.lado),
            paddingTop: pxDaFolha(pe.acima),
            right: pxDaFolha(pe.lado),
          }}
        >
          <p
            style={{
              color: cor.tintaClara,
              fontSize: pxDaFolha(quem.texto),
              lineHeight: quem.entrelinha,
            }}
          >
            <b
              className="block font-semibold"
              style={{ color: cor.tinta, fontSize: pxDaFolha(quem.emissor) }}
            >
              {folha.emissor}
            </b>
            {folha.plataforma}
          </p>
          <div
            className="flex items-center text-right"
            style={{ gap: pxDaFolha(confere.vao) }}
          >
            <p
              style={{
                color: cor.tintaClara,
                fontSize: pxDaFolha(confere.texto),
                lineHeight: confere.entrelinha,
              }}
            >
              Código
              <b
                className="block font-bold tabular-nums"
                style={{
                  color: cor.tinta,
                  fontSize: pxDaFolha(confere.codigo),
                  letterSpacing: `${confere.espacamentoDoCodigo}em`,
                }}
              >
                {folha.codigo}
              </b>
              {folha.confira}
            </p>
            <svg
              aria-hidden="true"
              shapeRendering="crispEdges"
              style={{
                height: pxDaFolha(confere.qr),
                width: pxDaFolha(confere.qr),
              }}
              viewBox={`0 0 ${folha.qr.lado} ${folha.qr.lado}`}
            >
              <path d={folha.qr.caminho} fill={cor.tinta} />
            </svg>
          </div>
        </div>
      </div>
    </figure>
  );
}
