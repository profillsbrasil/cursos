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
import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, sql } from "drizzle-orm";

import type { Servicos } from "../context";
import {
  type DocumentoDoCurso,
  type EdicaoDoCurso,
  LIMITES,
  lerFormularioDoCurso,
  type Plano,
  planejarCurso,
  podeApagarCurso,
  type RecusaDaEdicao,
} from "../dominio/edicao-do-curso";
import {
  type AulaId,
  type CursoId,
  capaDe,
  type ModuloId,
  type TrilhaId,
  type Versao,
} from "../dominio/tipos";
import { versaoDe } from "../dominio/versao";
import { videoDaAula } from "../dominio/video";
import type { ImagemDaCapa, RecusaDaCapa } from "../externos/capas";
import { COLUNAS_DA_CAPA, type Executor, type Transacao } from "./comum";
import { CURSO_EM_USO } from "./erros";
import { comTrava } from "./trava";

/**
 * Teto dos valores finais. O deslocamento de cada regravação é
 * greatest(max(valor atual do curso), TETO_FINAL) + 1: maior que qualquer valor
 * antigo e que qualquer valor final. A soma fica abaixo de 2000, longe do teto
 * do smallint.
 */
const TETO_FINAL = Math.max(LIMITES.numeroDeModulo, LIMITES.aulasPorModulo);

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
    documento: { ...semVersao, versao: versaoDe(semVersao) },
    podeApagar: podeApagarCurso(uso),
    uso,
  };
}

export interface CursoSalvo {
  cursoId: CursoId;
  slug: string;
  versao: Versao;
}

