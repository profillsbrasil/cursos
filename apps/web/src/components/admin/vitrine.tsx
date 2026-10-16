"use client";

import type { CategoriaNaLista } from "@cursos/api/dominio/categoria";
import { CARACTERES } from "@cursos/api/dominio/edicao-do-curso";
import { slugDoTitulo } from "@cursos/api/dominio/endereco";
import type { CategoriaId } from "@cursos/api/dominio/tipos";
import { Field, FieldLabel } from "@cursos/ui/components/field";
import { ArrowUpRight, Link2 } from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, type Dispatch, useCallback } from "react";

import { AreaDeTexto, CampoDeTexto } from "./campo-lido";
import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";
import type { Mudanca } from "./estado-do-editor";
import { ROTULO, Secao } from "./partes";
import { ID, type RascunhoDoCurso } from "./rascunho-do-curso";
import { Selecao } from "./selecao";

const LINK_DE_APOIO =
  "inline-flex items-center gap-1.5 rounded-md py-1 font-semibold text-[13px] text-ceu transition-colors hover:text-titulo";

function EnderecoDoCurso({
  slug,
  titulo,
}: {
  slug: string | null;
  titulo: string;
}) {
  const classe =
    "flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground";
  if (slug === null && titulo.trim() === "") {
    return <span className={classe}>O link do curso sai do título.</span>;
  }
  return (
    <span className={classe}>
      <Link2 aria-hidden="true" className="size-[13px]" />
      <code className="font-mono text-foreground text-xs">
        /cursos/{slug ?? slugDoTitulo(titulo)}
      </code>
      <span>
        {slug === null
          ? "gerado a partir do título"
          : "fixo desde o primeiro salvamento"}
      </span>
    </span>
  );
}

function CampoDaCategoria({
  categorias,
  mudar,
  valor,
}: {
  categorias: readonly CategoriaNaLista[];
  mudar: (valor: string) => void;
  valor: string;
}) {
  const id = ID.curso("categoriaId");
  const { aria, mensagem } = useErroDoCampo(id);
  return (
    <Field data-invalid={mensagem ? true : undefined}>
      <div className="flex items-baseline justify-between gap-3">
        <FieldLabel className={ROTULO} htmlFor={id}>
          Categoria
        </FieldLabel>
        <Link className={LINK_DE_APOIO} href="/admin/categorias">
          Gerenciar categorias
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      <Selecao
        {...aria}
        aoMudar={mudar}
        id={id}
        opcoes={categorias.map((c) => ({ rotulo: c.nome, valor: c.id }))}
        placeholder="Escolha a categoria"
        required
        semOpcoes="Nenhuma categoria ainda. Crie em Gerenciar categorias."
        valor={valor}
      />
      <ErroDoCampo id={id} mensagem={mensagem} />
    </Field>
  );
}

export function Vitrine({
  capa,
  categorias,
  despachar,
  mudarTexto,
  rascunho,
  slug,
}: {
  capa: React.ReactNode;
  categorias: readonly CategoriaNaLista[];
  despachar: Dispatch<Mudanca>;
  mudarTexto: (e: ChangeEvent<HTMLInputElement>) => void;
  rascunho: Pick<RascunhoDoCurso, "categoriaId" | "descricao" | "titulo">;
  slug: string | null;
}) {
  const mudarCategoria = useCallback(
    (categoriaId: string) =>
      despachar({
        mudanca: { categoriaId: categoriaId as CategoriaId },
        tipo: "campos",
      }),
    [despachar]
  );
  const mudarDescricao = useCallback(
    (descricao: string) =>
      despachar({ mudanca: { descricao }, tipo: "campos" }),
    [despachar]
  );
  return (
    <Secao id="vitrine" resumo="O topo da página do curso" titulo="Vitrine">
      <div className="grid gap-7 p-6 md:grid-cols-[280px_minmax(0,1fr)]">
        {capa}
        <div className="grid min-w-0 content-start gap-5">
          <CampoDeTexto
            ajuda={<EnderecoDoCurso slug={slug} titulo={rascunho.titulo} />}
            campoClasse="gap-2"
            className="h-[52px] font-bold text-titulo text-xl tracking-tight"
            id={ID.curso("titulo")}
            maxLength={CARACTERES.titulo}
            name="titulo"
            onChange={mudarTexto}
            placeholder="Operação da envasadora volumétrica"
            required
            rotulo="Título"
            value={rascunho.titulo}
          />
          <CampoDaCategoria
            categorias={categorias}
            mudar={mudarCategoria}
            valor={rascunho.categoriaId}
          />
          <AreaDeTexto
            ajuda="Linha em branco separa parágrafos."
            aoMudar={mudarDescricao}
            id={ID.curso("descricao")}
            maximo={CARACTERES.descricao}
            placeholder="O que o curso ensina e para quem ele é."
            rotulo="Descrição"
            rows={4}
            texto={rascunho.descricao}
          />
        </div>
      </div>
    </Secao>
  );
}
