// Seed de EXEMPLO. Sem flag, só escreve no Supabase local (SEED_DATABASE_URL, padrão 127.0.0.1:54322).
// Com --cloud, lê o DATABASE_URL do ambiente, imprime o destino e só segue com --sim-cloud.
// Conteúdo: upsert por id fixo. Fatos dos alunos de exemplo: apagados só por user_id e reinseridos.
// Uso: bun run db:seed -- --aluno user_xxx [--cloud --sim-cloud]

import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { inArray, sql } from "drizzle-orm";

import { createDb, type Database } from "../index";
import {
  aula,
  aulaAssistida,
  certificado,
  comunicado,
  cotaVideo,
  curso,
  liberacao,
  modulo,
  nivel,
  pontoLancamento,
  posicaoAula,
  trilha,
  trilhaCurso,
} from "../schema";
import {
  ALUNO_B,
  CERTIFICADO_A,
  COMUNICADO,
  CURSOS,
  codigoCertificado,
  LIBERADA_POR,
  PONTOS_AULA,
  PONTOS_CURSO,
  POSICAO_A,
  PROGRESSO_A,
  SOLTOS,
  TRILHAS,
  TROCA_A,
  VIDEO_EXEMPLO,
} from "./dados";
import {
  BancoNaoLocalError,
  garantirBancoLocal,
  URL_LOCAL_PADRAO,
} from "./guarda-local";

const USER_ID_CLERK = /^user_[A-Za-z0-9]+$/;
const FUSO = "America/Sao_Paulo";

/** UUID fixo derivado da chave, para o upsert achar a mesma linha em toda execução. */
function idFixo(chave: string): string {
  const h = createHash("sha1").update(`cursos-seed:${chave}`).digest("hex");
  const variante = ((Number.parseInt(h[16] ?? "0", 16) % 4) + 8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variante}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const idCurso = (c: string) => idFixo(`curso:${c}`);
const idModulo = (c: string, n: number) => idFixo(`modulo:${c}:${n}`);
const idAula = (c: string, n: number, p: number) =>
  idFixo(`aula:${c}:${n}:${p}`);

const diaSp = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: FUSO,
    year: "numeric",
  }).format(d);

