// Edição do curso inteiro contra o Supabase local, pelo caller do tRPC como admin.
// Roda só com TEST_DATABASE_URL em host local. Cada teste cria o próprio curso com
// sufixo aleatório, e o afterAll apaga tudo.

import { afterAll, describe, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { setTimeout as esperar } from "node:timers/promises";
import { createDb } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  curso,
  liberacao,
  modulo,
  nivel,
  posicaoAula,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { asc, eq, inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import {
  type DocumentoDoCurso,
  type EdicaoDoCurso,
  formularioDoCurso,
  type ModuloDoDocumento,
} from "../dominio/edicao-do-curso";
import type { AulaId, CursoId, ModuloId } from "../dominio/tipos";
import type { Capas } from "../externos/capas";
import { ErroParaAPessoa } from "../index";
import { createCaller } from "../routers/index";
import { CURSO_EM_USO, violacaoDe } from "./erros";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const ALUNO = `user_teste${S}edicao`;

/** Como no Storage, a URL sai do conteúdo: o mesmo arquivo dá a mesma URL. */
const urlDaCapa = (n: number) => `/capas/teste-${S}-${n}.jpg`;
const CAPA = { altura: 720, largura: 1280, url: urlDaCapa(1) };
const capasDeTeste: Capas = {
  receber: async (arquivo) => {
    const [n = 0] = new Uint8Array(await arquivo.arrayBuffer());
    return { imagem: { ...CAPA, url: urlDaCapa(n) }, tipo: "guardada" };
  },
};
const arquivoDaCapa = (n = 1) => new Blob([new Uint8Array([n])]);

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

const OK = { code: "ok", message: "" };

/** O motivo que o errorFormatter manda ao editor. */
const motivoDe = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: unknown) =>
      e instanceof ErroParaAPessoa ? e.motivo : "não é ErroParaAPessoa"
  );

