/** As medidas e o texto da folha, sem o `uqr`: a folha na tela de Minha conta roda no cliente e lê só daqui. */
export const FOLHA_EM_PX = {
  abre: 15,
  altura: 794,
  centro: { lado: 120, pe: 150, topo: 112 },
  confere: {
    codigo: 18,
    entrelinha: 1.5,
    espacamentoDoCodigo: 0.04,
    qr: 84,
    texto: 13,
    vao: 16,
  },
  cor: {
    faixa: "#282d33",
    faixaTexto: "#a8acb0",
    linha: "#c9cdd1",
    papel: "#f4f5f7",
    tinta: "#22262b",
    tintaClara: "#4d5257",
    traco: "#ffcc01",
  },
  curso: {
    abaixo: 8,
    acima: 6,
    espacamento: -0.02,
    menor: { acimaDeCaracteres: 56, tamanho: 26 },
    tamanho: 32,
  },
  entrelinha: 1.43,
  faixa: {
    altura: 112,
    lockup: { altura: 60, largura: 212 },
    recuo: 64,
    rotulo: 15,
  },
  frase: { entrelinha: 1.5, tamanho: 19 },
  largura: 1123,
  nome: {
    acima: 26,
    /** Do maior para o menor; acima de `grandeAte` caracteres, o nome começa no segundo. */
    degraus: [58, 44, 36, 30],
    entrelinha: 1.1,
    espacamento: -0.03,
    grandeAte: 30,
  },
  pe: { acima: 20, baixo: 48, lado: 64 },
  quem: { emissor: 15, entrelinha: 1.5, texto: 14 },
  traco: { abaixo: 26, acima: 24, altura: 5, largura: 96 },
} as const;

export interface FolhaDoCertificado {
  carga: string;
  codigo: string;
  confira: string;
  curso: string;
  cursoEmTamanho: number;
  data: string;
  emissor: string;
  nome: string;
  nomeEmTamanho: number;
  plataforma: string;
  qr: { caminho: string; lado: number };
  rotulo: string;
}

export const tamanhoPara = (
  texto: string,
  {
    menor,
    tamanho,
  }: { menor: { acimaDeCaracteres: number; tamanho: number }; tamanho: number }
) => (texto.length > menor.acimaDeCaracteres ? menor.tamanho : tamanho);

