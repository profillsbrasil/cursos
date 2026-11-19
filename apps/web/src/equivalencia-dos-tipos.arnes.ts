import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dir, "../../..");
const PACOTES = ["apps/web", "packages/api", "packages/db", "packages/ui"];

const GERADOS = [
  "apps/web/.next/types",
  "apps/web/next-env.d.ts",
  "apps/web/src/env.ts",
  "packages/db/src/env.ts",
];

const GLOBAL = "(global)";

type Plantio =
  | { tipo: "acrescentar"; arquivo: string; texto: string }
  | { tipo: "criar"; arquivo: string; texto: string }
  | { tipo: "tirar"; arquivo: string }
  | { tipo: "trocar"; arquivo: string; de: string; para: string };

type Resultado =
  | "nenhum"
  | "os dois"
  | "os dois, com diferença"
  | "só o Oxlint"
  | "só o tsrs direto";

interface Categoria {
  esperado: Resultado;
  nome: string;
  oxlint: string[];
  plantios: Plantio[];
  tsrsDireto: string[];
}

const ATRIBUICAO_ERRADA = '\nexport const erroPlantado: number = "texto";\n';

const CATEGORIAS: Categoria[] = [
  {
    nome: "atribuição errada em apps/web (TS2322)",
    tsrsDireto: ["TS2322"],
    oxlint: ["TS2322"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "acrescentar",
        arquivo: "apps/web/src/lib/formulario.ts",
        texto: ATRIBUICAO_ERRADA,
      },
    ],
  },
  {
    nome: "atribuição errada em packages/api (TS2322)",
    tsrsDireto: ["TS2322"],
    oxlint: ["TS2322"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "acrescentar",
        arquivo: "packages/api/src/dominio/limites-do-curso.ts",
        texto: ATRIBUICAO_ERRADA,
      },
    ],
  },
  {
    nome: "href de rota inexistente (typedRoutes)",
    tsrsDireto: ["TS2322"],
    oxlint: ["TS2322"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "trocar",
        arquivo: "apps/web/src/app/(admin)/admin/not-found.tsx",
        de: 'href="/admin/pessoas"',
        para: 'href="/admin/rota-que-nao-existe"',
      },
    ],
  },
  {
    nome: "RouteContext sem apps/web/.next/types",
    tsrsDireto: ["TS2304"],
    oxlint: ["TS2304"],
    esperado: "os dois",
    plantios: [{ tipo: "tirar", arquivo: "apps/web/.next/types" }],
  },
  {
    nome: "import de módulo inexistente (TS2307)",
    tsrsDireto: ["TS2307"],
    oxlint: ["TS2307"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "acrescentar",
        arquivo: "apps/web/src/lib/formato.ts",
        texto: '\nexport { nada } from "./modulo-que-nao-existe";\n',
      },
    ],
  },
  {
    nome: "propriedade inexistente (TS2339)",
    tsrsDireto: ["TS2339"],
    oxlint: ["TS2339"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "acrescentar",
        arquivo: "apps/web/src/lib/marca.ts",
        texto:
          '\nexport const tamanhoPlantado = "texto".propriedadeQueNaoExiste;\n',
      },
    ],
  },
  {
    nome: "argumento errado numa procedure do tRPC chamada pelo web",
    tsrsDireto: ["TS2322"],
    oxlint: ["TS2322"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "trocar",
        arquivo: "apps/web/src/components/curso/botao-de-troca.tsx",
        de: "precoVisto: preco }",
        para: "precoVisto: String(preco) }",
      },
    ],
  },
  {
    nome: "erro num arquivo de teste",
    tsrsDireto: ["TS2322"],
    oxlint: ["TS2322"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "acrescentar",
        arquivo: "apps/web/src/lib/formato.test.ts",
        texto: ATRIBUICAO_ERRADA,
      },
    ],
  },
  {
    nome: "erro dentro de um .d.ts (skipLibCheck), com sentinela num .ts",
    tsrsDireto: ["TS2322"],
    oxlint: ["TS2322"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "acrescentar",
        arquivo: "apps/web/src/lib/formulario.ts",
        texto: ATRIBUICAO_ERRADA,
      },
      {
        tipo: "criar",
        arquivo: "apps/web/src/plantado.d.ts",
        texto:
          "declare global {\n  interface Window {\n    plantado: TipoQueNaoExiste;\n  }\n}\nexport {};\n",
      },
    ],
  },
  {
    nome: "declaração global de um .d.ts usada por um .ts",
    tsrsDireto: ["TS2322"],
    oxlint: ["TS2322"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "criar",
        arquivo: "apps/web/src/plantado.d.ts",
        texto: "declare global {\n  const PLANTADO: string;\n}\nexport {};\n",
      },
      {
        tipo: "acrescentar",
        arquivo: "apps/web/src/lib/formulario.ts",
        texto: "\nexport const lidoDoGlobal: number = PLANTADO;\n",
      },
    ],
  },
  {
    nome: "erro global sem arquivo (TS2318, noLib), com sentinela",
    tsrsDireto: ["TS2318", "TS2322", "TS5053"],
    oxlint: ["TS2322", "tsconfig-error"],
    esperado: "os dois, com diferença",
    plantios: [
      {
        tipo: "trocar",
        arquivo: "packages/ui/tsconfig.json",
        de: '"strictNullChecks": true',
        para: '"strictNullChecks": true,\n    "noLib": true',
      },
      {
        tipo: "acrescentar",
        arquivo: "apps/web/src/lib/formulario.ts",
        texto: ATRIBUICAO_ERRADA,
      },
    ],
  },
  {
    nome: "erro de declaração (TS4094, declaration), com sentinela",
    tsrsDireto: ["TS2322", "TS4094"],
    oxlint: ["TS2322"],
    esperado: "os dois, com diferença",
    plantios: [
      {
        tipo: "trocar",
        arquivo: "packages/ui/tsconfig.json",
        de: '"strictNullChecks": true',
        para: '"strictNullChecks": true,\n    "declaration": true',
      },
      {
        tipo: "criar",
        arquivo: "packages/ui/src/plantado.ts",
        texto:
          "export const Plantada = class {\n  private segredo = 1;\n  ler() {\n    return this.segredo;\n  }\n};\n",
      },
      {
        tipo: "acrescentar",
        arquivo: "apps/web/src/lib/formulario.ts",
        texto: ATRIBUICAO_ERRADA,
      },
    ],
  },
  {
    nome: "noUncheckedIndexedAccess de packages/api",
    tsrsDireto: ["TS2322"],
    oxlint: ["TS2322"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "acrescentar",
        arquivo: "packages/api/src/dominio/regras.ts",
        texto:
          "\nconst listaPlantada: number[] = [1];\nexport const primeiroPlantado: number = listaPlantada[0];\n",
      },
    ],
  },
  {
    nome: "noUnusedLocals de packages/api (TS6133)",
    tsrsDireto: ["TS6133"],
    oxlint: ["TS6133"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "acrescentar",
        arquivo: "packages/api/src/dominio/regras.ts",
        texto: "\nexport const plantada = () => {\n  const naoUsada = 1;\n};\n",
      },
    ],
  },
  {
    nome: "export de packages/api renomeado, visto pelo web",
    tsrsDireto: ["TS2724"],
    oxlint: ["TS2724"],
    esperado: "os dois",
    plantios: [
      {
        tipo: "trocar",
        arquivo: "packages/api/src/dominio/rotas.ts",
        de: "caminhoDoCertificado",
        para: "caminhoDoCertificadoRenomeado",
      },
    ],
  },
];

