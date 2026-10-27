// A amostra pela liberação do perfil, por todos os procedures que abrem
// conteúdo: com só a liberação do perfil, a primeira aula abre e as outras são
// recusadas no servidor. A amostra grava o fato aula_assistida sem lançamento, e
// a troca abre o curso inteiro e lança as aulas já assistidas.

import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  alternativa,
  aula,
  aulaAssistida,
  certificado,
  cotaVideo,
  curso,
  liberacao,
  liberacaoDoPerfil,
  material,
  modulo,
  perfilDaPessoa,
  pergunta,
  pontoLancamento,
  posicaoAula,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import { PONTOS } from "../dominio/regras";
import type { AdminId, AulaId, CursoId } from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";
import { concluirParaQuemCompletou } from "./certificado";
import { liberar } from "./liberacao";
import { liberarParaPerfil } from "./liberacao-do-perfil";
import { definirPerfil } from "./perfil";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
const ADMIN = "user_admin" as AdminId;
const AGORA = new Date("2026-10-20T15:00:00Z");
const PRECO = 300;

const codigo = (e: unknown) =>
  e instanceof TRPCError ? e.code : `não é TRPCError: ${String(e)}`;

describe.skipIf(URL_TESTE === null)("amostra pela liberação do perfil", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const alunos: string[] = [];
  const cursos: string[] = [];

  /** Uma cliente sem liberação própria, com `pontos` de saldo. */
  async function cliente(pontos = 0) {
    const userId = `user_amostra${S}x${alunos.length}`;
    alunos.push(userId);
    await definirPerfil(db, ADMIN, userId, "cliente", AGORA);
    if (pontos > 0) {
      await db.insert(pontoLancamento).values({
        criadoEm: AGORA,
        diaMarco: "2026-10-01",
        motivo: "sequencia_7_dias",
        pontos,
        userId,
      });
    }
    return {
      // Cada leitura é um pedido novo, como cada página no app.
      get caller() {
        return createCaller(
          contextoDeTeste({
            db,
            pessoas: [
              { email: "cliente@exemplo.com", foto: null, nome: "C", userId },
            ],
            userId,
          })
        );
      },
      userId,
    };
  }

  /**
   * Um curso publicado de dois módulos, aberto ao perfil Cliente. A aula 1 (a
   * primeira do primeiro módulo) e a aula 2 têm uma pergunta cada; o módulo 1
   * vem depois do 0, embora seja inserido antes.
   */
  async function cursoComAmostra(
    o: { aulas?: number; perguntas?: boolean; preco?: number | null } = {}
  ) {
    const slug = `teste-${hex()}`;
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        categoriaId: await categoriaDeTeste(db),
        codigo: codigoDeTeste(),
        precoTroca: o.preco === undefined ? PRECO : o.preco,
        slug,
        status: "publicado",
        titulo: `Curso ${slug}`,
      })
      .returning({ id: curso.id });
    if (!c) {
      throw new Error("curso não criado");
    }
    cursos.push(c.id);
    const total = o.aulas ?? 3;
    const [depois] = await db
      .insert(modulo)
      .values({ cursoId: c.id, numero: 1, titulo: "Depois" })
      .returning({ id: modulo.id });
    const [antes] = await db
      .insert(modulo)
      .values({ cursoId: c.id, numero: 0, titulo: "Antes" })
      .returning({ id: modulo.id });
    const novaAula = async (moduloId: string, posicao: number, n: number) => {
      const [a] = await db
        .insert(aula)
        .values({
          duracaoSeg: 60,
          moduloId,
          posicao,
          titulo: `Aula ${n}`,
          videoId: "aqz-KE-bpKQ",
          videoProvedor: "youtube",
        })
        .returning({ id: aula.id });
      if (o.perguntas === false) {
        return { certa: "", id: (a?.id ?? "") as AulaId, pergunta: "" };
      }
      const [p] = await db
        .insert(pergunta)
        .values({ aulaId: a?.id ?? "", enunciado: "Pergunta", posicao: 1 })
        .returning({ id: pergunta.id });
      const alts = await db
        .insert(alternativa)
        .values(
          [1, 2].map((k) => ({
            certa: k === 1,
            perguntaId: p?.id ?? "",
            posicao: k,
            texto: `Alternativa ${k}`,
          }))
        )
        .returning({ id: alternativa.id });
      return {
        certa: alts[0]?.id ?? "",
        id: (a?.id ?? "") as AulaId,
        pergunta: p?.id ?? "",
      };
    };
    const aulas: Awaited<ReturnType<typeof novaAula>>[] = [
      await novaAula(antes?.id ?? "", 1, 1),
    ];
    for (let i = 1; i < total; i += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: as aulas do teste entram em ordem.
      aulas.push(await novaAula(depois?.id ?? "", i, i + 1));
    }
    const [m] = await db
      .insert(material)
      .values({
        bytes: 10,
        chave: `${randomBytes(32).toString("hex")}.pdf`,
        cursoId: c.id,
        nomeDoArquivo: "manual.pdf",
        posicao: 1,
        tipo: "pdf",
        titulo: "Manual",
      })
      .returning({ id: material.id });
    await liberarParaPerfil(db, ADMIN, "cliente", c.id as CursoId, AGORA);
    return { aulas, id: c.id as CursoId, material: m?.id ?? "", slug };
  }

  const assistir = (
    c: Awaited<ReturnType<typeof cliente>>["caller"],
    aulaId: AulaId
  ) =>
    c.aula.registrar({
      aulaId,
      posicaoSeg: 60,
      trechos: [{ fim: 60, inicio: 0 }],
    });

  const lancamentosDe = (userId: string) =>
    db
      .select({
        aulaId: pontoLancamento.aulaId,
        motivo: pontoLancamento.motivo,
        pontos: pontoLancamento.pontos,
      })
      .from(pontoLancamento)
      .where(eq(pontoLancamento.userId, userId));

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, alunos));
    await db.delete(certificado).where(inArray(certificado.userId, alunos));
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, alunos));
    await db.delete(posicaoAula).where(inArray(posicaoAula.userId, alunos));
    await db.delete(cotaVideo).where(inArray(cotaVideo.userId, alunos));
    await db.delete(liberacao).where(inArray(liberacao.userId, alunos));
    await db
      .delete(perfilDaPessoa)
      .where(inArray(perfilDaPessoa.userId, alunos));
    if (cursos.length > 0) {
      await db
        .delete(liberacaoDoPerfil)
        .where(inArray(liberacaoDoPerfil.cursoId, cursos));
      await db.delete(curso).where(inArray(curso.id, cursos));
    }
    await db.$client.end();
  });

  test("Meus cursos, a página e a vitrine mostram o curso como amostra, com o preço", async () => {
    const c = await cursoComAmostra();
    const pessoa = await cliente(120);
    const painel = await pessoa.caller.meusCursos.painel();
    const [primeira] = c.aulas;
    if (!primeira) {
      throw new Error("uma aula");
    }
    const a1 = primeira.id;
    const naGrade = painel.cursos.find((x) => x.slug === c.slug);
    expect(naGrade?.amostra).toEqual({
      aulaId: a1,
      preco: PRECO,
      vista: false,
    });
    // A retomada nunca leva a uma aula fechada.
    expect(painel.retomada).toBeNull();

    const pagina = await pessoa.caller.curso.pagina({ slug: c.slug });
    expect(pagina?.amostra).toEqual({
      aulaId: a1,
      cursoId: c.id,
      href: `/cursos/${c.slug}/aulas/${a1}`,
      preco: PRECO,
      saldo: 120,
    });
    // O material de apoio não sai na página da amostra.
    expect(pagina?.materiais).toEqual([]);

    const vitrine = await pessoa.caller.troca.painel();
    expect(vitrine.cartoes.find((x) => x.curso.id === c.id)?.tipo).toBe(
      "faltam"
    );
  });

  test("a aula 1 abre sem questionário e a aula 2 é recusada em todo procedure", async () => {
    const c = await cursoComAmostra();
    const pessoa = await cliente(500);
    const [a1, a2] = c.aulas;
    if (!(a1 && a2)) {
      throw new Error("duas aulas");
    }

    const aberta = await pessoa.caller.aula.abrir({
      aulaId: a1.id,
      slug: c.slug,
    });
    expect(aberta?.aula.id).toBe(a1.id);
    expect(aberta?.questionario).toBeNull();
    expect(aberta?.proxima).toBeNull();
    expect(aberta?.amostra).toEqual({
      cursoId: c.id,
      preco: PRECO,
      proxima: { id: a2.id, titulo: "Aula 2" },
      saldo: 500,
    });

    expect(
      await pessoa.caller.aula.abrir({ aulaId: a2.id, slug: c.slug })
    ).toBeNull();
    expect(await assistir(pessoa.caller, a2.id).catch(codigo)).toBe(
      "NOT_FOUND"
    );
    const responder = (a: (typeof c.aulas)[number]) =>
      pessoa.caller.questionario
        .responder({
          aulaId: a.id,
          respostas: [{ alternativaId: a.certa, perguntaId: a.pergunta }],
          tentativaId: randomUUID(),
        })
        .catch(codigo);
    expect(await responder(a1)).toBe("PRECONDITION_FAILED");
    expect(await responder(a2)).toBe("NOT_FOUND");
    expect(await pessoa.caller.curso.material({ id: c.material })).toBeNull();
    expect(await pessoa.caller.certificado.pagina({ slug: c.slug })).toBeNull();
    const conquistas = await pessoa.caller.aluno.conquistas();
    expect(JSON.stringify(conquistas.certificados)).not.toContain(c.slug);
    const posicoes = await db
      .select()
      .from(posicaoAula)
      .where(
        and(
          eq(posicaoAula.userId, pessoa.userId),
          eq(posicaoAula.aulaId, a2.id)
        )
      );
    expect(posicoes).toEqual([]);
  });

  test("assistir à amostra grava a aula assistida e a posição, sem lançamento e sem certificado", async () => {
    const c = await cursoComAmostra({ aulas: 1 });
    const pessoa = await cliente();
    const [a1] = c.aulas;
    if (!a1) {
      throw new Error("uma aula");
    }
    const r = await assistir(pessoa.caller, a1.id);
    expect(r.assistida).toBe(true);
    expect(r.conquista).toBeNull();
    const fatos = await db.query.aulaAssistida.findMany({
      where: { userId: pessoa.userId },
    });
    expect(fatos.map((f) => f.aulaId)).toEqual([a1.id]);
    const posicao = await db.query.posicaoAula.findFirst({
      where: { aulaId: a1.id, userId: pessoa.userId },
    });
    expect(posicao?.posicaoSeg).toBe(60);
    expect(await lancamentosDe(pessoa.userId)).toEqual([]);
    // A amostra do curso de uma aula só também não emite o certificado, nem pela edição do admin.
    await db.transaction((tx) => concluirParaQuemCompletou(tx, c.id, AGORA));
    expect(
      await db.query.certificado.findMany({ where: { userId: pessoa.userId } })
    ).toEqual([]);
  });

  test("a troca abre o curso inteiro e lança, na mesma transação, a aula da amostra já assistida", async () => {
    const c = await cursoComAmostra();
    const pessoa = await cliente(500);
    const [a1, a2] = c.aulas;
    if (!(a1 && a2)) {
      throw new Error("duas aulas");
    }
    await assistir(pessoa.caller, a1.id);
    expect(await lancamentosDe(pessoa.userId)).toHaveLength(1);

    await pessoa.caller.troca.trocar({ cursoId: c.id, precoVisto: PRECO });
    const depois = await lancamentosDe(pessoa.userId);
    expect(depois.filter((l) => l.motivo === "aula_assistida")).toEqual([
      { aulaId: a1.id, motivo: "aula_assistida", pontos: 10 },
    ]);
    const { saldo } = await pessoa.caller.aluno.resumo();
    expect(saldo).toBe(500 - PRECO + 10);

    const pagina = await pessoa.caller.curso.pagina({ slug: c.slug });
    expect(pagina?.amostra).toBeNull();
    expect(pagina?.materiais).toHaveLength(1);
    expect(
      await pessoa.caller.aula.abrir({ aulaId: a2.id, slug: c.slug })
    ).not.toBeNull();
    const r = await assistir(pessoa.caller, a2.id);
    expect(r.conquista?.pontos).toBe(10);
    expect(
      (await pessoa.caller.meusCursos.painel()).cursos.find(
        (x) => x.slug === c.slug
      )?.amostra
    ).toBeNull();
  });

  test("a liberação do admin depois da amostra lança a aula assistida e conclui o curso de uma aula", async () => {
    const c = await cursoComAmostra({ aulas: 1, perguntas: false });
    const pessoa = await cliente();
    const [a1] = c.aulas;
    if (!a1) {
      throw new Error("uma aula");
    }
    await assistir(pessoa.caller, a1.id);
    expect(await lancamentosDe(pessoa.userId)).toEqual([]);

    const r = await liberar(
      db,
      ADMIN,
      { email: null, foto: null, nome: "C", userId: pessoa.userId },
      c.id,
      AGORA
    );
    expect(r.nova).toBe(true);
    const depois = await lancamentosDe(pessoa.userId);
    expect(depois.map((l) => [l.motivo, l.pontos]).sort()).toEqual([
      ["aula_assistida", PONTOS.aula_assistida],
      ["curso_concluido", PONTOS.curso_concluido],
    ]);
    expect(
      await db.query.certificado.findMany({
        columns: { cursoId: true },
        where: { userId: pessoa.userId },
      })
    ).toEqual([{ cursoId: c.id }]);
    expect(
      (await pessoa.caller.certificado.pagina({ slug: c.slug })) === null
    ).toBe(false);
  });

  test("o curso da amostra sem preço aparece sem troca e continua fechado", async () => {
    const c = await cursoComAmostra({ preco: null });
    const pessoa = await cliente(500);
    const pagina = await pessoa.caller.curso.pagina({ slug: c.slug });
    expect(pagina?.amostra?.preco).toBeNull();
    expect(
      await pessoa.caller.troca
        .trocar({ cursoId: c.id, precoVisto: PRECO })
        .catch(codigo)
    ).toBe("NOT_FOUND");
  });
});
