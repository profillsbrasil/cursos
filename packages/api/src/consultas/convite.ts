// Escritor único de convite e convite_curso. O banco decide o estado, e o Clerk só
// entrega o link: toda chamada à porta Convites deixa, no pior caso, um link que
// só cria conta (docs/adr/0005-convite.md).

import type { Database } from "@cursos/db";
import { convite, conviteCurso } from "@cursos/db/schema/index";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import {
  aceitoDesde,
  type ConviteAceito,
  type Email,
  ESPERA_DO_REENVIO_SEG,
  type EstadoDoConvite,
  estadoDoConvite,
  horaDeSaoPaulo,
  type LinhasDosConvites,
  type OQueOConviteDa,
  type ResultadoDoConvite,
  type ResultadoDoEnvio,
  VALIDADE_EM_DIAS,
} from "../dominio/convite";
import type { AdminId, ConviteId, CursoId } from "../dominio/tipos";
import type { Convites } from "../externos/convites";
import type { Pessoas } from "../externos/pessoas";
import { ErroParaAPessoa } from "../index";
import type { Transacao } from "./comum";
import { violacaoDe } from "./erros";
import { type AlunoTravado, comTrava } from "./trava";

interface PortasDoConvite {
  convites: Convites;
  pessoas: Pick<Pessoas, "contasCom">;
}

const MS_POR_DIA = 86_400_000;
const validade = (agora: Date) =>
  new Date(agora.getTime() + VALIDADE_EM_DIAS * MS_POR_DIA);

const VIVO = and(isNull(convite.aceitoEm), isNull(convite.canceladoEm));

const FK_DO_CURSO = "convite_curso_curso_id_curso_id_fkey";

/** O teto da lista da opção Convidados. */
const TETO_DA_LISTA = 100;

const ESCAPE_DO_LIKE = /[\\%_]/g;

const cursoSumiu = (cause: unknown) =>
  new ErroParaAPessoa({
    cause,
    code: "NOT_FOUND",
    message:
      "Um dos cursos escolhidos não existe mais. Nenhum convite foi criado.",
  });

const loginNaoRespondeu = (cause: unknown) =>
  new ErroParaAPessoa({
    cause,
    code: "SERVICE_UNAVAILABLE",
    message: "O login da plataforma não respondeu. Nenhum convite foi criado.",
  });

const emailNaoSaiu = (cause: unknown) =>
  new ErroParaAPessoa({
    cause,
    code: "SERVICE_UNAVAILABLE",
    message: "O e-mail não saiu. O convite ficou como estava.",
  });

/**
 * INSERT de convite e de convite_curso, numa transação. `on conflict do nothing`
 * no índice convite_vivo_por_email: dois admins que convidam o mesmo e-mail
 * gravam uma linha, e o segundo lê ja_convidado. A FK do curso vira recusa para
 * a pessoa, e nada fica gravado.
 */
async function gravarConvites(
  db: Database,
  admin: AdminId,
  emails: readonly Email[],
  oQueDa: OQueOConviteDa,
  agora: Date
): Promise<{
  gravados: { email: Email; id: ConviteId }[];
  jaConvidados: { email: Email; enviado: boolean }[];
}> {
  if (emails.length === 0) {
    return { gravados: [], jaConvidados: [] };
  }
  try {
    return await db.transaction(async (tx) => {
      const novos = await tx
        .insert(convite)
        .values(
          emails.map((email) => ({
            comoAdmin: oQueDa.comoAdmin,
            convidadoEm: agora,
            convidadoPor: admin,
            email,
            expiraEm: validade(agora),
            perfil: oQueDa.perfil,
          }))
        )
        .onConflictDoNothing({
          target: convite.email,
          where: sql`aceito_em is null and cancelado_em is null`,
        })
        .returning({ email: convite.email, id: convite.id });
      const gravados = novos.map((n) => ({
        email: n.email as Email,
        id: n.id as ConviteId,
      }));
      if (gravados.length > 0 && oQueDa.cursoIds.length > 0) {
        await tx
          .insert(conviteCurso)
          .values(
            gravados.flatMap((g) =>
              oQueDa.cursoIds.map((cursoId) => ({ conviteId: g.id, cursoId }))
            )
          );
      }
      const feitos = new Set(gravados.map((g) => g.email));
      const repetidos = emails.filter((e) => !feitos.has(e));
      const vivos =
        repetidos.length === 0
          ? []
          : await tx
              .select({ email: convite.email, enviadoEm: convite.enviadoEm })
              .from(convite)
              .where(and(inArray(convite.email, repetidos), VIVO));
      const enviadoPorEmail = new Map(
        vivos.map((v) => [v.email, v.enviadoEm !== null])
      );
      return {
        gravados,
        jaConvidados: repetidos.map((email) => ({
          email,
          enviado: enviadoPorEmail.get(email) ?? false,
        })),
      };
    });
  } catch (erro) {
    if (violacaoDe(erro)?.restricao === FK_DO_CURSO) {
      throw cursoSumiu(erro);
    }
    throw erro;
  }
}

