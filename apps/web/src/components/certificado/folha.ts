import type { CertificadoEmitido } from "@cursos/api/dominio/pagina-do-certificado";
import { caminhoDaConferencia } from "@cursos/api/dominio/rotas";
import { encode } from "uqr";

import { fmtData, plural } from "@/lib/formato";
import { PRODUTO } from "@/lib/marca";

import {
  FOLHA_EM_PX,
  type FolhaDoCertificado,
  nomeNaFolha,
  tamanhoPara,
} from "./medidas-da-folha";

export interface EnderecoDaConferencia {
  exibido: string;
  url: string;
}

export function enderecoDaConferencia(
  origem: string,
  codigo: string
): EnderecoDaConferencia {
  const url = new URL(caminhoDaConferencia(codigo), origem);
  return { exibido: `${url.host}${url.pathname}`, url: url.href };
}

const primeiro = (valor: string | null) => valor?.split(",")[0]?.trim();

export function origemDoPedido(cabecalhos: Headers): string {
  const host =
    primeiro(cabecalhos.get("x-forwarded-host")) ??
    primeiro(cabecalhos.get("host"));
  if (!host) {
    throw new Error("O pedido chegou sem Host.");
  }
  const protocolo =
    primeiro(cabecalhos.get("x-forwarded-proto")) ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

export type CertificadoComNome = CertificadoEmitido & { nome: string };

export const comNome = (
  c: CertificadoEmitido | null
): CertificadoComNome | null => (c?.nome ? { ...c, nome: c.nome } : null);

export const cargaEmHoras = (horas: number) => plural(horas, "hora", "horas");

function qrDe(texto: string) {
  const { data, size } = encode(texto, { border: 0, ecc: "M" });
  const caminho = data
    .flatMap((linha, y) =>
      linha.flatMap((escuro, x) => (escuro ? [`M${x} ${y}h1v1h-1z`] : []))
    )
    .join("");
  return { caminho, lado: size };
}

const DE_TODA_FOLHA = {
  emissor: "Profills Brasil",
  plataforma: `${PRODUTO}, a plataforma de cursos da Profills`,
  rotulo: "Certificado de conclusão",
} as const;

export function folhaDo(
  c: CertificadoComNome,
  endereco: EnderecoDaConferencia
): FolhaDoCertificado {
  const cursoEmTamanho = tamanhoPara(c.tituloDoCurso, FOLHA_EM_PX.curso);
  const escrito = nomeNaFolha(c.nome, {
    tamanho: cursoEmTamanho,
    texto: c.tituloDoCurso,
  });
  return {
    ...DE_TODA_FOLHA,
    carga: cargaEmHoras(c.horas),
    codigo: c.codigo,
    confira: `Confira em ${endereco.exibido}`,
    curso: c.tituloDoCurso,
    cursoEmTamanho,
    data: fmtData(c.emitidoEm),
    nome: escrito.nome,
    nomeEmTamanho: escrito.tamanho,
    qr: qrDe(endereco.url),
  };
}

/**
 * A folha de Minha conta para quem ainda não tem certificado. O `PRODUCT.md` proíbe
 * curso e código inventados, então os campos dizem o que entra neles, e o QR leva à
 * conferência de verdade, onde a pessoa digita um código. O nome fica vazio: a tela
 * põe o que a pessoa digita.
 */
export function folhaDeExemplo(origem: string): FolhaDoCertificado {
  const url = new URL("/certificado", origem);
  return {
    ...DE_TODA_FOLHA,
    carga: "X horas",
    codigo: "XXXX-XXXX",
    confira: `Confira em ${url.host}${url.pathname}`,
    curso: "O curso que você concluir",
    cursoEmTamanho: FOLHA_EM_PX.curso.tamanho,
    data: "dia da conclusão",
    nome: "",
    nomeEmTamanho: FOLHA_EM_PX.nome.degraus[0],
    qr: qrDe(url.href),
  };
}
