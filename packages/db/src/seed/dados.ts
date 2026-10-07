// Dados de EXEMPLO para o banco local e para a demonstração do dono.
// Nomes de curso, módulos e códigos vêm do protótipo "Profills School Academia".
// Alunos, progresso, datas e pontos são exemplo e não descrevem pessoa real.

export interface AulaSeed {
  duracaoSeg: number;
  titulo: string;
}

export interface ModuloSeed {
  aulas: AulaSeed[];
  nivelOrdem: number | null;
  numero: number;
  titulo: string;
}

export interface CursoSeed {
  capaAlt: string;
  capaUrl: string;
  chave: string;
  codigo: string | null;
  destaque: string | null;
  modulos: ModuloSeed[];
  niveis: { nome: string; ordem: number }[];
  status: "em_producao" | "publicado";
  tema: string;
  titulo: string;
}

export interface TrilhaSeed {
  chave: string;
  cursos: string[];
  descricao: string;
  titulo: string;
}

const min = (m: number) => Math.round(m * 60);

const geradas = (titulo: string, numero: number, qtd: number): AulaSeed[] =>
  Array.from({ length: qtd }, (_, i) => ({
    duracaoSeg: min(6 + ((numero + i) % 5)),
    titulo: `${titulo}, parte ${i + 1}`,
  }));

const nivelDoComercial = (numero: number) => {
  if (numero <= 5) {
    return 1;
  }
  return numero <= 10 ? 2 : 3;
};

const MODULOS_COMERCIAL: [number, string, number][] = [
  [0, "Autoavaliação comercial", 2],
  [1, "História, posicionamento e responsabilidade", 5],
  [2, "Cultura comercial Profills", 4],
  [3, "Portfólio, aplicações e limites técnicos", 7],
  [4, "Prospecção e abertura de oportunidades", 6],
  [5, "Diagnóstico consultivo e qualificação", 6],
  [6, "Pilar Condição de Pagamento", 7],
  [7, "Pilar Necessidade", 6],
  [8, "Pilar Urgência", 8],
  [9, "Pilar Confiança", 7],
  [10, "Pilar Desejo", 6],
  [11, "Valor, retorno e proposta comercial", 7],
  [12, "Negociação, objeções e fechamento", 8],
  [13, "CRM Profills e acompanhamento", 5],
  [14, "Handoff e experiência pós-venda", 5],
  [15, "Avaliação final e certificação", 1],
];

const AULAS_M8: AulaSeed[] = [
  { duracaoSeg: min(7), titulo: "Urgência não se cria, se descobre" },
  { duracaoSeg: min(9), titulo: "Ficha de diagnóstico de urgência" },
  { duracaoSeg: min(8), titulo: "O custo do atraso para o cliente" },
  { duracaoSeg: min(9.67), titulo: "Cronograma reverso" },
  { duracaoSeg: min(8), titulo: "Responsabilidades do cliente" },
  { duracaoSeg: min(6), titulo: "Datas que não fecham" },
  { duracaoSeg: min(7), titulo: "Urgência e condição de pagamento" },
  { duracaoSeg: min(11), titulo: "Casos reais de urgência" },
];

const umModulo = (
  numero: number,
  titulo: string,
  aulas: [string, number][]
): ModuloSeed[] => [
  {
    aulas: aulas.map(([t, m]) => ({ duracaoSeg: min(m), titulo: t })),
    nivelOrdem: null,
    numero,
    titulo,
  },
];

