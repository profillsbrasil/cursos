import { createHash } from "node:crypto";

// Dados de EXEMPLO para o banco local e para a demonstração do dono.
// Nomes de curso, módulos e códigos vêm do protótipo "Profills School Academia".
// Alunos, progresso, datas e pontos são exemplo e não descrevem pessoa real.

export interface AulaSeed {
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
  precoTroca?: number;
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

/**
 * Toda aula de exemplo toca o mesmo vídeo: Big Buck Bunny (CC BY, Blender
 * Foundation). O getDuration() da IFrame API mediu 634,6 s.
 */
export const VIDEO_EXEMPLO = {
  duracaoSeg: 634,
  id: "aqz-KE-bpKQ",
  provedor: "youtube",
} as const;

export const PONTOS_AULA = 10;
export const PONTOS_CURSO = 100;

const geradas = (titulo: string, qtd: number): AulaSeed[] =>
  Array.from({ length: qtd }, (_, i) => ({
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
  { titulo: "Urgência não se cria, se descobre" },
  { titulo: "Ficha de diagnóstico de urgência" },
  { titulo: "O custo do atraso para o cliente" },
  { titulo: "Cronograma reverso" },
  { titulo: "Responsabilidades do cliente" },
  { titulo: "Datas que não fecham" },
  { titulo: "Urgência e condição de pagamento" },
  { titulo: "Casos reais de urgência" },
];

const umModulo = (
  numero: number,
  titulo: string,
  aulas: string[]
): ModuloSeed[] => [
  {
    aulas: aulas.map((t) => ({ titulo: t })),
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
      aulas: numero === 8 ? AULAS_M8 : geradas(titulo, qtd),
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
      "Riscos do posto de montagem",
      "Bloqueio antes de mexer",
      "Ferramentas e EPI",
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
      "Estrutura e conjuntos",
      "Bicos e dosagem",
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
      "Leitura do esquema",
      "Montando o conjunto",
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
      "Por que a rotina mudou",
      "O funil da semana",
      "Reunião de previsão",
      "Registro no CRM",
      "Proposta e prazo",
      "Follow-up em 48 h",
      "Perdas e motivos",
      "Fechamento do mês",
      "Checklist final",
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
      "A regra 5x4",
      "Ângulos e luz",
      "Máquina rodando",
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
      "Como responder",
      "As 6 competências",
    ]),
    niveis: [],
    status: "publicado",
    tema: "Vendas e negócios",
    titulo: "Autoavaliação Comercial",
  },
  {
    capaAlt:
      "Ilustração de um celular com balões de conversa, um fone de atendimento e uma caixa de ferramentas",
    capaUrl: "/capas/pos-venda.jpg",
    chave: "pos-venda",
    codigo: null,
    destaque: null,
    modulos: [
      {
        aulas: geradas("Atendimento pós-venda", 5),
        nivelOrdem: null,
        numero: 1,
        titulo: "Atendimento pós-venda",
      },
    ],
    niveis: [],
    precoTroca: 300,
    status: "publicado",
    tema: "Vendas e negócios",
    titulo: "Atendimento pós-venda",
  },
  {
    capaAlt:
      "Ilustração de uma operadora de touca e jaleco conferindo garrafas numa esteira de envase",
    capaUrl: "/capas/bpf.jpg",
    chave: "bpf",
    codigo: null,
    destaque: null,
    modulos: [
      {
        aulas: geradas("Boas práticas de fabricação", 3),
        nivelOrdem: null,
        numero: 1,
        titulo: "Boas práticas de fabricação",
      },
    ],
    niveis: [],
    precoTroca: 200,
    status: "publicado",
    tema: "Processo de envase",
    titulo: "Boas práticas de fabricação",
  },
  {
    capaAlt:
      "Ilustração de uma linha com envasadora, embaladora e enfardadeira lado a lado",
    capaUrl: "/capas/portfolio.jpg",
    chave: "portfolio",
    codigo: null,
    destaque: null,
    modulos: [
      {
        aulas: geradas(
          "Portfólio: envasadoras, embaladoras e enfardadeiras",
          4
        ),
        nivelOrdem: null,
        numero: 1,
        titulo: "Portfólio: envasadoras, embaladoras e enfardadeiras",
      },
    ],
    niveis: [],
    precoTroca: 500,
    status: "publicado",
    tema: "Produtos e aplicações",
    titulo: "Portfólio: envasadoras, embaladoras e enfardadeiras",
  },
  {
    capaAlt:
      "Ilustração de dois frascos despejando líquido num funil sobre um béquer",
    capaUrl: "/capas/fundamentos.jpg",
    chave: "fundamentos",
    codigo: null,
    destaque: null,
    modulos: [
      {
        aulas: geradas("Fundamentos do envase de líquidos", 5),
        nivelOrdem: null,
        numero: 1,
        titulo: "Fundamentos do envase de líquidos",
      },
    ],
    niveis: [],
    precoTroca: 800,
    status: "publicado",
    tema: "Processo de envase",
    titulo: "Fundamentos do envase de líquidos",
  },
  {
    capaAlt:
      "Ilustração de tubulações de aço com bolhas e uma mangueira lançando jato de água",
    capaUrl: "/capas/limpeza.jpg",
    chave: "limpeza",
    codigo: null,
    destaque: null,
    modulos: [
      {
        aulas: geradas("Limpeza CIP e troca de formato", 4),
        nivelOrdem: null,
        numero: 1,
        titulo: "Limpeza CIP e troca de formato",
      },
    ],
    niveis: [],
    precoTroca: 1000,
    status: "publicado",
    tema: "Fábrica e montagem",
    titulo: "Limpeza CIP e troca de formato",
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
  titulo:
    "Exemplo: Módulo 13 atualizado com o novo cadastro de atendimentos do CRM",
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

export const TROCA_A = { curso: "bpf", diasAtras: 3 };

export const POSICAO_A = {
  aula: 4,
  curso: "comercial",
  modulo: 8,
  posicaoSeg: 222,
};

export const CERTIFICADO_A = {
  curso: "autoavaliacao",
  prefixo: "PS-M0-2026",
};

// O código do certificado é único no banco: o sufixo sai do userId, então cada aluno de exemplo
// tem o seu e o mesmo aluno recebe o mesmo código em toda execução.
export function codigoCertificado(prefixo: string, userId: string): string {
  const sufixo = createHash("sha1")
    .update(userId)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  return `${prefixo}-${sufixo}`;
}

export const ALUNO_B = "user_seedB";

export const LIBERADA_POR = "user_seed";
