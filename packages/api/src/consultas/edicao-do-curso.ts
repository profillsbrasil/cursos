// Único escritor de curso, nivel, modulo e aula no app (o seed só planta árvores
// novas). A ordem de gravarCurso é o único lugar que conhece os uniques não
// deferrable modulo_numero_unico e aula_posicao_unica.

import type { Database } from "@cursos/db";
import {
  aula,
  aulaAssistida,
  certificado,
  curso,
  liberacao,
  modulo,
  nivel,
} from "@cursos/db/schema/index";
import { and, count, eq, inArray, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

import type { Servicos } from "../context";
import type { ImagemDaCapa, RecusaDaCapa } from "../dominio/capa";
import {
  type DocumentoDoCurso,
  type EdicaoDoCurso,
  LIMITES,
  lerFormularioDoCurso,
  podeApagarCurso,
} from "../dominio/edicao-do-curso";
import {
  type PlanoDeGravacao,
  planejarCurso,
  type RecusaDaEdicao,
  versaoDoCurso,
} from "../dominio/plano-do-curso";
import {
  type AulaId,
  type CursoId,
  capaDe,
  type ModuloId,
  type TrilhaId,
  type Versao,
} from "../dominio/tipos";
import { videoDaAula } from "../dominio/video";
import { ErroParaAPessoa } from "../index";
import { COLUNAS_DA_CAPA, type Executor, type Transacao } from "./comum";
import { CURSO_EM_USO, violacaoDe } from "./erros";
import { comTrava } from "./trava";

/**
 * Teto dos valores finais. O deslocamento de cada regravação é
 * greatest(max(valor atual do curso), TETO_FINAL) + 1: maior que qualquer valor
 * antigo e que qualquer valor final. A soma fica abaixo de 2000, longe do teto
 * do smallint.
 */
const TETO_FINAL = Math.max(LIMITES.numeroDeModulo, LIMITES.aulasPorModulo);

/** Aulas por INSERT: 7 colunas vezes 1000 fica longe dos 65535 parâmetros do Postgres. */
const AULAS_POR_LOTE = 1000;

/**
 * O curso como o editor abre: documento (com versão), capa e uso. Três
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
      codigo: true,
      destaque: true,
      id: true,
      precoTroca: true,
      slug: true,
      status: true,
      tema: true,
      titulo: true,
    },
    where: { id },
    with: {
      modulos: {
        columns: { id: true, nivelOrdem: true, numero: true, titulo: true },
        orderBy: { numero: "asc" },
        with: {
          aulas: {
            columns: {
              duracaoSeg: true,
              id: true,
              titulo: true,
              videoId: true,
              videoProvedor: true,
            },
            orderBy: { posicao: "asc" },
          },
        },
      },
      naTrilha: {
        columns: {},
        with: { trilha: { columns: { id: true, titulo: true } } },
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
  const {
    rows: [contagens],
  } = await exec.execute<{ certificados: number; liberacoes: number }>(sql`
    select
      (select count(*)::int from ${certificado} where ${certificado.cursoId} = ${id}) as certificados,
      (select count(*)::int from ${liberacao} where ${liberacao.cursoId} = ${id}) as liberacoes`);

  const semVersao: DocumentoDoCurso = {
    capaAlt: linha.capaAlt,
    codigo: linha.codigo,
    destaque: linha.destaque,
    id: linha.id as CursoId,
    modulos: linha.modulos.map((m) => ({
      aulas: m.aulas.map((a) => ({
        duracaoSeg: a.duracaoSeg,
        id: a.id as AulaId,
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
    slug: linha.slug,
    status: linha.status,
    tema: linha.tema,
    titulo: linha.titulo,
    versao: null,
  };
  const trilha = linha.naTrilha?.trilha;
  const uso = {
    assistidasPorAula: Object.fromEntries(
      assistidas.map((a) => [a.aulaId, a.alunos])
    ),
    certificados: contagens?.certificados ?? 0,
    liberacoes: contagens?.liberacoes ?? 0,
    trilha: trilha
      ? { id: trilha.id as TrilhaId, titulo: trilha.titulo }
      : null,
  };
  return {
    capa: capaDe(linha),
    documento: {
      ...semVersao,
      versao: versaoDoCurso(semVersao, linha.capaUrl),
    },
    podeApagar: podeApagarCurso(uso),
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
    default: {
      const nenhuma: never = r;
      throw new Error(`Recusa sem mensagem: ${JSON.stringify(nenhuma)}`);
    }
  }
}

/** Todas saem como PRECONDITION_FAILED, um dos códigos cuja mensagem a tela mostra. */
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

/**
 * admin.catalogo.salvarCurso. A capa sobe antes da transação (rede); objeto que
 * sobe e não chega a ser gravado fica no bucket, e reenviar reusa o mesmo nome.
 * A trava curso:<id> serializa dois salvamentos do mesmo curso, inclusive a
 * criação repetida, sem bloquear troca nem registro de aula.
 */
export async function salvarCurso(
  s: Pick<Servicos, "capas" | "db">,
  formulario: FormData
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
  const capa = recebida?.imagem ?? null;
  try {
    return await comTrava(s.db, `curso:${documento.id}`, async (tx) => {
      const atual = await abrirCurso(tx, documento.id);
      const plano = planejarCurso(atual, documento, capa);
      if (plano.tipo === "recusa") {
        throw erroDaEdicao(plano.recusa);
      }
      if (plano.tipo !== "nada_mudou") {
        await gravarCurso(tx, plano);
      }
      return {
        cursoId: documento.id,
        slug: documento.slug,
        versao: plano.versao,
      };
    });
  } catch (erro) {
    // O aluno não pega a trava do curso: a aula assistida que entra entre a conta
    // e o DELETE para no FK restrict. O plano refeito já conta essa aula.
    if (violacaoDe(erro)?.restricao === "aula_assistida_aula_id_aula_id_fkey") {
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

const colunasDaCapa = (c: ImagemDaCapa) => ({
  capaAltura: c.altura,
  capaLargura: c.largura,
  capaUrl: c.url,
});

/** O valor que o INSERT propôs, no SET de um upsert. */
const proposto = (coluna: AnyPgColumn) =>
  sql`excluded.${sql.identifier(coluna.name)}`;

/** Lista de uuid como um parâmetro só, de qualquer tamanho. */
const umDe = (coluna: AnyPgColumn, ids: readonly string[]) =>
  sql`${coluna} = any(${`{${ids.join(",")}}`}::uuid[])`;

/**
 * Soma a todas as linhas do filtro o mesmo deslocamento, que leva cada valor para
 * acima do maior valor antigo: o UPDATE não colide no meio, mesmo com o unique
 * conferido linha a linha.
 */
const deslocado = (tabela: PgTable, coluna: AnyPgColumn, filtro: SQL) =>
  sql`${coluna} + (select greatest(max(${coluna}), ${TETO_FINAL}) + 1 from ${tabela} where ${filtro})`;

function lotes<T>(lista: readonly T[], tamanho: number): T[][] {
  return Array.from({ length: Math.ceil(lista.length / tamanho) }, (_, i) =>
    lista.slice(i * tamanho, (i + 1) * tamanho)
  );
}

/**
 * Escreve o estado final do documento em statements de ordem fixa:
 *
 *   1. curso: INSERT ou UPDATE; as colunas da capa só com imagem nova.
 *   2. níveis: upsert por (curso_id, ordem).
 *   3. aulas que saem: DELETE. A posição delas cai em cascade; aula assistida
 *      segura (o planejador já recusou, o banco confirma).
 *   4. todos os módulos do curso: numero + deslocamento.
 *   5. todas as aulas do curso: posicao + deslocamento.
 *   6. módulos: upsert por id com o número final.
 *   7. aulas: upsert por id com módulo e posição finais, em lotes. Aula que troca
 *      de módulo muda aqui e mantém o id.
 *   8. módulos que saem: DELETE (já vazios depois dos passos 3 e 7).
 *   9. níveis que saem: DELETE (nenhum módulo aponta para eles depois do passo 6).
 *
 * Depois dos passos 4 e 5, todo valor antigo fica acima de TETO_FINAL e todo
 * valor final abaixo dele, então o upsert não colide com linha nova nem mantida.
 * Os finais são únicos porque o schema recusa número de módulo repetido e a
 * posição da aula é o índice. O upsert só atualiza linha deste curso: id de outro
 * curso volta fora do returning, e a contagem recusa o documento inteiro.
 */
async function gravarCurso(tx: Transacao, plano: PlanoDeGravacao) {
  const { documento: d } = plano;
  const cursoId = d.id;
  const campos = {
    capaAlt: d.capaAlt,
    codigo: d.codigo,
    destaque: d.destaque,
    precoTroca: d.precoTroca,
    slug: d.slug,
    status: d.status,
    tema: d.tema,
    titulo: d.titulo,
  };
  const doCurso = eq(modulo.cursoId, cursoId);
  const nosModulosDoCurso = inArray(
    aula.moduloId,
    tx.select({ id: modulo.id }).from(modulo).where(doCurso)
  );

  if (plano.tipo === "criar") {
    await tx
      .insert(curso)
      .values({ ...campos, ...colunasDaCapa(plano.capa), id: cursoId });
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
      duracaoSeg: a.duracaoSeg,
      id: a.id,
      moduloId: m.id,
      posicao: i + 1,
      titulo: a.titulo,
      videoId: a.video?.id ?? null,
      videoProvedor: a.video?.provedor ?? null,
    }))
  );
  for (const lote of lotes(aulas, AULAS_POR_LOTE)) {
    // biome-ignore lint/performance/noAwaitInLoops: os lotes dividem a transação, um client só.
    const gravadas = await tx
      .insert(aula)
      .values(lote)
      .onConflictDoUpdate({
        set: {
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
    // O aluno não pega a trava do curso: uma aula assistida, liberação ou
    // certificado que entra depois da conta de uso para no FK restrict.
    if (violacaoDe(erro)?.codigo === "23503") {
      // biome-ignore lint/style/useErrorCause: o ErroParaAPessoa leva a causa nas opções, como abaixo.
      throw new ErroParaAPessoa({
        cause: erro,
        code: "PRECONDITION_FAILED",
        message: CURSO_EM_USO,
      });
    }
    throw erro;
  }
}
