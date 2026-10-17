// Gera os três SVG do cubo da marca a partir das faces abaixo.
// Uso, da raiz do repo: bun docs/marca/cubo.ts apps/web
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Ponto = readonly [x: number, y: number];

interface Face {
  cor: string;
  pontos: readonly Ponto[];
}

// Medidas do símbolo da Profills School, traçado pelo potrace e acertado à mão:
// a aresta da frente em x 269, a inclinação de 0,525, lajes de 99 e vãos de 42.
const LARGURA = 664.5;
const ALTURA = 573;

const CEU = { luz: "#AAD2EA", sombra: "#7BB5DD", topo: "#D4E8F4" };
const SOL = { luz: "#FFCC01", sombra: "#E0A800" };
const CANELA = { luz: "#E5977A", sombra: "#C9785C" };

// A ordem é a de pintura, de cima para baixo. Em cada laje, a face da esquerda
// fica na sombra e a da direita leva a cor do app.
const FACES: readonly Face[] = [
  {
    cor: CEU.topo,
    pontos: [
      [269, 0],
      [412, 75],
      [269, 150],
      [126, 75],
    ],
  },
  {
    cor: CEU.sombra,
    pontos: [
      [0, 149.8],
      [94.3, 100.3],
      [269, 192],
      [269, 291],
    ],
  },
  {
    cor: CEU.luz,
    pontos: [
      [269, 192],
      [538, 50.8],
      [538, 149.8],
      [269, 291],
    ],
  },
  {
    cor: SOL.sombra,
    pontos: [
      [0, 191.8],
      [269, 333],
      [269, 432],
      [0, 290.8],
    ],
  },
  {
    cor: SOL.luz,
    pontos: [
      [269, 333],
      [572, 173.9],
      [572, 148],
      [664.5, 195.5],
      [572, 309],
      [572, 272.9],
      [269, 432],
    ],
  },
  {
    cor: CANELA.sombra,
    pontos: [
      [0, 332.8],
      [269, 474],
      [269, 573],
      [0, 431.8],
    ],
  },
  {
    cor: CANELA.luz,
    pontos: [
      [269, 474],
      [538, 332.8],
      [538, 431.8],
      [269, 573],
    ],
  },
];

const numero = (n: number) => String(Math.round(n * 10) / 10);

function caminhos(escala: number, dx: number, dy: number) {
  return FACES.map(({ cor, pontos }) => {
    const d = pontos
      .map(
        ([x, y], i) =>
          `${i === 0 ? "M" : "L"}${numero(x * escala + dx)} ${numero(y * escala + dy)}`
      )
      .join("");
    return `  <path d="${d}z" fill="${cor}" />`;
  });
}

// O cubo centrado num quadro quadrado, com 2 unidades de folga nas laterais.
function quadrado(lado: number, titulo: string) {
  const escala = (lado - 4) / LARGURA;
  const dy = (lado - ALTURA * escala) / 2;
  return [
    `<svg viewBox="0 0 ${lado} ${lado}" xmlns="http://www.w3.org/2000/svg">`,
    `  <title>${titulo}</title>`,
    ...caminhos(escala, 2, dy),
    "</svg>",
    "",
  ].join("\n");
}

// No lockup, o cubo ocupa a altura toda à esquerda, e o texto já desenhado fica.
// O texto é todo path que começa depois de x 150.
function lockup(atual: string) {
  const texto = [
    ...atual.matchAll(/<path\b[^>]*?\bd="M(\d+(?:\.\d+)?)[\s\S]*?\/>/g),
  ]
    .filter((m) => Number(m[1]) > 150)
    .map((m) => `  ${m[0]}`);
  if (texto.length !== 2) {
    throw new Error(
      `O lockup deveria ter 2 paths de texto, e tem ${texto.length}.`
    );
  }
  const cabecalho = atual.slice(
    0,
    atual.indexOf("</title>") + "</title>".length
  );
  return [
    cabecalho,
    ...caminhos(120 / ALTURA, 0, 0),
    ...texto,
    "</svg>",
    "",
  ].join("\n");
}

const [, , web] = process.argv;
if (!web) {
  throw new Error("Uso: bun docs/marca/cubo.ts apps/web");
}
const marca = join(web, "public", "marca");
const arquivoDoLockup = join(marca, "profills-cursos.svg");
const arquivoDoIcone = join(marca, "profills-cursos-icone.svg");
const arquivoDoFavicon = join(web, "src", "app", "icon.svg");
writeFileSync(arquivoDoIcone, quadrado(216, "Profills Cursos"));
writeFileSync(arquivoDoFavicon, quadrado(512, "Cubo da Profills"));
writeFileSync(arquivoDoLockup, lockup(readFileSync(arquivoDoLockup, "utf8")));

// O Biome formata SVG; sem isto, o `ultracite check` acusa o arquivo gerado.
const formatar = spawnSync(
  "bun",
  [
    "x",
    "biome",
    "format",
    "--write",
    arquivoDoLockup,
    arquivoDoIcone,
    arquivoDoFavicon,
  ],
  { stdio: ["ignore", "ignore", "inherit"] }
);
if (formatar.status !== 0) {
  throw new Error("O Biome não formatou os SVG da marca.");
}
