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
    entrelinha: 1.1,
    espacamento: -0.03,
    menor: { acimaDeCaracteres: 30, tamanho: 44 },
    tamanho: 58,
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

/** A mesma folha com outro nome, no tamanho que esse nome pede. */
export const folhaComONome = (
  folha: FolhaDoCertificado,
  nome: string
): FolhaDoCertificado => ({
  ...folha,
  nome,
  nomeEmTamanho: tamanhoPara(nome, FOLHA_EM_PX.nome),
});
