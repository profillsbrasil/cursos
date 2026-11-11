// As frases, os selos e as fichas do convite. Sem "use client": o diálogo, a
// lista e a página leem daqui.

import {
  type ConvidadoNaTela,
  type Email,
  horaDeSaoPaulo,
  lerEmails,
  type ResultadoDoConvite,
  type ResultadoDoEnvio,
  TETO_DE_CURSOS,
  TETO_DE_EMAILS,
} from "@cursos/api/dominio/convite";
import { Clock, MailWarning, TimerOff } from "lucide-react";

import { fmtNum, noDia, plural } from "@/lib/formato";

import type { Selo } from "../acompanhamento";

/** Um pedaço do campo de e-mails. `email` null: o texto não é um e-mail e trava o envio. */
export interface Ficha {
  email: Email | null;
  texto: string;
}

/** As fichas com o texto colado ou digitado, sem repetir e-mail nem pedaço ruim. */
export function fichasCom(fichas: readonly Ficha[], texto: string): Ficha[] {
  const lido = lerEmails(texto);
  const ja = new Set(fichas.map((f) => f.email ?? f.texto));
  return [
    ...fichas,
    ...lido.emails
      .filter((email) => !ja.has(email))
      .map((email) => ({ email, texto: email })),
    ...lido.ruins
      .filter((ruim) => !ja.has(ruim))
      .map((ruim) => ({ email: null, texto: ruim })),
  ];
}

export type EnvioDasFichas =
  | { emails: Email[]; rotulo: string; tipo: "pronto" }
  | { razao: string; rotulo: string; tipo: "desligado" };

/** O que o botão de enviar diz e se ele envia. */
export function envioDasFichas(
  fichas: readonly Ficha[],
  cursosMarcados: number
): EnvioDasFichas {
  const emails = fichas.flatMap((f) => f.email ?? []);
  const rotulo =
    emails.length === 0
      ? "Enviar convites"
      : `Enviar ${plural(emails.length, "convite", "convites")}`;
  const [ruim] = fichas.filter((f) => f.email === null);
  if (ruim) {
    return {
      razao: `${ruim.texto} não é um e-mail. Corrija ou apague para enviar.`,
      rotulo,
      tipo: "desligado",
    };
  }
  if (emails.length === 0) {
    return {
      razao: "Escreva pelo menos um e-mail.",
      rotulo,
      tipo: "desligado",
    };
  }
  if (emails.length > TETO_DE_EMAILS) {
    return {
      razao: `Um envio leva até ${TETO_DE_EMAILS} e-mails. Tire ${fmtNum(emails.length - TETO_DE_EMAILS)} para enviar.`,
      rotulo,
      tipo: "desligado",
    };
  }
  if (cursosMarcados > TETO_DE_CURSOS) {
    return {
      razao: `Um convite libera até ${TETO_DE_CURSOS} cursos.`,
      rotulo,
      tipo: "desligado",
    };
  }
  return { emails, rotulo, tipo: "pronto" };
}

/**
 * O que a região de status do campo diz ao leitor de tela: quantos e-mails há e,
 * com alguma ficha escrita, por que o envio não sai.
 */
export function anuncioDasFichas(
  fichas: readonly Ficha[],
  envio: EnvioDasFichas
): string {
  if (fichas.length === 0) {
    return "Nenhum e-mail escrito.";
  }
  const contagem = `${plural(fichas.length, "e-mail escrito", "e-mails escritos")}.`;
  return envio.tipo === "desligado" ? `${contagem} ${envio.razao}` : contagem;
}

/** A frase da ficha que não saiu. O `enviado` não chega aqui: a ficha dele some. */
export function fraseDoResultado(r: ResultadoDoConvite): string {
  switch (r.tipo) {
    case "enviado":
      return "Convite enviado.";
    case "ja_tem_conta":
      return "Já tem conta. Mude na ficha dela.";
    case "ja_convidado":
      return r.enviado
        ? "Já tem convite pendente. Reenvie ou cancele em Convidados."
        : "Já tem convite, mas o e-mail não saiu. Envie em Convidados.";
    case "nao_enviado":
      return r.motivo.tipo === "limite"
        ? `O convite ficou guardado, mas o limite de envios desta hora acabou. Envie em Convidados depois das ${horaDeSaoPaulo(new Date(r.motivo.tentarEm))}.`
        : "O convite ficou guardado, mas o e-mail não saiu. Envie em Convidados.";
    default:
      return r satisfies never;
  }
}

/** O toast do envio: "3 convites enviados", ou "" quando nenhum saiu. */
export function textoDoEnvio(r: ResultadoDoEnvio): string {
  const enviados = r.convites.filter((c) => c.tipo === "enviado").length;
  if (enviados === 0) {
    return "";
  }
  return enviados === 1
    ? "1 convite enviado"
    : `${fmtNum(enviados)} convites enviados`;
}

// As cores dos selos de estado do DESIGN.md. Nenhum vermelho: convite parado não é erro.
const SOL_SUAVE = "bg-sol/14 text-sol";
const NEUTRO = "bg-popover text-foreground";
const CONTORNO_APAGADO =
  "bg-transparent text-muted-foreground ring-1 ring-muted-foreground ring-inset";

export function seloDoConvidado(estado: ConvidadoNaTela["estado"]): Selo {
  switch (estado.tipo) {
    case "pendente":
      return { classe: SOL_SUAVE, icone: Clock, rotulo: "Pendente" };
    case "expirado":
      return { classe: CONTORNO_APAGADO, icone: TimerOff, rotulo: "Expirado" };
    case "nao_enviado":
      return { classe: NEUTRO, icone: MailWarning, rotulo: "Não enviado" };
    default:
      return estado satisfies never;
  }
}

/** A linha sob o e-mail do convidado: o dia do envio, do vencimento ou do convite. */
export function quandoDoConvidado(c: ConvidadoNaTela, hoje: string): string {
  switch (c.estado.tipo) {
    case "pendente":
      return `Enviado ${noDia(c.estado.enviadoEm, hoje)}`;
    case "expirado":
      return `Expirou ${noDia(c.estado.em, hoje)}`;
    case "nao_enviado":
      return `Convidado ${noDia(c.convidadoEm, hoje)}, sem e-mail enviado`;
    default:
      return c.estado satisfies never;
  }
}

/** "Nenhum curso", o título do único curso ou "3 cursos". */
export function cursosDoConvidado(cursos: ConvidadoNaTela["cursos"]): string {
  const [unico] = cursos;
  if (!unico) {
    return "Nenhum curso";
  }
  return cursos.length === 1
    ? unico.titulo
    : plural(cursos.length, "curso", "cursos");
}

/** A contagem da barra na opção Convidados; `total` é o de todos os convites vivos. */
export function contagemDeConvidados(
  mostrados: number,
  total: number,
  termo: string
): string {
  if (termo) {
    return `${plural(mostrados, "convidado", "convidados")} para "${termo}"`;
  }
  return total > mostrados
    ? `${fmtNum(mostrados)} de ${plural(total, "convidado", "convidados")}`
    : plural(mostrados, "convidado", "convidados");
}
