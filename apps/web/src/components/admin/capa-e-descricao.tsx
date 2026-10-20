"use client";

import type { CategoriaNaLista } from "@cursos/api/dominio/categoria";
import { CARACTERES } from "@cursos/api/dominio/edicao-do-curso";
import { slugDoTitulo } from "@cursos/api/dominio/endereco";
import type { CategoriaId } from "@cursos/api/dominio/tipos";
import { Field, FieldLabel } from "@cursos/ui/components/field";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowUpRight, Check, Link2 } from "lucide-react";
import Link from "next/link";
import {
  type ChangeEvent,
  type Dispatch,
  useCallback,
  useMemo,
  useState,
} from "react";

import { plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import { AreaDeTexto, CampoDeTexto } from "./campo-lido";
import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";
import { CARTAO_DA_SECAO, ROTULO } from "./partes";
import { ID, type RascunhoDoCurso } from "./rascunho-do-curso";
import type { Mudanca } from "./rascunho-do-editor";
import { SelecaoComBusca } from "./selecao";

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

const novoId = () => crypto.randomUUID() as CategoriaId;

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
  const { executar } = useAcao();
  // A criada aparece na lista antes de o refresh trazer a página com ela.
  const [criadas, setCriadas] = useState<readonly CategoriaNaLista[]>([]);
  const [criada, setCriada] = useState<CategoriaNaLista | null>(null);
  const [recusa, setRecusa] = useState<string | null>(null);
  const { aria, mensagem: doEditor } = useErroDoCampo(
    id,
    criada?.id === valor ? `${id}-criada` : undefined
  );
  const mensagem = recusa ?? doEditor;
  const todas = [
    ...categorias,
    ...criadas.filter((c) => !categorias.some((d) => d.id === c.id)),
  ];
  const escolher = useCallback(
    (v: string) => {
      setRecusa(null);
      mudar(v);
    },
    [mudar]
  );
  const criar = useMemo(
    () => ({
      aoCriar: (nome: string) => {
        const nova: CategoriaNaLista = { cursos: [], id: novoId(), nome };
        setRecusa(null);
        executar(
          () =>
            trpcClient.admin.categorias.salvar.mutate({
              id: nova.id,
              nome,
            }),
          {
            aoRecusar: (_motivo, frase) =>
              setRecusa(frase ?? "Não deu para criar a categoria."),
            depois: () => {
              setCriadas((atual) => [...atual, nova]);
              setCriada(nova);
              mudar(nova.id);
            },
          }
        );
      },
      rotulo: (nome: string) => `Criar categoria "${nome}"`,
    }),
    [executar, mudar]
  );
  return (
    <Field data-invalid={mensagem ? true : undefined}>
      <FieldLabel className={ROTULO} htmlFor={id}>
        Categoria
      </FieldLabel>
      <SelecaoComBusca
        {...aria}
        aoMudar={escolher}
        aria-describedby={recusa ? `${id}-erro` : aria["aria-describedby"]}
        aria-invalid={mensagem ? true : undefined}
        criar={criar}
        id={id}
        opcoes={todas.map((c) => ({
          contagem: plural(c.cursos.length, "curso", "cursos"),
          rotulo: c.nome,
          valor: c.id,
        }))}
        pe={
          <>
            <span>Digite para criar uma nova.</span>
            <Link className={LINK_DE_APOIO} href="/admin/categorias">
              Gerenciar
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </>
        }
        placeholder="Escolha a categoria"
        placeholderDaBusca="Buscar ou criar categoria"
        required
        rotuloDaBusca="Buscar ou criar categoria"
        semResultado="Nenhuma categoria ainda. Digite o nome para criar."
        valor={valor}
      />
      {criada?.id === valor && !mensagem ? (
        <p
          className="flex items-center gap-1.5 text-ceu text-xs"
          id={`${id}-criada`}
        >
          <Check aria-hidden="true" className="size-3.5" />
          Categoria "{criada.nome}" criada.
        </p>
      ) : null}
      <ErroDoCampo id={id} mensagem={mensagem} />
    </Field>
  );
}

/** O id do título da seção, alvo do índice (secoesDoEditor). */
const ID_DA_SECAO = "capa-e-descricao";

export function CapaEDescricao({
  capa,
  categorias,
  despachar,
  mudarTitulo,
  rascunho,
  slug,
}: {
  capa: React.ReactNode;
  categorias: readonly CategoriaNaLista[];
  despachar: Dispatch<Mudanca>;
  mudarTitulo: (e: ChangeEvent<HTMLInputElement>) => void;
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
    // O cartão abre o editor sem título visível; o h2 escondido nomeia a região e
    // é o alvo do índice. A seção relativa segura o h2 no alto dela.
    <section aria-labelledby={ID_DA_SECAO} className="relative">
      <h2 className="sr-only" id={ID_DA_SECAO} tabIndex={-1}>
        Capa e descrição
      </h2>
      <div className={cn(CARTAO_DA_SECAO, "@container")}>
        <div className="grid @3xl:grid-cols-[clamp(280px,28cqw,440px)_minmax(0,1fr)] gap-7 p-6">
          {capa}
          <div className="grid min-w-0 content-start gap-5">
            <CampoDeTexto
              ajuda={<EnderecoDoCurso slug={slug} titulo={rascunho.titulo} />}
              campoClasse="gap-2"
              className="font-bold text-titulo text-xl tracking-tight md:text-xl"
              id={ID.curso("titulo")}
              maxLength={CARACTERES.titulo}
              name="titulo"
              onChange={mudarTitulo}
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
              linhasFixas={4}
              maximo={CARACTERES.descricao}
              placeholder="O que o curso ensina e para quem ele é."
              rotulo="Descrição"
              texto={rascunho.descricao}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