describe.skipIf(URL_TESTE === null)("edição do curso", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const admin = createCaller(
    contextoDeTeste({
      capas: capasDeTeste,
      db,
      papel: "admin",
      userId: "user_admin",
    })
  );
  const cursos: CursoId[] = [];

  afterAll(async () => {
    await db.delete(aulaAssistida).where(eq(aulaAssistida.userId, ALUNO));
    await db.delete(posicaoAula).where(eq(posicaoAula.userId, ALUNO));
    await db.delete(liberacao).where(eq(liberacao.userId, ALUNO));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  const novaAula = (titulo: string) => ({
    duracaoSeg: 120,
    id: randomUUID() as AulaId,
    titulo,
    video: null,
  });

  const novoModulo = (
    numero: number,
    titulo: string,
    aulas: ModuloDoDocumento["aulas"] = []
  ): ModuloDoDocumento => ({
    aulas,
    id: randomUUID() as ModuloId,
    nivelOrdem: null,
    numero,
    titulo,
  });

  function documentoNovo(
    modulosDoCurso: ModuloDoDocumento[] = []
  ): DocumentoDoCurso {
    const id = randomUUID() as CursoId;
    cursos.push(id);
    return {
      capaAlt: "Capa de teste",
      codigo: null,
      destaque: null,
      id,
      modulos: modulosDoCurso,
      niveis: [],
      precoTroca: null,
      slug: `teste-${S}-${cursos.length}`,
      status: "em_producao",
      tema: "teste",
      titulo: `Curso ${S} ${cursos.length}`,
      versao: null,
    };
  }

  /** Curso salvo pelo admin com dois módulos (0: A1, A2, A3; 1: B1) e um nível. */
  async function cursoSalvo(): Promise<EdicaoDoCurso> {
    const a = novoModulo(0, "Módulo A", [
      novaAula("A1"),
      novaAula("A2"),
      novaAula("A3"),
    ]);
    const documento = {
      ...documentoNovo([{ ...a, nivelOrdem: 1 }, novoModulo(1, "Módulo B")]),
      niveis: [{ nome: "Básico", ordem: 1 }],
    };
    documento.modulos[1]?.aulas.push(novaAula("B1"));
    await salvarComCapa(documento);
    return abrir(documento.id);
  }

  async function abrir(id: CursoId): Promise<EdicaoDoCurso> {
    const edicao = await admin.admin.catalogo.abrirCurso({ id });
    if (!edicao) {
      throw new Error("curso não abriu");
    }
    return edicao;
  }

  const salvar = (documento: DocumentoDoCurso) =>
    admin.admin.catalogo.salvarCurso(formularioDoCurso(documento, null));

  const salvarComCapa = (documento: DocumentoDoCurso, capa = 1) =>
    admin.admin.catalogo.salvarCurso(
      formularioDoCurso(documento, arquivoDaCapa(capa))
    );

  const modulos = (d: DocumentoDoCurso) => {
    const [a, b] = d.modulos;
    if (!(a && b)) {
      throw new Error("o curso de teste tem dois módulos");
    }
    return [a, b] as const;
  };

  function aulasNoBanco(moduloId: string) {
    return db
      .select({ id: aula.id, posicao: aula.posicao, titulo: aula.titulo })
      .from(aula)
      .where(eq(aula.moduloId, moduloId))
      .orderBy(asc(aula.posicao));
  }

  const titulos = async (moduloId: string) =>
    (await aulasNoBanco(moduloId)).map((x) => x.titulo);

  function modulosNoBanco(cursoId: CursoId) {
    return db
      .select({
        id: modulo.id,
        nivelOrdem: modulo.nivelOrdem,
        numero: modulo.numero,
      })
      .from(modulo)
      .where(eq(modulo.cursoId, cursoId))
      .orderBy(asc(modulo.numero));
  }

  async function assistir(aulaId: AulaId) {
    await db.insert(aulaAssistida).values({ aulaId, userId: ALUNO });
    await db
      .insert(posicaoAula)
      .values({ aulaId, posicaoSeg: 42, userId: ALUNO });
  }

  test("criar curso sem capa é recusado; com capa grava url, largura e altura", async () => {
    const documento = documentoNovo();
    expect(await resultado(salvar(documento))).toEqual({
      code: "PRECONDITION_FAILED",
      message: "Curso novo precisa de capa.",
    });

    await salvarComCapa(documento);
    const [linha] = await db
      .select({
        altura: curso.capaAltura,
        largura: curso.capaLargura,
        url: curso.capaUrl,
      })
      .from(curso)
      .where(eq(curso.id, documento.id));
    expect(linha).toEqual(CAPA);
  });

  test("trocar a ordem das aulas do módulo passa pelo unique não deferrable", async () => {
    const { documento } = await cursoSalvo();
    const [a] = modulos(documento);
    const [a1, a2, a3] = a.aulas;
    a.aulas = [a3, a1, a2].filter((x) => x !== undefined);

    await salvar(documento);

    expect(
      (await aulasNoBanco(a.id)).map((x) => [x.titulo, x.posicao])
    ).toEqual([
      ["A3", 1],
      ["A1", 2],
      ["A2", 3],
    ]);
  });

  test("trocar os números de dois módulos passa por modulo_numero_unico", async () => {
    const { documento } = await cursoSalvo();
    const [a, b] = modulos(documento);
    a.numero = 1;
    b.numero = 0;

    expect(await resultado(salvar(documento))).toEqual(OK);

    expect(await modulosNoBanco(documento.id)).toEqual([
      { id: b.id, nivelOrdem: null, numero: 0 },
      { id: a.id, nivelOrdem: 1, numero: 1 },
    ]);
  });

  test("módulos fora de ordem no array: a versão devolvida é a que abrirCurso lê", async () => {
    const { documento } = await cursoSalvo();
    const [a, b] = modulos(documento);
    a.numero = 1;
    b.numero = 0;

    const salvo = await salvar(documento);

    expect((await abrir(documento.id)).documento.versao).toBe(salvo.versao);
    expect(
      await resultado(
        salvar({ ...documento, tema: "outro tema", versao: salvo.versao })
      )
    ).toEqual(OK);
  });

  test("id de aula em maiúscula é a mesma aula: aula assistida e posição ficam", async () => {
    const { documento } = await cursoSalvo();
    const [a] = modulos(documento);
    const [a1] = a.aulas;
    if (!a1) {
      throw new Error("sem A1");
    }
    await assistir(a1.id);
    a1.id = a1.id.toUpperCase() as AulaId;
    a1.titulo = "A1 renomeada";

    expect(await resultado(salvar(documento))).toEqual(OK);

    expect(await aulasNoBanco(a.id)).toContainEqual({
      id: a1.id.toLowerCase(),
      posicao: 1,
      titulo: "A1 renomeada",
    });
    const posicoes = await db
      .select({ seg: posicaoAula.posicaoSeg })
      .from(posicaoAula)
      .where(eq(posicaoAula.aulaId, a1.id.toLowerCase()));
    expect(posicoes).toEqual([{ seg: 42 }]);
  });

  test("aula muda de módulo e mantém aula assistida e posição do aluno", async () => {
    const { documento } = await cursoSalvo();
    const [a, b] = modulos(documento);
    const [a2] = a.aulas.splice(1, 1);
    if (!a2) {
      throw new Error("sem A2");
    }
    await assistir(a2.id);
    b.aulas.unshift(a2);

    await salvar(documento);

    expect(
      (await aulasNoBanco(b.id)).map((x) => [
        x.id === a2.id,
        x.titulo,
        x.posicao,
      ])
    ).toEqual([
      [true, "A2", 1],
      [false, "B1", 2],
    ]);
    expect(await titulos(a.id)).toEqual(["A1", "A3"]);
    const assistidas = await db
      .select({ aulaId: aulaAssistida.aulaId })
      .from(aulaAssistida)
      .where(eq(aulaAssistida.aulaId, a2.id));
    const posicoes = await db
      .select({ seg: posicaoAula.posicaoSeg })
      .from(posicaoAula)
      .where(eq(posicaoAula.aulaId, a2.id));
    expect([assistidas.length, posicoes]).toEqual([1, [{ seg: 42 }]]);
  });

  test("módulo esvaziado some, e as aulas dele ficam no outro", async () => {
    const { documento } = await cursoSalvo();
    const [a, b] = modulos(documento);
    a.aulas.push(...b.aulas);
    documento.modulos = [a];

    await salvar(documento);

    expect((await modulosNoBanco(documento.id)).map((m) => m.id)).toEqual([
      a.id,
    ]);
    expect(await titulos(a.id)).toEqual(["A1", "A2", "A3", "B1"]);
  });

  test("num salvamento só: módulo 0 novo empurra os outros, aula vai para ele, aula nova em módulo antigo, módulo e nível saem, capa troca", async () => {
    const base = await cursoSalvo();
    const c = { ...novoModulo(5, "Módulo C", [novaAula("C1")]), nivelOrdem: 2 };
    const comC = await salvar({
      ...base.documento,
      modulos: [...base.documento.modulos, c],
      niveis: [...base.documento.niveis, { nome: "Avançado", ordem: 2 }],
    });

    const { documento } = await abrir(base.documento.id);
    expect(documento.versao).toBe(comC.versao);
    const [a, b] = modulos(documento);
    const [a2] = a.aulas.splice(1, 1);
    if (!a2) {
      throw new Error("sem A2");
    }
    const zero = novoModulo(0, "Módulo zero", [a2, novaAula("N1")]);
    a.numero = 1;
    b.numero = 2;
    b.aulas.push(novaAula("B2"));
    documento.modulos = [zero, a, b];
    documento.niveis = [{ nome: "Básico", ordem: 1 }];

    const salvo = await salvarComCapa(documento, 2);

    expect(await modulosNoBanco(documento.id)).toEqual([
      { id: zero.id, nivelOrdem: null, numero: 0 },
      { id: a.id, nivelOrdem: 1, numero: 1 },
      { id: b.id, nivelOrdem: null, numero: 2 },
    ]);
    expect([
      await titulos(zero.id),
      await titulos(a.id),
      await titulos(b.id),
    ]).toEqual([
      ["A2", "N1"],
      ["A1", "A3"],
      ["B1", "B2"],
    ]);
    expect(await aulasNoBanco(c.id)).toEqual([]);
    expect(
      await db
        .select({ ordem: nivel.ordem })
        .from(nivel)
        .where(eq(nivel.cursoId, documento.id))
    ).toEqual([{ ordem: 1 }]);
    const aberto = await abrir(documento.id);
    expect([aberto.capa?.url, aberto.documento.versao]).toEqual([
      urlDaCapa(2),
      salvo.versao,
    ]);
  });

  test("bordas: módulo 999 troca com o 0, e as 500 aulas de um módulo se invertem", async () => {
    const cheio = novoModulo(
      999,
      "Cheio",
      Array.from({ length: 500 }, (_, i) => novaAula(`X${i + 1}`))
    );
    const documento = documentoNovo([
      novoModulo(0, "Pequeno", [novaAula("P1")]),
      cheio,
    ]);
    await salvarComCapa(documento);

    const aberto = (await abrir(documento.id)).documento;
    const [pequeno, grande] = modulos(aberto);
    pequeno.numero = 999;
    grande.numero = 0;
    grande.aulas.reverse();
    const salvo = await salvar(aberto);

    expect(
      (await modulosNoBanco(documento.id)).map((m) => [m.id, m.numero])
    ).toEqual([
      [cheio.id, 0],
      [pequeno.id, 999],
    ]);
    const aulas = await aulasNoBanco(cheio.id);
    expect([
      aulas.length,
      aulas[0]?.id === cheio.aulas[499]?.id,
      aulas[0]?.posicao,
      aulas[0]?.titulo,
      aulas.at(-1)?.titulo,
    ]).toEqual([500, true, 1, "X500", "X1"]);
    expect((await abrir(documento.id)).documento.versao).toBe(salvo.versao);
  });

  test("dois salvamentos da mesma versão em paralelo: um grava, o outro dá CONFLICT", async () => {
    const { documento } = await cursoSalvo();
    const codigos = await Promise.all([
      resultado(salvar({ ...documento, titulo: `${documento.titulo} um` })),
      resultado(salvar({ ...documento, tema: "dois" })),
    ]);
    expect(codigos.map((r) => r.code).sort()).toEqual(["CONFLICT", "ok"]);
  });

  test("criação repetida, em série e em paralelo, é sucesso e cria um curso só", async () => {
    const documento = documentoNovo([novoModulo(0, "Único")]);
    const primeiro = await salvarComCapa(documento);
    expect(await salvarComCapa(documento)).toEqual(primeiro);

    const outro = documentoNovo();
    const paralelos = await Promise.all([
      resultado(salvarComCapa(outro)),
      resultado(salvarComCapa(outro)),
    ]);
    expect(paralelos).toEqual([OK, OK]);
    expect((await abrir(documento.id)).documento.versao).toBe(primeiro.versao);
  });

  test("capa trocada muda a versão; reenviar a troca é sucesso; troca concorrente dá CONFLICT", async () => {
    const { documento } = await cursoSalvo();

    const trocada = await salvarComCapa(documento, 2);
    expect(trocada.versao).not.toBe(documento.versao);
    expect((await abrir(documento.id)).documento.versao).toBe(trocada.versao);

    expect(await resultado(salvarComCapa(documento, 2))).toEqual(OK);
    expect((await resultado(salvarComCapa(documento, 3))).code).toBe(
      "CONFLICT"
    );
    expect((await abrir(documento.id)).capa?.url).toBe(urlDaCapa(2));
  });

  test("id de módulo ou de aula de outro curso é recusado e nada muda", async () => {
    const outro = await cursoSalvo();
    const { documento } = await cursoSalvo();
    const [deFora] = outro.documento.modulos;
    const aulaDeFora = deFora?.aulas[0];
    if (!(deFora && aulaDeFora)) {
      throw new Error("o outro curso tem módulo e aula");
    }

    const comModulo = structuredClone(documento);
    comModulo.modulos.push({ ...deFora, aulas: [], numero: 7 });
    const comAula = structuredClone(documento);
    comAula.modulos[1]?.aulas.push(aulaDeFora);

    expect([
      await resultado(salvar(comModulo)),
      await resultado(salvar(comAula)),
    ]).toEqual([
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "O documento traz módulo de outro curso.",
      },
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "O documento traz aula de outro curso.",
      },
    ]);
    expect(await abrir(outro.documento.id)).toEqual(outro);
    expect((await abrir(documento.id)).documento).toEqual(documento);
  });

  test("apagar aula assistida é recusado com o título da aula e nada muda", async () => {
    const { documento } = await cursoSalvo();
    const [a, b] = modulos(documento);
    const [, , a3] = a.aulas;
    if (!a3) {
      throw new Error("sem A3");
    }
    await assistir(a3.id);
    const antes = await abrir(documento.id);
    a.aulas.pop();
    b.titulo = "Título que não pode entrar";

    expect(await resultado(salvar(documento))).toEqual({
      code: "PRECONDITION_FAILED",
      message:
        'A aula "A3" já foi assistida por 1 aluno e não se apaga. Troque o vídeo ou o título dela.',
    });
    expect(await abrir(documento.id)).toEqual(antes);
  });

  test("salvar com versão velha dá CONFLICT; salvar o mesmo conteúdo de novo é sucesso", async () => {
    const { documento } = await cursoSalvo();
    const primeiro = { ...documento, titulo: `${documento.titulo} editado` };
    const salvo = await salvar(primeiro);
    expect(await resultado(salvar(primeiro))).toEqual(OK);

    const velho = { ...documento, tema: "outro tema" };
    expect((await resultado(salvar(velho))).code).toBe("CONFLICT");
    expect(await motivoDe(salvar(velho))).toBe("versao_mudou");
    expect((await abrir(documento.id)).documento.versao).toBe(salvo.versao);
  });

  test("slug repetido dá CONFLICT com mensagem", async () => {
    const um = await cursoSalvo();
    const { documento } = await cursoSalvo();
    expect(
      await resultado(salvar({ ...documento, slug: um.documento.slug }))
    ).toEqual({
      code: "CONFLICT",
      message: "Já existe um curso com este endereço.",
    });
    expect(
      await motivoDe(salvar({ ...documento, slug: um.documento.slug }))
    ).toBe("slug_repetido");
  });

  test("curso com liberação não se apaga; curso sem uso se apaga", async () => {
    const usado = await cursoSalvo();
    await db.insert(liberacao).values({
      cursoId: usado.documento.id,
      liberadaPor: "user_admin",
      origem: "admin",
      userId: ALUNO,
    });
    expect(usado.podeApagar).toBe(true);
    expect((await abrir(usado.documento.id)).podeApagar).toBe(false);

    expect(
      await resultado(
        admin.admin.catalogo.apagarCurso({ id: usado.documento.id })
      )
    ).toEqual({ code: "PRECONDITION_FAILED", message: CURSO_EM_USO });
    expect(
      await admin.admin.catalogo.abrirCurso({ id: usado.documento.id })
    ).not.toBeNull();

    const livre = await cursoSalvo();
    expect(
      await admin.admin.catalogo.apagarCurso({ id: livre.documento.id })
    ).toEqual({ apagado: true });
    expect(
      await admin.admin.catalogo.abrirCurso({ id: livre.documento.id })
    ).toBeNull();
  });

  test("aula assistida que chega depois da conta de uso: apagarCurso diz que o curso está em uso", async () => {
    const { documento } = await cursoSalvo();
    const aulaId = documento.modulos[0]?.aulas[0]?.id;
    if (!aulaId) {
      throw new Error("sem aula");
    }
    const aluno = await db.$client.connect();
    try {
      await aluno.query("begin");
      await aluno.query(
        "insert into aula_assistida (user_id, aula_id) values ($1, $2)",
        [ALUNO, aulaId]
      );
      const apagando = resultado(
        admin.admin.catalogo.apagarCurso({ id: documento.id })
      );
      await esperarAlguemEsperandoTrava();
      await aluno.query("commit");

      expect(await apagando).toEqual({
        code: "PRECONDITION_FAILED",
        message: CURSO_EM_USO,
      });
    } finally {
      aluno.release();
    }
  });

  test("aula assistida que chega depois da conta: salvarCurso recusa com o título da aula e nada muda", async () => {
    const antes = await cursoSalvo();
    const { documento } = structuredClone(antes);
    const [a] = modulos(documento);
    const a1 = a.aulas.shift();
    if (!a1) {
      throw new Error("sem A1");
    }
    const aluno = await db.$client.connect();
    try {
      await aluno.query("begin");
      await aluno.query(
        "insert into aula_assistida (user_id, aula_id) values ($1, $2)",
        [ALUNO, a1.id]
      );
      const salvando = resultado(salvar(documento));
      await esperarAlguemEsperandoTrava();
      await aluno.query("commit");

      expect(await salvando).toEqual({
        code: "PRECONDITION_FAILED",
        message:
          'A aula "A1" já foi assistida por 1 aluno e não se apaga. Troque o vídeo ou o título dela.',
      });
    } finally {
      aluno.release();
    }
    expect((await abrir(documento.id)).documento).toEqual(antes.documento);
  });

  /** O DELETE do curso fica parado na linha da aula que o aluno travou ao inserir. */
  async function esperarAlguemEsperandoTrava(tentativas = 100): Promise<void> {
    const { rows } = await db.$client.query<{ n: number }>(
      "select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'"
    );
    if ((rows[0]?.n ?? 0) > 0) {
      return;
    }
    if (tentativas === 0) {
      throw new Error("o apagamento não chegou a esperar a trava do aluno");
    }
    await esperar(50);
    return esperarAlguemEsperandoTrava(tentativas - 1);
  }

  test("abrirCurso aceita só uuid; id que não existe é null", async () => {
    expect(
      (await resultado(admin.admin.catalogo.abrirCurso({ id: "novo" }))).code
    ).toBe("BAD_REQUEST");
    expect(
      await admin.admin.catalogo.abrirCurso({ id: randomUUID() })
    ).toBeNull();
  });
});
