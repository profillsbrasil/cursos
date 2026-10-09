// Edição da trilha contra o Supabase local, pelo caller do tRPC como admin e como
// aluno. Roda só com TEST_DATABASE_URL em host local. Cada execução cria trilhas e
// cursos com sufixo aleatório, e o afterAll apaga tudo.

import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  certificado,
  curso,
  liberacao,
  modulo,
  posicaoAula,
  trilha,
  trilhaCurso,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { asc, eq, inArray, sql } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import {
  type DocumentoDaTrilha,
  TRILHA_EM_USO,
} from "../dominio/edicao-da-trilha";
import type { CursoId, TrilhaId, Versao } from "../dominio/tipos";
import { ErroParaAPessoa } from "../index";
import { createCaller } from "../routers/index";
import { esperas, seguraATabela } from "./corrida-de-teste";
import { violacaoDe } from "./erros";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const SO_TRILHA = `user_teste${S}trilha`;
const COM_DIRETA = `user_teste${S}direta`;
const COMECOU = `user_teste${S}comecou`;
const PAROU = `user_teste${S}parou`;
const NO_ZERO = `user_teste${S}nozero`;
const ALUNOS = [SO_TRILHA, COM_DIRETA, COMECOU, PAROU, NO_ZERO];

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

describe.skipIf(URL_TESTE === null)("edição da trilha", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const admin = createCaller(
    contextoDeTeste({ db, papel: "admin", userId: "user_admin" })
  );
  const comoAluno = (userId: string) =>
    createCaller(contextoDeTeste({ db, userId }));
  const trilhas: string[] = [];
  const cursos: string[] = [];

  afterAll(async () => {
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, ALUNOS));
    await db.delete(posicaoAula).where(inArray(posicaoAula.userId, ALUNOS));
    await db.delete(certificado).where(inArray(certificado.userId, ALUNOS));
    await db.delete(liberacao).where(inArray(liberacao.userId, ALUNOS));
    await db.delete(trilha).where(inArray(trilha.id, trilhas));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  /** Cursos publicados soltos, de 1 módulo e 2 aulas cada. */
  async function criarCursos(n: number) {
    const sufixo = randomBytes(4).toString("hex");
    const novos = await db
      .insert(curso)
      .values(
        Array.from({ length: n }, (_, i) => ({
          capaAlt: "Capa de teste",
          capaAltura: 720,
          capaLargura: 1280,
          capaUrl: "/capas/teste.jpg",
          slug: `teste-${sufixo}-${i}`,
          status: "publicado" as const,
          tema: "teste",
          titulo: `Curso ${sufixo} ${i}`,
        }))
      )
      .returning({ id: curso.id, slug: curso.slug, titulo: curso.titulo });
    cursos.push(...novos.map((c) => c.id));
    const modulos = await db
      .insert(modulo)
      .values(
        novos.map((c) => ({ cursoId: c.id, numero: 1, titulo: "Módulo" }))
      )
      .returning({ cursoId: modulo.cursoId, id: modulo.id });
    const aulas = await db
      .insert(aula)
      .values(
        modulos.flatMap((m) =>
          [1, 2].map((posicao) => ({
            duracaoSeg: 600,
            moduloId: m.id,
            posicao,
            titulo: `Aula ${posicao}`,
          }))
        )
      )
      .returning({
        id: aula.id,
        moduloId: aula.moduloId,
        posicao: aula.posicao,
      });
    return novos.map((c) => {
      const m = modulos.find((x) => x.cursoId === c.id);
      const primeira = aulas.find(
        (a) => a.moduloId === m?.id && a.posicao === 1
      );
      return {
        id: c.id as CursoId,
        primeiraAula: primeira?.id ?? "",
        slug: c.slug,
        titulo: c.titulo,
      };
    });
  }

  function trilhaNova(cursosDaTrilha: CursoId[]): DocumentoDaTrilha {
    const id = randomUUID() as TrilhaId;
    trilhas.push(id);
    return {
      cursos: cursosDaTrilha,
      descricao: "Trilha de teste.",
      id,
      slug: `teste-${S}-t${trilhas.length}`,
      titulo: `Trilha ${S} ${trilhas.length}`,
      versao: null,
    };
  }

  async function salva(d: DocumentoDaTrilha) {
    await admin.admin.catalogo.salvarTrilha(d);
    const aberta = await admin.admin.catalogo.abrirTrilha({ id: d.id });
    if (!aberta) {
      throw new Error("trilha não abriu depois de salvar");
    }
    return aberta;
  }

  const posicoes = async (id: TrilhaId) =>
    (
      await db
        .select({ cursoId: trilhaCurso.cursoId, posicao: trilhaCurso.posicao })
        .from(trilhaCurso)
        .where(eq(trilhaCurso.trilhaId, id))
        .orderBy(asc(trilhaCurso.posicao))
    ).map((l) => [l.cursoId, l.posicao]);

  const liberarTrilha = (userId: string, trilhaId: string, revogada = false) =>
    db.insert(liberacao).values({
      liberadaPor: "user_admin",
      origem: "admin",
      trilhaId,
      userId,
      ...(revogada
        ? {
            liberadaEm: new Date(Date.now() - 60_000),
            revogadaEm: new Date(),
            revogadaPor: "user_admin",
          }
        : {}),
    });

  test("inverter a trilha inteira grava as posições sem colidir no unique", async () => {
    const [a, b, c] = await criarCursos(3);
    if (!(a && b && c)) {
      throw new Error("cursos não criados");
    }
    const aberta = await salva(trilhaNova([a.id, b.id, c.id]));
    const salvo = await admin.admin.catalogo.salvarTrilha({
      ...aberta.documento,
      cursos: [c.id, b.id, a.id],
    });

    expect(await posicoes(aberta.documento.id)).toEqual([
      [c.id, 1],
      [b.id, 2],
      [a.id, 3],
    ]);
    const relida = await admin.admin.catalogo.abrirTrilha({
      id: aberta.documento.id,
    });
    expect(relida?.documento.versao).toBe(salvo.versao);
    expect(relida?.documento.cursos).toEqual([c.id, b.id, a.id]);
  });

  test("reenviar a criação é sucesso, e a versão velha dá CONFLICT com versao_mudou", async () => {
    const [a, b] = await criarCursos(2);
    if (!(a && b)) {
      throw new Error("cursos não criados");
    }
    const nova = trilhaNova([a.id]);
    const primeira = await admin.admin.catalogo.salvarTrilha(nova);
    expect(await admin.admin.catalogo.salvarTrilha(nova)).toEqual(primeira);

    const velha = { ...nova, versao: primeira.versao };
    await admin.admin.catalogo.salvarTrilha({ ...velha, cursos: [a.id, b.id] });
    const erro = await admin.admin.catalogo
      .salvarTrilha({ ...velha, titulo: "Outro título" })
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroParaAPessoa);
    expect((erro as ErroParaAPessoa).code).toBe("CONFLICT");
    expect((erro as ErroParaAPessoa).motivo).toBe("versao_mudou");
  });

  test("curso de outra trilha é recusado com o nome do curso e o da trilha", async () => {
    const [a, b] = await criarCursos(2);
    if (!(a && b)) {
      throw new Error("cursos não criados");
    }
    const dona = await salva(trilhaNova([a.id]));
    const outra = trilhaNova([b.id, a.id]);

    expect(await resultado(admin.admin.catalogo.salvarTrilha(outra))).toEqual({
      code: "CONFLICT",
      message: `O curso "${a.titulo}" já está na trilha "${dona.documento.titulo}". Tire-o de lá antes de pôr nesta.`,
    });
    expect(await admin.admin.catalogo.abrirTrilha({ id: outra.id })).toBeNull();
    expect(await posicoes(dona.documento.id)).toEqual([[a.id, 1]]);
  });

  test("o salvar trava curso:<id> dos cursos atuais e desejados, em ordem de id", async () => {
    const tres = await criarCursos(3);
    const [a, b, c] = tres.map((x) => x.id).sort();
    if (!(a && b && c)) {
      throw new Error("cursos não criados");
    }
    const aberta = await salva(trilhaNova([a]));
    const tentaTravar = async (id: string) => {
      const { rows } = await db.execute<{ ok: boolean }>(
        sql`select pg_try_advisory_xact_lock(hashtextextended(${`curso:${id}`}, 0)) as ok`
      );
      return rows[0]?.ok;
    };
    const outro = await db.$client.connect();
    try {
      await outro.query("begin");
      await outro.query(
        "select pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`curso:${b}`]
      );
      const salvando = resultado(
        admin.admin.catalogo.salvarTrilha({
          ...aberta.documento,
          cursos: [c as CursoId, b as CursoId],
        })
      );
      const paradas = await esperas(db, 1, [
        "select pg_advisory_xact_lock",
      ]).catch((e: unknown) => String(e));
      const sonda = { a: await tentaTravar(a), c: await tentaTravar(c) };
      await outro.query("commit");

      expect({ paradas, salvando: await salvando, sonda }).toEqual({
        paradas: ["advisory"],
        salvando: { code: "ok", message: "" },
        sonda: { a: false, c: true },
      });
    } finally {
      outro.release();
    }
  });

  test("duas trilhas novas com os mesmos cursos ao mesmo tempo: a segunda espera e recusa com o nome da primeira", async () => {
    const [x, y] = await criarCursos(2);
    if (!(x && y)) {
      throw new Error("cursos não criados");
    }
    const primeira = trilhaNova([x.id, y.id]);
    const segunda = trilhaNova([y.id, x.id]);
    const soltar = await seguraATabela(db, "trilha_curso");
    const parou = (n: number) =>
      esperas(db, n, [
        'delete from "trilha_curso"',
        "select pg_advisory_xact_lock",
      ]);
    const r1 = resultado(admin.admin.catalogo.salvarTrilha(primeira));
    await parou(1);
    const r2 = resultado(admin.admin.catalogo.salvarTrilha(segunda));
    const paradas = await parou(2).catch((e: unknown) => String(e));
    await soltar();
    const [rPrimeira, rSegunda] = await Promise.all([r1, r2]);

    expect({
      paradas,
      posicoes: await posicoes(primeira.id),
      primeira: rPrimeira,
      segunda: rSegunda,
    }).toEqual({
      paradas: ["advisory", "relation"],
      posicoes: [
        [x.id, 1],
        [y.id, 2],
      ],
      primeira: { code: "ok", message: "" },
      segunda: {
        code: "CONFLICT",
        message: `O curso "${y.titulo}" já está na trilha "${primeira.titulo}". Tire-o de lá antes de pôr nesta.`,
      },
    });
  });

  test("curso que não existe é recusado sem gravar nada", async () => {
    const nova = trilhaNova([randomUUID() as CursoId]);
    expect(await resultado(admin.admin.catalogo.salvarTrilha(nova))).toEqual({
      code: "PRECONDITION_FAILED",
      message:
        "Um curso da lista foi apagado do catálogo. Tire-o da lista e salve de novo.",
    });
    expect(await admin.admin.catalogo.abrirTrilha({ id: nova.id })).toBeNull();
  });

  test("tirar curso da trilha tira o acesso de quem só tinha a trilha", async () => {
    const [a, b] = await criarCursos(2);
    if (!(a && b)) {
      throw new Error("cursos não criados");
    }
    const aberta = await salva(trilhaNova([a.id, b.id]));
    await liberarTrilha(SO_TRILHA, aberta.documento.id);
    await liberarTrilha(COM_DIRETA, aberta.documento.id);
    await db.insert(liberacao).values({
      cursoId: a.id,
      liberadaPor: "user_admin",
      origem: "admin",
      userId: COM_DIRETA,
    });
    const entra = async (userId: string) =>
      (await comoAluno(userId).aula.entrada({ slug: a.slug })) !== null;
    expect([await entra(SO_TRILHA), await entra(COM_DIRETA)]).toEqual([
      true,
      true,
    ]);
    expect(
      (await admin.admin.catalogo.abrirTrilha({ id: aberta.documento.id }))?.uso
        .alunosComATrilha
    ).toBe(2);

    await admin.admin.catalogo.salvarTrilha({
      ...aberta.documento,
      cursos: [b.id],
    });

    expect([await entra(SO_TRILHA), await entra(COM_DIRETA)]).toEqual([
      false,
      true,
    ]);
  });

  test("conta por curso quem começou ou concluiu só pela trilha, e tirar o curso tira o acesso dessas pessoas", async () => {
    const [a, b] = await criarCursos(2);
    if (!(a && b)) {
      throw new Error("cursos não criados");
    }
    const aberta = await salva(trilhaNova([a.id, b.id]));
    expect(aberta.uso.comecaramSoPelaTrilha).toEqual([
      { cursoId: a.id, pessoas: 0 },
      { cursoId: b.id, pessoas: 0 },
    ]);
    await db.insert(liberacao).values([
      ...[SO_TRILHA, COM_DIRETA, COMECOU, PAROU, NO_ZERO].map((userId) => ({
        liberadaPor: "user_admin",
        origem: "admin" as const,
        trilhaId: aberta.documento.id,
        userId,
      })),
      {
        cursoId: a.id,
        liberadaPor: "user_admin",
        origem: "admin",
        userId: COM_DIRETA,
      },
    ]);
    await db.insert(aulaAssistida).values([
      { aulaId: a.primeiraAula, userId: SO_TRILHA },
      { aulaId: a.primeiraAula, userId: COM_DIRETA },
    ]);
    await db.insert(certificado).values({
      codigo: `TESTE-${S}-17`,
      cursoId: a.id,
      userId: COMECOU,
    });
    await db.insert(posicaoAula).values([
      { aulaId: b.primeiraAula, posicaoSeg: 90, userId: PAROU },
      { aulaId: b.primeiraAula, posicaoSeg: 0, userId: NO_ZERO },
    ]);

    const contada = await admin.admin.catalogo.abrirTrilha({
      id: aberta.documento.id,
    });
    expect(contada?.uso.comecaramSoPelaTrilha).toEqual([
      { cursoId: a.id, pessoas: 2 },
      { cursoId: b.id, pessoas: 1 },
    ]);

    const entra = async (userId: string) =>
      (await comoAluno(userId).aula.entrada({ slug: a.slug })) !== null;
    expect([await entra(SO_TRILHA), await entra(COM_DIRETA)]).toEqual([
      true,
      true,
    ]);
    await admin.admin.catalogo.salvarTrilha({
      ...aberta.documento,
      cursos: [b.id],
    });
    expect([await entra(SO_TRILHA), await entra(COM_DIRETA)]).toEqual([
      false,
      true,
    ]);
  });

  test("liberação que entra depois da conta de uso: apagarTrilha espera e recusa com TRILHA_EM_USO", async () => {
    const t = await salva(trilhaNova([]));
    const outro = await db.$client.connect();
    try {
      await outro.query("begin");
      await outro.query(
        "insert into liberacao (user_id, trilha_id, liberada_por, origem) values ($1, $2, 'user_admin', 'admin')",
        [SO_TRILHA, t.documento.id]
      );
      const apagando = resultado(
        admin.admin.catalogo.apagarTrilha({ id: t.documento.id })
      );
      const paradas = await esperas(db, 1, ['delete from "trilha"']);
      await outro.query("commit");

      expect({ apagando: await apagando, paradas }).toEqual({
        apagando: { code: "PRECONDITION_FAILED", message: TRILHA_EM_USO },
        paradas: ["transactionid"],
      });
    } finally {
      outro.release();
    }
  });

  test("trilha liberada, mesmo revogada, não se apaga; sem uso, apaga com os vínculos", async () => {
    const [a, b] = await criarCursos(2);
    if (!(a && b)) {
      throw new Error("cursos não criados");
    }
    const usada = await salva(trilhaNova([a.id]));
    await liberarTrilha(SO_TRILHA, usada.documento.id, true);
    expect(usada.podeApagar).toBe(true);
    expect(
      await resultado(
        admin.admin.catalogo.apagarTrilha({ id: usada.documento.id })
      )
    ).toEqual({ code: "PRECONDITION_FAILED", message: TRILHA_EM_USO });

    const livre = await salva(trilhaNova([b.id]));
    expect(livre.podeApagar).toBe(true);
    expect(
      await admin.admin.catalogo.apagarTrilha({ id: livre.documento.id })
    ).toEqual({ apagado: true });
    expect(await posicoes(livre.documento.id)).toEqual([]);
    expect(
      await admin.admin.catalogo.apagarTrilha({ id: livre.documento.id })
    ).toEqual({ apagado: false });
  });

  test("inserir curso antes de um começado não tranca o começado (item 26)", async () => {
    const [a, b, novo] = await criarCursos(3);
    if (!(a && b && novo)) {
      throw new Error("cursos não criados");
    }
    const aberta = await salva(trilhaNova([a.id, b.id]));
    await liberarTrilha(COMECOU, aberta.documento.id);
    await db.insert(certificado).values({
      codigo: `TESTE-${S}-26`,
      cursoId: a.id,
      userId: COMECOU,
    });
    await db.insert(posicaoAula).values({
      aulaId: b.primeiraAula,
      posicaoSeg: 90,
      userId: COMECOU,
    });

    await admin.admin.catalogo.salvarTrilha({
      ...aberta.documento,
      cursos: [a.id, novo.id, b.id],
    });

    const aluno = comoAluno(COMECOU);
    const painel = await aluno.meusCursos.painel();
    const naTrilha = painel.trilhas.find((t) => t.id === aberta.documento.id);
    expect(naTrilha?.cursos.map((c) => [c.titulo, c.estado.tipo])).toEqual([
      [a.titulo, "concluido"],
      [novo.titulo, "nao_iniciado"],
      [b.titulo, "em_andamento"],
    ]);
    expect(await aluno.aula.entrada({ slug: b.slug })).not.toBeNull();
  });

  test("versão inventada numa trilha que não existe é NOT_FOUND", async () => {
    const d = { ...trilhaNova([]), versao: "inventada" as Versao };
    expect(await resultado(admin.admin.catalogo.salvarTrilha(d))).toEqual({
      code: "NOT_FOUND",
      message: "Esta trilha foi apagada enquanto você editava.",
    });
  });

  test("endereço de outra trilha dá CONFLICT com slug_repetido", async () => {
    const primeira = await salva(trilhaNova([]));
    const erro = await admin.admin.catalogo
      .salvarTrilha({ ...trilhaNova([]), slug: primeira.documento.slug })
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroParaAPessoa);
    expect([
      (erro as ErroParaAPessoa).code,
      (erro as ErroParaAPessoa).motivo,
    ]).toEqual(["CONFLICT", "slug_repetido"]);
  });
});
