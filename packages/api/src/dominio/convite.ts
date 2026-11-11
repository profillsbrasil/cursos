import type { Perfil } from "./perfil";
import type { ContagemPorPerfil } from "./pessoas";
import { diaLocal } from "./sequencia";
import type {
  AdminId,
  ConviteId,
  CursoId,
  DiaISO,
  StatusDoCurso,
} from "./tipos";

declare const lido: unique symbol;
/** E-mail aparado, em ASCII e em minúsculas, no formato do check convite_email_formato. Só lerEmail cria um. */
export type Email = string & { readonly [lido]: true };

/** Um envio por e-mail no Clerk, que aceita 100 por hora. */
export const TETO_DE_EMAILS = 20;
export const TETO_DE_CURSOS = 50;
/** A mesma do link do Clerk (expiresInDays). */
export const VALIDADE_EM_DIAS = 30;
export const ESPERA_DO_REENVIO_SEG = 60;

/**
 * O papel de admin do convite que o Clerk não gravou se retoma só até 1 hora
 * depois do aceite. Ler o papel atual não distingue "nunca foi aplicado" de "o
 * dono tirou no painel do Clerk": sem prazo, o pedido seguinte devolveria o
 * papel tirado. Depois dele, o admin dá o papel pela ficha.
 */
export const PRAZO_DO_PAPEL_MS = 3_600_000;

/** O aceite mais antigo cujo papel ainda se retoma em `agora`. */
export const aceitoDesde = (agora: Date): Date =>
  new Date(agora.getTime() - PRAZO_DO_PAPEL_MS);

const TAMANHO_MAXIMO = 254;
// Só ASCII imprimível, sem espaço e sem @ fora do meio: o toLowerCase do JS e o
// lower() do Postgres divergem fora do ASCII ("İ"), e o check
// convite_email_formato recusaria o lote inteiro. O que passa aqui passa no banco.
const FORMATO = /^[!-?A-~]+@[!-?A-~]+\.[!-?A-~]+$/;
const SEPARADOR = /[\s,;]+/;

/** null quando o texto não é um e-mail. Mais estreita que o check do banco. */
export function lerEmail(texto: string): Email | null {
  const aparado = texto.trim();
  return aparado.length <= TAMANHO_MAXIMO && FORMATO.test(aparado)
    ? (aparado.toLowerCase() as Email)
    : null;
}

/**
 * O texto colado no campo: separa por vírgula, ponto e vírgula, espaço e quebra
 * de linha, sem repetir. `ruins` são os pedaços que não são e-mail, como vieram.
 */
export function lerEmails(texto: string): { emails: Email[]; ruins: string[] } {
  const emails = new Set<Email>();
  const ruins = new Set<string>();
  for (const pedaco of texto.split(SEPARADOR)) {
    if (pedaco === "") {
      continue;
    }
    const email = lerEmail(pedaco);
    if (email) {
      emails.add(email);
    } else {
      ruins.add(pedaco);
    }
  }
  return { emails: [...emails], ruins: [...ruins] };
}

const HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** A hora de São Paulo como a frase do limite a escreve: "15h40". */
export const horaDeSaoPaulo = (instante: Date): string =>
  HORA.format(instante).replace(":", "h");

/** O que a pessoa recebe na chegada. */
export interface OQueOConviteDa {
  comoAdmin: boolean;
  cursoIds: readonly CursoId[];
  perfil: Perfil;
}

/** As colunas de convite que decidem o estado. */
export interface LinhaDoConvite {
  aceitoEm: Date | null;
  aceitoPor: string | null;
  canceladoEm: Date | null;
  canceladoPor: string | null;
  comoAdmin: boolean;
  enviadoEm: Date | null;
  expiraEm: Date;
  papelAplicadoEm: Date | null;
}

export type EstadoDoConvite =
  | { tipo: "nao_enviado"; expiraEm: Date }
  | { tipo: "pendente"; enviadoEm: Date; expiraEm: Date }
  | { tipo: "expirado"; em: Date }
  | {
      tipo: "aceito";
      em: Date;
      por: string;
      papel: "nao_pediu" | "aplicado" | "por_aplicar";
    }
  | { tipo: "cancelado"; em: Date; por: string };

/** Os estados em que o convite ainda se reenvia, se cancela e ocupa o e-mail. */
export type EstadoVivo = Extract<
  EstadoDoConvite,
  { tipo: "nao_enviado" | "pendente" | "expirado" }
>;

function papelDoAceito(
  linha: LinhaDoConvite
): "nao_pediu" | "aplicado" | "por_aplicar" {
  if (!linha.comoAdmin) {
    return "nao_pediu";
  }
  return linha.papelAplicadoEm ? "aplicado" : "por_aplicar";
}

/**
 * A única leitura do estado. Ordem: cancelado, aceito, expirado (expiraEm <= agora),
 * não enviado, pendente. A tela, o reenviar e o cancelar leem daqui.
 */