const rodar = async (comando: string[], cwd: string) => {
  const processo = Bun.spawn(comando, { cwd, stderr: "pipe", stdout: "pipe" });

  const [saida, erro, codigo] = await Promise.all([
    new Response(processo.stdout).text(),
    new Response(processo.stderr).text(),
    processo.exited,
  ]);

  return { codigo, saida: `${saida}${erro}` };
};

const montarCopia = async () => {
  const cache = join(
    process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"),
    "cursos"
  );

  await mkdir(cache, { recursive: true });
  const copia = await mkdtemp(join(cache, "equivalencia-dos-tipos-"));

  const arquivos = await rodar(
    [
      "sh",
      "-c",
      'git ls-files -z --cached --others --exclude-standard | tar --null -T - -cf - | tar -xf - -C "$1"',
      "sh",
      copia,
    ],
    RAIZ
  );

  if (arquivos.codigo !== 0) {
    throw new Error(`A cópia falhou:\n${arquivos.saida}`);
  }

  await Promise.all(
    GERADOS.map((gerado) =>
      cp(join(RAIZ, gerado), join(copia, gerado), { recursive: true })
    )
  );

  const instalacao = await rodar(
    ["bun", "install", "--frozen-lockfile", "--ignore-scripts"],
    copia
  );

  if (instalacao.codigo !== 0) {
    throw new Error(`O bun install falhou:\n${instalacao.saida}`);
  }

  return copia;
};

