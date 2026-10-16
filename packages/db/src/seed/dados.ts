import { createHash } from "node:crypto";

// Dados de EXEMPLO para o banco local e para a demonstração do dono.
// Nomes de curso, módulos e códigos vêm do protótipo "Profills School Academia".
// Alunos, progresso, datas e pontos são exemplo e não descrevem pessoa real.

export interface AulaSeed {
  /** Só nas aulas de título próprio. As geradas ficam sem descrição. */
  descricao?: string;
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
  /** Medida real da imagem em public/capas. */
  capaAltura: number;
  capaLargura: number;
  capaUrl: string;
  categoria: string;
  chave: string;
  codigo: string | null;
  descricao: string;
  destaque: string | null;
  modulos: ModuloSeed[];
  niveis: { nome: string; ordem: number }[];
  precoTroca?: number;
  status: "em_producao" | "publicado";
  titulo: string;
  topicos: string[];
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
  {
    descricao:
      "Por que a urgência do cliente já existe antes da visita e como encontrá-la nas perguntas certas.",
    titulo: "Urgência não se cria, se descobre",
  },
  {
    descricao:
      "Como preencher a ficha que registra prazos, gargalos e datas de produção do cliente.",
    titulo: "Ficha de diagnóstico de urgência",
  },
  {
    descricao:
      "Como calcular com o cliente quanto custa cada mês sem a máquina funcionando.",
    titulo: "O custo do atraso para o cliente",
  },
  {
    descricao:
      "Como montar o cronograma de trás para a frente, da data de produção até o pedido.",
    titulo: "Cronograma reverso",
  },
  {
    descricao:
      "O que o cliente precisa entregar (layout, energia, ar comprimido) para a data valer.",
    titulo: "Responsabilidades do cliente",
  },
  {
    descricao:
      "Como agir quando a data que o cliente quer não cabe no prazo de fabricação.",
    titulo: "Datas que não fecham",
  },
  {
    descricao:
      "Como a urgência muda a conversa sobre entrada, parcelas e financiamento.",
    titulo: "Urgência e condição de pagamento",
  },
  {
    descricao:
      "Três negociações reais em que a urgência decidiu o fechamento, e o que aprender com cada uma.",
    titulo: "Casos reais de urgência",
  },
];

const umModulo = (
  numero: number,
  titulo: string,
  aulas: (string | AulaSeed)[]
): ModuloSeed[] => [
  {
    aulas: aulas.map((a) => (typeof a === "string" ? { titulo: a } : a)),
    nivelOrdem: null,
    numero,
    titulo,
  },
];

