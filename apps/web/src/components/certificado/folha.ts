import type { CertificadoEmitido } from "@cursos/api/dominio/pagina-do-certificado";
import { caminhoDaConferencia } from "@cursos/api/dominio/rotas";
import { encode } from "uqr";

import { fmtData, plural } from "@/lib/formato";
import { PRODUTO } from "@/lib/marca";

import { COR_DA_FOLHA } from "./cores-da-folha";

export const FOLHA_EM_PX = {
  abre: 15,
  altura: 794,
  centro: { lado: 120, pe: 150, topo: 112 },
  confere: {
    codigo: 18,
    entrelinha: 1.5,
    espacamentoDoCodigo: 0.04,
    qr: 84,
    texto: 13,
    vao: 16,
  },
  cor: COR_DA_FOLHA,
  curso: {
    abaixo: 8,
    acima: 6,
    espacamento: -0.02,
    menor: { acimaDeCaracteres: 56, tamanho: 26 },
    tamanho: 32,
  },
  entrelinha: 1.43,
  faixa: {
    altura: 112,
    lockup: { altura: 60, largura: 212 },
    recuo: 64,
    rotulo: 15,
  },
  frase: { entrelinha: 1.5, tamanho: 19 },
  largura: 1123,
  nome: {
    acima: 26,
    entrelinha: 1.1,
    espacamento: -0.03,
    menor: { acimaDeCaracteres: 30, tamanho: 44 },
    tamanho: 58,
  },
  pe: { acima: 20, baixo: 48, lado: 64 },
  quem: { emissor: 15, entrelinha: 1.5, texto: 14 },
  traco: { abaixo: 26, acima: 24, altura: 5, largura: 96 },
} as const;

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

export interface FolhaDoCertificado {
  carga: string;
  codigo: string;
  confira: string;
  curso: string;
  cursoEmTamanho: number;
  data: string;
  emissor: string;
  nome: string;
  nomeEmTamanho: number;
  plataforma: string;
  qr: { caminho: string; lado: number };
  rotulo: string;
}

function qrDe(texto: string) {
  const { data, size } = encode(texto, { border: 0, ecc: "M" });
  const caminho = data
    .flatMap((linha, y) =>
      linha.flatMap((escuro, x) => (escuro ? [`M${x} ${y}h1v1h-1z`] : []))
    )
    .join("");
  return { caminho, lado: size };
}

const tamanhoPara = (
  texto: string,
  {
    menor,
    tamanho,
  }: { menor: { acimaDeCaracteres: number; tamanho: number }; tamanho: number }
) => (texto.length > menor.acimaDeCaracteres ? menor.tamanho : tamanho);

export function folhaDo(
  c: CertificadoComNome,
  endereco: EnderecoDaConferencia
): FolhaDoCertificado {
  return {
    carga: cargaEmHoras(c.horas),
    codigo: c.codigo,
    confira: `Confira em ${endereco.exibido}`,
    curso: c.tituloDoCurso,
    cursoEmTamanho: tamanhoPara(c.tituloDoCurso, FOLHA_EM_PX.curso),
    data: fmtData(c.emitidoEm),
    emissor: "Profills Brasil",
    nome: c.nome,
    nomeEmTamanho: tamanhoPara(c.nome, FOLHA_EM_PX.nome),
    plataforma: `${PRODUTO}, a plataforma de cursos da Profills`,
    qr: qrDe(endereco.url),
    rotulo: "Certificado de conclusão",
  };
}