/** Instante às `hora` de São Paulo (UTC-3, sem horário de verão desde 2019) do dia `dias` atrás. */
function diasAtras(hoje: string, dias: number, hora: number): Date {
  const d = new Date(`${hoje}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  d.setUTCHours(hora + 3, 0, 0, 0);
  return d;
}

/** Os `n` dias úteis mais recentes até hoje, em dias atrás (0 = hoje). */
function ultimosDiasUteis(hoje: string, n: number): number[] {
  const dias: number[] = [];
  for (let atras = 0; dias.length < n; atras += 1) {
    const semana = diasAtras(hoje, atras, 12).getUTCDay();
    if (semana !== 0 && semana !== 6) {
      dias.push(atras);
    }
  }
  return dias;
}

function destino(argv: { cloud: boolean; simCloud: boolean }): string {
  if (argv.cloud) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("--cloud pede DATABASE_URL no ambiente.");
    }
    const alvo = new URL(url);
    console.log(`Destino: ${alvo.hostname}:${alvo.port || "5432"} (cloud)`);
    if (!argv.simCloud) {
      throw new Error(
        "Escrita no cloud recusada: repita com --sim-cloud para confirmar o destino acima."
      );
    }
    return url;
  }
  const url = process.env.SEED_DATABASE_URL ?? URL_LOCAL_PADRAO;
  const { host, porta } = garantirBancoLocal(url);
  console.log(`Destino: ${host}:${porta} (local)`);
  return url;
}

function lerArgs() {
  const { values } = parseArgs({
    options: {
      aluno: { type: "string" },
      cloud: { default: false, type: "boolean" },
      "sim-cloud": { default: false, type: "boolean" },
    },
  });
  const aluno = values.aluno ?? (values.cloud ? undefined : "user_seedA");
  if (!(aluno && USER_ID_CLERK.test(aluno))) {
    throw new Error(
      "--aluno precisa do userId do Clerk (user_...). No cloud ele é obrigatório."
    );
  }
  return { aluno, cloud: values.cloud, simCloud: values["sim-cloud"] };
}

type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Linhas do conteúdo de exemplo, com ids fixos. */
function linhasDeConteudo() {
  const cursos = CURSOS.map((c) => ({
    capaAlt: c.capaAlt,
    capaUrl: c.capaUrl,
    codigo: c.codigo,
    destaque: c.destaque,
    id: idCurso(c.chave),
    precoTroca: c.precoTroca ?? null,
    slug: c.chave,
    status: c.status,
    tema: c.tema,
    titulo: c.titulo,
  }));
  const niveis = CURSOS.flatMap((c) =>
    c.niveis.map((n) => ({
      cursoId: idCurso(c.chave),
      nome: n.nome,
      ordem: n.ordem,
    }))
  );
  const modulos = CURSOS.flatMap((c) =>
    c.modulos.map((m) => ({
      cursoId: idCurso(c.chave),
      id: idModulo(c.chave, m.numero),
      nivelOrdem: m.nivelOrdem,
      numero: m.numero,
      titulo: m.titulo,
    }))
  );
  const aulas = CURSOS.flatMap((c) =>
    c.modulos.flatMap((m) =>
      m.aulas.map((a, i) => ({
        duracaoSeg: VIDEO_EXEMPLO.duracaoSeg,
        id: idAula(c.chave, m.numero, i + 1),
        moduloId: idModulo(c.chave, m.numero),
        posicao: i + 1,
        titulo: a.titulo,
        videoId: VIDEO_EXEMPLO.id,
        videoProvedor: VIDEO_EXEMPLO.provedor,
      }))
    )
  );
  const trilhas = TRILHAS.map((t) => ({
    descricao: t.descricao,
    id: idFixo(`trilha:${t.chave}`),
    slug: t.chave,
    titulo: t.titulo,
  }));
  const trilhaCursos = TRILHAS.flatMap((t) =>
    t.cursos.map((chave, i) => ({
      cursoId: idCurso(chave),
      posicao: i + 1,
      trilhaId: idFixo(`trilha:${t.chave}`),
    }))
  );
  return { aulas, cursos, modulos, niveis, trilhaCursos, trilhas };
}

const novo = (coluna: string) => sql.raw(`excluded.${coluna}`);

/** Conteúdo: upsert por id fixo, uma instrução por tabela, na ordem das FKs. */
async function upsertConteudo(tx: Transacao) {
  const l = linhasDeConteudo();
  await tx
    .insert(curso)
    .values(l.cursos)
    .onConflictDoUpdate({
      set: {
        capaAlt: novo("capa_alt"),
        capaUrl: novo("capa_url"),
        codigo: novo("codigo"),
        destaque: novo("destaque"),
        precoTroca: novo("preco_troca"),
        slug: novo("slug"),
        status: novo("status"),
        tema: novo("tema"),
        titulo: novo("titulo"),
      },
      target: curso.id,
    });
  await tx
    .insert(nivel)
    .values(l.niveis)
    .onConflictDoUpdate({
      set: { nome: novo("nome") },
      target: [nivel.cursoId, nivel.ordem],
    });
  await tx
    .insert(modulo)
    .values(l.modulos)
    .onConflictDoUpdate({
      set: {
        cursoId: novo("curso_id"),
        nivelOrdem: novo("nivel_ordem"),
        numero: novo("numero"),
        titulo: novo("titulo"),
      },
      target: modulo.id,
    });
  await tx
    .insert(aula)
    .values(l.aulas)
    .onConflictDoUpdate({
      set: {
        duracaoSeg: sql`case when ${aula.videoId} is null then excluded.duracao_seg else ${aula.duracaoSeg} end`,
        moduloId: novo("modulo_id"),
        posicao: novo("posicao"),
        titulo: novo("titulo"),
        videoId: sql`coalesce(${aula.videoId}, excluded.video_id)`,
        videoProvedor: sql`coalesce(${aula.videoProvedor}, excluded.video_provedor)`,
      },
      target: aula.id,
    });
  await tx
    .insert(trilha)
    .values(l.trilhas)
    .onConflictDoUpdate({
      set: {
        descricao: novo("descricao"),
        slug: novo("slug"),
        titulo: novo("titulo"),
      },
      target: trilha.id,
    });
  await tx
    .insert(trilhaCurso)
    .values(l.trilhaCursos)
    .onConflictDoUpdate({
      set: { posicao: novo("posicao"), trilhaId: novo("trilha_id") },
      target: trilhaCurso.cursoId,
    });
}

async function semear(url: string, alunoA: string) {
  const db = createDb({ DATABASE_URL: url });
  const agora = new Date();
  const hoje = diaSp(agora);

  await db.transaction(async (tx) => {
    await upsertConteudo(tx);
    const com = {
      cursoId: null,
      id: idFixo(`comunicado:${COMUNICADO.chave}`),
      publicadoEm: diasAtras(hoje, 5, 10),
      publicadoPor: LIBERADA_POR,
      texto: COMUNICADO.texto,
      titulo: COMUNICADO.titulo,
    };
    await tx
      .insert(comunicado)
      .values(com)
      .onConflictDoUpdate({ set: com, target: comunicado.id });

    // Fatos dos alunos de exemplo: apagados só por user_id, na ordem das FKs.
    const alunos = [alunoA, ALUNO_B];
    await tx
      .delete(pontoLancamento)
      .where(inArray(pontoLancamento.userId, alunos));
    await tx.delete(certificado).where(inArray(certificado.userId, alunos));
    await tx.delete(posicaoAula).where(inArray(posicaoAula.userId, alunos));
    await tx.delete(cotaVideo).where(inArray(cotaVideo.userId, alunos));
    await tx.delete(aulaAssistida).where(inArray(aulaAssistida.userId, alunos));
    await tx.delete(liberacao).where(inArray(liberacao.userId, alunos));

    const idTrilha = (chave: string) => idFixo(`trilha:${chave}`);
    await tx.insert(liberacao).values([
      ...TRILHAS.map((t, i) => ({
        liberadaEm: diasAtras(hoje, 60 - i, 9),
        liberadaPor: LIBERADA_POR,
        trilhaId: idTrilha(t.chave),
        userId: alunoA,
      })),
      ...SOLTOS.map((chave, i) => ({
        cursoId: idCurso(chave),
        liberadaEm: diasAtras(hoje, 50 - i, 9),
        liberadaPor: LIBERADA_POR,
        userId: alunoA,
      })),
      {
        liberadaEm: diasAtras(hoje, 30, 9),
        liberadaPor: LIBERADA_POR,
        trilhaId: idTrilha("fabrica-montagem"),
        userId: ALUNO_B,
      },
    ]);

    // Aulas assistidas do aluno A, em ordem de estudo.
    const assistidas = PROGRESSO_A.flatMap((p) => {
      const c = CURSOS.find((x) => x.chave === p.curso);
      const m = c?.modulos.find((x) => x.numero === p.modulo);
      if (!m) {
        throw new Error(
          `Progresso aponta para módulo inexistente: ${p.curso} ${p.modulo}`
        );
      }
      return m.aulas
        .slice(0, Math.min(p.aulas, m.aulas.length))
        .map((_, i) => idAula(p.curso, p.modulo, i + 1));
    });
    // As 5 últimas assistidas caem nos 5 últimos dias úteis (a sequência mostra 5);
    // o resto fica entre 40 e 20 dias atrás. Ordem: comercial até a aula 3 do módulo 8,
    // depois Nova Rotina e Autoavaliação.
    const recentes = [
      idAula("comercial", 8, 3),
      idAula("comercial", 8, 2),
      idAula("comercial", 8, 1),
      idAula("nova-rotina", 1, 3),
      idAula("nova-rotina", 1, 2),
    ];
    const antigas = assistidas.filter((id) => !recentes.includes(id));
    const diasUteis = ultimosDiasUteis(hoje, recentes.length);
    const quando = new Map<string, Date>();
    for (const [i, id] of recentes.entries()) {
      const atras = diasUteis[i] ?? 0;
      quando.set(
        id,
        atras === 0
          ? new Date(agora.getTime() - 60_000)
          : diasAtras(hoje, atras, 14)
      );
    }
    for (const [i, id] of antigas.entries()) {
      const atras = 40 - Math.floor((i * 20) / antigas.length);
      quando.set(id, diasAtras(hoje, atras, 15));
    }
    const fatos = [...quando.entries()].map(([aulaId, assistidaEm]) => ({
      assistidaEm,
      aulaId,
      userId: alunoA,
    }));
    await tx.insert(aulaAssistida).values(fatos);

    await tx.insert(posicaoAula).values({
      atualizadaEm: agora,
      aulaId: idAula(POSICAO_A.curso, POSICAO_A.modulo, POSICAO_A.aula),
      posicaoSeg: POSICAO_A.posicaoSeg,
      trechosVistos: [{ fim: POSICAO_A.posicaoSeg, inicio: 0 }],
      userId: alunoA,
    });

    const emitidoEm = diasAtras(hoje, 20, 16);
    await tx.insert(certificado).values({
      codigo: codigoCertificado(CERTIFICADO_A.prefixo, alunoA),
      cursoId: idCurso(CERTIFICADO_A.curso),
      emitidoEm,
      userId: alunoA,
    });

    await tx.insert(pontoLancamento).values([
      ...fatos.map((f) => ({
        aulaId: f.aulaId,
        criadoEm: f.assistidaEm,
        motivo: "aula_assistida" as const,
        pontos: PONTOS_AULA,
        userId: alunoA,
      })),
      {
        criadoEm: emitidoEm,
        cursoId: idCurso(CERTIFICADO_A.curso),
        motivo: "curso_concluido" as const,
        pontos: PONTOS_CURSO,
        userId: alunoA,
      },
    ]);

    // A troca é o par liberação + lançamento negativo, como troca.trocar grava.
    const trocado = CURSOS.find((c) => c.chave === TROCA_A.curso);
    if (!trocado?.precoTroca) {
      throw new Error(
        `Troca de exemplo aponta para curso sem preço: ${TROCA_A.curso}`
      );
    }
    const trocadoEm = diasAtras(hoje, TROCA_A.diasAtras, 11);
    const [lib] = await tx
      .insert(liberacao)
      .values({
        cursoId: idCurso(trocado.chave),
        liberadaEm: trocadoEm,
        liberadaPor: alunoA,
        userId: alunoA,
      })
      .returning({ id: liberacao.id });
    await tx.insert(pontoLancamento).values({
      criadoEm: trocadoEm,
      liberacaoId: lib?.id,
      motivo: "troca",
      pontos: -trocado.precoTroca,
      userId: alunoA,
    });
  });

  const contagem = await db.execute<{ n: number; tabela: string }>(sql`
    select 'trilha' as tabela, count(*)::int as n from trilha
    union all select 'curso', count(*)::int from curso
    union all select 'trilha_curso', count(*)::int from trilha_curso
    union all select 'nivel', count(*)::int from nivel
    union all select 'modulo', count(*)::int from modulo
    union all select 'aula', count(*)::int from aula
    union all select 'liberacao', count(*)::int from liberacao
    union all select 'aula_assistida', count(*)::int from aula_assistida
    union all select 'posicao_aula', count(*)::int from posicao_aula
    union all select 'cota_video', count(*)::int from cota_video
    union all select 'certificado', count(*)::int from certificado
    union all select 'ponto_lancamento', count(*)::int from ponto_lancamento
    union all select 'comunicado', count(*)::int from comunicado`);
  console.table(contagem.rows);
  await db.$client.end();
}

try {
  const args = lerArgs();
  const url = destino(args);
  console.log(`Aluno A: ${args.aluno}. Aluno B: ${ALUNO_B}.`);
  await semear(url, args.aluno);
} catch (erro) {
  if (erro instanceof BancoNaoLocalError) {
    console.error(erro.message);
  } else {
    console.error(erro instanceof Error ? erro.message : erro);
  }
  process.exit(1);
}