function erroDaEdicao(r: RecusaDaEdicao): TRPCError {
  switch (r.tipo) {
    case "versao_mudou":
      return new TRPCError({
        code: "CONFLICT",
        message:
          "Outra pessoa salvou este curso depois que você abriu. Recarregue para ver a versão nova.",
      });
    case "sumiu":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "Este curso foi apagado enquanto você editava.",
      });
    case "sem_capa":
      return new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Curso novo precisa de capa.",
      });
    case "aula_assistida":
      return new TRPCError({
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
export function erroDaCapa(r: RecusaDaCapa): TRPCError {
  return new TRPCError({
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
    throw new TRPCError({ code: "BAD_REQUEST", message: lido.mensagem });
  }
  const recebida = lido.capa ? await s.capas.receber(lido.capa) : null;
  if (recebida?.tipo === "recusa") {
    throw erroDaCapa(recebida.recusa);
  }
  const imagem = recebida?.imagem ?? null;
  const { documento } = lido;
  return comTrava(s.db, `curso:${documento.id}`, async (tx) => {
    const atual = await abrirCurso(tx, documento.id);
    const plano = planejarCurso(atual, documento, imagem !== null);
    switch (plano.tipo) {
      case "recusa":
        throw erroDaEdicao(plano.recusa);
      case "nada_mudou":
        return {
          cursoId: documento.id,
          slug: documento.slug,
          versao: versaoDe(documento),
        };
      case "gravar":
        await gravarCurso(tx, plano, imagem);
        return {
          cursoId: documento.id,
          slug: documento.slug,
          versao: versaoDe(documento),
        };
      default: {
        const nenhum: never = plano;
        throw new Error(`Plano sem gravação: ${JSON.stringify(nenhum)}`);
      }
    }
  });
}

/** Linhas como jsonb_to_recordset as lê: um parâmetro só, qualquer tamanho. */
const registros = (linhas: readonly object[]) =>
  sql`jsonb_to_recordset(${JSON.stringify(linhas)}::jsonb)`;

/**
 * Escreve o estado final do documento em no máximo onze statements de ordem fixa:
 *
 *   1. curso: INSERT ou UPDATE; as colunas da capa só com imagem nova.
 *   2. níveis: upsert por (curso_id, ordem).
 *   3. aulas que saem: DELETE. A posição delas cai em cascade; aula assistida
 *      segura (o planejador já recusou, o banco confirma).
 *   4. todos os módulos do curso: numero + deslocamento.
 *   5. módulos novos: INSERT com o número final.
 *   6. módulos mantidos: número final, título, nível.
 *   7. todas as aulas do curso: posicao + deslocamento.
 *   8. aulas mantidas: módulo, posição final, título, duração, vídeo. Aula que
 *      troca de módulo muda aqui e mantém o id.
 *   9. aulas novas: INSERT com a posição final.
 *  10. módulos que saem: DELETE (já vazios depois dos passos 3 e 8).
 *  11. níveis que saem: DELETE (nenhum módulo aponta para eles depois do passo 6).
 *
 * Somar o mesmo deslocamento a todas as linhas leva cada valor para acima do
 * maior valor antigo, então o UPDATE não colide no meio, mesmo com o unique
 * conferido linha a linha. Depois, todo valor antigo fica acima de TETO_FINAL e
 * todo valor final abaixo dele. Os finais são únicos porque o schema recusa número
 * de módulo repetido e a posição da aula é o índice.
 */
async function gravarCurso(
  tx: Transacao,
  plano: Extract<Plano, { tipo: "gravar" }>,
  capa: ImagemDaCapa | null
): Promise<void> {
  const { apagar, documento: d, novos } = plano;
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
  const colunasDaCapa = capa
    ? { capaAltura: capa.altura, capaLargura: capa.largura, capaUrl: capa.url }
    : null;

  if (plano.criar) {
    if (!colunasDaCapa) {
      throw new Error("Curso novo chegou à gravação sem capa.");
    }
    await tx.insert(curso).values({ ...campos, ...colunasDaCapa, id: cursoId });
  } else {
    await tx
      .update(curso)
      .set({ ...campos, ...colunasDaCapa })
      .where(eq(curso.id, cursoId));
  }

  if (d.niveis.length > 0) {
    await tx
      .insert(nivel)
      .values(d.niveis.map((n) => ({ ...n, cursoId })))
      .onConflictDoUpdate({
        set: { nome: sql`excluded.nome` },
        target: [nivel.cursoId, nivel.ordem],
      });
  }

  if (apagar.aulas.length > 0) {
    await tx.delete(aula).where(inArray(aula.id, [...apagar.aulas]));
  }

  const modulosNovos = new Set<string>(novos.modulos);
  const aulasNovas = new Set<string>(novos.aulas);
  const modulosDoCurso = sql`(select ${modulo.id} from ${modulo} where ${modulo.cursoId} = ${cursoId})`;

  if (!plano.criar) {
    await tx.execute(sql`
      update ${modulo} set numero = numero + (
        select greatest(max(numero), ${TETO_FINAL}) + 1 from ${modulo} where curso_id = ${cursoId}
      ) where curso_id = ${cursoId}`);
  }

  const [mNovos, mMantidos] = particionar(d.modulos, (m) =>
    modulosNovos.has(m.id)
  );
  if (mNovos.length > 0) {
    await tx.insert(modulo).values(
      mNovos.map((m) => ({
        cursoId,
        id: m.id,
        nivelOrdem: m.nivelOrdem,
        numero: m.numero,
        titulo: m.titulo,
      }))
    );
  }
  if (mMantidos.length > 0) {
    const linhas = mMantidos.map((m) => ({
      id: m.id,
      nivel_ordem: m.nivelOrdem,
      numero: m.numero,
      titulo: m.titulo,
    }));
    await tx.execute(sql`
      update ${modulo} m set numero = x.numero, titulo = x.titulo, nivel_ordem = x.nivel_ordem
      from ${registros(linhas)} as x(id uuid, numero smallint, titulo text, nivel_ordem smallint)
      where m.id = x.id and m.curso_id = ${cursoId}`);
  }

  const aulasFinais = d.modulos.flatMap((m) =>
    m.aulas.map((a, i) => ({
      duracao_seg: a.duracaoSeg,
      id: a.id,
      modulo_id: m.id,
      posicao: i + 1,
      titulo: a.titulo,
      video_id: a.video?.id ?? null,
      video_provedor: a.video?.provedor ?? null,
    }))
  );
  const [aNovas, aMantidas] = particionar(aulasFinais, (a) =>
    aulasNovas.has(a.id)
  );

  if (aMantidas.length > 0) {
    await tx.execute(sql`
      update ${aula} set posicao = posicao + (
        select greatest(max(posicao), ${TETO_FINAL}) + 1 from ${aula} where modulo_id in ${modulosDoCurso}
      ) where modulo_id in ${modulosDoCurso}`);
    await tx.execute(sql`
      update ${aula} a set modulo_id = x.modulo_id, posicao = x.posicao, titulo = x.titulo,
        duracao_seg = x.duracao_seg, video_id = x.video_id,
        video_provedor = x.video_provedor::video_provedor
      from ${registros(aMantidas)} as x(id uuid, modulo_id uuid, posicao smallint, titulo text,
        duracao_seg integer, video_id text, video_provedor text)
      where a.id = x.id and a.modulo_id in ${modulosDoCurso}`);
  }
  if (aNovas.length > 0) {
    await tx.insert(aula).values(
      aNovas.map((a) => ({
        duracaoSeg: a.duracao_seg,
        id: a.id,
        moduloId: a.modulo_id,
        posicao: a.posicao,
        titulo: a.titulo,
        videoId: a.video_id,
        videoProvedor: a.video_provedor,
      }))
    );
  }

  if (apagar.modulos.length > 0) {
    await tx.delete(modulo).where(inArray(modulo.id, [...apagar.modulos]));
  }
  if (apagar.niveis.length > 0) {
    await tx
      .delete(nivel)
      .where(
        and(
          eq(nivel.cursoId, cursoId),
          inArray(nivel.ordem, [...apagar.niveis])
        )
      );
  }
}

function particionar<T>(
  lista: readonly T[],
  sim: (x: T) => boolean
): [T[], T[]] {
  const a: T[] = [];
  const b: T[] = [];
  for (const x of lista) {
    (sim(x) ? a : b).push(x);
  }
  return [a, b];
}

/**
 * admin.catalogo.apagarCurso. Níveis, módulos, aulas e comunicados do curso caem
 * em cascade. Id que não existe: { apagado: false }, sem erro.
 */
export function apagarCurso(
  db: Database,
  id: CursoId
): Promise<{ apagado: boolean }> {
  return comTrava(db, `curso:${id}`, async (tx) => {
    const atual = await abrirCurso(tx, id);
    if (!atual) {
      return { apagado: false };
    }
    if (!atual.podeApagar) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: CURSO_EM_USO,
      });
    }
    await tx.delete(curso).where(eq(curso.id, id));
    return { apagado: true };
  });
}
