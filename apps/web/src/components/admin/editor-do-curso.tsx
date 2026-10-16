"use client";

import type { CategoriaNaLista } from "@cursos/api/dominio/categoria";
import {
  CARACTERES,
  type EdicaoDoCurso,
  formularioDoCurso,
} from "@cursos/api/dominio/edicao-do-curso";
import type { StatusDoCurso } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { Switch } from "@cursos/ui/components/switch";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  useCallback,
  useId,
  useMemo,
  useReducer,
  useState,
} from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { ALAVANCA, CAMPO } from "@/components/casca/campos";
import { focarDepois, focarOPrimeiro } from "@/lib/editor";
import { fmtHoras, plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { useDaGeracao, useRascunhoApoiado } from "@/lib/use-rascunho-apoiado";
import { trpcClient } from "@/utils/trpc";

import { BarraDeSalvar } from "./barra-de-salvar";
import { CampoDeCapa } from "./campo-de-capa";
import { CampoDeTexto, CampoLido } from "./campo-lido";
import { ConfirmacaoNaLinha, type LinhaAberta } from "./confirmacao-na-linha";
import {
  ErroDoCampo,
  ErrosDoEditor,
  SaiuDoCampo,
  useErroDoCampo,
} from "./erros-do-editor";
import {
  type AcaoNosBlocos,
  abertosAoAbrir,
  abrirOsComErro,
  blocosAbertos,
  comGrupoDasLetrasTocado,
  despacharNosDois,
  donoDoCampo,
  escolhas,
  type Mudanca,
  NADA_ESCOLHIDO,
  problemasNaTela,
  proximaOrdem,
  REGRAS_DO_CURSO,
} from "./estado-do-editor";
import { ModulosDoCurso } from "./modulos-do-curso";
import { ICONE, ROTULO, Secao } from "./partes";
import { errosPorCampo, type Problema, recusaNaTela } from "./problemas";
import {
  ID,
  lerRascunho,
  type RascunhoDoCurso,
  type RecusaDoCurso,
  recusaDoMotivo,
  segundosDas,
} from "./rascunho-do-curso";
import { type OpcaoDaSelecao, Selecao } from "./selecao";
import { TopicosDoCurso } from "./topicos-do-curso";
import { Vitrine } from "./vitrine";

type Despachar = Dispatch<Mudanca>;

const STATUS: Record<StatusDoCurso, { descricao: string; rotulo: string }> = {
  em_producao: {
    descricao: "Fora do ar para quem não tem certificado.",
    rotulo: "Em produção",
  },
  publicado: {
    descricao: "Aberto para quem tem o curso liberado.",
    rotulo: "Publicado",
  },
};

const OPCOES_DO_STATUS: readonly OpcaoDaSelecao[] = Object.entries(STATUS).map(
  ([valor, { descricao, rotulo }]) => ({ descricao, rotulo, valor })
);

type CampoDeTextoDoCurso = "capaAlt" | "codigo" | "destaque" | "titulo";
const OPCIONAIS = new Set<CampoDeTextoDoCurso>(["codigo", "destaque"]);

function Publicacao({
  despachar,
  mudarTexto,
  rascunho,
}: {
  despachar: Despachar;
  mudarTexto: (e: ChangeEvent<HTMLInputElement>) => void;
  rascunho: RascunhoDoCurso;
}) {
  const id = useId();
  const mudarStatus = useCallback(
    (status: string) =>
      despachar({
        mudanca: { status: status as StatusDoCurso },
        tipo: "campos",
      }),
    [despachar]
  );
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
      <Field>
        <FieldLabel className={ROTULO} htmlFor={`${id}-status`}>
          Status
        </FieldLabel>
        <Selecao
          aoMudar={mudarStatus}
          aria-describedby={`${id}-status-descricao`}
          id={`${id}-status`}
          opcoes={OPCOES_DO_STATUS}
          valor={rascunho.status}
        />
        <FieldDescription className="text-xs" id={`${id}-status-descricao`}>
          {STATUS[rascunho.status].descricao}
        </FieldDescription>
      </Field>
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
      <CampoDeTexto
        id={ID.curso("codigo")}
        maxLength={CARACTERES.codigo}
        name="codigo"
        onChange={mudarTexto}
        placeholder="NR-12"
        rotulo={
          <>
            Código{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </>
        }
        value={rascunho.codigo ?? ""}
      />
      <CampoDeTexto
        ajuda="O card mostra o código; sem código, mostra o destaque."
        id={ID.curso("destaque")}
        maxLength={CARACTERES.destaque}
        name="destaque"
        onChange={mudarTexto}
        placeholder="Novo"
        rotulo={
          <>
            Destaque{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </>
        }
        value={rascunho.destaque ?? ""}
      />
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

const NENHUM_TOCADO: ReadonlySet<string> = new Set();

const SEM_CAPA: Problema = {
  campo: ID.curso("capa"),
  mensagem: "Escolha a imagem da capa.",
};

export function EditorDoCurso({
  categorias,
  edicao,
}: {
  /** admin.categorias.lista, por nome. */
  categorias: readonly CategoriaNaLista[];
  edicao: EdicaoDoCurso;
}) {
  const [capaGuardada, guardarCapa] = useState<{
    arquivo: File | null;
    geracao: number;
  }>({ arquivo: null, geracao: 0 });
  const {
    base,
    descartar,
    geracao,
    mudar: mudarRascunho,
    novo,
    pendente,
    rascunho,
    salvar,
    sujo,
    titulo,
    versaoMudou,
  } = useRascunhoApoiado({
    caminho: `/admin/catalogo/cursos/${edicao.documento.id}` as Route,
    pagina: edicao.documento,
    regras: REGRAS_DO_CURSO,
    sujoAlem: (g) =>
      capaGuardada.geracao === g && capaGuardada.arquivo !== null,
  });
  const [abertos, mudarBlocos] = useReducer(
    blocosAbertos,
    rascunho,
    abertosAoAbrir
  );
  const [escolhidas, mudarEscolhas] = useReducer(escolhas, NADA_ESCOLHIDO);
  const mudarTela = useCallback(
    (a: Extract<AcaoNosBlocos, { tipo: "mudou" }>) => {
      mudarBlocos(a);
      mudarEscolhas(a);
    },
    []
  );
  const despachar = useMemo(
    () => despacharNosDois(mudarRascunho, mudarTela),
    [mudarRascunho, mudarTela]
  );
  const capa = capaGuardada.geracao === geracao ? capaGuardada.arquivo : null;
  const escolherCapa = useCallback(
    (arquivo: File | null) =>
      guardarCapa((atual) => ({ ...atual, arquivo, geracao })),
    [geracao]
  );
  const [tentou, setTentou] = useDaGeracao<boolean>(geracao, false);
  const [tocados, setTocados] = useDaGeracao<ReadonlySet<string>>(
    geracao,
    NENHUM_TOCADO
  );
  const saiuDoCampo = useCallback(
    (id: string) =>
      setTocados((atual) => (atual.has(id) ? atual : new Set([...atual, id]))),
    [setTocados]
  );
  const [recusa, setRecusa] = useDaGeracao<RecusaDoCurso | null>(geracao, null);
  const [chave, pedir] = useDaGeracao<string | null>(geracao, null);
  const fechar = useCallback(
    (minha: string) => pedir((atual) => (atual === minha ? null : atual)),
    [pedir]
  );
  const linhaAberta: LinhaAberta = { chave, fechar, pedir };

  const semCapa = novo && capa === null ? [SEM_CAPA] : [];
  const lido = lerRascunho(rascunho, base);
  const problemas = problemasNaTela({
    achados: [...(lido.tipo === "problemas" ? lido.problemas : []), ...semCapa],
    recusa: recusaNaTela(recusa, rascunho, ID.curso),
    tentou,
    tocados: comGrupoDasLetrasTocado(tocados, rascunho),
  });
  const erros = errosPorCampo(problemas);
  // Nenhum erro fica num bloco fechado: o bloco abre no render em que o erro
  // aparece e continua aberto depois da correção.
  const abrir = abrirOsComErro(abertos, rascunho, erros);
  if (abrir) {
    mudarBlocos(abrir);
  }

  const mudarTexto = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const campo = e.target.name as CampoDeTextoDoCurso;
      const valor = e.target.value;
      despachar({
        mudanca: {
          [campo]: OPCIONAIS.has(campo) && valor === "" ? null : valor,
        },
        tipo: "campos",
      });
    },
    [despachar]
  );

  const enviar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const achados = [
        ...(lido.tipo === "problemas" ? lido.problemas : []),
        ...semCapa,
      ];
      if (lido.tipo === "problemas" || achados.length > 0) {
        setTentou(true);
        const campos = achados.flatMap((p) => (p.campo ? [p.campo] : []));
        const dono = campos[0] ? donoDoCampo(rascunho, campos[0]) : null;
        if (dono) {
          mudarEscolhas({ dono, tipo: "campo_mostrado" });
        }
        focarOPrimeiro(campos);
        return;
      }
      setTentou(false);
      setRecusa(null);
      const enviada = capa;
      salvar(
        lido.documento,
        () =>
          trpcClient.admin.catalogo.salvarCurso.mutate(
            formularioDoCurso(lido.documento, enviada)
          ),
        {
          aoRecusar: (motivo) => {
            const r = recusaDoMotivo(motivo, rascunho);
            setRecusa(r);
            if (r) {
              document.getElementById(ID.curso(r.campo))?.focus();
            }
          },
          // A capa escolhida durante o salvar fica para o próximo.
          aoSalvar: () =>
            guardarCapa((atual) =>
              atual.arquivo === enviada ? { ...atual, arquivo: null } : atual
            ),
          sucesso: "Curso salvo.",
        }
      );
    },
    [capa, lido, rascunho, salvar, semCapa, setRecusa, setTentou]
  );

  const aulas = rascunho.modulos.reduce((s, m) => s + m.aulas.length, 0);
  const duracao = rascunho.modulos.reduce(
    (s, m) => s + segundosDas(m.aulas),
    0
  );
  return (
    <ErrosDoEditor value={erros}>
      <SaiuDoCampo value={saiuDoCampo}>
        <form
          className="mx-auto grid max-w-5xl gap-10"
          noValidate
          onSubmit={enviar}
        >
          <div>
            <Link
              className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full pr-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="/admin/catalogo"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Catálogo
            </Link>
            <header className="grid gap-1.5">
              <h1
                className="text-balance font-bold text-3xl text-titulo tracking-tight"
                ref={titulo}
                tabIndex={-1}
              >
                {rascunho.titulo.trim() || "Curso novo"}
              </h1>
              <p className="text-muted-foreground tabular-nums">
                {plural(rascunho.modulos.length, "módulo", "módulos")},{" "}
                {plural(aulas, "aula", "aulas")}
                {duracao > 0 ? `, ${fmtHoras(duracao)}` : ""}
              </p>
            </header>
          </div>

          <Vitrine
            capa={
              <CampoDeCapa
                alt={rascunho.capaAlt}
                aoEscolher={escolherCapa}
                arquivo={capa}
                atual={edicao.capa}
                geracao={geracao}
                mudarAlt={mudarTexto}
              />
            }
            categorias={categorias}
            despachar={despachar}
            mudarTexto={mudarTexto}
            rascunho={rascunho}
            slug={edicao.slug}
          />

          <TopicosDoCurso despachar={despachar} topicos={rascunho.topicos} />

          <Secao
            id="publicacao"
            resumo={STATUS[rascunho.status].rotulo}
            titulo="Publicação"
          >
            <Publicacao
              despachar={despachar}
              mudarTexto={mudarTexto}
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
            abertos={abertos}
            assistidasPorAula={edicao.uso.assistidasPorAula}
            despachar={despachar}
            escolhas={escolhidas}
            linhaAberta={linhaAberta}
            marcados={erros}
            mudarBlocos={mudarBlocos}
            mudarEscolhas={mudarEscolhas}
            rascunho={rascunho}
          />

          {novo ? null : (
            <Secao id="apagar" resumo="" titulo="Apagar">
              <ApagarCurso edicao={edicao} linhaAberta={linhaAberta} />
            </Secao>
          )}

          <BarraDeSalvar
            novo={novo}
            pendente={pendente}
            problemas={problemas}
            recarregar={descartar}
            sujo={sujo}
            versaoMudou={versaoMudou}
          />
        </form>
      </SaiuDoCampo>
    </ErrosDoEditor>
  );
}
