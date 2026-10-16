import type {
  ComunicadosDoAluno,
  MesDeComunicados,
} from "@cursos/api/dominio/comunicado";

import { plural } from "@/lib/formato";

const SEMANA = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

const MES = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

/** O dia do calendário ("2026-10-14") vira o número e a sigla da semana: 14, "qua.". */
export function diaNaLinha(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`);
  return {
    numero: data.getUTCDate(),
    semana: SEMANA[data.getUTCDay()] ?? "",
  };
}

/** "2026-10" vira "Outubro de 2026". */
export function nomeDoMes(mes: string) {
  const nome = MES.format(new Date(`${mes}-01T12:00:00Z`));
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${mes.slice(0, 4)}`;
}

export const contagemDoMes = (m: MesDeComunicados) =>
  plural(m.comunicados.length, "comunicado", "comunicados");

/** O admin separa os parágrafos com Enter; linha em branco não vira parágrafo. */
export const paragrafos = (texto: string) =>
  texto
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

export const subtituloDaTela = (c: ComunicadosDoAluno | null) =>
  c?.tipo === "com_comunicados"
    ? "Gerais e dos seus cursos, do mais novo para o mais velho"
    : "Gerais e dos seus cursos";
