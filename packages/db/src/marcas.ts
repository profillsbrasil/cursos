declare const marca: unique symbol;

/** Um primitivo com nome. Só o predicado da marca, o `.$type<>()` do schema e o `sql<>` da consulta criam um valor dela. */
export type Marca<T, M extends string> = T & { readonly [marca]: M };

export type CursoId = Marca<string, "CursoId">;

export type AulaId = Marca<string, "AulaId">;

export type ModuloId = Marca<string, "ModuloId">;

export type PerguntaId = Marca<string, "PerguntaId">;

export type AlternativaId = Marca<string, "AlternativaId">;

/** Uma tentativa do questionário de uma aula. O id nasce no cliente. */
export type TentativaId = Marca<string, "TentativaId">;

/** Impressão do conteúdo de um documento do admin (dominio/versao.ts do @cursos/api). */
export type Versao = Marca<string, "Versao">;

export type LiberacaoId = Marca<string, "LiberacaoId">;

export type LiberacaoDoPerfilId = Marca<string, "LiberacaoDoPerfilId">;

export type ConviteId = Marca<string, "ConviteId">;

export type ComunicadoId = Marca<string, "ComunicadoId">;

export type CategoriaId = Marca<string, "CategoriaId">;

/** Um arquivo do material de apoio do curso. O id nasce no editor. */
export type MaterialId = Marca<string, "MaterialId">;

/** "2026-10-07": dia civil de São Paulo. */
export type DiaISO = Marca<string, "DiaISO">;

/** userId de quem passou pelo adminProcedure. Só o adminIdDe de packages/api/src/sessao.ts cria um. */
export type AdminId = Marca<string, "AdminId">;

export type VideoId = Marca<string, "VideoId">;

/** E-mail aparado, em ASCII e em minúsculas, no formato do check convite_email_formato. */
export type Email = Marca<string, "Email">;

const ID_NAO_VAZIO_E_SEM_ESPACO = /^\S+$/;

const DIA = /^\d{4}-\d{2}-\d{2}$/;

const TETO_DO_EMAIL_NO_CHECK_DO_BANCO = 254;

// WARNING: só ASCII, porque toLowerCase do JS e lower() do Postgres divergem fora dele e o check convite_email_formato recusaria o lote inteiro.
const FORMATO_DO_EMAIL =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

export const ehCursoId = (s: string): s is CursoId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehAulaId = (s: string): s is AulaId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehModuloId = (s: string): s is ModuloId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehPerguntaId = (s: string): s is PerguntaId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehAlternativaId = (s: string): s is AlternativaId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehTentativaId = (s: string): s is TentativaId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehVersao = (s: string): s is Versao =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehLiberacaoId = (s: string): s is LiberacaoId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehLiberacaoDoPerfilId = (s: string): s is LiberacaoDoPerfilId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehConviteId = (s: string): s is ConviteId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehComunicadoId = (s: string): s is ComunicadoId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehCategoriaId = (s: string): s is CategoriaId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehMaterialId = (s: string): s is MaterialId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

export const ehVideoId = (s: string): s is VideoId =>
  ID_NAO_VAZIO_E_SEM_ESPACO.test(s);

/** "AAAA-MM-DD" de um dia que existe no calendário: "2026-02-30" não passa. */
export const ehDiaISO = (s: string): s is DiaISO => {
  if (!DIA.test(s)) {
    return false;
  }

  const instante = Date.parse(`${s}T00:00:00Z`);

  return (
    !Number.isNaN(instante) && new Date(instante).toISOString().startsWith(s)
  );
};

/** Mais estreito que o check convite_email_formato do banco: quem passa aqui o banco aceita. */
export const ehEmail = (s: string): s is Email =>
  s.length <= TETO_DO_EMAIL_NO_CHECK_DO_BANCO &&
  FORMATO_DO_EMAIL.test(s) &&
  s === s.toLowerCase();

/** O valor não tem o formato da marca que o construtor pediu. */
export class MarcaRecusada extends TypeError {
  readonly valor: string;

  constructor(valor: string) {
    super(`Fora do formato da marca: ${JSON.stringify(valor)}`);
    this.name = "MarcaRecusada";
    this.valor = valor;
  }
}

/**
 * O caminho de string para marca fora do schema e do zod: confere pelo
 * predicado e lança MarcaRecusada quando o valor não passa.
 */
export function marcar<M extends string>(
  eh: (s: string) => s is M,
  valor: string
): M {
  if (eh(valor)) {
    return valor;
  }

  throw new MarcaRecusada(valor);
}

export const cursoId = (s: string): CursoId => marcar(ehCursoId, s);
export const aulaId = (s: string): AulaId => marcar(ehAulaId, s);
export const moduloId = (s: string): ModuloId => marcar(ehModuloId, s);
export const perguntaId = (s: string): PerguntaId => marcar(ehPerguntaId, s);

export const alternativaId = (s: string): AlternativaId =>
  marcar(ehAlternativaId, s);

export const tentativaId = (s: string): TentativaId => marcar(ehTentativaId, s);
export const versao = (s: string): Versao => marcar(ehVersao, s);
export const liberacaoId = (s: string): LiberacaoId => marcar(ehLiberacaoId, s);

export const liberacaoDoPerfilId = (s: string): LiberacaoDoPerfilId =>
  marcar(ehLiberacaoDoPerfilId, s);

export const conviteId = (s: string): ConviteId => marcar(ehConviteId, s);

export const comunicadoId = (s: string): ComunicadoId =>
  marcar(ehComunicadoId, s);

export const categoriaId = (s: string): CategoriaId => marcar(ehCategoriaId, s);
export const materialId = (s: string): MaterialId => marcar(ehMaterialId, s);
export const diaISO = (s: string): DiaISO => marcar(ehDiaISO, s);
export const videoId = (s: string): VideoId => marcar(ehVideoId, s);
export const email = (s: string): Email => marcar(ehEmail, s);

export const novoCategoriaId = (): CategoriaId =>
  marcar(ehCategoriaId, crypto.randomUUID());

export const novoModuloId = (): ModuloId =>
  marcar(ehModuloId, crypto.randomUUID());

export const novoAulaId = (): AulaId => marcar(ehAulaId, crypto.randomUUID());

export const novoPerguntaId = (): PerguntaId =>
  marcar(ehPerguntaId, crypto.randomUUID());

export const novoAlternativaId = (): AlternativaId =>
  marcar(ehAlternativaId, crypto.randomUUID());

export const novoMaterialId = (): MaterialId =>
  marcar(ehMaterialId, crypto.randomUUID());

export const novaTentativaId = (): TentativaId =>
  marcar(ehTentativaId, crypto.randomUUID());