export const CURSOS: CursoSeed[] = [
  {
    capaAlt:
      "Peça do treinamento Profills School: Vender com técnica, convencer com valor, fechar com método, com vendedores apertando a mão de um cliente",
    capaUrl: "/capas/comercial.jpg",
    chave: "comercial",
    codigo: null,
    destaque: null,
    modulos: MODULOS_COMERCIAL.map(([numero, titulo, qtd]) => ({
      aulas: numero === 8 ? AULAS_M8 : geradas(titulo, numero, qtd),
      nivelOrdem: nivelDoComercial(numero),
      numero,
      titulo,
    })),
    niveis: [
      { nome: "Vendedor Profills Certificado", ordem: 1 },
      { nome: "Consultor Comercial Profills", ordem: 2 },
      { nome: "Especialista Comercial", ordem: 3 },
    ],
    status: "publicado",
    tema: "Vendas e negócios",
    titulo: "Profills School Comercial",
  },
  {
    capaAlt: "Ilustração de um posto de montagem com equipamento de proteção",
    capaUrl: "/capas/seguranca.jpg",
    chave: "seguranca-posto",
    codigo: null,
    destaque: null,
    modulos: umModulo(1, "Segurança da máquina", [
      ["Riscos do posto de montagem", 8],
      ["Bloqueio antes de mexer", 10],
      ["Ferramentas e EPI", 7],
    ]),
    niveis: [],
    status: "publicado",
    tema: "Fábrica e montagem",
    titulo: "Segurança do posto",
  },
  {
    capaAlt: "Ilustração de uma envasadora e seus conjuntos",
    capaUrl: "/capas/operacao.jpg",
    chave: "envasadora",
    codigo: null,
    destaque: null,
    modulos: umModulo(1, "Componentes e conjuntos", [
      ["Estrutura e conjuntos", 9],
      ["Bicos e dosagem", 11],
    ]),
    niveis: [],
    status: "em_producao",
    tema: "Fábrica e montagem",
    titulo: "Envasadora: conhecendo a máquina",
  },
  {
    capaAlt: "Ilustração de montagem de componentes pneumáticos",
    capaUrl: "/capas/calibracao.jpg",
    chave: "montagem",
    codigo: null,
    destaque: null,
    modulos: umModulo(1, "Montagem passo a passo", [
      ["Leitura do esquema", 10],
      ["Montando o conjunto", 14],
    ]),
    niveis: [],
    status: "em_producao",
    tema: "Fábrica e montagem",
    titulo: "Montagem pneumática",
  },
  {
    capaAlt:
      "Equipe comercial da Profills reunida em volta de uma mesa com notebooks, diante de um painel de fechamento de vendas",
    capaUrl: "/capas/nova-rotina.jpg",
    chave: "nova-rotina",
    codigo: "POP-COM-001",
    destaque: null,
    modulos: umModulo(1, "Rotina de fechamento", [
      ["Por que a rotina mudou", 4],
      ["O funil da semana", 6],
      ["Reunião de previsão", 5],
      ["Registro no CRM", 6],
      ["Proposta e prazo", 5],
      ["Follow-up em 48 h", 5],
      ["Perdas e motivos", 6],
      ["Fechamento do mês", 6],
      ["Checklist final", 5],
    ]),
    niveis: [],
    status: "publicado",
    tema: "Vendas e negócios",
    titulo: "Nova Rotina de Fechamento",
  },
  {
    capaAlt:
      "Peça Como filmar as máquinas Profills: uma pessoa grava com o celular uma envasadora na fábrica",
    capaUrl: "/capas/gravacao.jpg",
    chave: "gravacao",
    codigo: null,
    destaque: "Regra 5x4",
    modulos: umModulo(1, "Curso de gravação técnica", [
      ["A regra 5x4", 8],
      ["Ângulos e luz", 9],
      ["Máquina rodando", 8],
    ]),
    niveis: [],
    status: "publicado",
    tema: "Produtos e aplicações",
    titulo: "Gravação de Máquinas",
  },
  {
    capaAlt:
      "Peça azul da Profills School com o lema Vender com técnica, convencer com valor, fechar com método",
    capaUrl: "/capas/autoavaliacao.jpg",
    chave: "autoavaliacao",
    codigo: null,
    destaque: "30 afirmações · 6 competências",
    modulos: umModulo(0, "Autoavaliação", [
      ["Como responder", 5],
      ["As 6 competências", 10],
    ]),
    niveis: [],
    status: "publicado",
    tema: "Vendas e negócios",
    titulo: "Autoavaliação Comercial",
  },
];

export const TRILHAS: TrilhaSeed[] = [
  {
    chave: "formacao-comercial",
    cursos: ["comercial"],
    descricao:
      "O curso Profills School Comercial, do diagnóstico ao pós-venda, em 16 módulos e três níveis.",
    titulo: "Formação comercial",
  },
  {
    chave: "fabrica-montagem",
    cursos: ["seguranca-posto", "envasadora", "montagem"],
    descricao:
      "Trilha teórica da fábrica. Dois cursos ainda estão em produção.",
    titulo: "Fábrica e montagem",
  },
];

export const SOLTOS = ["nova-rotina", "gravacao", "autoavaliacao"];

export const COMUNICADO = {
  chave: "modulo-13-atualizado",
  texto: "Quem já concluiu a versão anterior mantém o certificado.",
  titulo: "Módulo 13 atualizado com o novo cadastro de atendimentos do CRM",
};

/** Progresso de exemplo do aluno A: quantas aulas assistidas por módulo, em ordem. */
export const PROGRESSO_A: { curso: string; modulo: number; aulas: number }[] = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((m) => ({
    aulas: Number.POSITIVE_INFINITY,
    curso: "comercial",
    modulo: m,
  })),
  { aulas: 3, curso: "comercial", modulo: 8 },
  { aulas: 3, curso: "nova-rotina", modulo: 1 },
  { aulas: 2, curso: "autoavaliacao", modulo: 0 },
];

export const POSICAO_A = {
  aula: 4,
  curso: "comercial",
  modulo: 8,
  posicaoSeg: 222,
};

export const CERTIFICADO_A = {
  codigo: "PS-M0-2026-0391",
  curso: "autoavaliacao",
};

export const ALUNO_B = "user_seedB";

export const LIBERADA_POR = "user_seed";
