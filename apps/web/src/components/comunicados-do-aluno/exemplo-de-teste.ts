import type {
  AlvoDoComunicado,
  ComunicadoDoAluno,
  ComunicadosDoAluno,
} from "@cursos/api/dominio/comunicado";
import type { ComunicadoId, DiaISO } from "@cursos/api/dominio/tipos";

const curso = (slug: string, titulo: string): AlvoDoComunicado => ({
  capa: {
    alt: `Capa de ${titulo}`,
    altura: 604,
    largura: 900,
    url: `/capas/${slug}.jpg`,
  },
  href: `/cursos/${slug}`,
  tipo: "curso",
  titulo,
});

const COMERCIAL = curso("comercial", "Comercial");
const FABRICA = curso("fabrica", "Fábrica e montagem");
const GERAL: AlvoDoComunicado = { tipo: "geral" };

const comunicado = (
  id: string,
  dia: string,
  alvo: AlvoDoComunicado,
  publicadoPor: string | null,
  titulo: string,
  texto: string
): ComunicadoDoAluno => ({
  alvo,
  dia: dia as DiaISO,
  id: id as ComunicadoId,
  publicadoEm: `${dia}T13:00:00.000Z`,
  publicadoPor,
  texto,
  titulo,
});

const DESTAQUE = comunicado(
  "c1",
  "2026-10-14",
  COMERCIAL,
  "Marina Duarte",
  "Módulo 13 atualizado com o novo cadastro de atendimentos do CRM",
  "As aulas 2 e 4 do módulo 13 foram regravadas com a tela nova de cadastro de atendimentos.\nQuem já concluiu a versão anterior mantém o certificado."
);

export const VARIOS: ComunicadosDoAluno = {
  anteriores: [
    {
      comunicados: [
        comunicado(
          "c2",
          "2026-10-09",
          GERAL,
          "Marina Duarte",
          "Dois cursos novos em Trocar pontos",
          "Atendimento pós-venda e Fundamentos do envase de líquidos entraram na vitrine, por 300 e 800 pontos."
        ),
        comunicado(
          "c3",
          "2026-10-01",
          FABRICA,
          null,
          "Checklist de bloqueio para levar ao posto",
          "A aula Bloqueio antes de mexer, do módulo 1, ganhou o checklist da fábrica."
        ),
      ],
      mes: "2026-10",
    },
    {
      comunicados: [
        comunicado(
          "c4",
          "2026-09-22",
          GERAL,
          null,
          "Plataforma fora do ar no sábado, 27 de setembro, das 8h às 10h",
          "É a manutenção do servidor. O progresso das aulas fica salvo."
        ),
      ],
      mes: "2026-09",
    },
  ],
  destaque: DESTAQUE,
  tipo: "com_comunicados",
};

export const UM_SO: ComunicadosDoAluno = {
  anteriores: [],
  destaque: DESTAQUE,
  tipo: "com_comunicados",
};

export const UM_GERAL: ComunicadosDoAluno = {
  anteriores: [],
  destaque: comunicado(
    "g1",
    "2026-08-18",
    GERAL,
    "Othavio Quiliao",
    "Bem-vindo aos cursos da Profills",
    "A plataforma de capacitação da Profills abriu para os funcionários."
  ),
  tipo: "com_comunicados",
};

export const VAZIO: ComunicadosDoAluno = { tipo: "vazio" };