/**
 * Grava o envio que saiu e renova a validade, só em convite vivo: a validade
 * conta do último e-mail que o Clerk mandou. Devolve se gravou.
 */
async function marcarEnviado(
  db: Database,
  id: ConviteId,
  clerkConviteId: string,
  agora: Date
): Promise<boolean> {
  const linhas = await db
    .update(convite)
    .set({ clerkConviteId, enviadoEm: agora, expiraEm: validade(agora) })
    .where(and(eq(convite.id, id), VIVO))
    .returning({ id: convite.id });
  return linhas.length > 0;
}

type Envio =
  | { tipo: "enviado" }
  | { tipo: "limite"; tentarEm: Date }
  | { tipo: "falha" };

async function enviarUm(
  db: Database,
  convites: Convites,
  gravado: { email: Email; id: ConviteId },
  agora: Date
): Promise<Envio> {
  try {
    const r = await convites.enviar(gravado.email, agora);
    if (r.tipo === "limite") {
      return r;
    }
    if (!(await marcarEnviado(db, gravado.id, r.clerkConviteId, agora))) {
      // Outro admin cancelou entre o INSERT e o envio: o link que saiu não vale.
      await convites.revogar(r.clerkConviteId);
    }
    return { tipo: "enviado" };
  } catch (erro) {
    console.error(`convite ${gravado.id}: o e-mail não saiu`, erro);
    return { tipo: "falha" };
  }
}

/**
 * O envio do diálogo. Devolve um resultado por e-mail, na ordem do pedido, e só
 * lança quando nada foi gravado: o Clerk não respondeu à checagem das contas, ou
 * um curso sumiu. O e-mail de quem já tem conta não ganha convite. No 429, o
 * e-mail da vez e os seguintes ficam gravados sem envio, e o Clerk não é mais
 * chamado neste pedido.
 */
export async function convidar(
  db: Database,
  portas: PortasDoConvite,
  admin: AdminId,
  pedido: OQueOConviteDa & { emails: readonly Email[] },
  agora: Date
): Promise<ResultadoDoEnvio> {
  const emails = [...new Set(pedido.emails)];
  let comConta: ReadonlyMap<Email, string>;
  try {
    comConta = await portas.pessoas.contasCom(emails);
  } catch (erro) {
    throw loginNaoRespondeu(erro);
  }
  const { gravados, jaConvidados } = await gravarConvites(
    db,
    admin,
    emails.filter((e) => !comConta.has(e)),
    pedido,
    agora
  );
  const porEmail = new Map<Email, ResultadoDoConvite>();
  for (const [email, userId] of comConta) {
    porEmail.set(email, { email, tipo: "ja_tem_conta", userId });
  }
  for (const j of jaConvidados) {
    porEmail.set(j.email, { ...j, tipo: "ja_convidado" });
  }
  let limite: Date | null = null;
  for (const gravado of gravados) {
    const envio: Envio = limite
      ? { tentarEm: limite, tipo: "limite" }
      : // biome-ignore lint/performance/noAwaitInLoops: um envio por vez, para o 429 parar os seguintes.
        await enviarUm(db, portas.convites, gravado, agora);
    if (envio.tipo === "limite") {
      limite = envio.tentarEm;
    }
    porEmail.set(gravado.email, resultadoDoEnvio(gravado.email, envio));
  }
  return {
    convites: emails.flatMap((email) => porEmail.get(email) ?? []),
  };
}

function resultadoDoEnvio(email: Email, envio: Envio): ResultadoDoConvite {
  switch (envio.tipo) {
    case "enviado":
      return { email, tipo: "enviado" };
    case "limite":
      return {
        email,
        motivo: { tentarEm: envio.tentarEm.toISOString(), tipo: "limite" },
        tipo: "nao_enviado",
      };
    case "falha":
      return { email, motivo: { tipo: "falha" }, tipo: "nao_enviado" };
    default:
      return envio satisfies never;
  }
}

const COLUNAS_DO_ESTADO = {
  aceitoEm: true,
  aceitoPor: true,
  canceladoEm: true,
  canceladoPor: true,
  comoAdmin: true,
  enviadoEm: true,
  expiraEm: true,
  papelAplicadoEm: true,
} as const;

