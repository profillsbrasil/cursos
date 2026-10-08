import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { createDb } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  cotaVideo,
  curso,
  liberacao,
  modulo,
  pontoLancamento,
  posicaoAula,
  trilha,
  trilhaCurso,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { contextoDeTeste } from "../contexto-de-teste";
import type { AulaId, StatusDoCurso } from "../dominio/tipos";
import type { Trecho } from "../dominio/trechos";
import { createCaller } from "../routers/index";
import { carregarAula, carregarEntrada, registrar } from "./aula";

const URL_TESTE = urlDeTeste();
const hex = () => randomBytes(4).toString("hex");
const S = hex();
let alunos = 0;
const ALUNOS: string[] = [];
const novoAluno = () => {
  alunos += 1;
  const a = `user_teste${S}x${alunos}`;
  ALUNOS.push(a);
  return a;
};

const QUARTA_15H = new Date("2026-10-07T18:00:00Z");
const em = (s: number) => new Date(QUARTA_15H.getTime() + s * 1000);
const t = (inicio: number, fim: number): Trecho => ({ fim, inicio });

const emSerie = <T, R>(itens: readonly T[], f: (x: T) => Promise<R>) =>
  itens.reduce<Promise<R[]>>(
    (acc, x) => acc.then(async (rs) => [...rs, await f(x)]),
    Promise.resolve([])
  );

// O pg avisa uma vez por processo quando duas queries dividem um client; a
// transação do registro não pode disparar isso (no pg 9 vira erro).
const avisosDoPg: string[] = [];
process.on("warning", (w) => {
  if (w.message.includes("already executing a query")) {
    avisosDoPg.push(w.message);
  }
});

const codigo = (e: unknown) =>
  e instanceof TRPCError ? e.code : `não é TRPCError: ${String(e)}`;

