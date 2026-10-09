"use client";

import {
  CARACTERES,
  type EdicaoDoCurso,
  FORMATO_DO_SLUG,
  formularioDoCurso,
} from "@cursos/api/dominio/edicao-do-curso";
import type { ModuloId, StatusDoCurso } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@cursos/ui/components/native-select";
import { Switch } from "@cursos/ui/components/switch";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft, Plus, Trash2, TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  useCallback,
  useId,
  useReducer,
  useState,
} from "react";

import { BOTAO, BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import {
  apoioEm,
  apoioSalvo,
  focarDepois,
  focarOPrimeiro,
  novoId,
  sincronizarComAPagina,
} from "@/lib/editor";
import { fmtHoras, plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { useGuardaDeSaida } from "@/lib/use-guarda-de-saida";
import {
  useSalvarDocumento,
  useTituloComFoco,
} from "@/lib/use-salvar-documento";
import { trpcClient } from "@/utils/trpc";

import { AvisoDeVersaoMudou } from "./aviso-de-versao-mudou";
import { CampoDeCapa } from "./campo-de-capa";
import { CampoDeTexto, CampoLido } from "./campo-lido";
import {
  Carregando,
  ConfirmacaoNaLinha,
  type LinhaAberta,
} from "./confirmacao-na-linha";
import { ErroDoCampo, ErrosDoEditor, useErroDoCampo } from "./erros-do-editor";
import { type Mudanca, mudar, proximaOrdem } from "./estado-do-editor";
import { BlocoDoModulo } from "./modulos-do-curso";
import { AVISO, CAMPO, ICONE, ROTULO, SELECAO, Secao, Vazio } from "./partes";
import {
  ID,
  lerPreco,
  lerRascunho,
  mesmoRascunho,
  type Problema,
  problemasDaRecusa,
  type RascunhoDoCurso,
  type Recusa,
  rascunhoDoCurso,
  recusaDoMotivo,
  segundosDas,
} from "./rascunho-do-curso";

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

type CampoDeTextoDoCurso =
  | "capaAlt"
  | "codigo"
  | "destaque"
  | "slug"
  | "tema"
  | "titulo";
const OPCIONAIS = new Set<CampoDeTextoDoCurso>(["codigo", "destaque"]);

function CampoDoSlug({
  mudarTexto,
  slug,
  slugSalvo,
}: {
  mudarTexto: (e: ChangeEvent<HTMLInputElement>) => void;
  slug: string;
  slugSalvo: string | null;
}) {
  const id = ID.curso("slug");
  const { aria, mensagem } = useErroDoCampo(id, `${id}-regra`);
  const slugMudou = slugSalvo !== null && slug !== slugSalvo;
  return (
    <Field className="md:col-span-2" data-invalid={mensagem ? true : undefined}>
      <FieldLabel className={ROTULO} htmlFor={id}>
        Endereço
      </FieldLabel>
      <div className="flex min-w-0 items-center rounded-[12px] border border-muted-foreground bg-background has-aria-invalid:border-destructive has-focus-visible:outline-2 has-focus-visible:outline-ceu has-focus-visible:outline-solid has-focus-visible:outline-offset-2">
        <span
          aria-hidden="true"
          className="shrink-0 pl-3.5 text-muted-foreground text-sm"
        >
          /cursos/
        </span>
        <Input
          {...aria}
          autoCapitalize="none"
          autoComplete="off"
          className="h-11 min-w-0 border-0 bg-transparent pl-0.5 text-sm focus-visible:ring-0 aria-invalid:ring-0 md:text-sm dark:bg-transparent dark:aria-invalid:ring-0"
          id={id}
          maxLength={CARACTERES.slug}
          name="slug"
          onChange={mudarTexto}
          pattern={FORMATO_DO_SLUG}
          placeholder="operacao-envasadora"
          required
          spellCheck={false}
          value={slug}
        />
      </div>
      <FieldDescription className="text-xs" id={`${id}-regra`}>
        Letras minúsculas, números e hífen, sem espaço. É o link do curso para o
        aluno.
      </FieldDescription>
      <ErroDoCampo id={id} mensagem={mensagem} />
      {slugMudou ? (
        <p className={AVISO} role="status">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-sol"
          />
          <span>
            Ao salvar, o link antigo{" "}
            <span className="font-semibold">/cursos/{slugSalvo}</span> deixa de
            abrir. Quem guardou esse link cai na página de não encontrado.
          </span>
        </p>
      ) : null}
    </Field>
  );
}

function CamposDoCurso({
  despachar,
  mudarTexto,
  rascunho,
  slugSalvo,
}: {
  despachar: Despachar;
  mudarTexto: (e: ChangeEvent<HTMLInputElement>) => void;
  rascunho: RascunhoDoCurso;
  slugSalvo: string | null;
}) {
  const id = useId();
  const mudarStatus = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) =>
      despachar({
        mudanca: { status: e.target.value as StatusDoCurso },
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
      <CampoDeTexto
        campoClasse="md:col-span-2"
        id={ID.curso("titulo")}
        maxLength={CARACTERES.titulo}
        name="titulo"
        onChange={mudarTexto}
        placeholder="Operação da envasadora volumétrica"
        required
        rotulo="Título"
        value={rascunho.titulo}
      />
      <CampoDoSlug
        mudarTexto={mudarTexto}
        slug={rascunho.slug}
        slugSalvo={slugSalvo}
      />
      <CampoDeTexto
        id={ID.curso("tema")}
        maxLength={CARACTERES.tema}
        name="tema"
        onChange={mudarTexto}
        placeholder="Máquinas"
        required
        rotulo="Tema"
        value={rascunho.tema}
      />
      <Field>
        <FieldLabel className={ROTULO} htmlFor={`${id}-status`}>
          Status
        </FieldLabel>
        <NativeSelect
          aria-describedby={`${id}-status-descricao`}
          className={SELECAO}
          id={`${id}-status`}
          onChange={mudarStatus}
          value={rascunho.status}
        >
          <NativeSelectOption value="em_producao">
            {STATUS.em_producao.rotulo}
          </NativeSelectOption>
          <NativeSelectOption value="publicado">
            {STATUS.publicado.rotulo}
          </NativeSelectOption>
        </NativeSelect>
        <FieldDescription className="text-xs" id={`${id}-status-descricao`}>
          {STATUS[rascunho.status].descricao}
        </FieldDescription>
      </Field>
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
      <div className="grid gap-3 md:col-span-2">
        <Field className="w-auto" orientation="horizontal">
          <Switch
            checked={rascunho.precoTroca !== null}
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
              ler={lerPreco}
              placeholder="300"
              required
              rotulo="Preço em pontos"
              texto={rascunho.precoTroca}
            />
          </div>
        )}
      </div>
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
            className={cn(CAMPO, "h-11 min-w-0 flex-1 md:h-10")}
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
    uso.trilha ? `está na trilha ${uso.trilha.titulo}` : null,
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
    const motivos = motivosDoUso(edicao.uso);
    const soATrilha = edicao.uso.trilha !== null && motivos.length === 1;
    return (
      <p className="max-w-[70ch] p-5 text-muted-foreground text-sm">
        O curso não se apaga porque {lista(motivos)}.{" "}
        {soATrilha
          ? "Para apagar, tire o curso dessa trilha e volte aqui. "
          : null}
        Para só tirar do ar, mude o status para Em produção e salve.
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

function Situacao({
  novo,
  problemas,
  sujo,
}: {
  novo: boolean;
  problemas: readonly Problema[];
  sujo: boolean;
}) {
  const marcados = problemas.filter((p) => p.campo !== null).length;
  const frases = problemas
    .filter((p) => p.campo === null)
    .map((p) => p.mensagem);
  if (marcados > 0 || frases.length > 0) {
    return (
      <ul className="grid gap-0.5 text-destructive">
        {marcados > 0 ? (
          <li>
            Confira {plural(marcados, "campo marcado", "campos marcados")}.
          </li>
        ) : null}
        {frases.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    );
  }
  let texto = "Tudo salvo.";
  if (novo) {
    texto = "Rascunho. Os alunos não veem nada até você salvar.";
  } else if (sujo) {
    texto = "Alterações não salvas.";
  }
  return <p className="text-muted-foreground">{texto}</p>;
}

const SEM_CAPA: Problema = {
  campo: ID.curso("capa"),
  mensagem: "Escolha a imagem da capa.",
};

export function EditorDoCurso({ edicao }: { edicao: EdicaoDoCurso }) {
  const [apoio, setApoio] = useState(() => apoioEm(edicao.documento, 0));
  const novo = apoio.base.versao === null;
  const { descartes, pendente, recarregar, salvar, versaoMudou } =
    useSalvarDocumento({
      caminho: `/admin/catalogo/cursos/${edicao.documento.id}` as Route,
      novo,
    });
  const titulo = useTituloComFoco<HTMLHeadingElement>();
  const [rascunho, despachar] = useReducer(
    mudar,
    edicao.documento,
    rascunhoDoCurso
  );
  const [capa, setCapa] = useState<{ arquivo: File | null; montagem: number }>({
    arquivo: null,
    montagem: 0,
  });
  const escolherCapa = useCallback(
    (arquivo: File | null) => setCapa((atual) => ({ ...atual, arquivo })),
    []
  );
  const [tentou, setTentou] = useState(false);
  const [recusa, setRecusa] = useState<Recusa | null>(null);
  const [chave, pedir] = useState<string | null>(null);
  const fechar = useCallback(
    (minha: string) => pedir((atual) => (atual === minha ? null : atual)),
    []
  );
  const linhaAberta: LinhaAberta = { chave, fechar, pedir };
  const sujo =
    capa.arquivo !== null ||
    !mesmoRascunho(rascunhoDoCurso(apoio.base), rascunho);
  if (edicao.documento !== apoio.pagina || descartes !== apoio.descartes) {
    const s = sincronizarComAPagina(apoio, {
      descartes,
      limpo: !sujo,
      pagina: edicao.documento,
    });
    setApoio(s.apoio);
    if (s.recomecar) {
      despachar({ documento: s.apoio.base, tipo: "recomecado" });
      setCapa((atual) => ({ arquivo: null, montagem: atual.montagem + 1 }));
      setTentou(false);
      setRecusa(null);
      pedir(null);
    }
  }
  useGuardaDeSaida(sujo);

  const semCapa = novo && capa.arquivo === null ? [SEM_CAPA] : [];
  const lido = lerRascunho(rascunho);
  const problemas = [
    ...(tentou && lido.tipo === "problemas" ? lido.problemas : []),
    ...(tentou ? semCapa : []),
    ...problemasDaRecusa(recusa, rascunho),
  ];
  const erros = new Map(
    problemas.flatMap((p) => (p.campo ? [[p.campo, p.mensagem] as const] : []))
  );

  const mudarTexto = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const campo = e.target.name as CampoDeTextoDoCurso;
    const valor = e.target.value;
    despachar({
      mudanca: { [campo]: OPCIONAIS.has(campo) && valor === "" ? null : valor },
      tipo: "campos",
    });
  }, []);

  const enviar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const achados = [
        ...(lido.tipo === "problemas" ? lido.problemas : []),
        ...semCapa,
      ];
      if (lido.tipo === "problemas" || achados.length > 0) {
        setTentou(true);
        focarOPrimeiro(achados.flatMap((p) => (p.campo ? [p.campo] : [])));
        return;
      }
      setTentou(false);
      setRecusa(null);
      const enviada = capa.arquivo;
      salvar(
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
          aoSalvar: ({ versao }) => {
            const gravado = { ...lido.documento, versao };
            setApoio((atual) => apoioSalvo(atual, gravado));
            despachar({ documento: gravado, enviado: rascunho, tipo: "salvo" });
            setCapa((atual) =>
              atual.arquivo === enviada
                ? { arquivo: null, montagem: atual.montagem + 1 }
                : atual
            );
          },
          sucesso: "Curso salvo.",
        }
      );
    },
    [capa.arquivo, lido, rascunho, salvar, semCapa]
  );

  const adicionarModulo = useCallback(() => {
    const id = novoId<ModuloId>();
    despachar({ id, tipo: "modulo_novo" });
    focarDepois(ID.modulo(id, "titulo"));
  }, []);

  // O aviso sai do DOM com o botão Recarregar, e o foco cairia no <body>.
  const descartar = useCallback(() => {
    recarregar();
    titulo.current?.focus({ preventScroll: true });
  }, [recarregar, titulo]);

  const aulas = rascunho.modulos.reduce((s, m) => s + m.aulas.length, 0);
  const duracao = rascunho.modulos.reduce(
    (s, m) => s + segundosDas(m.aulas),
    0
  );
  return (
    <ErrosDoEditor value={erros}>
      <form
        className="mx-auto grid max-w-5xl gap-10"
        noValidate
        onSubmit={enviar}
      >
        <div>
          <Link
            className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full pr-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2"
            href="/admin/catalogo"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Catálogo
          </Link>
          <header className="grid gap-1.5">
            <h1
              className="text-balance font-bold text-3xl text-titulo tracking-tight focus:outline-none"
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

        <Secao
          id="curso"
          resumo={STATUS[rascunho.status].rotulo}
          titulo="Curso"
        >
          <CamposDoCurso
            despachar={despachar}
            mudarTexto={mudarTexto}
            rascunho={rascunho}
            slugSalvo={novo ? null : apoio.base.slug}
          />
        </Secao>

        <Secao
          id="capa"
          resumo={novo && !capa.arquivo ? "Obrigatória" : "JPG, PNG ou WebP"}
          titulo="Capa"
        >
          <CampoDeCapa
            alt={rascunho.capaAlt}
            aoEscolher={escolherCapa}
            atual={edicao.capa}
            key={capa.montagem}
            mudarAlt={mudarTexto}
          />
        </Secao>

        <Secao
          id="niveis"
          resumo={plural(rascunho.niveis.length, "nível", "níveis")}
          titulo="Níveis"
        >
          <Niveis despachar={despachar} niveis={rascunho.niveis} />
        </Secao>

        <Secao
          id="modulos"
          resumo={`${plural(rascunho.modulos.length, "módulo", "módulos")}, ${plural(aulas, "aula", "aulas")}`}
          titulo="Módulos e aulas"
        >
          {rascunho.modulos.length === 0 ? (
            <Vazio>
              O curso ainda não tem módulos. Cada módulo agrupa aulas, e o aluno
              vê o número dele.
            </Vazio>
          ) : (
            rascunho.modulos.map((m, i) => (
              <BlocoDoModulo
                assistidasPorAula={edicao.uso.assistidasPorAula}
                despachar={despachar}
                indice={i}
                key={m.id}
                linhaAberta={linhaAberta}
                modulo={m}
                modulos={rascunho.modulos}
                niveis={rascunho.niveis}
              />
            ))
          )}
          <div className="border-border border-t px-5 py-4">
            <Button
              className={cn(BOTAO_CONTORNO, PEQUENO)}
              onClick={adicionarModulo}
            >
              <Plus aria-hidden="true" className="size-4" />
              Adicionar módulo
            </Button>
          </div>
        </Secao>

        {novo ? null : (
          <Secao id="apagar" resumo="" titulo="Apagar">
            <ApagarCurso edicao={edicao} linhaAberta={linhaAberta} />
          </Secao>
        )}

        <div className="sticky bottom-3 z-10 grid gap-3 rounded-[20px] bg-card/95 px-4 py-3 shadow-[0_10px_30px_rgb(0_0_0/0.45)] ring-1 ring-border backdrop-blur-sm md:px-5">
          {versaoMudou || apoio.versaoDeFora ? (
            <AvisoDeVersaoMudou oQue="este curso" recarregar={descartar} />
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div aria-live="polite" className="min-w-0 flex-1 text-sm">
              <Situacao novo={novo} problemas={problemas} sujo={sujo} />
            </div>
            <Button
              aria-busy={pendente}
              className={cn(BOTAO, "disabled:opacity-100")}
              disabled={pendente}
              focusableWhenDisabled
              type="submit"
            >
              <Carregando ativo={pendente} />
              Salvar
            </Button>
          </div>
        </div>
      </form>
    </ErrosDoEditor>
  );
}