const naoExiste = () =>
  new ErroParaAPessoa({
    code: "NOT_FOUND",
    message: "Este convite não existe.",
  });

/** A recusa de reenviar ou cancelar o convite que já teve fim. */
function recusaDoFim(
  estado: Extract<EstadoDoConvite, { tipo: "aceito" | "cancelado" }>,
  aceito: string
): ErroParaAPessoa {
  return new ErroParaAPessoa({
    code: "PRECONDITION_FAILED",
    message: estado.tipo === "aceito" ? aceito : "Este convite foi cancelado.",
  });
}

const JA_ACEITOU = "Esta pessoa já aceitou o convite.";

async function lerEstado(db: Database, id: ConviteId, agora: Date) {
  const linha = await db.query.convite.findFirst({
    columns: { ...COLUNAS_DO_ESTADO, clerkConviteId: true, email: true },
    where: { id },
  });
  return linha ? { estado: estadoDoConvite(linha, agora), linha } : null;
}

/**
 * Reenviar e o "Enviar" da linha não enviada: o mesmo caminho. O Clerk vem antes
 * do banco, então a recusa dele (limite, falha) deixa a linha como estava, com o
 * link anterior ainda valendo. O envio que saiu grava o id novo, renova a
 * validade e revoga o link anterior. Dentro de ESPERA_DO_REENVIO_SEG do último
 * envio, devolve o envio que existe sem mandar outro e-mail.
 */
export async function reenviarConvite(
  db: Database,
  convites: Convites,
  id: ConviteId,
  agora: Date
): Promise<{ enviadoEm: Date }> {
  const lido = await lerEstado(db, id, agora);
  if (!lido) {
    throw naoExiste();
  }
  const { estado, linha } = lido;
  if (estado.tipo === "aceito" || estado.tipo === "cancelado") {
    throw recusaDoFim(estado, JA_ACEITOU);
  }
  if (
    linha.enviadoEm &&
    agora.getTime() - linha.enviadoEm.getTime() < ESPERA_DO_REENVIO_SEG * 1000
  ) {
    return { enviadoEm: linha.enviadoEm };
  }
  let envio: Awaited<ReturnType<Convites["enviar"]>>;
  try {
    envio = await convites.enviar(linha.email as Email, agora);
  } catch (erro) {
    throw emailNaoSaiu(erro);
  }
  if (envio.tipo === "limite") {
    throw new ErroParaAPessoa({
      code: "TOO_MANY_REQUESTS",
      message: `O limite de envios desta hora acabou. Tente de novo depois das ${horaDeSaoPaulo(envio.tentarEm)}.`,
    });
  }
  if (!(await marcarEnviado(db, id, envio.clerkConviteId, agora))) {
    // O convite teve fim enquanto o Clerk respondia: o link novo não vale.
    await convites.revogar(envio.clerkConviteId);
    const depois = await lerEstado(db, id, agora);
    if (
      depois?.estado.tipo === "aceito" ||
      depois?.estado.tipo === "cancelado"
    ) {
      throw recusaDoFim(depois.estado, JA_ACEITOU);
    }
    throw naoExiste();
  }
  if (linha.clerkConviteId) {
    await convites.revogar(linha.clerkConviteId);
  }
  return { enviadoEm: agora };
}

/**
 * Cancela no banco, que é o que impede a aplicação, e depois revoga o link.
 * Cancelar de novo é sucesso e não muda a linha, como revogar uma liberação.
 */
export async function cancelarConvite(
  db: Database,
  convites: Convites,
  admin: AdminId,
  id: ConviteId,
  agora: Date
): Promise<{ cancelado: boolean }> {
  const [cancelada] = await db
    .update(convite)
    .set({ canceladoEm: agora, canceladoPor: admin })
    .where(and(eq(convite.id, id), VIVO))
    .returning({ clerkConviteId: convite.clerkConviteId });
  if (cancelada) {
    if (cancelada.clerkConviteId) {
      await convites.revogar(cancelada.clerkConviteId);
    }
    return { cancelado: true };
  }
  const lido = await lerEstado(db, id, agora);
  if (!lido) {
    throw naoExiste();
  }
  if (lido.estado.tipo === "aceito") {
    throw recusaDoFim(
      lido.estado,
      "Esta pessoa já aceitou o convite. Mude na ficha dela."
    );
  }
  if (lido.linha.clerkConviteId) {
    await convites.revogar(lido.linha.clerkConviteId);
  }
  return { cancelado: false };
}

/**
 * A leitura da tela, em 3 statements paralelos: os vivos que casam o termo (trecho
 * do e-mail), do mais novo ao mais antigo, o total dos vivos e os cursos do diálogo.
 */