describe.skipIf(URL_TESTE === null)("registro do player", () => {
  let statements = 0;
  const db = createDb(
    { DATABASE_URL: URL_TESTE ?? "" },
    {
      logger: {
        logQuery: () => {
          statements += 1;
        },
      },
    }
  );
  const cursos: string[] = [];
  const trilhas: string[] = [];

  async function criarCurso(
    n: number,
    o: { comVideo?: boolean; status?: StatusDoCurso } = {}
  ) {
    const slug = `teste-${hex()}`;
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        slug,
        status: o.status ?? "publicado",
        tema: "teste",
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
        Array.from({ length: n }, (_, i) => ({
          duracaoSeg: 600,
          moduloId: m?.id ?? "",
          posicao: i + 1,
          titulo: `Aula ${i + 1}`,
          ...(o.comVideo === false
            ? {}
            : { videoId: "aqz-KE-bpKQ", videoProvedor: "youtube" as const }),
        }))
      )
      .returning({ id: aula.id });
    return { aulas: aulas.map((a) => a.id as AulaId), id: c.id, slug };
  }

  const liberarCurso = (userId: string, cursoId: string) =>
    db.insert(liberacao).values({
      cursoId,
      liberadaPor: "user_admin",
      origem: "admin",
      userId,
    });

  async function cursoLiberado(n = 2) {
    const aluno = novoAluno();
    const c = await criarCurso(n);
    await liberarCurso(aluno, c.id);
    return { aluno, c };
  }

  const comoAluno = (userId: string | null) =>
    createCaller(contextoDeTeste({ db, userId }));

  const contar = async <T>(f: () => Promise<T>) => {
    statements = 0;
    const r = await f();
    return { n: statements, r };
  };

  const terco = (aluno: string, aulaId: AulaId, base: number, i: 0 | 1 | 2) =>
    registrar(
      db,
      aluno,
      aulaId,
      { posicaoSeg: (i + 1) * 180, trechos: [t(i * 180, (i + 1) * 180)] },
      em(base + i * 90)
    );
  const assistir540 = async (aluno: string, aulaId: AulaId, base: number) => {
    await terco(aluno, aulaId, base, 0);
    await terco(aluno, aulaId, base, 1);
    return terco(aluno, aulaId, base, 2);
  };

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, ALUNOS));
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, ALUNOS));
    await db.delete(posicaoAula).where(inArray(posicaoAula.userId, ALUNOS));
    await db.delete(cotaVideo).where(inArray(cotaVideo.userId, ALUNOS));
    await db.delete(liberacao).where(inArray(liberacao.userId, ALUNOS));
    await db.delete(trilha).where(inArray(trilha.id, trilhas));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  test("sem login, abrir e registrar lançam UNAUTHORIZED", async () => {
    const anonimo = comoAluno(null);
    const id = "00000000-0000-4000-8000-000000000000";
    const erros = await Promise.all([
      anonimo.aula.abrir({ aulaId: id, slug: "comercial" }).catch(codigo),
      anonimo.aula
        .registrar({ aulaId: id, posicaoSeg: 0, trechos: [] })
        .catch(codigo),
    ]);
    expect(erros).toEqual(["UNAUTHORIZED", "UNAUTHORIZED"]);
  });

  test("NOT_FOUND sem liberação, com curso em breve, bloqueado e depois de revogar", async () => {
    const aluno = novoAluno();
    const caller = comoAluno(aluno);
    const tentar = (aulaId: string) =>
      caller.aula
        .registrar({ aulaId, posicaoSeg: 10, trechos: [t(0, 10)] })
        .then(() => "ok", codigo);

    const semLiberacao = await criarCurso(1);
    const breve = await criarCurso(1, { status: "em_producao" });
    await liberarCurso(aluno, breve.id);
    const primeiro = await criarCurso(1);
    const segundo = await criarCurso(1);
    const [tr] = await db
      .insert(trilha)
      .values({ descricao: "teste", slug: `teste-${hex()}`, titulo: "T" })
      .returning({ id: trilha.id });
    trilhas.push(tr?.id ?? "");
    await db.insert(trilhaCurso).values([
      { cursoId: primeiro.id, posicao: 1, trilhaId: tr?.id ?? "" },
      { cursoId: segundo.id, posicao: 2, trilhaId: tr?.id ?? "" },
    ]);
    await db.insert(liberacao).values({
      liberadaPor: "user_admin",
      origem: "admin",
      trilhaId: tr?.id,
      userId: aluno,
    });

    expect(await tentar(semLiberacao.aulas[0] ?? "")).toBe("NOT_FOUND");
    expect(await tentar(breve.aulas[0] ?? "")).toBe("NOT_FOUND");
    expect(await tentar(segundo.aulas[0] ?? "")).toBe("NOT_FOUND");
    expect(await tentar(primeiro.aulas[0] ?? "")).toBe("ok");
    expect(
      await caller.aula.abrir({
        aulaId: segundo.aulas[0] ?? "",
        slug: segundo.slug,
      })
    ).toBeNull();

    await db
      .update(liberacao)
      .set({ revogadaEm: new Date(), revogadaPor: "user_admin" })
      .where(and(eq(liberacao.userId, aluno), isNull(liberacao.revogadaEm)));
    expect(await tentar(primeiro.aulas[0] ?? "")).toBe("NOT_FOUND");
  });

  test("PRECONDITION_FAILED em aula sem vídeo", async () => {
    const aluno = novoAluno();
    const c = await criarCurso(1, { comVideo: false });
    await liberarCurso(aluno, c.id);
    const erro = await comoAluno(aluno)
      .aula.registrar({ aulaId: c.aulas[0] ?? "", posicaoSeg: 5, trechos: [] })
      .catch(codigo);
    expect(erro).toBe("PRECONDITION_FAILED");
  });

  test("envios de 15 s até 540 de 600 dão uma conquista, um fato e um lançamento", async () => {
    const { aluno, c } = await cursoLiberado();
    const aulaId = c.aulas[0] as AulaId;
    const passos = Array.from({ length: 36 }, (_, i) => (i + 1) * 15);
    const respostas = await emSerie(passos, (s) =>
      registrar(
        db,
        aluno,
        aulaId,
        { posicaoSeg: s, trechos: [t(s - 15, s)] },
        em(s)
      )
    );
    const conquistas = respostas.filter((r) => r.conquista);
    expect(conquistas.map((r) => r.conquista)).toEqual([
      { bonusSequencia: null, pontos: 10, sequenciaDias: 1 },
    ]);
    expect(respostas.at(-1)).toMatchObject({
      assistida: true,
      cobertura: { pct: 90, vistosSeg: 540 },
      recusadosSeg: 0,
    });

    const deNovo = await registrar(
      db,
      aluno,
      aulaId,
      { posicaoSeg: 540, trechos: [t(525, 540)] },
      em(541)
    );
    expect(deNovo.conquista).toBeNull();
    expect(deNovo.cobertura.vistosSeg).toBe(540);

    const rever = await registrar(
      db,
      aluno,
      aulaId,
      { posicaoSeg: 600, trechos: [t(540, 600)] },
      em(700)
    );
    expect(rever.conquista).toBeNull();
    const fatos = await db
      .select()
      .from(aulaAssistida)
      .where(eq(aulaAssistida.userId, aluno));
    const pontos = await db
      .select({
        motivo: pontoLancamento.motivo,
        pontos: pontoLancamento.pontos,
      })
      .from(pontoLancamento)
      .where(eq(pontoLancamento.userId, aluno));
    expect(fatos).toHaveLength(1);
    expect(fatos[0]?.dia).toBe("2026-10-07");
    expect(pontos).toEqual([{ motivo: "aula_assistida", pontos: 10 }]);
  });

  test("600 s de cara não vira assistida: a cota leva 180", async () => {
    const { aluno, c } = await cursoLiberado();
    const r = await registrar(
      db,
      aluno,
      c.aulas[0] as AulaId,
      { posicaoSeg: 600, trechos: [t(0, 600)] },
      QUARTA_15H
    );
    expect(r).toMatchObject({
      assistida: false,
      conquista: null,
      recusadosSeg: 420,
    });
    expect(r.trechos).toEqual([t(0, 180)] as never);
  });

  test("duas chamadas ao mesmo tempo unem os trechos e gastam a cota uma vez", async () => {
    const { aluno, c } = await cursoLiberado();
    const aulaId = c.aulas[0] as AulaId;
    const pedido = { posicaoSeg: 100, trechos: [t(0, 100)] };
    const [um, dois] = await Promise.all([
      registrar(db, aluno, aulaId, pedido, QUARTA_15H),
      registrar(
        db,
        aluno,
        aulaId,
        { posicaoSeg: 150, trechos: [t(50, 150)] },
        QUARTA_15H
      ),
    ]);
    expect([um?.cobertura.vistosSeg, dois?.cobertura.vistosSeg].sort()).toEqual(
      [100, 150]
    );
    const [cota] = await db
      .select({ segundos: cotaVideo.segundos })
      .from(cotaVideo)
      .where(eq(cotaVideo.userId, aluno));
    expect(cota?.segundos).toBe(30);
    const [posicao] = await db
      .select({ trechos: posicaoAula.trechosVistos })
      .from(posicaoAula)
      .where(eq(posicaoAula.userId, aluno));
    expect(posicao?.trechos).toEqual([t(0, 150)]);
  });

  test("seis dias úteis antes e a aula numa quarta lançam o bônus uma vez", async () => {
    const { aluno, c } = await cursoLiberado(8);
    const dias = [
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-05",
      "2026-10-06",
    ];
    await db.insert(aulaAssistida).values(
      dias.map((dia, i) => ({
        assistidaEm: new Date(`${dia}T15:00:00Z`),
        aulaId: c.aulas[i] ?? "",
        userId: aluno,
      }))
    );
    const primeira = await assistir540(aluno, c.aulas[6] as AulaId, 0);
    const segunda = await assistir540(aluno, c.aulas[7] as AulaId, 400);
    expect(primeira.conquista).toEqual({
      bonusSequencia: 30,
      pontos: 10,
      sequenciaDias: 7,
    });
    expect(segunda.conquista).toEqual({
      bonusSequencia: null,
      pontos: 10,
      sequenciaDias: 7,
    });
    const bonus = await db
      .select({ diaMarco: pontoLancamento.diaMarco })
      .from(pontoLancamento)
      .where(
        and(
          eq(pontoLancamento.userId, aluno),
          eq(pontoLancamento.motivo, "sequencia_7_dias")
        )
      );
    expect(bonus).toEqual([{ diaMarco: "2026-10-07" }]);
  });

  test("a conquista mostra só os lançamentos que entraram", async () => {
    const { aluno, c } = await cursoLiberado(7);
    const dias = [
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-05",
      "2026-10-06",
    ];
    await db.insert(aulaAssistida).values(
      dias.map((dia, i) => ({
        assistidaEm: new Date(`${dia}T15:00:00Z`),
        aulaId: c.aulas[i] ?? "",
        userId: aluno,
      }))
    );
    await db.insert(pontoLancamento).values({
      criadoEm: em(-3600),
      diaMarco: "2026-10-07",
      motivo: "sequencia_7_dias",
      pontos: 30,
      userId: aluno,
    });
    const r = await assistir540(aluno, c.aulas[6] as AulaId, 0);
    expect(r.conquista).toEqual({
      bonusSequencia: null,
      pontos: 10,
      sequenciaDias: 7,
    });
  });

  test("falha no meio desfaz tudo: sem fato, posição e cota de antes", async () => {
    const { aluno, c } = await cursoLiberado();
    const aulaId = c.aulas[0] as AulaId;
    await terco(aluno, aulaId, 0, 0);
    await terco(aluno, aulaId, 0, 1);
    const nome = `recusa_ponto_${S}`;
    await db.$client.query(
      `create function ${nome}() returns trigger language plpgsql as $$
       begin
         if new.user_id = '${aluno}' then raise exception 'falha de teste'; end if;
         return new;
       end $$`
    );
    await db.$client.query(
      `create trigger ${nome} before insert on ponto_lancamento for each row execute function ${nome}()`
    );
    try {
      const erro = await terco(aluno, aulaId, 0, 2).then(
        () => null,
        (e: unknown) => String(e)
      );
      expect(erro).toContain("Failed query");
    } finally {
      await db.$client.query(`drop trigger ${nome} on ponto_lancamento`);
      await db.$client.query(`drop function ${nome}()`);
    }
    const fatos = await db
      .select()
      .from(aulaAssistida)
      .where(eq(aulaAssistida.userId, aluno));
    const [posicao] = await db
      .select({
        seg: posicaoAula.posicaoSeg,
        trechos: posicaoAula.trechosVistos,
      })
      .from(posicaoAula)
      .where(eq(posicaoAula.userId, aluno));
    const [cota] = await db
      .select({ segundos: cotaVideo.segundos })
      .from(cotaVideo)
      .where(eq(cotaVideo.userId, aluno));
    expect(fatos).toEqual([]);
    expect(posicao).toEqual({ seg: 360, trechos: [t(0, 360)] });
    expect(cota?.segundos).toBe(0);
  });

  test("abrir e entrada montam a aula e o caminho do curso", async () => {
    const { aluno, c } = await cursoLiberado(3);
    await registrar(
      db,
      aluno,
      c.aulas[1] as AulaId,
      { posicaoSeg: 42, trechos: [t(0, 42)] },
      QUARTA_15H
    );
    const vm = await carregarAula(db, aluno, c.slug, c.aulas[1] ?? "");
    expect(vm).toMatchObject({
      anterior: { id: c.aulas[0] },
      aula: {
        numeroNoModulo: 2,
        totalNoModulo: 3,
        video: { id: "aqz-KE-bpKQ", provedor: "youtube" },
      },
      curso: { slug: c.slug },
      estudo: { assistida: false, posicaoSeg: 42 },
      proxima: { id: c.aulas[2] },
    });
    expect(vm?.estudo.trechos).toEqual([t(0, 42)] as never);
    expect(await carregarEntrada(db, aluno, c.slug)).toEqual({
      aulaId: c.aulas[1] as AulaId,
      tipo: "aula",
    });
    expect(await carregarAula(db, aluno, c.slug, cursos[0] ?? "")).toBeNull();
  });

  test("o registro lê o curso em série dentro da transação", async () => {
    const { aluno, c } = await cursoLiberado();
    await terco(aluno, c.aulas[0] as AulaId, 0, 0);
    expect(avisosDoPg).toEqual([]);
  });

  test("contagem de statements: abrir 4, envio comum 7 e com conquista 9, mais begin e commit", async () => {
    const { aluno, c } = await cursoLiberado();
    const aulaId = c.aulas[0] as AulaId;
    const abrir = await contar(() => carregarAula(db, aluno, c.slug, aulaId));
    const comum = await contar(() => terco(aluno, aulaId, 0, 0));
    await terco(aluno, aulaId, 0, 1);
    const comConquista = await contar(() => terco(aluno, aulaId, 0, 2));
    expect(comConquista.r.conquista).not.toBeNull();
    expect({
      abrir: abrir.n,
      comConquista: comConquista.n,
      comum: comum.n,
    }).toEqual({ abrir: 4, comConquista: 2 + 9, comum: 2 + 7 });
  });
});
