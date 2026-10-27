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
  slug: id,
  titulo,
});

export const ALUNA: Conquistas = {
  certificados: [
    {
      codigo: "PS-M0-2026-3F9A1C",
      curso: curso("autoavaliacao", "Autoavaliação Comercial"),
      dia: dia("2026-09-02"),
      estado: "ganha",
      horas: 2,
    },
    {
      categoria: "Vendas",
      curso: curso("comercial", "Comercial"),
      estado: "por_ganhar",
      feitas: 46,
      total: 90,
    },
    {
      categoria: "Rotinas internas",
      curso: curso("nova-rotina", "Nova Rotina de Fechamento"),
      estado: "por_ganhar",
      feitas: 3,
      total: 9,
    },
    {
      categoria: "Máquinas",
      curso: curso("fabrica", "Fábrica e montagem"),
      estado: "por_ganhar",
      feitas: 0,
      total: 7,
    },
    {
      categoria: "Envase e embalagem",
      curso: curso("bpf", "Boas práticas de fabricação"),
      estado: "por_ganhar",
      feitas: 0,
      total: 3,
    },
  ],
  hoje: dia("2026-10-16"),
  marcos: [
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
  ],
  medalhas: [
    {
      medalha: { dia: dia("2026-08-18"), estado: "ganha" },
      tipo: "primeira_aula",
    },
    {
      medalha: { dia: dia("2026-10-13"), estado: "ganha" },
      tipo: "primeira_troca",
    },
    {
      medalha: { dia: dia("2026-09-02"), estado: "ganha" },
      tipo: "primeiro_curso",
    },
    {
      medalha: { estado: "por_ganhar", feitas: 1, pct: 33, total: 3 },
      tipo: "tres_trocas",
    },
    {
      medalha: {
        amostraVista: "Manutenção básica",
        estado: "por_ganhar",
        feitas: 1,
        pct: 50,
        total: 2,
      },
      tipo: "amostra_e_troca",
    },
    {
      medalha: {
        estado: "por_ganhar",
        maisAdiantado: {
          curso: "Boas práticas de fabricação",
          feitas: 0,
          total: 3,
        },
        pct: 0,
      },
      tipo: "troca_ate_o_fim",
    },
    {
      medalha: { dia: dia("2026-08-25"), estado: "ganha" },
      tipo: "primeiro_questionario",
    },
    {
      medalha: {
        estado: "por_ganhar",
        melhor: { feitas: 4, total: 5 },
        pct: 80,
      },
      tipo: "nota_cheia",
    },
    {
      medalha: { estado: "por_ganhar", feitas: 1, pct: 33, total: 3 },
      tipo: "tres_cursos",
    },
    {
      medalha: { estado: "por_ganhar", feitas: 580, pct: 58, total: 1000 },
      tipo: "mil_pontos",
    },
  ],
};

export const NOVO: Conquistas = {
  certificados: [
    {
      categoria: "Máquinas",
      curso: curso("fabrica", "Fábrica e montagem"),
      estado: "por_ganhar",
      feitas: 0,
      total: 7,
    },
  ],
  hoje: dia("2026-10-16"),
  marcos: [
    { medalha: { estado: "por_ganhar", feitas: 0 }, meta: 10, tipo: "aulas" },
    { medalha: { estado: "por_ganhar", feitas: 0 }, meta: 50, tipo: "aulas" },
    { medalha: { estado: "por_ganhar", feitas: 0 }, meta: 100, tipo: "aulas" },
    {
      medalha: { dias: 0, estado: "por_ganhar", hojePendente: true, meta: 7 },
      tipo: "sequencia",
    },
  ],
  medalhas: [
    {
      medalha: {
        estado: "por_ganhar",
        pct: 0,
        proxima: {
          aula: "Riscos do posto de montagem",
          curso: "Fábrica e montagem",
          tipo: "comecar",
        },
      },
      tipo: "primeira_aula",
    },
    {
      medalha: {
        estado: "por_ganhar",
        maisBarato: 200,
        pct: 0,
        pontosPorAula: 10,
      },
      tipo: "primeira_troca",
    },
    {
      medalha: {
        estado: "por_ganhar",
        maisPerto: { curso: "Fábrica e montagem", feitas: 0, total: 7 },
        pct: 0,
      },
      tipo: "primeiro_curso",
    },
    {
      medalha: { estado: "por_ganhar", feitas: 0, pct: 0, total: 3 },
      tipo: "tres_trocas",
    },
    {
      medalha: {
        amostraVista: null,
        estado: "por_ganhar",
        feitas: 0,
        pct: 0,
        total: 2,
      },
      tipo: "amostra_e_troca",
    },
    {
      medalha: { estado: "por_ganhar", maisAdiantado: null, pct: 0 },
      tipo: "troca_ate_o_fim",
    },
    {
      medalha: { estado: "por_ganhar", pct: 0 },
      tipo: "primeiro_questionario",
    },
    {
      medalha: { estado: "por_ganhar", melhor: null, pct: 0 },
      tipo: "nota_cheia",
    },
    {
      medalha: { estado: "por_ganhar", feitas: 0, pct: 0, total: 3 },
      tipo: "tres_cursos",
    },
    {
      medalha: { estado: "por_ganhar", feitas: 0, pct: 0, total: 1000 },
      tipo: "mil_pontos",
    },
  ],
};