const trocarUmaVez = (
  texto: string,
  plantio: { arquivo: string; de: string; para: string }
) => {
  const partes = texto.split(plantio.de);

  if (partes.length !== 2) {
    throw new Error(
      `"${plantio.de}" não aparece uma vez só em ${plantio.arquivo}`
    );
  }

  return partes.join(plantio.para);
};

const plantarUm = async (copia: string, plantio: Plantio) => {
  const alvo = join(copia, plantio.arquivo);

  switch (plantio.tipo) {
    case "criar": {
      await writeFile(alvo, plantio.texto);

      return () => rm(alvo);
    }

    case "tirar": {
      await rename(alvo, `${alvo}.fora`);

      return () => rename(`${alvo}.fora`, alvo);
    }

    case "acrescentar":
    case "trocar": {
      const original = await readFile(alvo, "utf8");

      const plantado =
        plantio.tipo === "acrescentar"
          ? `${original}${plantio.texto}`
          : trocarUmaVez(original, plantio);

      await writeFile(alvo, plantado);

      return () => writeFile(alvo, original);
    }

    default:
      throw new Error("plantio desconhecido");
  }
};

const plantar = async (copia: string, plantios: Plantio[]) => {
  const desfazeres = await Promise.all(
    plantios.map((plantio) => plantarUm(copia, plantio))
  );

  return () => Promise.all(desfazeres.map((desfazer) => desfazer()));
};

const LINHA_DO_TSRS = /^(?:(.+?)\(\d+,\d+\): )?error (TS\d+):/u;
const CODIGO_DO_OXLINT = /^typescript\((TS\d+|tsconfig-error)\)$/u;

const SAIDA_DO_TSRS_COM_ERRO = 2;

const errosDoTsrsDireto = async (copia: string) => {
  const saidas = await Promise.all(
    PACOTES.map(async (pacote) => {
      const pasta = join(copia, pacote);

      const { codigo, saida } = await rodar(
        [
          join(copia, "node_modules/.bin/tsrs"),
          "--noEmit",
          "--pretty",
          "false",
          "--listFiles",
        ],
        pasta
      );

      const linhas = saida.split("\n");

      const erros = linhas.flatMap((linha) => {
        const achado = LINHA_DO_TSRS.exec(linha);

        if (!achado?.[2]) {
          return [];
        }

        const arquivo = achado[1]
          ? relative(copia, resolve(pasta, achado[1]))
          : GLOBAL;

        return [`${arquivo} ${achado[2]}`];
      });

      const esperado = erros.length > 0 ? SAIDA_DO_TSRS_COM_ERRO : 0;

      if (codigo !== esperado) {
        throw new Error(
          `O tsrs de ${pacote} saiu com ${codigo}, e ${erros.length} erros pediam ${esperado}:\n${saida.slice(-2000)}`
        );
      }

      const arquivos = linhas.filter((linha) => linha.startsWith(copia)).length;

      return { arquivos, erros };
    })
  );

  return {
    arquivos: saidas.reduce((soma, saida) => soma + saida.arquivos, 0),
    erros: new Set(saidas.flatMap((saida) => saida.erros)),
  };
};

interface DiagnosticoDoOxlint {
  code: string;
  filename: string;
  severity: string;
}

const ehSaidaDoOxlint = (
  valor: unknown
): valor is { diagnostics: DiagnosticoDoOxlint[]; number_of_files: number } =>
  typeof valor === "object" &&
  valor !== null &&
  "diagnostics" in valor &&
  Array.isArray(valor.diagnostics) &&
  "number_of_files" in valor &&
  typeof valor.number_of_files === "number";

