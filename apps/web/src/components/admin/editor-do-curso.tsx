"use client";

import {
  type DocumentoDoCurso,
  documentoDoCurso,
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
import { TRPCClientError } from "@trpc/client";
import { ArrowLeft, Plus, Trash2, TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useReducer,
  useState,
} from "react";

import { BOTAO, BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { fmtHoras, plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import { CampoDeCapa } from "./campo-de-capa";
import { CampoLido, lerPreco } from "./campo-lido";
import {
  Carregando,
  ConfirmacaoNaLinha,
  type LinhaAberta,
} from "./confirmacao-na-linha";
import { type Edicao, editar } from "./estado-do-editor";
import { BlocoDoModulo, focarDepois, novoId } from "./modulos-do-curso";
import { CAMPO, ICONE, ROTULO, SELECAO, Secao, Vazio } from "./partes";

type Despachar = Dispatch<Edicao>;

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

const AVISO =
  "flex gap-2.5 rounded-[14px] bg-sol/10 p-3.5 text-foreground text-sm ring-1 ring-sol/40";

/** Os campos de texto do curso; o nome do input é o nome no documento. */
type CampoDeTexto =
  | "capaAlt"
  | "codigo"
  | "destaque"
  | "slug"
  | "tema"
  | "titulo";
const OPCIONAIS = new Set<CampoDeTexto>(["codigo", "destaque"]);

function CamposDoCurso({
  despachar,
  documento,
  mudarTexto,
  slugSalvo,
}: {
  despachar: Despachar;
  documento: DocumentoDoCurso;
  mudarTexto: (e: ChangeEvent<HTMLInputElement>) => void;
  /** null no curso novo: ainda não há link antigo para quebrar. */
  slugSalvo: string | null;
}) {
  const id = useId();
  const [aceitaTroca, setAceitaTroca] = useState(documento.precoTroca !== null);
  const mudarStatus = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) =>
      despachar({
        mudanca: { status: e.target.value as StatusDoCurso },
        tipo: "campos",
      }),
    [despachar]
  );
  const ligarTroca = useCallback(
    (ligado: boolean) => {
      setAceitaTroca(ligado);
      if (!ligado) {
        despachar({ mudanca: { precoTroca: null }, tipo: "campos" });
      }
    },
    [despachar]
  );
  const mudarPreco = useCallback(
    (precoTroca: number) =>
      despachar({ mudanca: { precoTroca }, tipo: "campos" }),
    [despachar]
  );
  const slugMudou = slugSalvo !== null && documento.slug !== slugSalvo;
  return (
    <div className="grid gap-5 p-5 md:grid-cols-2">
      <Field className="md:col-span-2">
        <FieldLabel className={ROTULO} htmlFor={`${id}-titulo`}>
          Título
        </FieldLabel>
        <Input
          autoComplete="off"
          className={cn(CAMPO, "h-11")}
          id={`${id}-titulo`}
          maxLength={120}
          name="titulo"
          onChange={mudarTexto}
          placeholder="Operação da envasadora volumétrica"
          required
          value={documento.titulo}
        />
      </Field>
      <Field className="md:col-span-2">
        <FieldLabel className={ROTULO} htmlFor={`${id}-slug`}>
          Endereço
        </FieldLabel>
        <div className="flex min-w-0 items-center rounded-[12px] border border-muted-foreground bg-background has-focus-visible:outline-2 has-focus-visible:outline-ceu has-focus-visible:outline-solid has-focus-visible:outline-offset-2">
          <span
            aria-hidden="true"
            className="shrink-0 pl-3.5 text-muted-foreground text-sm"
          >
            /cursos/
          </span>
          <Input
            aria-describedby={`${id}-slug-regra`}
            autoComplete="off"
            className="h-11 min-w-0 border-0 bg-transparent pl-0.5 text-sm focus-visible:ring-0 md:text-sm dark:bg-transparent"
            id={`${id}-slug`}
            maxLength={80}
            name="slug"
            onChange={mudarTexto}
            pattern={FORMATO_DO_SLUG}
            placeholder="operacao-envasadora"
            required
            title="Letras minúsculas, números e hífen, sem espaço."
            value={documento.slug}
          />
        </div>
        <FieldDescription className="text-xs" id={`${id}-slug-regra`}>
          Letras minúsculas, números e hífen, sem espaço. É o link do curso para
          o aluno.
        </FieldDescription>
        {slugMudou ? (
          <p className={AVISO} role="status">
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-sol"
            />
            <span>
              Ao salvar, o link antigo{" "}
              <span className="font-semibold">/cursos/{slugSalvo}</span> deixa
              de abrir. Quem guardou esse link cai na página de não encontrado.
            </span>
          </p>
        ) : null}
      </Field>
      <Field>
        <FieldLabel className={ROTULO} htmlFor={`${id}-tema`}>
          Tema
        </FieldLabel>
        <Input
          autoComplete="off"
          className={cn(CAMPO, "h-11")}
          id={`${id}-tema`}
          maxLength={80}
          name="tema"
          onChange={mudarTexto}
          placeholder="Máquinas"
          required
          value={documento.tema}
        />
      </Field>
      <Field>
        <FieldLabel className={ROTULO} htmlFor={`${id}-status`}>
          Status
        </FieldLabel>
        <NativeSelect
          aria-describedby={`${id}-status-descricao`}
          className={SELECAO}
          id={`${id}-status`}
          onChange={mudarStatus}
          value={documento.status}
        >
          <NativeSelectOption value="em_producao">
            {STATUS.em_producao.rotulo}
          </NativeSelectOption>
          <NativeSelectOption value="publicado">
            {STATUS.publicado.rotulo}
          </NativeSelectOption>
        </NativeSelect>
        <FieldDescription className="text-xs" id={`${id}-status-descricao`}>
          {STATUS[documento.status].descricao}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel className={ROTULO} htmlFor={`${id}-codigo`}>
          Código{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </FieldLabel>
        <Input
          autoComplete="off"
          className={cn(CAMPO, "h-11")}
          id={`${id}-codigo`}
          maxLength={40}
          name="codigo"
          onChange={mudarTexto}
          placeholder="NR-12"
          value={documento.codigo ?? ""}
        />
      </Field>
      <Field>
        <FieldLabel className={ROTULO} htmlFor={`${id}-destaque`}>
          Destaque{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </FieldLabel>
        <Input
          aria-describedby={`${id}-destaque-descricao`}
          autoComplete="off"
          className={cn(CAMPO, "h-11")}
          id={`${id}-destaque`}
          maxLength={60}
          name="destaque"
          onChange={mudarTexto}
          placeholder="Novo"
          value={documento.destaque ?? ""}
        />
        <FieldDescription className="text-xs" id={`${id}-destaque-descricao`}>
          O card mostra o código; sem código, mostra o destaque.
        </FieldDescription>
      </Field>
      <div className="grid gap-3 md:col-span-2">
        <Field className="w-auto" orientation="horizontal">
          <Switch
            checked={aceitaTroca}
            id={`${id}-troca`}
            onCheckedChange={ligarTroca}
          />
          <FieldLabel className={ROTULO} htmlFor={`${id}-troca`}>
            Aceita troca por pontos
          </FieldLabel>
        </Field>
        {aceitaTroca ? (
          <div className="max-w-60">
            <CampoLido
              aoLer={mudarPreco}
              inicial={
                documento.precoTroca === null
                  ? ""
                  : String(documento.precoTroca)
              }
              inputMode="numeric"
              ler={lerPreco}
              placeholder="300"
              required
              rotulo="Preço em pontos"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LinhaDoNivel({
  despachar,
  nivel,
}: {
  despachar: Despachar;
  nivel: DocumentoDoCurso["niveis"][number];
}) {
  const { ordem } = nivel;
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
    <li className="flex items-end gap-2">
      <Field className="min-w-0 flex-1 gap-1.5">
        <FieldLabel className={ROTULO} htmlFor={`nivel-${ordem}`}>
          Nível {ordem}
        </FieldLabel>
        <Input
          autoComplete="off"
          className={cn(CAMPO, "h-11 md:h-10")}
          id={`nivel-${ordem}`}
          maxLength={60}
          onChange={renomear}
          placeholder="Básico"
          required
          value={nivel.nome}
        />
      </Field>
      <Button
        aria-label={`Remover o nível ${ordem}. Os módulos dele ficam sem nível.`}
        className={ICONE}
        onClick={remover}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </li>
  );
}

function Niveis({
  despachar,
  niveis,
}: {
  despachar: Despachar;
  niveis: DocumentoDoCurso["niveis"];
}) {
  const proxima = Math.max(0, ...niveis.map((n) => n.ordem)) + 1;
  const adicionar = useCallback(() => {
    despachar({ nome: "", tipo: "nivel_novo" });
    focarDepois(`nivel-${proxima}`);
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

const motivoDe = (e: unknown) =>
  e instanceof TRPCClientError ? (e.data?.motivo ?? null) : null;

/** O zod só chega aqui com o que o formulário não confere sozinho. */
function problemasDe(documento: DocumentoDoCurso): string[] {
  const lido = documentoDoCurso.safeParse(documento);
  if (lido.success) {
    return [];
  }
  return [
    ...new Set(
      lido.error.issues.map((i) =>
        i.code === "custom" ? i.message : "Confira os campos marcados."
      )
    ),
  ];
}

const lista = (itens: readonly string[]) =>
  new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(itens);

function motivosDoUso(uso: EdicaoDoCurso["uso"]): string {
  const aulas = Object.values(uso.assistidasPorAula).filter(
    (n) => n > 0
  ).length;
  return lista(
    [
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
    ].filter((m): m is string => m !== null)
  );
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
        O curso não se apaga porque {motivosDoUso(edicao.uso)}. Para tirar do
        ar, mude o status para Em produção e salve.
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
  conflito,
  novo,
  problemas,
  sujo,
}: {
  conflito: boolean;
  novo: boolean;
  problemas: readonly string[];
  sujo: boolean;
}) {
  if (conflito) {
    return (
      <p className="flex items-start gap-2 text-foreground">
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-sol"
        />
        <span>
          Outra pessoa salvou este curso depois que você abriu. Recarregar traz
          a versão dela e descarta o que você mudou aqui.
        </span>
      </p>
    );
  }
  if (problemas.length > 0) {
    return (
      <ul className="grid gap-0.5 text-destructive">
        {problemas.map((p) => (
          <li key={p}>{p}</li>
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

/**
 * O curso inteiro num formulário, salvo de uma vez com a capa. O documento vive
 * no reducer; a página remonta o editor pela versão depois de salvar.
 */
export function EditorDoCurso({ edicao }: { edicao: EdicaoDoCurso }) {
  const router = useRouter();
  const { executar, pendente } = useAcao();
  const [documento, despachar] = useReducer(editar, edicao.documento);
  const [capa, setCapa] = useState<File | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [conflito, setConflito] = useState(false);
  const [chave, pedir] = useState<string | null>(null);
  const fechar = useCallback(
    (minha: string) => pedir((atual) => (atual === minha ? null : atual)),
    []
  );
  const linhaAberta: LinhaAberta = { chave, fechar, pedir };
  const novo = edicao.documento.versao === null;
  const sujo =
    capa !== null ||
    JSON.stringify(documento) !== JSON.stringify(edicao.documento);

  useEffect(() => {
    if (!sujo) {
      return;
    }
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);

  const mudarTexto = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const campo = e.target.name as CampoDeTexto;
    const valor = e.target.value;
    despachar({
      mudanca: { [campo]: OPCIONAIS.has(campo) && valor === "" ? null : valor },
      tipo: "campos",
    });
  }, []);

  const salvar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const achados = problemasDe(documento);
      setProblemas(achados);
      if (achados.length > 0) {
        return;
      }
      setConflito(false);
      executar(
        () =>
          trpcClient.admin.catalogo.salvarCurso.mutate(
            formularioDoCurso(documento, capa)
          ),
        {
          depois: () => {
            if (novo) {
              router.replace(`/admin/catalogo/cursos/${documento.id}` as Route);
            }
          },
          naRecusa: (erro) => setConflito(motivoDe(erro) === "versao_mudou"),
          sucesso: "Curso salvo.",
        }
      );
    },
    [capa, documento, executar, novo, router]
  );

  const adicionarModulo = useCallback(() => {
    const id = novoId<ModuloId>();
    despachar({ id, tipo: "modulo_novo" });
    focarDepois(`modulo-${id}-titulo`);
  }, []);

  const recarregar = useCallback(() => router.refresh(), [router]);

  const aulas = documento.modulos.reduce((s, m) => s + m.aulas.length, 0);
  const duracao = documento.modulos.reduce(
    (s, m) => s + m.aulas.reduce((t, a) => t + a.duracaoSeg, 0),
    0
  );
  return (
    <form className="mx-auto grid max-w-5xl gap-10" onSubmit={salvar}>
      <div>
        <Link
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full pr-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2"
          href="/admin/catalogo"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Catálogo
        </Link>
        <header className="grid gap-1.5">
          <h1 className="text-balance font-bold text-3xl text-titulo tracking-tight">
            {documento.titulo.trim() || "Curso novo"}
          </h1>
          <p className="text-muted-foreground tabular-nums">
            {plural(documento.modulos.length, "módulo", "módulos")},{" "}
            {plural(aulas, "aula", "aulas")}
            {duracao > 0 ? `, ${fmtHoras(duracao)}` : ""}
          </p>
        </header>
      </div>

      <Secao id="curso" resumo={STATUS[documento.status].rotulo} titulo="Curso">
        <CamposDoCurso
          despachar={despachar}
          documento={documento}
          mudarTexto={mudarTexto}
          slugSalvo={novo ? null : edicao.documento.slug}
        />
      </Secao>

      <Secao
        id="capa"
        resumo={novo && !capa ? "Obrigatória" : "JPG, PNG ou WebP"}
        titulo="Capa"
      >
        <CampoDeCapa
          alt={documento.capaAlt}
          aoEscolher={setCapa}
          atual={edicao.capa}
          mudarAlt={mudarTexto}
        />
      </Secao>

      <Secao
        id="niveis"
        resumo={plural(documento.niveis.length, "nível", "níveis")}
        titulo="Níveis"
      >
        <Niveis despachar={despachar} niveis={documento.niveis} />
      </Secao>

      <Secao
        id="modulos"
        resumo={`${plural(documento.modulos.length, "módulo", "módulos")}, ${plural(aulas, "aula", "aulas")}`}
        titulo="Módulos e aulas"
      >
        {documento.modulos.length === 0 ? (
          <Vazio>
            O curso ainda não tem módulos. Cada módulo agrupa aulas, e o aluno
            vê o número dele.
          </Vazio>
        ) : (
          documento.modulos.map((m, i) => (
            <BlocoDoModulo
              assistidasPorAula={edicao.uso.assistidasPorAula}
              despachar={despachar}
              indice={i}
              key={m.id}
              linhaAberta={linhaAberta}
              modulo={m}
              modulos={documento.modulos}
              niveis={documento.niveis}
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

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-card/95 px-4 py-3 shadow-[0_10px_30px_rgb(0_0_0/0.45)] ring-1 ring-border backdrop-blur-sm md:px-5">
        <div aria-live="polite" className="min-w-0 flex-1 text-sm">
          <Situacao
            conflito={conflito}
            novo={novo}
            problemas={problemas}
            sujo={sujo}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {conflito ? (
            <Button className={BOTAO_CONTORNO} onClick={recarregar}>
              Recarregar
            </Button>
          ) : null}
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
  );
}
