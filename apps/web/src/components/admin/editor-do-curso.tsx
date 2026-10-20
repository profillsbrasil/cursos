"use client";

import type { CategoriaNaLista } from "@cursos/api/dominio/categoria";
import {
  CARACTERES,
  type EdicaoDoCurso,
} from "@cursos/api/dominio/edicao-do-curso";
import type { StatusDoCurso } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldLabel } from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { Switch } from "@cursos/ui/components/switch";
import { cn } from "@cursos/ui/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  useCallback,
  useId,
  useRef,
} from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { ALAVANCA, CAMPO } from "@/components/casca/campos";
import { useAtalhoDeSalvar } from "@/lib/atalho-de-salvar";
import { focarDepois } from "@/lib/editor";
import { plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import {
  antesDePublicar,
  resumoDoCurso,
  secoesDoEditor,
} from "./antes-de-publicar";
import {
  BarraDeSalvar,
  type EstadoDoSalvar,
  nadaASalvar,
} from "./barra-de-salvar";
import { CampoDeCapa } from "./campo-de-capa";
import { CampoLido } from "./campo-lido";
import { CapaEDescricao } from "./capa-e-descricao";
import { ColunaDePublicacao, STATUS } from "./coluna-de-publicacao";
import { ConfirmacaoNaLinha, type LinhaAberta } from "./confirmacao-na-linha";
import {
  ErroDoCampo,
  ErrosDoEditor,
  SaiuDoCampo,
  useErroDoCampo,
} from "./erros-do-editor";
import { ModulosDoCurso } from "./modulos-do-curso";
import { ICONE, ROTULO, Secao } from "./partes";
import { ID, type RascunhoDoCurso } from "./rascunho-do-curso";
import { type Mudanca, proximaOrdem } from "./rascunho-do-editor";
import { TopicosDoCurso } from "./topicos-do-curso";
import { useRascunhoDoEditor } from "./use-rascunho-do-editor";

type Despachar = Dispatch<Mudanca>;

function Publicacao({
  codigo,
  despachar,
  rascunho,
}: {
  /** null até o primeiro salvamento, quando o servidor gera o código. */
  codigo: string | null;
  despachar: Despachar;
  rascunho: RascunhoDoCurso;
}) {
  const id = useId();
  const ligarTroca = useCallback(
    (ligado: boolean) =>
      despachar({
        mudanca: { precoTroca: ligado ? "" : null },
        tipo: "campos",
      }),
    [despachar]
  );
  const mudarPreco = useCallback(
    (precoTroca: string) =>
      despachar({ mudanca: { precoTroca }, tipo: "campos" }),
    [despachar]
  );
  return (
    <div className="grid gap-5 p-5 md:grid-cols-2">
      <div className="grid gap-3">
        <Field className="w-auto" orientation="horizontal">
          <Switch
            checked={rascunho.precoTroca !== null}
            className={ALAVANCA}
            id={`${id}-troca`}
            onCheckedChange={ligarTroca}
          />
          <FieldLabel className={ROTULO} htmlFor={`${id}-troca`}>
            Aceita troca por pontos
          </FieldLabel>
        </Field>
        {rascunho.precoTroca === null ? null : (
          <div className="max-w-60">
            <CampoLido
              aoMudar={mudarPreco}
              id={ID.curso("precoTroca")}
              inputMode="numeric"
              placeholder="300"
              required
              rotulo="Preço em pontos"
              texto={rascunho.precoTroca}
            />
          </div>
        )}
      </div>
      <dl className="grid content-start gap-2">
        <dt className={ROTULO}>Código</dt>
        <dd
          className={cn(
            "text-sm",
            codigo === null ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {codigo ?? "Gerado ao salvar"}
        </dd>
      </dl>
    </div>
  );
}

function LinhaDoNivel({
  despachar,
  nivel,
}: {
  despachar: Despachar;
  nivel: RascunhoDoCurso["niveis"][number];
}) {
  const { ordem } = nivel;
  const id = ID.nivel(ordem);
  const { aria, mensagem } = useErroDoCampo(id);
  const renomear = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      despachar({ nome: e.target.value, ordem, tipo: "nivel_renomeado" }),
    [despachar, ordem]
  );
  const remover = useCallback(
    () => despachar({ ordem, tipo: "nivel_removido" }),
    [despachar, ordem]
  );
  return (
    <li>
      <Field className="gap-1.5" data-invalid={mensagem ? true : undefined}>
        <FieldLabel className={ROTULO} htmlFor={id}>
          Nível {ordem}
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            {...aria}
            autoComplete="off"
            className={cn(CAMPO, "min-w-0 flex-1")}
            id={id}
            maxLength={CARACTERES.nomeDoNivel}
            onChange={renomear}
            placeholder="Básico"
            required
            value={nivel.nome}
          />
          <Button
            aria-label={`Remover o nível ${ordem}. Os módulos dele ficam sem nível.`}
            className={ICONE}
            onClick={remover}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
        <ErroDoCampo id={id} mensagem={mensagem} />
      </Field>
    </li>
  );
}

function Niveis({
  despachar,
  niveis,
}: {
  despachar: Despachar;
  niveis: RascunhoDoCurso["niveis"];
}) {
  const proxima = proximaOrdem(niveis);
  const adicionar = useCallback(() => {
    despachar({ ordem: proxima, tipo: "nivel_novo" });
    focarDepois(ID.nivel(proxima));
  }, [despachar, proxima]);
  return (
    <div className="grid gap-4 p-5">
      {niveis.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Níveis agrupam módulos, como Básico e Avançado. Sem nível, os módulos
          aparecem numa lista só.
        </p>
      ) : (
        <ul className="grid gap-3">
          {niveis.map((n) => (
            <LinhaDoNivel despachar={despachar} key={n.ordem} nivel={n} />
          ))}
        </ul>
      )}
      <div>
        <Button className={cn(BOTAO_CONTORNO, PEQUENO)} onClick={adicionar}>
          <Plus aria-hidden="true" className="size-4" />
          Adicionar nível
        </Button>
      </div>
    </div>
  );
}

const lista = (itens: readonly string[]) =>
  new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(itens);

function motivosDoUso(uso: EdicaoDoCurso["uso"]): string[] {
  const aulas = Object.values(uso.assistidasPorAula).filter(
    (n) => n > 0
  ).length;
  return [
    uso.liberacoes > 0
      ? `já foi liberado ${plural(uso.liberacoes, "vez", "vezes")}`
      : null,
    uso.certificados > 0
      ? `tem ${plural(uso.certificados, "certificado", "certificados")}`
      : null,
    aulas > 0
      ? `tem ${plural(aulas, "aula assistida", "aulas assistidas")}`
      : null,
  ].filter((m): m is string => m !== null);
}

function ApagarCurso({
  edicao,
  linhaAberta,
}: {
  edicao: EdicaoDoCurso;
  linhaAberta: LinhaAberta;
}) {
  const router = useRouter();
  const { executar, pendente } = useAcao();
  const { id, titulo } = edicao.documento;
  const apagar = useCallback(
    () =>
      executar(() => trpcClient.admin.catalogo.apagarCurso.mutate({ id }), {
        depois: () => router.replace("/admin/catalogo"),
        sucesso: `${titulo} apagado.`,
      }),
    [executar, id, router, titulo]
  );
  if (!edicao.podeApagar) {
    return (
      <p className="max-w-[70ch] p-5 text-muted-foreground text-sm">
        O curso não se apaga porque {lista(motivosDoUso(edicao.uso))}. Para só
        tirar do ar, mude o status para Em produção e salve.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
      <p className="max-w-[60ch] text-muted-foreground text-sm">
        Ninguém usa este curso ainda. Apagar tira o curso, os módulos e as aulas
        de vez.
      </p>
      <ConfirmacaoNaLinha
        botao={{ nome: `Confirmar: apagar ${titulo}`, rotulo: "Apagar" }}
        chave="apagar-curso"
        className="flex flex-wrap items-center gap-2"
        confirmar={apagar}
        enviando={pendente}
        gatilho={{ nome: `Apagar ${titulo}`, rotulo: "Apagar curso" }}
        linhaAberta={linhaAberta}
        pergunta={
          <span className="text-foreground text-sm">
            Apagar o curso inteiro?
          </span>
        }
      />
    </div>
  );
}

export function EditorDoCurso({
  categorias,
  edicao,
}: {
  /** admin.categorias.lista, por nome. */
  categorias: readonly CategoriaNaLista[];
  edicao: EdicaoDoCurso;
}) {
  const { descartar, despachar, estado, pendente, salvar, tela, titulo } =
    useRascunhoDoEditor(edicao.documento);
  const { daGeracao, geracao, rascunho } = estado;
  const escolherCapa = useCallback(
    (arquivo: File | null) => despachar({ arquivo, tipo: "capa_escolhida" }),
    [despachar]
  );
  const saiuDoCampo = useCallback(
    (id: string) => despachar({ id, tipo: "saiu_do_campo" }),
    [despachar]
  );
  const linhaAberta: LinhaAberta = {
    chave: daGeracao.linha,
    fechar: (chave) => despachar({ chave, tipo: "linha_fechada" }),
    pedir: (chave) => despachar({ chave, tipo: "linha_pedida" }),
  };

  const mudarTitulo = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      despachar({ mudanca: { titulo: e.target.value }, tipo: "campos" }),
    [despachar]
  );
  const enviar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      salvar();
    },
    [salvar]
  );
  const mudarStatus = useCallback(
    (status: StatusDoCurso) =>
      despachar({ mudanca: { status }, tipo: "campos" }),
    [despachar]
  );
  const estadoDoSalvar: EstadoDoSalvar = {
    novo: tela.novo,
    pendente,
    problemas: tela.problemas,
    recarregar: descartar,
    sujo: tela.sujo,
    versaoMudou: tela.versaoMudou,
  };
  const formulario = useRef<HTMLFormElement>(null);
  useAtalhoDeSalvar(formulario, !nadaASalvar(estadoDoSalvar));

  return (
    <ErrosDoEditor value={tela.erros}>
      <SaiuDoCampo value={saiuDoCampo}>
        <form
          className="@container grid gap-10"
          noValidate
          onSubmit={enviar}
          ref={formulario}
        >
          <div className="grid @min-[960px]:grid-cols-[minmax(0,1fr)_300px] items-start gap-x-8 gap-y-10">
            <div className="grid min-w-0 gap-10">
              <h1
                className="text-balance font-bold text-3xl text-titulo tracking-tight"
                ref={titulo}
                tabIndex={-1}
              >
                {tela.novo
                  ? "Novo curso"
                  : rascunho.titulo.trim() || edicao.documento.titulo}
              </h1>

              <CapaEDescricao
                capa={
                  <CampoDeCapa
                    aoEscolher={escolherCapa}
                    arquivo={daGeracao.capa}
                    atual={edicao.capa}
                    key={geracao}
                  />
                }
                categorias={categorias}
                despachar={despachar}
                mudarTitulo={mudarTitulo}
                rascunho={rascunho}
                slug={edicao.slug}
              />

              <TopicosDoCurso
                despachar={despachar}
                topicos={rascunho.topicos}
              />

              <Secao
                id="publicacao"
                resumo={STATUS[rascunho.status].rotulo}
                titulo="Publicação"
              >
                <Publicacao
                  codigo={edicao.codigo}
                  despachar={despachar}
                  rascunho={rascunho}
                />
              </Secao>

              <Secao
                id="niveis"
                resumo={plural(rascunho.niveis.length, "nível", "níveis")}
                titulo="Níveis"
              >
                <Niveis despachar={despachar} niveis={rascunho.niveis} />
              </Secao>

              <ModulosDoCurso
                abertos={estado.abertos}
                assistidasPorAula={edicao.uso.assistidasPorAula}
                despachar={despachar}
                escolhas={estado.escolhas}
                linhaAberta={linhaAberta}
                marcados={tela.erros}
                rascunho={rascunho}
              />
            </div>
            <ColunaDePublicacao
              antes={antesDePublicar(
                rascunho,
                edicao.capa !== null || daGeracao.capa !== null
              )}
              aoMudarStatus={mudarStatus}
              descartar={descartar}
              estado={estadoDoSalvar}
              resumo={resumoDoCurso(rascunho)}
              secoes={secoesDoEditor(rascunho, tela.novo)}
              status={rascunho.status}
            />
            {/* Na coluna estreita, o Apagar vem depois do status; na larga, embaixo dos módulos. */}
            {tela.novo ? null : (
              <div className="min-w-0">
                <Secao id="apagar" resumo="" titulo="Apagar">
                  <ApagarCurso edicao={edicao} linhaAberta={linhaAberta} />
                </Secao>
              </div>
            )}
          </div>
          <BarraDeSalvar className="@min-[960px]:hidden" {...estadoDoSalvar} />
        </form>
      </SaiuDoCampo>
    </ErrosDoEditor>
  );
}
