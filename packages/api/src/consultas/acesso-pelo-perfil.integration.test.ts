// O que o aluno vê pela liberação do perfil, por todos os routers do aluno: o
// alunoProcedure lê o perfil e cada leitor soma a liberação do perfil à própria.
// A liberação do perfil dá a amostra (amostra.integration.test.ts prova cada
// procedure); aqui fica quem vê o curso e quem não vê.

import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  certificado,
  comunicado,
  cotaVideo,
  curso,
  liberacao,
  liberacaoDoPerfil,
  modulo,
  perfilDaPessoa,
  pontoLancamento,
  posicaoAula,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import type { Perfil } from "../dominio/perfil";
import type { AdminId, AulaId, CursoId } from "../dominio/tipos";
import { createCaller } from "../routers/index";
import { categoriaDeTeste, codigoDeTeste } from "./categoria-de-teste";
import { concluirParaQuemCompletou } from "./certificado";
import { liberarParaPerfil, revogarDoPerfil } from "./liberacao-do-perfil";
import { definirPerfil } from "./perfil";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
const ADMIN = "user_admin" as AdminId;
const AGORA = new Date("2026-10-20T15:00:00Z");

describe.skipIf(URL_TESTE === null)("acesso pela liberação do perfil", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const alunos: string[] = [];
  const cursos: string[] = [];
  const comunicados: string[] = [];

  /** Um aluno com o perfil já escolhido pelo admin, e o caller de um pedido dele. */
  async function aluno(perfil: Perfil, email = "pessoa@exemplo.com") {
    const userId = `user_perfilve${S}x${alunos.length}`;
    alunos.push(userId);
    await definirPerfil(db, ADMIN, userId, perfil, AGORA);
    // Cada leitura de caller é um pedido novo, como cada página no app.
    return {
      get caller() {
        return comoAluno(userId, email);
      },
      userId,
    };
  }

  const comoAluno = (userId: string, email: string) =>
    createCaller(
      contextoDeTeste({
        db,
        pessoas: [{ email, foto: null, nome: "Pessoa", userId }],
        userId,
      })
    );

  async function criarCurso(o: { aulas?: number; precoTroca?: number } = {}) {
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
        precoTroca: o.precoTroca ?? null,
        slug,
        status: "publicado",
        titulo: `Curso ${slug}`,
      })
      .returning({ id: curso.id });
    if (!c) {
      throw new Error("curso não criado");
    }
    cursos.push(c.id);
    const [m] = await db
      .insert(modulo)
      .values({ cursoId: c.id, numero: 0, titulo: "Módulo" })
      .returning({ id: modulo.id });
    const aulas = await db
      .insert(aula)
      .values(
        Array.from({ length: o.aulas ?? 1 }, (_, i) => ({
          duracaoSeg: 60,
          moduloId: m?.id ?? "",
          posicao: i + 1,
          titulo: `Aula ${i + 1}`,
          videoId: "aqz-KE-bpKQ",
          videoProvedor: "youtube" as const,
        }))
      )
      .returning({ id: aula.id });
    return {
      aulas: aulas.map((a) => a.id as AulaId),
      id: c.id as CursoId,
      slug,
    };
  }

  const slugsEmMeusCursos = async (c: ReturnType<typeof comoAluno>) =>
    (await c.meusCursos.painel()).cursos.map((x) => x.slug);

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
    if (comunicados.length > 0) {
      await db.delete(comunicado).where(inArray(comunicado.id, comunicados));
    }
    if (cursos.length > 0) {
      await db
        .delete(liberacaoDoPerfil)
        .where(inArray(liberacaoDoPerfil.cursoId, cursos));
      await db.delete(curso).where(inArray(curso.id, cursos));
    }
    await db.$client.end();
  });

  test("o cliente vê o curso do perfil dele em Meus cursos, na página e na aula; o público aberto não", async () => {
    const c = await criarCurso();
    await liberarParaPerfil(db, ADMIN, "cliente", c.id, AGORA);
    const cliente = await aluno("cliente");
    const publico = await aluno("publico");

    expect(await slugsEmMeusCursos(cliente.caller)).toContain(c.slug);
    expect(await cliente.caller.curso.pagina({ slug: c.slug })).not.toBeNull();
    expect(
      await cliente.caller.aula.abrir({
        aulaId: c.aulas[0] ?? "",
        slug: c.slug,
      })
    ).not.toBeNull();

    expect(await slugsEmMeusCursos(publico.caller)).not.toContain(c.slug);
    expect(await publico.caller.curso.pagina({ slug: c.slug })).toBeNull();
    expect(
      await publico.caller.aula.abrir({
        aulaId: c.aulas[0] ?? "",
        slug: c.slug,
      })
    ).toBeNull();
  });

  test("revogar a liberação do perfil tira o curso, e mudar o perfil também", async () => {
    const c = await criarCurso();
    const { id } = await liberarParaPerfil(db, ADMIN, "cliente", c.id, AGORA);
    const cliente = await aluno("cliente");
    expect(await slugsEmMeusCursos(cliente.caller)).toContain(c.slug);

    await definirPerfil(db, ADMIN, cliente.userId, "publico", AGORA);
    expect(await slugsEmMeusCursos(cliente.caller)).not.toContain(c.slug);

    await definirPerfil(db, ADMIN, cliente.userId, "cliente", AGORA);
    await revogarDoPerfil(db, ADMIN, id, AGORA);
    expect(await slugsEmMeusCursos(cliente.caller)).not.toContain(c.slug);
  });

  test("o primeiro acesso com e-mail da Profills já vê o curso dos funcionários", async () => {
    const c = await criarCurso();
    await liberarParaPerfil(db, ADMIN, "funcionario", c.id, AGORA);
    const userId = `user_perfilve${S}novo`;
    alunos.push(userId);
    expect(
      await slugsEmMeusCursos(comoAluno(userId, "nova@profills.com"))
    ).toContain(c.slug);
  });

  test("assistir a única aula pelo perfil não emite o certificado: a amostra não conclui o curso", async () => {
    const c = await criarCurso();
    await liberarParaPerfil(db, ADMIN, "cliente", c.id, AGORA);
    const cliente = await aluno("cliente");
    const r = await cliente.caller.aula.registrar({
      aulaId: c.aulas[0] ?? "",
      posicaoSeg: 60,
      trechos: [{ fim: 60, inicio: 0 }],
    });
    expect(r.assistida).toBe(true);
    expect(
      await cliente.caller.certificado.pagina({ slug: c.slug })
    ).toBeNull();
    const conquistas = await cliente.caller.aluno.conquistas();
    expect(JSON.stringify(conquistas.certificados)).not.toContain(c.slug);
  });

  test("a edição do admin não conclui quem vê o curso só pelo perfil", async () => {
    const c = await criarCurso();
    await liberarParaPerfil(db, ADMIN, "cliente", c.id, AGORA);
    const cliente = await aluno("cliente");
    await db.insert(aulaAssistida).values({
      assistidaEm: AGORA,
      aulaId: c.aulas[0] ?? "",
      userId: cliente.userId,
    });
    await db.transaction((tx) => concluirParaQuemCompletou(tx, c.id, AGORA));
    const emitidos = await db.query.certificado.findMany({
      where: { cursoId: c.id, userId: cliente.userId },
    });
    expect(emitidos).toHaveLength(0);
  });

  test("o comunicado do curso aberto ao perfil chega ao aluno do perfil, e só a ele", async () => {
    const c = await criarCurso();
    await liberarParaPerfil(db, ADMIN, "cliente", c.id, AGORA);
    const id = crypto.randomUUID();
    comunicados.push(id);
    await db.insert(comunicado).values({
      cursoId: c.id,
      id,
      publicadoEm: AGORA,
      publicadoPor: ADMIN,
      texto: "Módulo novo.",
      titulo: "Do curso do perfil",
    });
    const cliente = await aluno("cliente");
    const publico = await aluno("publico");
    const ids = async (x: ReturnType<typeof comoAluno>) =>
      JSON.stringify(await x.aluno.comunicados());
    expect(await ids(cliente.caller)).toContain(id);
    expect(await ids(publico.caller)).not.toContain(id);
  });

  test("curso trocável aberto ao perfil fica na vitrine e a troca cobra o preço", async () => {
    const c = await criarCurso({ precoTroca: 100 });
    await liberarParaPerfil(db, ADMIN, "cliente", c.id, AGORA);
    const cliente = await aluno("cliente");
    await db.insert(pontoLancamento).values({
      criadoEm: AGORA,
      diaMarco: "2026-10-01",
      motivo: "sequencia_7_dias",
      pontos: 500,
      userId: cliente.userId,
    });
    const painel = await cliente.caller.troca.painel();
    expect(JSON.stringify(painel.cartoes)).toContain(c.id);
    await cliente.caller.troca.trocar({ cursoId: c.id, precoVisto: 100 });
    const lancamentos = await db.query.pontoLancamento.findMany({
      where: { userId: cliente.userId },
    });
    expect(lancamentos.map((l) => l.pontos).sort()).toEqual([-100, 500]);
  });
});