const errosDoOxlint = async (copia: string) => {
  const { saida } = await rodar(
    [join(copia, "node_modules/.bin/oxlint"), "-f", "json"],
    copia
  );

  const lido: unknown = JSON.parse(saida.slice(saida.indexOf("{")));

  if (!ehSaidaDoOxlint(lido)) {
    throw new Error(`O oxlint não devolveu JSON:\n${saida}`);
  }

  return {
    arquivos: lido.number_of_files,
    erros: new Set(
      lido.diagnostics.flatMap((diagnostico) => {
        const codigo = CODIGO_DO_OXLINT.exec(diagnostico.code)?.[1];

        if (!codigo || diagnostico.severity !== "error") {
          return [];
        }

        const arquivo = diagnostico.filename
          ? relative(copia, resolve(copia, diagnostico.filename))
          : GLOBAL;

        return [`${arquivo} ${codigo}`];
      })
    ),
  };
};

const codigos = (erros: Set<string>) =>
  [...new Set([...erros].map((erro) => erro.split(" ")[1]))].sort();

const rodarOsDois = async (copia: string) => {
  const [tsrsDireto, oxlint] = await Promise.all([
    errosDoTsrsDireto(copia),
    errosDoOxlint(copia),
  ]);

  expect(tsrsDireto.arquivos).toBeGreaterThan(0);
  expect(oxlint.arquivos).toBeGreaterThan(0);

  return { oxlint: oxlint.erros, tsrsDireto: tsrsDireto.erros };
};

const comparar = (tsrsDireto: Set<string>, oxlint: Set<string>): Resultado => {
  if (tsrsDireto.size === 0) {
    return oxlint.size === 0 ? "nenhum" : "só o Oxlint";
  }

  if (oxlint.size === 0) {
    return "só o tsrs direto";
  }

  const iguais =
    tsrsDireto.size === oxlint.size &&
    [...tsrsDireto].every((erro) => oxlint.has(erro));

  return iguais ? "os dois" : "os dois, com diferença";
};

const resumir = (erros: Set<string>) => {
  if (erros.size === 0) {
    return "nada";
  }

  if (erros.size <= 3) {
    return [...erros].map((erro) => `\`${erro}\``).join("<br>");
  }

  return `${erros.size} erros (${codigos(erros).join(", ")})`;
};

interface Linha {
  nome: string;
  oxlint: Set<string>;
  resultado: Resultado;
  tsrsDireto: Set<string>;
}

const tabela = (linhas: Linha[]) =>
  [
    "| Categoria | tsrs direto | Oxlint | Resultado |",
    "| --- | --- | --- | --- |",
    ...linhas.map(
      (linha) =>
        `| ${linha.nome} | ${resumir(linha.tsrsDireto)} | ${resumir(linha.oxlint)} | ${linha.resultado} |`
    ),
  ].join("\n");

describe("check de tipos: tsrs --noEmit contra oxlint --type-check", () => {
  let copia = "";
  const linhas: Linha[] = [];

  beforeAll(async () => {
    copia = await montarCopia();
  }, 300_000);

  afterAll(async () => {
    console.log(tabela(linhas));

    if (copia) {
      await rm(copia, { force: true, recursive: true });
    }
  });

  test("o código sem plantio não tem erro de tipo nos dois", async () => {
    const desfazer = await plantar(copia, [
      {
        tipo: "acrescentar",
        arquivo: "apps/web/src/lib/formulario.ts",
        texto: ATRIBUICAO_ERRADA,
      },
    ]);

    try {
      const sentinela = await rodarOsDois(copia);
      expect(codigos(sentinela.tsrsDireto)).toEqual(["TS2322"]);
      expect(codigos(sentinela.oxlint)).toEqual(["TS2322"]);
    } finally {
      await desfazer();
    }

    const { tsrsDireto, oxlint } = await rodarOsDois(copia);
    expect([...tsrsDireto]).toEqual([]);
    expect([...oxlint]).toEqual([]);
  }, 120_000);

  test.each(CATEGORIAS)(
    "$nome",
    async (categoria) => {
      const desfazer = await plantar(copia, categoria.plantios);

      try {
        const { tsrsDireto, oxlint } = await rodarOsDois(copia);
        const resultado = comparar(tsrsDireto, oxlint);
        linhas.push({ nome: categoria.nome, oxlint, resultado, tsrsDireto });
        expect(resultado).toBe(categoria.esperado);
        expect(codigos(tsrsDireto)).toEqual(categoria.tsrsDireto);
        expect(codigos(oxlint)).toEqual(categoria.oxlint);
      } finally {
        await desfazer();
      }
    },
    120_000
  );
});
