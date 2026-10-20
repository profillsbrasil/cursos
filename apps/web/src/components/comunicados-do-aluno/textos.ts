import type {
  ComunicadoDoAluno,
  ComunicadosDoAluno,
  MesDeComunicados,
} from "@cursos/api/dominio/comunicado";

import { plural } from "@/lib/formato";

const SEMANA = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

const MES = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

export function diaNaLinha(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`);
  return {
    numero: data.getUTCDate(),
    semana: SEMANA[data.getUTCDay()] ?? "",
  };
}

export function nomeDoMes(mes: string) {
  const nome = MES.format(new Date(`${mes}-01T12:00:00Z`));
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${mes.slice(0, 4)}`;
}

/** O destaque sai da lista, mas o mês dele o conta, senão a contagem fica menor que o mês. */
export function contagemDoMes(
  m: MesDeComunicados,
  destaque: ComunicadoDoAluno
) {
  if (!destaque.dia.startsWith(m.mes)) {
    return plural(m.comunicados.length, "comunicado", "comunicados");
  }
  return `${plural(m.comunicados.length + 1, "comunicado", "comunicados")}, contando o destaque`;
}

export const subtituloDaTela = (c: ComunicadosDoAluno | null) =>
  c?.tipo === "com_comunicados"
    ? "Gerais e dos seus cursos, do mais novo para o mais velho"
    : "Gerais e dos seus cursos";
