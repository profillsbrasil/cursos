import { afterAll, beforeAll, describe, expect, test } from "bun:test";
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
  modulo,
  pergunta,
  pontoLancamento,
  posicaoAula,
  questionarioTentativa,
} from "@cursos/db/schema/index";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

import { contextoDeTeste } from "../contexto-de-teste";
import { FORMATO_DO_CODIGO } from "../dominio/certificado";
import { type CursoComAulas, lerCursoDoAluno } from "../dominio/curso-do-aluno";
import {
  type DocumentoDoCurso,
  formularioDoCurso,
} from "../dominio/edicao-do-curso";
import { estudoDe } from "../dominio/historico";
import type {
  AlternativaId,
  AulaId,
  CategoriaId,
  CursoId,
  ModuloId,
  PerguntaId,
  TentativaId,
} from "../dominio/tipos";
import type { Capas } from "../externos/capas";
import { createCaller } from "../routers/index";
import { registrar } from "./aula";
import { categoriaDeTeste } from "./categoria-de-teste";
import { linhasDoHistorico } from "./meus-cursos";

const URL_TESTE = urlDeTeste();
const S = randomBytes(4).toString("hex");
const AGORA = new Date("2026-10-07T18:00:00Z");
const em = (s: number) => new Date(AGORA.getTime() + s * 1000);

const capasDeTeste: Capas = {
  receber: () =>
    Promise.resolve({
      imagem: { altura: 720, largura: 1280, url: `/capas/teste-${S}.jpg` },
      tipo: "guardada",
    }),
};

const recusa = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) =>
      e instanceof TRPCError
        ? { code: e.code, message: e.message }
        : { code: "não é TRPCError", message: String(e) }
  );

