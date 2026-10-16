import type { Conquistas } from "@cursos/api/dominio/conquistas";
import type { CursoId, DiaISO } from "@cursos/api/dominio/tipos";

const dia = (d: string) => d as DiaISO;

const capa = (nome: string) => ({
  alt: `Capa de ${nome}`,
  altura: 604,
  largura: 900,
  url: `/capas/${nome}.jpg`,
});

const curso = (id: string, titulo: string) => ({
  capa: capa(id),
  id: id as CursoId,
  titulo,
});

/** A aluna A do seed, como no protótipo aprovado: as datas e o código são de exemplo. */
export const ALUNA: Conquistas = {
  certificados: [
    {
      codigo: "PS-M0-2026-3F9A1C",
      curso: curso("autoavaliacao", "Autoavaliação Comercial"),
      dia: dia("2026-09-02"),
      estado: "ganha",
    },
    {
      curso: curso("comercial", "Comercial"),
      estado: "por_ganhar",
      feitas: 46,
      total: 90,
    },
    {
      curso: curso("nova-rotina", "Nova Rotina de Fechamento"),
      estado: "por_ganhar",
      feitas: 3,
      total: 9,
    },
    {
      curso: curso("fabrica", "Fábrica e montagem"),
      estado: "por_ganhar",
      feitas: 0,
      total: 7,
    },
    {
      curso: curso("bpf", "Boas práticas de fabricação"),
      estado: "por_ganhar",
      feitas: 0,
      total: 3,
    },
  ],
  hoje: dia("2026-10-16"),
  marcos: [
    {
      medalha: {
        aula: "Como responder",
        curso: "Autoavaliação Comercial",
        dia: dia("2026-08-18"),
        estado: "ganha",
      },
      tipo: "primeira_aula",
    },
    {
      medalha: { dia: dia("2026-09-09"), estado: "ganha" },
      meta: 10,
      tipo: "aulas",
    },
    { medalha: { estado: "por_ganhar", feitas: 49 }, meta: 50, tipo: "aulas" },
    { medalha: { estado: "por_ganhar", feitas: 49 }, meta: 100, tipo: "aulas" },
    {
      medalha: { dias: 3, estado: "por_ganhar", hojePendente: true, meta: 7 },
      tipo: "sequencia",
    },
    {
      medalha: {
        curso: "Boas práticas de fabricação",
        dia: dia("2026-10-13"),
        estado: "ganha",
        pontos: 200,
      },
      tipo: "primeira_troca",
    },
    {
      medalha: {
        curso: "Autoavaliação Comercial",
        dia: dia("2026-09-02"),
        estado: "ganha",
      },
      tipo: "primeiro_curso",
    },
  ],
};

/** O aluno novo do protótipo: só Fábrica e montagem, nenhuma aula e 0 pts. */
export const NOVO: Conquistas = {
  certificados: [
    {
      curso: curso("fabrica", "Fábrica e montagem"),
      estado: "por_ganhar",
      feitas: 0,
      total: 7,
    },
  ],
  hoje: dia("2026-10-16"),
  marcos: [
    {
      medalha: {
        estado: "por_ganhar",
        proxima: {
          aula: "Riscos do posto de montagem",
          curso: "Fábrica e montagem",
          tipo: "comecar",
        },
      },
      tipo: "primeira_aula",
    },
    { medalha: { estado: "por_ganhar", feitas: 0 }, meta: 10, tipo: "aulas" },
    { medalha: { estado: "por_ganhar", feitas: 0 }, meta: 50, tipo: "aulas" },
    { medalha: { estado: "por_ganhar", feitas: 0 }, meta: 100, tipo: "aulas" },
    {
      medalha: { dias: 0, estado: "por_ganhar", hojePendente: true, meta: 7 },
      tipo: "sequencia",
    },
    {
      medalha: { estado: "por_ganhar", maisBarato: 200, pontosPorAula: 10 },
      tipo: "primeira_troca",
    },
    {
      medalha: {
        estado: "por_ganhar",
        maisPerto: { curso: "Fábrica e montagem", feitas: 0, total: 7 },
      },
      tipo: "primeiro_curso",
    },
  ],
};
