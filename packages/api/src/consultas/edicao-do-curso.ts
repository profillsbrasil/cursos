import type { Database } from "@cursos/db";
import {
  alternativa,
  aula,
  aulaAssistida,
  categoria,
  certificado,
  curso,
  liberacao,
  liberacaoDoPerfil,
  material,
  modulo,
  nivel,
  pergunta,
  questionarioTentativa,
} from "@cursos/db/schema/index";
import { and, count, eq, inArray, like, or, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

import type { Servicos } from "../context";
import type { ImagemDaCapa, RecusaDaCapa } from "../dominio/capa";
import { CATEGORIA_SUMIU } from "../dominio/categoria";
import { codigoLivre, siglaDaCategoria } from "../dominio/codigo-do-curso";
import {
  type DocumentoDoCurso,
  type EdicaoDoCurso,
  lerFormularioDoCurso,
  podeApagarCurso,
} from "../dominio/edicao-do-curso";
import { raizDoSlug, slugDoTitulo, slugLivre } from "../dominio/endereco";
import { LIMITES, PRECO_PARA_PUBLICAR } from "../dominio/limites-do-curso";
import { mensagemDoMaterial, type RecusaDoMaterial } from "../dominio/material";
import {
  type PlanoDeGravacao,
  planejarCurso,
  type RecusaDaEdicao,
  versaoDoCurso,
} from "../dominio/plano-do-curso";
import {
  type AlternativaId,
  type AulaId,
  type CategoriaId,
  type CursoId,
  capaDe,
  type MaterialId,
  type ModuloId,
  type PerguntaId,
  type Versao,
} from "../dominio/tipos";
import { videoDaAula } from "../dominio/video";
import { ErroParaAPessoa } from "../index";
import { concluirParaQuemCompletou } from "./certificado";
import { COLUNAS_DA_CAPA, type Executor, type Transacao } from "./comum";
import { CURSO_EM_USO, FK_VIOLADA, violacaoDe } from "./erros";
import { comTrava, travarTambem } from "./trava";

const TETO_FINAL = Math.max(LIMITES.numeroDeModulo, LIMITES.aulasPorModulo);

const LINHAS_POR_LOTE = 1000;

/**
 * O curso como o editor abre: documento (com versão), capa e uso. Quatro
 * statements em série, porque dentro da transação eles dividem um client. null
 * quando o id não existe.
 */
export async function abrirCurso(
  exec: Executor,
  id: CursoId
): Promise<EdicaoDoCurso | null> {
  const linha = await exec.query.curso.findFirst({
    columns: {
      ...COLUNAS_DA_CAPA,
      categoriaId: true,
      codigo: true,
      descricao: true,
      id: true,
      precoTroca: true,
      slug: true,
      status: true,
      titulo: true,
      topicos: true,
    },
    where: { id },
    with: {
      materiais: {
        columns: {
          bytes: true,
          chave: true,
          id: true,
          nomeDoArquivo: true,
          tipo: true,
          titulo: true,
        },
        orderBy: { posicao: "asc" },
      },
      modulos: {
        columns: { id: true, nivelOrdem: true, numero: true, titulo: true },
        orderBy: { numero: "asc" },
        with: {
          aulas: {
            columns: {
              descricao: true,
              duracaoSeg: true,
              id: true,
              titulo: true,
              videoId: true,
              videoProvedor: true,
            },
            orderBy: { posicao: "asc" },
            with: {
              perguntas: {
                columns: { enunciado: true, id: true },
                orderBy: { posicao: "asc" },
                with: {
                  alternativas: {
                    columns: { certa: true, id: true, texto: true },
                    orderBy: { posicao: "asc" },
                  },
                },
              },
            },
          },
        },
      },
      niveis: {
        columns: { nome: true, ordem: true },
        orderBy: { ordem: "asc" },
      },
    },
  });

  if (!linha) {
    return null;
  }

  const assistidas = await exec
    .select({ alunos: count(), aulaId: aulaAssistida.aulaId })
    .from(aulaAssistida)
    .innerJoin(aula, eq(aula.id, aulaAssistida.aulaId))
    .innerJoin(modulo, eq(modulo.id, aula.moduloId))
    .where(eq(modulo.cursoId, id))
    .groupBy(aulaAssistida.aulaId);

  const tentativas = await exec
    .select({
      alunos: sql<number>`count(distinct ${questionarioTentativa.userId})::int`,
      aulaId: questionarioTentativa.aulaId,
    })
    .from(questionarioTentativa)
    .innerJoin(aula, eq(aula.id, questionarioTentativa.aulaId))
    .innerJoin(modulo, eq(modulo.id, aula.moduloId))
    .where(eq(modulo.cursoId, id))
    .groupBy(questionarioTentativa.aulaId);

  const {
    rows: [contagens],
  } = await exec.execute<{ certificados: number; liberacoes: number }>(sql`
    select
      (select count(*)::int from ${certificado} where ${certificado.cursoId} = ${id}) as certificados,
      (select count(*)::int from ${liberacao} where ${liberacao.cursoId} = ${id})
        + (select count(*)::int from ${liberacaoDoPerfil} where ${liberacaoDoPerfil.cursoId} = ${id}) as liberacoes`);

  const semVersao: DocumentoDoCurso = {
    categoriaId: linha.categoriaId as CategoriaId,
    descricao: linha.descricao,
    id: linha.id as CursoId,
    materiais: linha.materiais.map((m) => ({
      ...m,
      id: m.id as MaterialId,
    })),
    modulos: linha.modulos.map((m) => ({
      aulas: m.aulas.map((a) => ({
        descricao: a.descricao,
        duracaoSeg: a.duracaoSeg,
        id: a.id as AulaId,
        perguntas: a.perguntas.map((p) => ({
          alternativas: p.alternativas.map((x) => ({
            certa: x.certa,
            id: x.id as AlternativaId,
            texto: x.texto,
          })),
          enunciado: p.enunciado,
          id: p.id as PerguntaId,
        })),
        titulo: a.titulo,
        video: videoDaAula(a.videoProvedor, a.videoId),
      })),
      id: m.id as ModuloId,
      nivelOrdem: m.nivelOrdem,
      numero: m.numero,
      titulo: m.titulo,
    })),
    niveis: linha.niveis,
    precoTroca: linha.precoTroca,
    status: linha.status,
    titulo: linha.titulo,
    topicos: linha.topicos,
    versao: null,
  };

  const uso = {
    assistidasPorAula: Object.fromEntries(
      assistidas.map((a) => [a.aulaId, a.alunos])
    ),
    certificados: contagens?.certificados ?? 0,
    liberacoes: contagens?.liberacoes ?? 0,
    tentativasPorAula: Object.fromEntries(
      tentativas.map((t) => [t.aulaId, t.alunos])
    ),
  };

  return {
    capa: capaDe(linha),
    codigo: linha.codigo,
    documento: {
      ...semVersao,
      versao: versaoDoCurso(semVersao, linha.capaUrl),
    },
    podeApagar: podeApagarCurso(uso),
    slug: linha.slug,
    uso,
  };
}

export interface CursoSalvo {
  cursoId: CursoId;
  slug: string;
  versao: Versao;
}

function erroDaEdicao(r: RecusaDaEdicao, cause?: unknown): ErroParaAPessoa {
  switch (r.tipo) {
    case "versao_mudou":
      return new ErroParaAPessoa({
        cause,
        code: "CONFLICT",
        message:
          "Outra pessoa salvou este curso depois que você abriu. Recarregue para ver a versão nova.",
        motivo: "versao_mudou",
      });
    case "sumiu":
      return new ErroParaAPessoa({
        cause,
        code: "NOT_FOUND",
        message: "Este curso foi apagado enquanto você editava.",
      });
    case "sem_capa":
      return new ErroParaAPessoa({
        cause,
        code: "PRECONDITION_FAILED",
        message: "Curso novo precisa de capa.",
      });
    case "aula_assistida":
      return new ErroParaAPessoa({
        cause,
        code: "PRECONDITION_FAILED",
        message: `A aula "${r.titulo}" já foi assistida por ${r.alunos} ${r.alunos === 1 ? "aluno" : "alunos"} e não se apaga. Troque o vídeo ou o título dela.`,
      });
    case "questionario_respondido":
      return new ErroParaAPessoa({
        cause,
        code: "PRECONDITION_FAILED",
        message: `O questionário da aula "${r.titulo}" já foi respondido por ${r.alunos} ${r.alunos === 1 ? "aluno" : "alunos"}, e a aula não se apaga. Troque o vídeo ou o título dela.`,
      });
    default: {
      const nenhuma: never = r;
      throw new Error(`Recusa sem mensagem: ${JSON.stringify(nenhuma)}`);
    }
  }
}

function erroDaCapa(r: RecusaDaCapa): ErroParaAPessoa {
  return new ErroParaAPessoa({
    code: "PRECONDITION_FAILED",
    message: mensagemDaCapa(r),
  });
}

function mensagemDaCapa(r: RecusaDaCapa): string {
  switch (r.tipo) {
    case "desligado":
      return "O envio de capa não está configurado neste ambiente.";
    case "enorme":
      return `A capa passa de ${r.ladoMaximo} px num dos lados.`;
    case "estreita":
      return `A capa precisa de pelo menos ${r.larguraMinima} px de largura.`;
    case "formato":
      return "A capa precisa ser JPG, PNG ou WebP.";
    case "pesada":
      return `A capa passa de ${r.limiteMb} MB. Exporte com mais compressão.`;
    default: {
      const nenhuma: never = r;
      throw new Error(
        `Recusa de capa sem mensagem: ${JSON.stringify(nenhuma)}`
      );
    }
  }
}

/** Recusa do envio de material; sai como PRECONDITION_FAILED, que a tela mostra. */
export function erroDoMaterial(r: RecusaDoMaterial): ErroParaAPessoa {
  return new ErroParaAPessoa({
    code: "PRECONDITION_FAILED",
    message: mensagemDoMaterial(r),
  });
}

async function exigirMateriaisNoBucket(
  s: Pick<Servicos, "db" | "materiais">,
  documento: DocumentoDoCurso
) {
  if (documento.materiais.length === 0) {
    return;
  }

  const doCurso = await s.db
    .select({ chave: material.chave })
    .from(material)
    .where(eq(material.cursoId, documento.id));

  const conhecidas = new Set(doCurso.map((m) => m.chave));
  const novos = documento.materiais.filter((m) => !conhecidas.has(m.chave));

  const existem = await Promise.all(
    novos.map((m) => s.materiais.existe(m.chave))
  );

  const sumido = novos.find((_, i) => !existem[i]);

  if (sumido) {
    throw new ErroParaAPessoa({
      code: "PRECONDITION_FAILED",
      message: `O arquivo "${sumido.nomeDoArquivo}" não chegou ao armazenamento. Tire da lista e envie de novo.`,
    });
  }
}

async function exigirCategoria(tx: Transacao, id: CategoriaId) {
  const [alvo] = await tx
    .select({ nome: categoria.nome })
    .from(categoria)
    .where(eq(categoria.id, id))
    .for("key share");

  if (!alvo) {
    throw new ErroParaAPessoa({ code: "NOT_FOUND", message: CATEGORIA_SUMIU });
  }

  return alvo;
}

async function slugParaCursoNovo(tx: Transacao, titulo: string) {
  const base = slugDoTitulo(titulo);
  await travarTambem(tx, `slug:${raizDoSlug(base)}`);

  const ocupados = await tx
    .select({ slug: curso.slug })
    .from(curso)
    .where(or(eq(curso.slug, base), like(curso.slug, `${base}-%`)));

  return slugLivre(base, new Set(ocupados.map((c) => c.slug)));
}

async function codigoParaCursoNovo(tx: Transacao, nomeDaCategoria: string) {
  const sigla = siglaDaCategoria(nomeDaCategoria);
  await travarTambem(tx, `codigo:${sigla}`);

  const ocupados = await tx
    .select({ codigo: curso.codigo })
    .from(curso)
    .where(like(curso.codigo, `${sigla}-%`));

  return codigoLivre(sigla, new Set(ocupados.map((c) => c.codigo)));
}

interface IdentidadeDoCursoNovo {
  codigo: string;
  slug: string;
}

// WARNING: em série e nesta ordem, toda criação pega a trava do slug antes da do código.
async function identidadeDoCursoNovo(
  tx: Transacao,
  titulo: string,
  nomeDaCategoria: string
): Promise<IdentidadeDoCursoNovo> {
  const slug = await slugParaCursoNovo(tx, titulo);
  const codigo = await codigoParaCursoNovo(tx, nomeDaCategoria);

  return { codigo, slug };
}

const FK_DO_ALUNO: ReadonlySet<string> = new Set([
  "aula_assistida_aula_id_aula_id_fkey",
  "questionario_tentativa_aula_id_aula_id_fkey",
]);

/**
 * admin.catalogo.salvarCurso. A capa sobe antes da transação (rede); objeto que
 * sobe e não chega a ser gravado fica no bucket, e reenviar reusa o mesmo nome.
 * A trava curso:<id> serializa dois salvamentos do mesmo curso, inclusive a
 * criação repetida, sem bloquear troca nem registro de aula.
 */
export async function salvarCurso(
  s: Pick<Servicos, "capas" | "db" | "materiais">,
  formulario: FormData,
  agora = new Date()
): Promise<CursoSalvo> {
  const lido = lerFormularioDoCurso(formulario);

  if (lido.tipo === "invalido") {
    throw new ErroParaAPessoa({ code: "BAD_REQUEST", message: lido.mensagem });
  }

  const recebida = lido.capa ? await s.capas.receber(lido.capa) : null;

  if (recebida?.tipo === "recusa") {
    throw erroDaCapa(recebida.recusa);
  }

  const { documento } = lido;

  if (documento.status === "publicado" && documento.precoTroca === null) {
    throw new ErroParaAPessoa({
      code: "PRECONDITION_FAILED",
      message: `${PRECO_PARA_PUBLICAR} Defina o preço de troca ou salve em produção.`,
    });
  }

  await exigirMateriaisNoBucket(s, documento);
  const capa = recebida?.imagem ?? null;

  try {
    return await comTrava(s.db, `curso:${documento.id}`, async (tx) => {
      const atual = await abrirCurso(tx, documento.id);
      const categoriaDoCurso = await exigirCategoria(tx, documento.categoriaId);
      const plano = planejarCurso(atual, documento, capa);

      if (plano.tipo === "recusa") {
        throw erroDaEdicao(plano.recusa);
      }

      const novo =
        plano.tipo === "criar"
          ? await identidadeDoCursoNovo(
              tx,
              documento.titulo,
              categoriaDoCurso.nome
            )
          : null;

      const slug = novo?.slug ?? atual?.slug;

      if (!slug) {
        throw new Error(`Curso ${documento.id} salvo sem endereço.`);
      }

      if (plano.tipo !== "nada_mudou") {
        await gravarCurso(tx, plano, novo);
      }

      if (
        plano.tipo === "atualizar" &&
        (plano.apagar.aulas.length > 0 || plano.apagar.perguntas.length > 0)
      ) {
        await concluirParaQuemCompletou(tx, documento.id, agora);
      }

      return { cursoId: documento.id, slug, versao: plano.versao };
    });
  } catch (erro) {
    if (FK_DO_ALUNO.has(violacaoDe(erro)?.restricao ?? "")) {
      const plano = planejarCurso(
        await abrirCurso(s.db, documento.id),
        documento,
        capa
      );

      if (plano.tipo === "recusa") {
        throw erroDaEdicao(plano.recusa, erro);
      }
    }

    throw erro;
  }
}

const altDaCapa = (titulo: string) => `Capa do curso ${titulo}`;

const colunasDaCapa = (c: ImagemDaCapa) => ({
  capaAltura: c.altura,
  capaLargura: c.largura,
  capaUrl: c.url,
});

const proposto = (coluna: AnyPgColumn) =>
  sql`excluded.${sql.identifier(coluna.name)}`;

const umDe = (coluna: AnyPgColumn, ids: readonly string[]) =>
  sql`${coluna} = any(${`{${ids.join(",")}}`}::uuid[])`;

const deslocado = (tabela: PgTable, coluna: AnyPgColumn, filtro: SQL) =>
  sql`${coluna} + (select greatest(max(${coluna}), ${TETO_FINAL}) + 1 from ${tabela} where ${filtro})`;

function lotes<T>(lista: readonly T[], tamanho: number): T[][] {
  return Array.from({ length: Math.ceil(lista.length / tamanho) }, (_, i) =>
    lista.slice(i * tamanho, (i + 1) * tamanho)
  );
}

// WARNING: a ordem dos statements de gravarCurso é a única defesa dos uniques não deferrable; não reordene.
async function gravarCurso(
  tx: Transacao,
  plano: PlanoDeGravacao,
  novo: IdentidadeDoCursoNovo | null
) {
  const { documento: d } = plano;
  const cursoId = d.id;

  const campos = {
    capaAlt: altDaCapa(d.titulo),
    categoriaId: d.categoriaId,
    descricao: d.descricao,
    precoTroca: d.precoTroca,
    status: d.status,
    titulo: d.titulo,
    topicos: d.topicos,
  };

  const doCurso = eq(modulo.cursoId, cursoId);

  const nosModulosDoCurso = inArray(
    aula.moduloId,
    tx.select({ id: modulo.id }).from(modulo).where(doCurso)
  );

  const nasAulasDoCurso = inArray(
    pergunta.aulaId,
    tx.select({ id: aula.id }).from(aula).where(nosModulosDoCurso)
  );

  const nasPerguntasDoCurso = inArray(
    alternativa.perguntaId,
    tx.select({ id: pergunta.id }).from(pergunta).where(nasAulasDoCurso)
  );

  if (plano.tipo === "criar") {
    if (!novo) {
      throw new Error(`Curso ${cursoId} criado sem endereço nem código.`);
    }

    await tx.insert(curso).values({
      ...campos,
      ...colunasDaCapa(plano.capa),
      ...novo,
      id: cursoId,
    });
  } else {
    await tx
      .update(curso)
      .set({ ...campos, ...(plano.capa && colunasDaCapa(plano.capa)) })
      .where(eq(curso.id, cursoId));
  }

  if (d.niveis.length > 0) {
    await tx
      .insert(nivel)
      .values(d.niveis.map((n) => ({ ...n, cursoId })))
      .onConflictDoUpdate({
        set: { nome: proposto(nivel.nome) },
        target: [nivel.cursoId, nivel.ordem],
      });
  }

  if (plano.tipo === "atualizar") {
    if (plano.apagar.aulas.length > 0) {
      await tx.delete(aula).where(umDe(aula.id, plano.apagar.aulas));
    }

    await tx
      .update(modulo)
      .set({ numero: deslocado(modulo, modulo.numero, doCurso) })
      .where(doCurso);
    await tx
      .update(aula)
      .set({ posicao: deslocado(aula, aula.posicao, nosModulosDoCurso) })
      .where(nosModulosDoCurso);
  }

  if (d.modulos.length > 0) {
    const gravados = await tx
      .insert(modulo)
      .values(
        d.modulos.map((m) => ({
          cursoId,
          id: m.id,
          nivelOrdem: m.nivelOrdem,
          numero: m.numero,
          titulo: m.titulo,
        }))
      )
      .onConflictDoUpdate({
        set: {
          nivelOrdem: proposto(modulo.nivelOrdem),
          numero: proposto(modulo.numero),
          titulo: proposto(modulo.titulo),
        },
        setWhere: sql`${modulo.cursoId} = ${proposto(modulo.cursoId)}`,
        target: modulo.id,
      })
      .returning({ id: modulo.id });

    if (gravados.length !== d.modulos.length) {
      throw new Error("O documento traz módulo de outro curso.");
    }
  }

  const aulas = d.modulos.flatMap((m) =>
    m.aulas.map((a, i) => ({
      descricao: a.descricao,
      duracaoSeg: a.duracaoSeg,
      id: a.id,
      moduloId: m.id,
      posicao: i + 1,
      titulo: a.titulo,
      videoId: a.video?.id ?? null,
      videoProvedor: a.video?.provedor ?? null,
    }))
  );

  for (const lote of lotes(aulas, LINHAS_POR_LOTE)) {
    // oxlint-disable-next-line no-await-in-loop -- os lotes dividem a transação, um client só.
    const gravadas = await tx
      .insert(aula)
      .values(lote)
      .onConflictDoUpdate({
        set: {
          descricao: proposto(aula.descricao),
          duracaoSeg: proposto(aula.duracaoSeg),
          moduloId: proposto(aula.moduloId),
          posicao: proposto(aula.posicao),
          titulo: proposto(aula.titulo),
          videoId: proposto(aula.videoId),
          videoProvedor: proposto(aula.videoProvedor),
        },
        setWhere: nosModulosDoCurso,
        target: aula.id,
      })
      .returning({ id: aula.id });

    if (gravadas.length !== lote.length) {
      throw new Error("O documento traz aula de outro curso.");
    }
  }

  await gravarQuestionario(tx, plano, nasAulasDoCurso, nasPerguntasDoCurso);

  if (plano.tipo === "atualizar") {
    if (plano.apagar.modulos.length > 0) {
      await tx.delete(modulo).where(umDe(modulo.id, plano.apagar.modulos));
    }

    if (plano.apagar.niveis.length > 0) {
      await tx
        .delete(nivel)
        .where(
          and(
            eq(nivel.cursoId, cursoId),
            inArray(nivel.ordem, [...plano.apagar.niveis])
          )
        );
    }
  }

  await gravarMateriais(tx, plano);
}

async function gravarMateriais(tx: Transacao, plano: PlanoDeGravacao) {
  const { documento: d } = plano;
  const doCurso = eq(material.cursoId, d.id);

  if (plano.tipo === "atualizar") {
    if (plano.apagar.materiais.length > 0) {
      await tx
        .delete(material)
        .where(umDe(material.id, plano.apagar.materiais));
    }

    await tx
      .update(material)
      .set({ posicao: deslocado(material, material.posicao, doCurso) })
      .where(doCurso);
  }

  if (d.materiais.length === 0) {
    return;
  }

  const gravados = await tx
    .insert(material)
    .values(
      d.materiais.map((m, i) => ({
        bytes: m.bytes,
        chave: m.chave,
        cursoId: d.id,
        id: m.id,
        nomeDoArquivo: m.nomeDoArquivo,
        posicao: i + 1,
        tipo: m.tipo,
        titulo: m.titulo,
      }))
    )
    .onConflictDoUpdate({
      set: {
        bytes: proposto(material.bytes),
        chave: proposto(material.chave),
        nomeDoArquivo: proposto(material.nomeDoArquivo),
        posicao: proposto(material.posicao),
        tipo: proposto(material.tipo),
        titulo: proposto(material.titulo),
      },
      setWhere: sql`${material.cursoId} = ${proposto(material.cursoId)}`,
      target: material.id,
    })
    .returning({ id: material.id });

  if (gravados.length !== d.materiais.length) {
    throw new Error("O documento traz material de outro curso.");
  }
}

async function gravarQuestionario(
  tx: Transacao,
  plano: PlanoDeGravacao,
  nasAulasDoCurso: SQL,
  nasPerguntasDoCurso: SQL
) {
  const { documento: d } = plano;

  if (plano.tipo === "atualizar") {
    if (plano.apagar.perguntas.length > 0) {
      await tx
        .delete(pergunta)
        .where(umDe(pergunta.id, plano.apagar.perguntas));
    }

    if (plano.apagar.alternativas.length > 0) {
      await tx
        .delete(alternativa)
        .where(umDe(alternativa.id, plano.apagar.alternativas));
    }

    await tx
      .update(pergunta)
      .set({ posicao: deslocado(pergunta, pergunta.posicao, nasAulasDoCurso) })
      .where(nasAulasDoCurso);
    await tx
      .update(alternativa)
      .set({
        certa: false,
        posicao: deslocado(
          alternativa,
          alternativa.posicao,
          nasPerguntasDoCurso
        ),
      })
      .where(nasPerguntasDoCurso);
  }

  const perguntas = d.modulos.flatMap((m) =>
    m.aulas.flatMap((a) =>
      a.perguntas.map((p, i) => ({
        aulaId: a.id,
        enunciado: p.enunciado,
        id: p.id,
        posicao: i + 1,
      }))
    )
  );

  for (const lote of lotes(perguntas, LINHAS_POR_LOTE)) {
    // oxlint-disable-next-line no-await-in-loop -- os lotes dividem a transação, um client só.
    const gravadas = await tx
      .insert(pergunta)
      .values(lote)
      .onConflictDoUpdate({
        set: {
          aulaId: proposto(pergunta.aulaId),
          enunciado: proposto(pergunta.enunciado),
          posicao: proposto(pergunta.posicao),
        },
        setWhere: nasAulasDoCurso,
        target: pergunta.id,
      })
      .returning({ id: pergunta.id });

    if (gravadas.length !== lote.length) {
      throw new Error("O documento traz pergunta de outro curso.");
    }
  }

  const alternativas = d.modulos.flatMap((m) =>
    m.aulas.flatMap((a) =>
      a.perguntas.flatMap((p) =>
        p.alternativas.map((x, i) => ({
          certa: x.certa,
          id: x.id,
          perguntaId: p.id,
          posicao: i + 1,
          texto: x.texto,
        }))
      )
    )
  );

  for (const lote of lotes(alternativas, LINHAS_POR_LOTE)) {
    // oxlint-disable-next-line no-await-in-loop -- os lotes dividem a transação, um client só.
    const gravadas = await tx
      .insert(alternativa)
      .values(lote)
      .onConflictDoUpdate({
        set: {
          certa: proposto(alternativa.certa),
          perguntaId: proposto(alternativa.perguntaId),
          posicao: proposto(alternativa.posicao),
          texto: proposto(alternativa.texto),
        },
        setWhere: nasPerguntasDoCurso,
        target: alternativa.id,
      })
      .returning({ id: alternativa.id });

    if (gravadas.length !== lote.length) {
      throw new Error("O documento traz alternativa de outro curso.");
    }
  }
}

/**
 * admin.catalogo.apagarCurso. Níveis, módulos, aulas e comunicados do curso caem
 * em cascade. Id que não existe: { apagado: false }, sem erro.
 */
export async function apagarCurso(
  db: Database,
  id: CursoId
): Promise<{ apagado: boolean }> {
  try {
    return await comTrava(db, `curso:${id}`, async (tx) => {
      const atual = await abrirCurso(tx, id);

      if (!atual) {
        return { apagado: false };
      }

      if (!atual.podeApagar) {
        throw new ErroParaAPessoa({
          code: "PRECONDITION_FAILED",
          message: CURSO_EM_USO,
        });
      }

      await tx.delete(curso).where(eq(curso.id, id));

      return { apagado: true };
    });
  } catch (erro) {
    if (FK_VIOLADA.has(violacaoDe(erro)?.codigo ?? "")) {
      throw new ErroParaAPessoa({
        cause: erro,
        code: "PRECONDITION_FAILED",
        message: CURSO_EM_USO,
      });
    }

    throw erro;
  }
}
