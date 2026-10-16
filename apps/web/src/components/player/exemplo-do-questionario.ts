import type {
  QuestionarioDaAula,
  ResultadoDoQuestionario,
} from "@cursos/api/dominio/questionario";
import type { AlternativaId, PerguntaId } from "@cursos/api/dominio/tipos";

const P = (n: number) =>
  `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}` as PerguntaId;
const A = (n: number) =>
  `00000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}` as AlternativaId;

const pergunta = (
  n: number,
  enunciado: string,
  textos: readonly string[]
): QuestionarioDaAula["perguntas"][number] => ({
  alternativas: textos.map((texto, i) => ({ id: A(n * 10 + i), texto })),
  enunciado,
  id: P(n),
});

export const CRONOGRAMA: QuestionarioDaAula = {
  paraPassar: 3,
  perguntas: [
    pergunta(1, "Por onde o cronograma reverso começa?", [
      "Pela data do pedido",
      "Pela data em que a linha do cliente precisa rodar",
      "Pelo prazo de fabricação da Profills",
      "Pela data da próxima visita",
    ]),
    pergunta(
      2,
      "A linha do cliente precisa rodar em 1º de março, e a fabricação leva 90 dias. O que o cronograma reverso mostra?",
      [
        "Que o pedido pode sair em fevereiro",
        "Que o pedido precisa sair antes de 1º de dezembro, e ainda faltam instalação e teste",
        "Que o prazo só depende da Profills",
      ]
    ),
    pergunta(
      3,
      "Qual etapa do cronograma depende do cliente, e não da Profills?",
      [
        "A fabricação da máquina",
        "A obra, a energia e o ar comprimido no local",
        "A montagem dos bicos de dosagem",
      ]
    ),
  ],
  ultima: null,
};

export const BLOQUEIO: QuestionarioDaAula = {
  paraPassar: 3,
  perguntas: [
    pergunta(
      1,
      "Antes de abrir o painel elétrico da envasadora, o que vem primeiro?",
      [
        "Desligar a máquina pelo botão de parada",
        "Bloquear a chave geral com cadeado e etiqueta",
        "Avisar o colega do posto ao lado",
      ]
    ),
    pergunta(2, "Quem retira o cadeado de bloqueio?", [
      "Qualquer pessoa do turno",
      "O supervisor da linha",
      "Quem colocou o cadeado",
    ]),
    pergunta(
      3,
      "Depois de fechar o ar comprimido, o que falta antes de mexer no cilindro?",
      [
        "Aliviar a pressão que ficou na linha",
        "Nada: com o ar fechado, o cilindro está parado",
        "Trocar a etiqueta por uma nova",
        "Ligar a máquina para testar",
      ]
    ),
    pergunta(4, "O que a etiqueta de bloqueio precisa dizer?", [
      "O nome de quem bloqueou e o motivo",
      "Só a data do bloqueio",
      "O número de série da máquina",
    ]),
  ],
  ultima: null,
};

export const CERTA_DO_CRONOGRAMA = [A(11), A(21), A(31)];
const CERTA_DO_BLOQUEIO = [A(11), A(21), A(30), A(40)];

export const REPROVADO_NA_PRIMEIRA: ResultadoDoQuestionario = {
  acertos: 2,
  aprovada: false,
  paraPassar: 3,
  pontos: 10,
  pontosDaPrimeira: 10,
  respostas: [
    { alternativaId: A(11), certa: true, certaId: null, perguntaId: P(1) },
    { alternativaId: A(20), certa: false, certaId: null, perguntaId: P(2) },
    { alternativaId: A(31), certa: false, certaId: null, perguntaId: P(3) },
    { alternativaId: A(40), certa: true, certaId: null, perguntaId: P(4) },
  ],
  tentativa: 1,
  total: 4,
};

export const APROVADO_NA_PRIMEIRA: ResultadoDoQuestionario = {
  acertos: 3,
  aprovada: true,
  paraPassar: 3,
  pontos: 15,
  pontosDaPrimeira: 15,
  respostas: [1, 2, 3].map((n) => ({
    alternativaId: A(n * 10 + 1),
    certa: true,
    certaId: A(n * 10 + 1),
    perguntaId: P(n),
  })),
  tentativa: 1,
  total: 3,
};

export const APROVADO_NA_SEGUNDA: ResultadoDoQuestionario = {
  acertos: 4,
  aprovada: true,
  paraPassar: 3,
  pontos: 0,
  pontosDaPrimeira: 10,
  respostas: CERTA_DO_BLOQUEIO.map((certaId, i) => ({
    alternativaId: certaId,
    certa: true,
    certaId,
    perguntaId: P(i + 1),
  })),
  tentativa: 2,
  total: 4,
};

export const APROVADO_NA_SEGUNDA_COM_ERRO: ResultadoDoQuestionario = {
  ...APROVADO_NA_SEGUNDA,
  acertos: 3,
  respostas: APROVADO_NA_SEGUNDA.respostas.map((r, i) =>
    i === 1 ? { ...r, alternativaId: A(22), certa: false } : r
  ),
};