export async function linhasDosConvites(
  db: Database,
  termo: string
): Promise<LinhasDosConvites> {
  const trecho = termo.toLowerCase().replace(ESCAPE_DO_LIKE, "\\$&");
  const [convidados, total, cursos] = await Promise.all([
    db.query.convite.findMany({
      columns: {
        ...COLUNAS_DO_ESTADO,
        convidadoEm: true,
        email: true,
        id: true,
        perfil: true,
      },
      limit: TETO_DA_LISTA,
      orderBy: { convidadoEm: "desc", id: "asc" },
      where: {
        aceitoEm: { isNull: true },
        canceladoEm: { isNull: true },
        ...(trecho ? { email: { like: `%${trecho}%` } } : {}),
      },
      with: {
        cursos: {
          columns: {},
          with: { curso: { columns: { id: true, titulo: true } } },
        },
      },
    }),
    db.$count(convite, VIVO),
    db.query.curso.findMany({
      columns: { id: true, status: true, titulo: true },
      orderBy: { titulo: "asc" },
    }),
  ]);
  return {
    convidados: convidados.map((c) => ({
      ...c,
      cursos: c.cursos
        .map((cc) => ({ id: cc.curso.id as CursoId, titulo: cc.curso.titulo }))
        .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR")),
      email: c.email as Email,
      id: c.id as ConviteId,
    })),
    cursos: cursos.map((c) => ({ ...c, id: c.id as CursoId })),
    total,
  };
}

/**
 * A chegada reivindica o convite vivo e não vencido do e-mail, num UPDATE só, e
 * lê os cursos dele. O AlunoTravado diz para quem grava. O cancelar concorrente
 * espera a linha e encontra o convite aceito, ou chega antes e este UPDATE não
 * acha nada: o convite se aceita uma vez.
 */
export async function reivindicarConvite(
  aluno: AlunoTravado,
  email: Email,
  agora: Date
): Promise<ConviteAceito | null> {
  const [aceito] = await aluno.tx
    .update(convite)
    .set({ aceitoEm: agora, aceitoPor: aluno.userId })
    .where(and(eq(convite.email, email), VIVO, gt(convite.expiraEm, agora)))
    .returning({
      comoAdmin: convite.comoAdmin,
      convidadoPor: convite.convidadoPor,
      id: convite.id,
      perfil: convite.perfil,
    });
  if (!aceito) {
    return null;
  }
  const cursos = await aluno.tx
    .select({ cursoId: conviteCurso.cursoId })
    .from(conviteCurso)
    .where(eq(conviteCurso.conviteId, aceito.id));
  return {
    comoAdmin: aceito.comoAdmin,
    // Só o adminProcedure chega ao INSERT de convite.
    convidadoPor: aceito.convidadoPor as AdminId,
    cursoIds: cursos.map((c) => c.cursoId as CursoId),
    id: aceito.id as ConviteId,
    perfil: aceito.perfil,
  };
}

const papelPorAplicar = (userId: string) =>
  and(
    eq(convite.aceitoPor, userId),
    eq(convite.comoAdmin, true),
    isNull(convite.papelAplicadoEm)
  );

/**
 * Leva ao Clerk o papel de admin de um convite aceito, sob a trava `papel`.
 * Depois da trava relê o marcador: quem chega em segundo não chama o Clerk. Se
 * o Clerk grava e o marcador não, o pedido seguinte grava admin de novo, que é a
 * mesma escrita, mas só dentro de PRAZO_DO_PAPEL_MS do aceite. Só convite aceito
 * tem aceito_por, então o cancelado nunca chega aqui.
 */
export function aplicarPapelDoConvite(
  db: Database,
  pessoas: Pick<Pessoas, "definirPapel">,
  userId: string,
  agora: Date
): Promise<void> {
  return comTrava(db, "papel", async (tx) => {
    const [pendente] = await tx
      .select({ id: convite.id })
      .from(convite)
      .where(
        and(papelPorAplicar(userId), gt(convite.aceitoEm, aceitoDesde(agora)))
      );
    if (!pendente) {
      return;
    }
    await pessoas.definirPapel(userId, "admin");
    await tx
      .update(convite)
      .set({ papelAplicadoEm: agora })
      .where(eq(convite.id, pendente.id));
  });
}

/**
 * A mudança de papel feita na ficha encerra o papel por aplicar: a decisão do
 * admin na ficha vence o convite. Roda na transação da trava `papel`.
 */
export async function encerrarPapelDoConvite(
  tx: Transacao,
  userId: string,
  agora: Date
): Promise<void> {
  await tx
    .update(convite)
    .set({ papelAplicadoEm: agora })
    .where(papelPorAplicar(userId));
}