export const CURSOS: CursoSeed[] = [
  {
    capaAlt:
      "Peça do treinamento Profills School: Vender com técnica, convencer com valor, fechar com método, com vendedores apertando a mão de um cliente",
    capaAltura: 604,
    capaLargura: 900,
    capaUrl: "/capas/comercial.jpg",
    categoria: "Vendas e negócios",
    chave: "comercial",
    codigo: null,
    descricao:
      "A formação comercial completa da Profills, da autoavaliação ao pós-venda. Você aprende o método dos cinco pilares para diagnosticar o cliente, montar uma proposta de valor e conduzir a negociação até o fechamento, com o CRM como apoio em cada etapa.",
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
    titulo: "Profills School Comercial",
    topicos: [
      "Diagnosticar o cliente pelos cinco pilares da venda consultiva",
      "Prospectar e qualificar oportunidades de envase",
      "Montar uma proposta que mostra valor e retorno",
      "Conduzir objeções e negociar o fechamento",
      "Registrar e acompanhar a negociação no CRM",
      "Passar o cliente para o pós-venda sem perder informação",
    ],
  },
  {
    capaAlt: "Ilustração de um posto de montagem com equipamento de proteção",
    capaAltura: 720,
    capaLargura: 1280,
    capaUrl: "/capas/seguranca.jpg",
    categoria: "Produção e montagem",
    chave: "fabrica-montagem",
    codigo: null,
    descricao:
      "O básico para trabalhar na montagem das máquinas Profills com segurança. O curso começa pelos riscos do posto, apresenta a envasadora conjunto por conjunto e termina com a montagem pneumática a partir do esquema.",
    destaque: null,
    modulos: [
      ...umModulo(1, "Segurança do posto", [
        {
          descricao:
            "Os riscos de esmagamento, choque e ar comprimido em cada etapa da montagem.",
          titulo: "Riscos do posto de montagem",
        },
        {
          descricao:
            "Como bloquear e etiquetar energia e ar antes de qualquer intervenção na máquina.",
          titulo: "Bloqueio antes de mexer",
        },
        {
          descricao:
            "Quais ferramentas e equipamentos de proteção cada tarefa do posto exige.",
          titulo: "Ferramentas e EPI",
        },
      ]),
      ...umModulo(2, "Envasadora: conhecendo a máquina", [
        {
          descricao:
            "Os conjuntos da envasadora, do tanque ao transportador, e a função de cada um.",
          titulo: "Estrutura e conjuntos",
        },
        {
          descricao:
            "Como os bicos dosam o volume e o que muda de um produto para outro.",
          titulo: "Bicos e dosagem",
        },
      ]),
      ...umModulo(3, "Montagem pneumática", [
        {
          descricao:
            "Como ler o esquema pneumático e achar cada válvula e cilindro na máquina.",
          titulo: "Leitura do esquema",
        },
        {
          descricao:
            "A montagem do conjunto pneumático passo a passo, com o teste de vazamento no fim.",
          titulo: "Montando o conjunto",
        },
      ]),
    ],
    niveis: [],
    status: "publicado",
    titulo: "Fábrica e montagem",
    topicos: [
      "Reconhecer os riscos do posto de montagem",
      "Bloquear energia e ar antes de mexer na máquina",
      "Identificar os conjuntos de uma envasadora",
      "Ler um esquema pneumático",
      "Montar e testar um conjunto pneumático",
    ],
  },
  {
    capaAlt:
      "Equipe comercial da Profills reunida em volta de uma mesa com notebooks, diante de um painel de fechamento de vendas",
    capaAltura: 604,
    capaLargura: 900,
    capaUrl: "/capas/nova-rotina.jpg",
    categoria: "Vendas e negócios",
    chave: "nova-rotina",
    codigo: "POP-COM-001",
    descricao:
      "A rotina de fechamento que a equipe comercial passou a seguir neste ano. Cada aula cobre um passo da semana, do funil à reunião de previsão, e o curso fecha com o checklist do fim do mês.",
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
    titulo: "Nova Rotina de Fechamento",
    topicos: [
      "Organizar o funil da semana",
      "Preparar a reunião de previsão",
      "Fazer o follow-up em até 48 horas",
      "Registrar perdas e os motivos no CRM",
    ],
  },
  {
    capaAlt:
      "Peça Como filmar as máquinas Profills: uma pessoa grava com o celular uma envasadora na fábrica",
    capaAltura: 507,
    capaLargura: 900,
    capaUrl: "/capas/gravacao.jpg",
    categoria: "Produtos e aplicações",
    chave: "gravacao",
    codigo: null,
    descricao:
      "Como gravar vídeos das máquinas Profills que mostram o equipamento com clareza para o cliente, só com o celular.",
    destaque: "Regra 5x4",
    modulos: umModulo(1, "Curso de gravação técnica", [
      "A regra 5x4",
      "Ângulos e luz",
      "Máquina rodando",
    ]),
    niveis: [],
    status: "em_producao",
    titulo: "Gravação de Máquinas",
    topicos: [
      "Aplicar a regra 5x4 em cada gravação",
      "Escolher ângulo e luz na fábrica",
      "Filmar a máquina em funcionamento sem tremer",
    ],
  },
  {
    capaAlt:
      "Peça azul da Profills School com o lema Vender com técnica, convencer com valor, fechar com método",
    capaAltura: 437,
    capaLargura: 900,
    capaUrl: "/capas/autoavaliacao.jpg",
    categoria: "Vendas e negócios",
    chave: "autoavaliacao",
    codigo: null,
    descricao:
      "Trinta afirmações sobre o seu jeito de vender, agrupadas em seis competências. O resultado mostra por onde começar a formação comercial.",
    destaque: "30 afirmações · 6 competências",
    modulos: umModulo(0, "Autoavaliação", [
      "Como responder",
      "As 6 competências",
    ]),
    niveis: [],
    status: "publicado",
    titulo: "Autoavaliação Comercial",
    topicos: [
      "Responder à autoavaliação com sinceridade",
      "Entender as seis competências do vendedor Profills",
      "Escolher a competência para desenvolver primeiro",
    ],
  },
  {
    capaAlt:
      "Ilustração de um celular com balões de conversa, um fone de atendimento e uma caixa de ferramentas",
    capaAltura: 720,
    capaLargura: 1280,
    capaUrl: "/capas/pos-venda.jpg",
    categoria: "Vendas e negócios",
    chave: "pos-venda",
    codigo: null,
    descricao:
      "O que acontece depois que a máquina chega ao cliente. O curso mostra como acompanhar a instalação, responder chamados e manter o cliente por perto para a próxima compra.",
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
    titulo: "Atendimento pós-venda",
    topicos: [
      "Acompanhar a instalação e a partida da máquina",
      "Responder chamados no prazo combinado",
      "Registrar o atendimento no CRM",
      "Transformar o pós-venda em nova oportunidade",
    ],
  },
  {
    capaAlt:
      "Ilustração de uma operadora de touca e jaleco conferindo garrafas numa esteira de envase",
    capaAltura: 720,
    capaLargura: 1280,
    capaUrl: "/capas/bpf.jpg",
    categoria: "Processo de envase",
    chave: "bpf",
    codigo: null,
    descricao:
      "As boas práticas de fabricação que o cliente de alimentos, bebidas e cosméticos cobra da linha de envase.",
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
    titulo: "Boas práticas de fabricação",
    topicos: [
      "Entender o que a vigilância sanitária exige da linha",
      "Manter higiene de pessoas, área e equipamento",
      "Registrar a produção para a rastreabilidade",
    ],
  },
  {
    capaAlt:
      "Ilustração de uma linha com envasadora, embaladora e enfardadeira lado a lado",
    capaAltura: 720,
    capaLargura: 1280,
    capaUrl: "/capas/portfolio.jpg",
    categoria: "Produtos e aplicações",
    chave: "portfolio",
    codigo: null,
    descricao:
      "Um passeio pelo portfólio da Profills: que máquina resolve cada etapa da linha e para qual cliente ela serve.",
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
    titulo: "Portfólio: envasadoras, embaladoras e enfardadeiras",
    topicos: [
      "Diferenciar os modelos de envasadora",
      "Indicar a embaladora certa para cada produto",
      "Saber quando a linha precisa de enfardadeira",
      "Montar uma linha completa com o cliente",
    ],
  },
  {
    capaAlt:
      "Ilustração de dois frascos despejando líquido num funil sobre um béquer",
    capaAltura: 720,
    capaLargura: 1280,
    capaUrl: "/capas/fundamentos.jpg",
    categoria: "Processo de envase",
    chave: "fundamentos",
    codigo: null,
    descricao:
      "Os conceitos que explicam por que um líquido se envasa de um jeito e não de outro: viscosidade, espuma, temperatura e o princípio de dosagem de cada máquina.",
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
    titulo: "Fundamentos do envase de líquidos",
    topicos: [
      "Reconhecer como a viscosidade muda o envase",
      "Comparar envase volumétrico, por gravidade e por pistão",
      "Evitar espuma e respingo no frasco",
      "Escolher o bico pelo tipo de produto",
    ],
  },
  {
    capaAlt:
      "Ilustração de tubulações de aço com bolhas e uma mangueira lançando jato de água",
    capaAltura: 720,
    capaLargura: 1280,
    capaUrl: "/capas/limpeza.jpg",
    categoria: "Operação de linha",
    chave: "limpeza",
    codigo: null,
    descricao:
      "Como limpar a linha sem desmontar e trocar de frasco no menor tempo, com a sequência que a fábrica usa.",
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
    titulo: "Limpeza CIP e troca de formato",
    topicos: [
      "Rodar o ciclo de limpeza CIP do começo ao fim",
      "Conferir a limpeza antes de liberar a linha",
      "Trocar o formato do frasco com o checklist",
    ],
  },
];

/** Cursos que o admin liberou ao aluno A, do mais antigo ao mais novo. */
export const LIBERADOS_A = [
  "comercial",
  "fabrica-montagem",
  "nova-rotina",
  "gravacao",
  "autoavaliacao",
];

/** O curso que o admin liberou ao aluno B. */
export const LIBERADO_B = "fabrica-montagem";

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