const ESPACOS = /\s+/;
const ESTREITAS = /[fijlrtIÍÌÎÏíìîï.,;:'’!|()-]/u;
const LARGAS = /[MWmwŒÆœæ@%—]/u;
const LATINA = /[\p{Script=Latin}\p{Nd}]/u;
const MAIUSCULA = /\p{Lu}/u;

/**
 * A largura da letra em em na Geist Bold, arredondada para cima por grupo: a conta
 * nunca dá linha mais curta que a desenhada. Fora do latim (emoji, outra escrita),
 * vale o teto de 1,3 em.
 */
function emDaLetra(letra: string) {
  if (letra === " ") {
    return 0.25;
  }
  if (ESTREITAS.test(letra)) {
    return 0.45;
  }
  if (LARGAS.test(letra)) {
    return 1.12;
  }
  if (LATINA.test(letra)) {
    return MAIUSCULA.test(letra) ? 0.78 : 0.7;
  }
  return 1.3;
}

const emDaPalavra = (palavra: string) =>
  [...palavra].reduce((soma, letra) => soma + emDaLetra(letra), 0);

const LARGURA_DO_CENTRO = FOLHA_EM_PX.largura - 2 * FOLHA_EM_PX.centro.lado;

/**
 * Quantas linhas o texto ocupa na largura do meio da folha. A palavra maior que a
 * linha quebra letra a letra, com o hífen no fim de cada pedaço (`quebravel`).
 */
function linhasDo(texto: string, tamanho: number) {
  const cabe = LARGURA_DO_CENTRO / tamanho;
  const hifen = emDaLetra("-");
  let linhas = 1;
  let usado = 0;
  for (const palavra of texto.split(ESPACOS).filter(Boolean)) {
    const largura = emDaPalavra(palavra);
    const aoLado = usado === 0 ? largura : usado + emDaLetra(" ") + largura;
    if (aoLado <= cabe) {
      usado = aoLado;
    } else if (largura <= cabe) {
      linhas += 1;
      usado = largura;
    } else {
      linhas += usado === 0 ? 0 : 1;
      usado = 0;
      for (const letra of palavra) {
        if (usado + emDaLetra(letra) + hifen > cabe) {
          linhas += 1;
          usado = 0;
        }
        usado += emDaLetra(letra);
      }
    }
  }
  return linhas;
}

const { abre, centro, curso, frase, nome, traco } = FOLHA_EM_PX;

/** A altura do meio da folha menos tudo o que não é o nome, com 8 px de folga para o pé. */
function alturaParaONome(cursoNaFolha: { tamanho: number; texto: string }) {
  const doCurso =
    linhasDo(cursoNaFolha.texto, cursoNaFolha.tamanho) *
    cursoNaFolha.tamanho *
    FOLHA_EM_PX.entrelinha;
  const doResto =
    abre * FOLHA_EM_PX.entrelinha +
    nome.acima +
    traco.acima +
    traco.altura +
    traco.abaixo +
    2 * frase.tamanho * frase.entrelinha +
    curso.acima +
    curso.abaixo;
  return FOLHA_EM_PX.altura - centro.topo - centro.pe - doCurso - doResto - 8;
}

/**
 * O nome como a folha o escreve e o corpo dele: o maior degrau em que ele cabe entre
 * "Certificamos que" e o traço, com cada palavra inteira numa linha. Só no menor
 * degrau a palavra maior que a linha quebra. O que não cabe nem nele sai cortado,
 * com reticências, no maior pedaço que cabe.
 */
export function nomeNaFolha(
  texto: string,
  cursoNaFolha: { tamanho: number; texto: string }
): { nome: string; tamanho: number } {
  const altura = alturaParaONome(cursoNaFolha);
  const menor = nome.degraus.at(-1) ?? 0;
  const cabe = (t: string, tamanho: number) =>
    linhasDo(t, tamanho) * tamanho * nome.entrelinha <= altura;
  const semQuebrarPalavra = (tamanho: number) =>
    tamanho === menor ||
    texto
      .split(ESPACOS)
      .every((p) => emDaPalavra(p) * tamanho <= LARGURA_DO_CENTRO);
  const letras = [...texto];
  const degraus =
    letras.length > nome.grandeAte ? nome.degraus.slice(1) : nome.degraus;
  const degrau = degraus.find((t) => semQuebrarPalavra(t) && cabe(texto, t));
  if (degrau) {
    return { nome: texto, tamanho: degrau };
  }
  const cortado = (n: number) => `${letras.slice(0, n).join("").trimEnd()}…`;
  let cabeAte = 0;
  let passaDe = letras.length;
  while (passaDe - cabeAte > 1) {
    const meio = Math.floor((cabeAte + passaDe) / 2);
    if (cabe(cortado(meio), menor)) {
      cabeAte = meio;
    } else {
      passaDe = meio;
    }
  }
  return { nome: cortado(cabeAte), tamanho: menor };
}

export const HIFEN_OCULTO = "\u00ad";

/**
 * O nome com um hífen oculto entre as letras de cada palavra maior que a linha. A
 * tela (`hyphens: manual`, o padrão do CSS) e o PDF (`registerHyphenationCallback`)
 * quebram ali, com o hífen à vista, em vez de deixar a palavra passar da margem.
 */
export const quebravel = (texto: string, tamanho: number) =>
  texto
    .split(" ")
    .map((palavra) =>
      emDaPalavra(palavra) * tamanho > LARGURA_DO_CENTRO
        ? [...palavra].join(HIFEN_OCULTO)
        : palavra
    )
    .join(" ");

/** A mesma folha com outro nome, no tamanho que esse nome pede. */
export function folhaComONome(
  folha: FolhaDoCertificado,
  texto: string
): FolhaDoCertificado {
  const escrito = nomeNaFolha(texto, {
    tamanho: folha.cursoEmTamanho,
    texto: folha.curso,
  });
  return { ...folha, nome: escrito.nome, nomeEmTamanho: escrito.tamanho };
}