export function estadoDoConvite(
  linha: LinhaDoConvite,
  agora: Date
): EstadoDoConvite {
  if (linha.canceladoEm && linha.canceladoPor) {
    return {
      em: linha.canceladoEm,
      por: linha.canceladoPor,
      tipo: "cancelado",
    };
  }
  if (linha.aceitoEm && linha.aceitoPor) {
    return {
      em: linha.aceitoEm,
      papel: papelDoAceito(linha),
      por: linha.aceitoPor,
      tipo: "aceito",
    };
  }
  if (linha.expiraEm.getTime() <= agora.getTime()) {
    return { em: linha.expiraEm, tipo: "expirado" };
  }
  if (!linha.enviadoEm) {
    return { expiraEm: linha.expiraEm, tipo: "nao_enviado" };
  }
  return {
    enviadoEm: linha.enviadoEm,
    expiraEm: linha.expiraEm,
    tipo: "pendente",
  };
}

export const ehVivo = (e: EstadoDoConvite): e is EstadoVivo =>
  e.tipo === "nao_enviado" || e.tipo === "pendente" || e.tipo === "expirado";

/** O que o envio fez com cada e-mail. Um por e-mail pedido, na ordem do pedido. */
export type ResultadoDoConvite = { email: Email } & (
  | { tipo: "enviado" }
  | { tipo: "ja_tem_conta"; userId: string }
  | { tipo: "ja_convidado"; enviado: boolean }
  | {
      tipo: "nao_enviado";
      /** `tentarEm` é o instante, em ISO, em que o Clerk volta a aceitar envio. */
      motivo: { tipo: "limite"; tentarEm: string } | { tipo: "falha" };
    }
);

export interface ResultadoDoEnvio {
  convites: readonly ResultadoDoConvite[];
}

/** A linha da opção Convidados. Só convite vivo chega à tela. */
export interface ConvidadoNaTela {
  comoAdmin: boolean;
  convidadoEm: DiaISO;
  cursos: readonly { id: CursoId; titulo: string }[];
  email: Email;
  estado:
    | { tipo: "nao_enviado" }
    | { tipo: "pendente"; enviadoEm: DiaISO; expiraEm: DiaISO }
    | { tipo: "expirado"; em: DiaISO };
  id: ConviteId;
  perfil: Perfil;
}

export interface CursoDoConvite {
  id: CursoId;
  status: StatusDoCurso;
  titulo: string;
}

export interface PainelDeConvites {
  /** Quem já entrou no app, por perfil: os números das outras opções da trilha. */
  contagem: ContagemPorPerfil;
  /** Os convidados que casam o termo, do mais novo ao mais antigo, até 100. */
  convidados: readonly ConvidadoNaTela[];
  /** Os cursos do diálogo, por título. */
  cursos: readonly CursoDoConvite[];
  hoje: DiaISO;
  /** Todos os convites vivos, sem o termo: o número da trilha. */
  total: number;
}

/** Um convite como a consulta da tela o lê, com os cursos por título. */
export interface LinhaDoConvidado extends LinhaDoConvite {
  convidadoEm: Date;
  cursos: readonly { id: CursoId; titulo: string }[];
  email: Email;
  id: ConviteId;
  perfil: Perfil;
}

export interface LinhasDosConvites {
  convidados: readonly LinhaDoConvidado[];
  cursos: readonly CursoDoConvite[];
  total: number;
}

function estadoNaTela(estado: EstadoVivo): ConvidadoNaTela["estado"] {
  switch (estado.tipo) {
    case "nao_enviado":
      return { tipo: "nao_enviado" };
    case "pendente":
      return {
        enviadoEm: diaLocal(estado.enviadoEm),
        expiraEm: diaLocal(estado.expiraEm),
        tipo: "pendente",
      };
    case "expirado":
      return { em: diaLocal(estado.em), tipo: "expirado" };
    default:
      return estado satisfies never;
  }
}

export function montarPainelDeConvites(
  linhas: LinhasDosConvites,
  contagem: ContagemPorPerfil,
  agora: Date
): PainelDeConvites {
  const convidados: ConvidadoNaTela[] = [];
  for (const linha of linhas.convidados) {
    const estado = estadoDoConvite(linha, agora);
    if (ehVivo(estado)) {
      convidados.push({
        comoAdmin: linha.comoAdmin,
        convidadoEm: diaLocal(linha.convidadoEm),
        cursos: linha.cursos,
        email: linha.email,
        estado: estadoNaTela(estado),
        id: linha.id,
        perfil: linha.perfil,
      });
    }
  }
  return {
    contagem,
    convidados,
    cursos: linhas.cursos,
    hoje: diaLocal(agora),
    total: linhas.total,
  };
}

/** O convite que a chegada reivindicou, pronto para aplicar. */
export interface ConviteAceito extends OQueOConviteDa {
  convidadoPor: AdminId;
  id: ConviteId;
}