describe.skipIf(URL_TESTE === null)("questionário do aluno", () => {
  const db = createDb({ DATABASE_URL: URL_TESTE ?? "" });
  const cursos: string[] = [];
  const alunos: string[] = [];
  let categoriaId: CategoriaId;
  const admin = createCaller(
    contextoDeTeste({
      capas: capasDeTeste,
      db,
      papel: "admin",
      userId: "user_admin",
    })
  );

  beforeAll(async () => {
    categoriaId = await categoriaDeTeste(db);
  });

  afterAll(async () => {
    await db
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, alunos));
    await db.delete(certificado).where(inArray(certificado.userId, alunos));
    await db
      .delete(questionarioTentativa)
      .where(inArray(questionarioTentativa.userId, alunos));
    await db.delete(aulaAssistida).where(inArray(aulaAssistida.userId, alunos));
    await db.delete(posicaoAula).where(inArray(posicaoAula.userId, alunos));
    await db.delete(cotaVideo).where(inArray(cotaVideo.userId, alunos));
    await db.delete(liberacao).where(inArray(liberacao.userId, alunos));
    await db.delete(curso).where(inArray(curso.id, cursos));
    await db.$client.end();
  });

  const novoAluno = () => {
    const a = `user_teste${S}q${alunos.length + 1}`;
    alunos.push(a);
    return a;
  };

  interface PerguntaPlantada {
    alternativas: AlternativaId[];
    certa: AlternativaId;
    id: PerguntaId;
  }

  interface AulaPlantada {
    id: AulaId;
    perguntas: PerguntaPlantada[];
  }

  /** Curso publicado com uma aula por item de `perguntasPorAula`, cada uma com N perguntas de 3 alternativas (a certa é a 2ª). */
  async function plantarCurso(perguntasPorAula: readonly number[]) {
    const slug = `teste-${S}-${cursos.length + 1}`;
    const [c] = await db
      .insert(curso)
      .values({
        capaAlt: "Capa de teste",
        capaAltura: 720,
        capaLargura: 1280,
        capaUrl: "/capas/teste.jpg",
        categoriaId,
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
      .values({ cursoId: c.id, numero: 1, titulo: "Módulo" })
      .returning({ id: modulo.id });
    const aulas: AulaPlantada[] = [];
    for (const [i, n] of perguntasPorAula.entries()) {
      // biome-ignore lint/performance/noAwaitInLoops: as perguntas precisam do id da aula gravada.
      const [a] = await db
        .insert(aula)
        .values({
          duracaoSeg: 600,
          moduloId: m?.id ?? "",
          posicao: i + 1,
          titulo: `Aula ${i + 1}`,
          videoId: "aqz-KE-bpKQ",
          videoProvedor: "youtube",
        })
        .returning({ id: aula.id });
      const perguntas: PerguntaPlantada[] = [];
      for (let p = 1; p <= n; p += 1) {
        // biome-ignore lint/performance/noAwaitInLoops: as alternativas precisam do id da pergunta gravada.
        const [pg] = await db
          .insert(pergunta)
          .values({
            aulaId: a?.id ?? "",
            enunciado: `Pergunta ${p}`,
            posicao: p,
          })
          .returning({ id: pergunta.id });
        const alts = await db
          .insert(alternativa)
          .values(
            [1, 2, 3].map((k) => ({
              certa: k === 2,
              perguntaId: pg?.id ?? "",
              posicao: k,
              texto: `Alternativa ${k}`,
            }))
          )
          .returning({ id: alternativa.id });
        const ids = alts.map((x) => x.id as AlternativaId);
        perguntas.push({
          alternativas: ids,
          certa: ids[1] as AlternativaId,
          id: pg?.id as PerguntaId,
        });
      }
      aulas.push({ id: a?.id as AulaId, perguntas });
    }
    return { aulas, id: c.id as CursoId, slug };
  }

  const liberar = (userId: string, cursoId: string) =>
    db.insert(liberacao).values({
      cursoId,
      liberadaPor: "user_admin",
      origem: "admin",
      userId,
    });

  const assistir = (userId: string, aulaId: AulaId) =>
    db.insert(aulaAssistida).values({ assistidaEm: AGORA, aulaId, userId });

  const comoAluno = (userId: string) =>
    createCaller(contextoDeTeste({ db, userId }));

  /** As respostas de uma aula: a certa em `acertos` perguntas e a 1ª nas outras. */
  const respostas = (a: AulaPlantada, acertos: number) =>
    a.perguntas.map((p, i) => ({
      alternativaId:
        i < acertos ? p.certa : (p.alternativas[0] as AlternativaId),
      perguntaId: p.id,
    }));

  const enviar = (
    userId: string,
    a: AulaPlantada,
    acertos: number,
    tentativaId = randomUUID() as TentativaId
  ) =>
    comoAluno(userId).questionario.responder({
      aulaId: a.id,
      respostas: respostas(a, acertos),
      tentativaId,
    });

  const pontosDe = (userId: string) =>
    db
      .select({
        motivo: pontoLancamento.motivo,
        pontos: pontoLancamento.pontos,
      })
      .from(pontoLancamento)
      .where(eq(pontoLancamento.userId, userId))
      .orderBy(pontoLancamento.criadoEm);

  const certificadosDe = (userId: string) =>
    db
      .select({ codigo: certificado.codigo, cursoId: certificado.cursoId })
      .from(certificado)
      .where(eq(certificado.userId, userId));

  test("5 pontos por acerto só na primeira tentativa, aprovada ou não; a tentativa e as respostas ficam gravadas", async () => {
    const c = await plantarCurso([3, 0]);
    const [a1] = c.aulas;
    if (!a1) {
      throw new Error("aula não plantada");
    }
    const aluno = novoAluno();
    await liberar(aluno, c.id);

    const primeira = await enviar(aluno, a1, 2);
    expect(primeira.resultado).toMatchObject({
      acertos: 2,
      aprovada: false,
      paraPassar: 3,
      pontos: 10,
      pontosDaPrimeira: 10,
      tentativa: 1,
      total: 3,
    });
    expect(primeira.resultado.respostas.map((r) => r.certa)).toEqual([
      true,
      true,
      false,
    ]);
    expect(primeira.cursoConcluido).toBeNull();

    const segunda = await enviar(aluno, a1, 3);
    expect(segunda.resultado).toMatchObject({
      acertos: 3,
      aprovada: true,
      pontos: 0,
      pontosDaPrimeira: 10,
      tentativa: 2,
    });
    expect(await pontosDe(aluno)).toEqual([
      { motivo: "questionario", pontos: 10 },
    ]);

    const tentativas = await db.query.questionarioTentativa.findMany({
      columns: { acertos: true, aprovada: true, numero: true, total: true },
      orderBy: { numero: "asc" },
      where: { aulaId: a1.id, userId: aluno },
      with: { respostas: { columns: { certa: true } } },
    });
    expect(tentativas).toEqual([
      {
        acertos: 2,
        aprovada: false,
        numero: 1,
        respostas: [{ certa: true }, { certa: true }, { certa: false }],
        total: 3,
      },
      {
        acertos: 3,
        aprovada: true,
        numero: 2,
        respostas: [{ certa: true }, { certa: true }, { certa: true }],
        total: 3,
      },
    ]);
  });

  test("a certa não chega ao cliente antes da aprovação, nem em abrir nem no resultado reprovado; aprovado, chega", async () => {
    const c = await plantarCurso([2]);
    const [a1] = c.aulas;
    if (!a1) {
      throw new Error("aula não plantada");
    }
    const aluno = novoAluno();
    await liberar(aluno, c.id);

    const antes = await comoAluno(aluno).aula.abrir({
      aulaId: a1.id,
      slug: c.slug,
    });
    expect(antes?.questionario?.perguntas).toHaveLength(2);
    expect(JSON.stringify(antes?.questionario)).not.toContain("certa");

    const reprovada = await enviar(aluno, a1, 1);
    expect(reprovada.resultado.aprovada).toBe(false);
    expect(reprovada.resultado.respostas.map((r) => r.certaId)).toEqual([
      null,
      null,
    ]);
    const depois = await comoAluno(aluno).aula.abrir({
      aulaId: a1.id,
      slug: c.slug,
    });
    expect(
      depois?.questionario?.ultima?.respostas.map((r) => r.certaId)
    ).toEqual([null, null]);

    const aprovada = await enviar(aluno, a1, 2);
    expect(aprovada.resultado.respostas.map((r) => r.certaId)).toEqual(
      a1.perguntas.map((p) => p.certa)
    );
    const aberta = await comoAluno(aluno).aula.abrir({
      aulaId: a1.id,
      slug: c.slug,
    });
    expect(aberta?.questionario?.ultima).toMatchObject({
      aprovada: true,
      pontosDaPrimeira: 5,
      tentativa: 2,
    });
    expect(aberta?.modulos[0]?.aulas[0]?.questionario).toEqual({
      tipo: "aprovado",
    });
  });

  test("reenviar a mesma tentativa, ou enviar depois de aprovar, devolve o gravado sem outra tentativa nem outro ponto", async () => {
    const c = await plantarCurso([2]);
    const [a1] = c.aulas;
    if (!a1) {
      throw new Error("aula não plantada");
    }
    const aluno = novoAluno();
    await liberar(aluno, c.id);
    const id = randomUUID() as TentativaId;

    const primeira = await enviar(aluno, a1, 2, id);
    const repetida = await enviar(aluno, a1, 0, id);
    const depoisDeAprovar = await enviar(aluno, a1, 0);
    expect(repetida.resultado).toEqual(primeira.resultado);
    expect(depoisDeAprovar.resultado).toEqual(primeira.resultado);
    const tentativas = await db
      .select({ id: questionarioTentativa.id })
      .from(questionarioTentativa)
      .where(eq(questionarioTentativa.userId, aluno));
    expect(tentativas).toHaveLength(1);
    expect(await pontosDe(aluno)).toEqual([
      { motivo: "questionario", pontos: 10 },
    ]);
  });

  test("envio incompleto, aula sem questionário e curso sem liberação são recusados sem gravar", async () => {
    const c = await plantarCurso([2, 0]);
    const [a1, a2] = c.aulas;
    if (!(a1 && a2)) {
      throw new Error("aulas não plantadas");
    }
    const aluno = novoAluno();
    const semAcesso = await recusa(enviar(aluno, a1, 2));
    expect(semAcesso?.code).toBe("NOT_FOUND");

    await liberar(aluno, c.id);
    const incompleto = await recusa(
      comoAluno(aluno).questionario.responder({
        aulaId: a1.id,
        respostas: respostas(a1, 2).slice(0, 1),
        tentativaId: randomUUID() as TentativaId,
      })
    );
    expect(incompleto).toEqual({
      code: "BAD_REQUEST",
      message: "Falta responder 1 pergunta.",
    });
    const semQuestionario = await recusa(enviar(aluno, a2, 0));
    expect(semQuestionario).toEqual({
      code: "PRECONDITION_FAILED",
      message: "Esta aula não tem questionário.",
    });
    expect(await pontosDe(aluno)).toEqual([]);
    const tentativas = await db
      .select({ id: questionarioTentativa.id })
      .from(questionarioTentativa)
      .where(eq(questionarioTentativa.userId, aluno));
    expect(tentativas).toHaveLength(0);
  });

  test("o certificado sai se e só se a leitura de Meus cursos diz completo, com a reprovada antes da aprovada", async () => {
    const c = await plantarCurso([0, 2]);
    const [a1, a2] = c.aulas;
    if (!(a1 && a2)) {
      throw new Error("aulas não plantadas");
    }
    const alvo: CursoComAulas = {
      id: c.id,
      modulos: [
        {
          aulas: c.aulas.map((a) => ({
            id: a.id,
            perguntas: a.perguntas.length,
          })),
          numero: 1,
          titulo: "Módulo",
        },
      ],
      status: "publicado",
      titulo: `Curso ${c.slug}`,
    };
    const aluno = novoAluno();
    const lido = async () => {
      const leitura = lerCursoDoAluno(
        alvo,
        estudoDe(await linhasDoHistorico(db, aluno))
      );
      const certificados = await certificadosDe(aluno);
      return { certificados: certificados.length, completo: leitura.completo };
    };
    await liberar(aluno, c.id);
    await assistir(aluno, a1.id);
    await assistir(aluno, a2.id);

    const reprovada = await enviar(aluno, a2, 0);
    expect(reprovada.resultado.aprovada).toBe(false);
    expect(reprovada.cursoConcluido).toBeNull();
    expect(await lido()).toEqual({ certificados: 0, completo: false });

    const aprovada = await enviar(aluno, a2, 2);
    expect(aprovada.cursoConcluido?.codigo).toMatch(FORMATO_DO_CODIGO);
    expect(await lido()).toEqual({ certificados: 1, completo: true });
  });

  test("o último questionário aprovado, com as aulas assistidas, emite o certificado e os 100 pontos uma vez", async () => {
    const c = await plantarCurso([2, 1]);
    const [a1, a2] = c.aulas;
    if (!(a1 && a2)) {
      throw new Error("aulas não plantadas");
    }
    const aluno = novoAluno();
    await liberar(aluno, c.id);
    await assistir(aluno, a1.id);
    await assistir(aluno, a2.id);

    const painelAntes = await comoAluno(aluno).meusCursos.painel();
    expect(painelAntes.cursos[0]?.estado).toEqual({
      aprovados: 0,
      proximaAula: a1.id,
      tipo: "questionarios",
      total: 2,
    });

    const umaFalta = await enviar(aluno, a1, 2);
    expect(umaFalta.cursoConcluido).toBeNull();
    const fechou = await enviar(aluno, a2, 1);
    expect(fechou.cursoConcluido?.codigo).toMatch(FORMATO_DO_CODIGO);
    expect(await certificadosDe(aluno)).toEqual([
      { codigo: fechou.cursoConcluido?.codigo ?? "", cursoId: c.id },
    ]);
    expect(await pontosDe(aluno)).toEqual([
      { motivo: "questionario", pontos: 10 },
      { motivo: "questionario", pontos: 5 },
      { motivo: "curso_concluido", pontos: 100 },
    ]);

    const deNovo = await enviar(aluno, a2, 1);
    expect(deNovo.cursoConcluido).toBeNull();
    expect(await certificadosDe(aluno)).toHaveLength(1);
    const painel = await comoAluno(aluno).meusCursos.painel();
    expect(painel.cursos[0]?.estado.tipo).toBe("concluido");
  });

  test("a última aula assistida, com os questionários já aprovados, emite o certificado; o envio seguinte não emite outro", async () => {
    const c = await plantarCurso([1]);
    const [a1] = c.aulas;
    if (!a1) {
      throw new Error("aula não plantada");
    }
    const aluno = novoAluno();
    await liberar(aluno, c.id);
    const aprovado = await enviar(aluno, a1, 1);
    expect(aprovado.cursoConcluido).toBeNull();
    expect(await certificadosDe(aluno)).toHaveLength(0);

    const terco = (i: 0 | 1 | 2) =>
      registrar(
        db,
        aluno,
        a1.id,
        {
          posicaoSeg: (i + 1) * 180,
          trechos: [{ fim: (i + 1) * 180, inicio: i * 180 }],
        },
        em(i * 90)
      );
    await terco(0);
    await terco(1);
    const r = await terco(2);
    expect(r.assistida).toBe(true);
    expect(await certificadosDe(aluno)).toHaveLength(1);
    await terco(2);
    expect(await certificadosDe(aluno)).toHaveLength(1);
    // O registrar grava com o relógio do teste, e o responder com o de agora: a ordem não importa.
    expect((await pontosDe(aluno)).map((p) => p.motivo).toSorted()).toEqual([
      "aula_assistida",
      "curso_concluido",
      "questionario",
    ]);
  });

  test("a edição do admin que tira a pergunta pendente conclui o curso de quem já assistiu a tudo", async () => {
    const aulaId = randomUUID() as AulaId;
    const perguntaId = randomUUID() as PerguntaId;
    const documento: DocumentoDoCurso = {
      categoriaId,
      codigo: null,
      descricao: "",
      destaque: null,
      id: randomUUID() as CursoId,
      modulos: [
        {
          aulas: [
            {
              descricao: "",
              duracaoSeg: 600,
              id: aulaId,
              perguntas: [
                {
                  alternativas: [
                    {
                      certa: false,
                      id: randomUUID() as AlternativaId,
                      texto: "A",
                    },
                    {
                      certa: true,
                      id: randomUUID() as AlternativaId,
                      texto: "B",
                    },
                  ],
                  enunciado: "Pergunta",
                  id: perguntaId,
                },
              ],
              titulo: "Aula única",
              video: null,
            },
          ],
          id: randomUUID() as ModuloId,
          nivelOrdem: null,
          numero: 1,
          titulo: "Módulo",
        },
      ],
      niveis: [],
      precoTroca: null,
      status: "publicado",
      titulo: `Curso ${S} edição`,
      topicos: [],
      versao: null,
    };
    cursos.push(documento.id);
    const salvo = await admin.admin.catalogo.salvarCurso(
      formularioDoCurso(documento, new Blob([new Uint8Array([1])]))
    );
    const aluno = novoAluno();
    await liberar(aluno, documento.id);
    await assistir(aluno, aulaId);
    expect(await certificadosDe(aluno)).toHaveLength(0);

    const semPergunta: DocumentoDoCurso = {
      ...documento,
      modulos: documento.modulos.map((m) => ({
        ...m,
        aulas: m.aulas.map((a) => ({ ...a, perguntas: [] })),
      })),
      versao: salvo.versao,
    };
    await admin.admin.catalogo.salvarCurso(
      formularioDoCurso(semPergunta, null)
    );
    expect(await certificadosDe(aluno)).toEqual([
      {
        codigo: expect.stringMatching(FORMATO_DO_CODIGO),
        cursoId: documento.id,
      },
    ]);
  });

  test("a aula com tentativa não se apaga pelo editor, e a pergunta respondida sim, sem perder a aprovação", async () => {
    const aulaId = randomUUID() as AulaId;
    const p1 = randomUUID() as PerguntaId;
    const certa = randomUUID() as AlternativaId;
    const documento: DocumentoDoCurso = {
      categoriaId,
      codigo: null,
      descricao: "",
      destaque: null,
      id: randomUUID() as CursoId,
      modulos: [
        {
          aulas: [
            {
              descricao: "",
              duracaoSeg: 600,
              id: aulaId,
              perguntas: [
                {
                  alternativas: [
                    {
                      certa: false,
                      id: randomUUID() as AlternativaId,
                      texto: "A",
                    },
                    { certa: true, id: certa, texto: "B" },
                  ],
                  enunciado: "Pergunta",
                  id: p1,
                },
              ],
              titulo: "Aula com questionário",
              video: null,
            },
            {
              descricao: "",
              duracaoSeg: 600,
              id: randomUUID() as AulaId,
              perguntas: [],
              titulo: "Aula sem questionário",
              video: null,
            },
          ],
          id: randomUUID() as ModuloId,
          nivelOrdem: null,
          numero: 1,
          titulo: "Módulo",
        },
      ],
      niveis: [],
      precoTroca: null,
      status: "publicado",
      titulo: `Curso ${S} tentativa`,
      topicos: [],
      versao: null,
    };
    cursos.push(documento.id);
    const salvo = await admin.admin.catalogo.salvarCurso(
      formularioDoCurso(documento, new Blob([new Uint8Array([1])]))
    );
    const aluno = novoAluno();
    await liberar(aluno, documento.id);
    await comoAluno(aluno).questionario.responder({
      aulaId,
      respostas: [{ alternativaId: certa, perguntaId: p1 }],
      tentativaId: randomUUID() as TentativaId,
    });

    const [m] = documento.modulos;
    const semAAula: DocumentoDoCurso = {
      ...documento,
      modulos: m ? [{ ...m, aulas: m.aulas.slice(1) }] : [],
      versao: salvo.versao,
    };
    expect(
      await recusa(
        admin.admin.catalogo.salvarCurso(formularioDoCurso(semAAula, null))
      )
    ).toEqual({
      code: "PRECONDITION_FAILED",
      message:
        'O questionário da aula "Aula com questionário" já foi respondido por 1 aluno, e a aula não se apaga. Troque o vídeo ou o título dela.',
    });

    const semAPergunta: DocumentoDoCurso = {
      ...documento,
      modulos: documento.modulos.map((x) => ({
        ...x,
        aulas: x.aulas.map((a) => ({ ...a, perguntas: [] })),
      })),
      versao: salvo.versao,
    };
    await admin.admin.catalogo.salvarCurso(
      formularioDoCurso(semAPergunta, null)
    );
    const tentativas = await db.query.questionarioTentativa.findMany({
      columns: { aprovada: true },
      where: { userId: aluno },
      with: { respostas: { columns: { certa: true } } },
    });
    expect(tentativas).toEqual([{ aprovada: true, respostas: [] }]);
  });
});
