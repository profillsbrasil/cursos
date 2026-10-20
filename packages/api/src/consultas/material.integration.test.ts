// O material de apoio contra o Postgres local: o salvarCurso como único escritor
// (cria, reordena, tira, recusa chave que não está no bucket e o 21º arquivo), os
// tetos do banco e a porta do download (admin, aluno liberado, aluno sem
// liberação e liberação revogada). Roda só com TEST_DATABASE_URL em host local.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  curso,
  liberacao,
  liberacaoDoPerfil,
  material,
  perfilDaPessoa,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { asc, eq, inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import {
  type DocumentoDoCurso,
  formularioDoCurso,
  type MaterialDoDocumento,
} from "../dominio/edicao-do-curso";
import { CARACTERES, LIMITES } from "../dominio/limites-do-curso";
import type {
  AdminId,
  AulaId,
  CategoriaId,
  CursoId,
  MaterialId,
  ModuloId,
} from "../dominio/tipos";
import type { Capas } from "../externos/capas";
import type { Materiais } from "../externos/materiais";
import { createCaller } from "../routers/index";
import { categoriaDeTeste } from "./categoria-de-teste";
import { violacaoDe } from "./erros";
import { liberarParaPerfil } from "./liberacao-do-perfil";
import { definirPerfil } from "./perfil";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const LIBERADO = `user_teste${S}liberado`;
const SEM_LIBERACAO = `user_teste${S}sem`;
const REVOGADO = `user_teste${S}revogado`;
const CLIENTE = `user_teste${S}cliente`;

const capasDeTeste: Capas = {
  abrir: () => Promise.resolve(null),
  receber: () =>
    Promise.resolve({
      imagem: { altura: 720, largura: 1280, url: `/capas/teste-${S}.jpg` },
      tipo: "guardada",
    }),
};

/** O bucket falso só conhece as chaves que o teste pôs nele. */
const noBucket = new Set<string>();
const materiaisDeTeste: Materiais = {
  abrir: () => Promise.resolve(null),
  existe: (guardada) => Promise.resolve(noBucket.has(guardada)),
  receber: () => Promise.reject(new Error("o teste não envia arquivo")),
};

const chave = (n: number, tipo = "pdf") =>
  `${n.toString(16).padStart(8, "0")}${S}${"0".repeat(48)}.${tipo}`;

function novoMaterial(n: number, tipo: "pdf" | "xlsx" = "pdf") {
  const m: MaterialDoDocumento = {
    bytes: 1000 + n,
    chave: chave(n, tipo),
    id: randomUUID() as MaterialId,
    nomeDoArquivo: `arquivo-${n}.${tipo}`,
    tipo,
    titulo: `Material ${n}`,
  };
  noBucket.add(m.chave);
  return m;
}

/** Erro sem tradução mostra a restrição violada no lugar do texto do Postgres. */
const resultado = (p: Promise<unknown>) =>
  p.then(
    () => ({ code: "ok", message: "" }),
    (e: unknown) => {
      if (!(e instanceof TRPCError)) {
        return { code: "não é TRPCError", message: String(e) };
      }
      const v = e.code === "INTERNAL_SERVER_ERROR" ? violacaoDe(e) : null;
      return {
        code: e.code,
        message: v ? `violou ${v.restricao} (${v.codigo})` : e.message,
      };
    }
  );

describe.skipIf(URL_TESTE === null)("material de apoio", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const como = (userId: string, papel: "admin" | "aluno" = "aluno") =>
    createCaller(
      contextoDeTeste({
        capas: capasDeTeste,
        db,
        materiais: materiaisDeTeste,
        papel,
        userId,
      })
    );
  const admin = como("user_admin", "admin");
  const cursos: CursoId[] = [];
  let categoriaId: CategoriaId;

  beforeAll(async () => {
    categoriaId = await categoriaDeTeste(db);
  });

  afterAll(async () => {
    await db
      .delete(liberacao)
      .where(inArray(liberacao.userId, [LIBERADO, SEM_LIBERACAO, REVOGADO]));
    await db
      .delete(perfilDaPessoa)
      .where(
        inArray(perfilDaPessoa.userId, [
          LIBERADO,
          SEM_LIBERACAO,
          REVOGADO,
          CLIENTE,
          "user_outroadmin",
        ])
      );
    await db
      .delete(liberacaoDoPerfil)
      .where(inArray(liberacaoDoPerfil.cursoId, cursos));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  function documentoNovo(materiais: MaterialDoDocumento[]): DocumentoDoCurso {
    const id = randomUUID() as CursoId;
    cursos.push(id);
    return {
      categoriaId,
      descricao: "",
      id,
      materiais,
      modulos: [
        {
          aulas: [
            {
              descricao: "",
              duracaoSeg: 120,
              id: randomUUID() as AulaId,
              perguntas: [],
              titulo: "Aula 1",
              video: null,
            },
          ],
          id: randomUUID() as ModuloId,
          nivelOrdem: null,
          numero: 1,
          titulo: "Módulo 1",
        },
      ],
      niveis: [],
      precoTroca: null,
      status: "publicado",
      titulo: `Curso do material ${S} ${cursos.length}`,
      topicos: [],
      versao: null,
    };
  }

  async function salvar(documento: DocumentoDoCurso) {
    const { versao } = await admin.admin.catalogo.salvarCurso(
      formularioDoCurso(documento, new Blob([new Uint8Array([1])]))
    );
    return { ...documento, versao };
  }

  const noBanco = (cursoId: CursoId) =>
    db
      .select({ posicao: material.posicao, titulo: material.titulo })
      .from(material)
      .where(eq(material.cursoId, cursoId))
      .orderBy(asc(material.posicao));

  test("salvar cria, renomeia, reordena e tira; abrirCurso devolve na ordem", async () => {
    const [a, b, c] = [
      novoMaterial(1),
      novoMaterial(2, "xlsx"),
      novoMaterial(3),
    ];
    if (!(a && b && c)) {
      throw new Error("três materiais");
    }
    const criado = await salvar(documentoNovo([a, b, c]));
    expect(await noBanco(criado.id)).toEqual([
      { posicao: 1, titulo: "Material 1" },
      { posicao: 2, titulo: "Material 2" },
      { posicao: 3, titulo: "Material 3" },
    ]);

    const mudado = await salvar({
      ...criado,
      materiais: [{ ...c, titulo: "Manual" }, a],
    });
    expect(await noBanco(criado.id)).toEqual([
      { posicao: 1, titulo: "Manual" },
      { posicao: 2, titulo: "Material 1" },
    ]);
    const aberto = await admin.admin.catalogo.abrirCurso({ id: criado.id });
    expect(aberto?.documento.materiais).toEqual(mudado.materiais);
    expect(aberto?.documento.versao).toBe(mudado.versao);
    expect(mudado.versao).not.toBe(criado.versao);
  });

  test("chave nova que não está no bucket é recusada com frase e nada muda", async () => {
    const criado = await salvar(documentoNovo([novoMaterial(10)]));
    const forjado = { ...novoMaterial(11), nomeDoArquivo: "forjado.pdf" };
    noBucket.delete(forjado.chave);

    expect(
      await resultado(
        admin.admin.catalogo.salvarCurso(
          formularioDoCurso(
            { ...criado, materiais: [...criado.materiais, forjado] },
            null
          )
        )
      )
    ).toEqual({
      code: "PRECONDITION_FAILED",
      message:
        'O arquivo "forjado.pdf" não chegou ao armazenamento. Tire da lista e envie de novo.',
    });
    expect(await noBanco(criado.id)).toHaveLength(1);
  });

  test("o schema segura 20 materiais por curso, e o 21º é recusado", async () => {
    const vinte = Array.from({ length: LIMITES.materiais }, (_, i) =>
      novoMaterial(100 + i)
    );
    const criado = await salvar(documentoNovo(vinte));
    expect(await noBanco(criado.id)).toHaveLength(20);

    expect(
      (
        await resultado(
          admin.admin.catalogo.salvarCurso(
            formularioDoCurso(
              {
                ...criado,
                materiais: [...criado.materiais, novoMaterial(200)],
              },
              null
            )
          )
        )
      ).code
    ).toBe("BAD_REQUEST");
  });

  test("o banco aceita os tetos do schema e recusa um a mais", async () => {
    const criado = await salvar(documentoNovo([novoMaterial(300)]));
    const [linha] = await db
      .select({ id: material.id })
      .from(material)
      .where(eq(material.cursoId, criado.id));
    const gravar = (mudanca: Partial<typeof material.$inferInsert>) =>
      db
        .update(material)
        .set(mudanca)
        .where(eq(material.id, linha?.id ?? ""))
        .then(
          () => "ok",
          (e: unknown) => violacaoDe(e)?.restricao ?? String(e)
        );
    const { nomeDoArquivo, tituloDoMaterial } = CARACTERES;

    expect([
      await gravar({ titulo: "t".repeat(tituloDoMaterial) }),
      await gravar({ titulo: "t".repeat(tituloDoMaterial + 1) }),
      await gravar({ titulo: " com espaço" }),
      await gravar({ nomeDoArquivo: "n".repeat(nomeDoArquivo) }),
      await gravar({ nomeDoArquivo: "n".repeat(nomeDoArquivo + 1) }),
      await gravar({ bytes: LIMITES.bytesDoMaterial }),
      await gravar({ bytes: LIMITES.bytesDoMaterial + 1 }),
      await gravar({ bytes: 0 }),
      await gravar({ chave: chave(301, "xlsx") }),
      await gravar({ chave: chave(301, "xlsx"), tipo: "xlsx" }),
      await gravar({ posicao: 0 }),
    ]).toEqual([
      "ok",
      "material_titulo_formato",
      "material_titulo_formato",
      "ok",
      "material_nome_do_arquivo_tamanho",
      "ok",
      "material_bytes_limite",
      "material_bytes_limite",
      "material_chave_formato",
      "ok",
      "material_posicao_positiva",
    ]);
  });

  test("baixa o admin e o aluno com liberação ativa; o sem liberação e o revogado, não", async () => {
    const m = novoMaterial(400);
    const criado = await salvar(documentoNovo([m]));
    await db.insert(liberacao).values([
      {
        cursoId: criado.id,
        liberadaPor: "user_admin",
        origem: "admin",
        userId: LIBERADO,
      },
      {
        cursoId: criado.id,
        liberadaPor: "user_admin",
        origem: "admin",
        revogadaEm: new Date(Date.now() + 1000),
        revogadaPor: "user_admin",
        userId: REVOGADO,
      },
    ]);
    const baixar = (userId: string, papel?: "admin") =>
      como(userId, papel).curso.material({ id: m.id });
    const arquivo = {
      chave: m.chave,
      nomeDoArquivo: m.nomeDoArquivo,
      tipo: m.tipo,
    };

    expect([
      await baixar("user_outroadmin", "admin"),
      await baixar(LIBERADO),
      await baixar(SEM_LIBERACAO),
      await baixar(REVOGADO),
      await como(LIBERADO).curso.material({ id: randomUUID() }),
      await como(LIBERADO).curso.material({ id: "nao-e-uuid" }),
    ]).toEqual([arquivo, arquivo, null, null, null, null]);
  });

  test("quem vê o curso só pelo perfil baixa o material, e o de outro perfil não", async () => {
    const m = novoMaterial(450);
    const criado = await salvar(documentoNovo([m]));
    const ADMIN = "user_admin" as AdminId;
    await definirPerfil(db, ADMIN, CLIENTE, "cliente", new Date());
    await definirPerfil(db, ADMIN, SEM_LIBERACAO, "publico", new Date());
    await liberarParaPerfil(db, ADMIN, "cliente", criado.id, new Date());
    expect([
      (await como(CLIENTE).curso.material({ id: m.id }))?.chave,
      await como(SEM_LIBERACAO).curso.material({ id: m.id }),
    ]).toEqual([m.chave, null]);
  });

  test("a página do curso lista o material em ordem com o link; o curso em produção não abre", async () => {
    const [a, b] = [novoMaterial(500), novoMaterial(501, "xlsx")];
    if (!(a && b)) {
      throw new Error("dois materiais");
    }
    const criado = await salvar(documentoNovo([b, a]));
    await db.insert(liberacao).values({
      cursoId: criado.id,
      liberadaPor: "user_admin",
      origem: "admin",
      userId: LIBERADO,
    });
    const [slug] = await db
      .select({ slug: curso.slug })
      .from(curso)
      .where(eq(curso.id, criado.id));
    const pagina = await como(LIBERADO).curso.pagina({
      slug: slug?.slug ?? "",
    });

    expect(pagina?.materiais).toEqual([
      {
        bytes: b.bytes,
        href: `/material/${b.id}`,
        id: b.id,
        nomeDoArquivo: b.nomeDoArquivo,
        tipo: "xlsx",
        titulo: b.titulo,
      },
      {
        bytes: a.bytes,
        href: `/material/${a.id}`,
        id: a.id,
        nomeDoArquivo: a.nomeDoArquivo,
        tipo: "pdf",
        titulo: a.titulo,
      },
    ]);

    await salvar({ ...criado, status: "em_producao" });
    expect(await como(LIBERADO).curso.material({ id: a.id })).toBeNull();
  });
});
