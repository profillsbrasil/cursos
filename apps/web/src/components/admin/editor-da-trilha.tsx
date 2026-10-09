"use client";

import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";
import {
  documentoDaTrilha,
  type EdicaoDaTrilha,
} from "@cursos/api/dominio/edicao-da-trilha";
import type { CursoId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@cursos/ui/components/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { Textarea } from "@cursos/ui/components/textarea";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowDown, ArrowLeft, ArrowUp, TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import { BOTAO, BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import {
  Carregando,
  ConfirmacaoNaLinha,
  type LinhaAberta,
} from "./confirmacao-na-linha";
import { SELO, Secao, Vazio } from "./partes";

const CAMPO =
  "rounded-[12px] border-muted-foreground bg-background px-3.5 text-sm md:text-sm dark:border-muted-foreground dark:bg-background";
const ROTULO = "font-semibold text-foreground text-sm";
const AVISO =
  "flex gap-2.5 rounded-[14px] bg-sol/10 px-4 py-3.5 text-foreground text-sm ring-1 ring-sol/40";
const SETA = cn(BOTAO_CONTORNO, "size-9 px-0");
const EM_PRODUCAO = cn(
  SELO,
  "w-fit bg-transparent text-muted-foreground ring-1 ring-muted-foreground ring-inset"
);
const CATALOGO = "/admin/catalogo" as Route;

interface Campos {
  descricao: string;
  slug: string;
  titulo: string;
}
type Campo = keyof Campos;
type Erros = Partial<Record<Campo, string>>;

const ERRO_DO_CAMPO: Record<Campo, string> = {
  descricao: "Escreva uma descrição de até 600 caracteres.",
  slug: "Use só letras minúsculas, números e hífen, sem hífen no começo nem no fim.",
  titulo: "Dê um título de até 120 caracteres.",
};

const ehCampo = (k: unknown): k is Campo =>
  k === "descricao" || k === "slug" || k === "titulo";

function mover<T>(lista: readonly T[], de: number, para: number): T[] {
  const nova = [...lista];
  const [item] = nova.splice(de, 1);
  if (item !== undefined) {
    nova.splice(para, 0, item);
  }
  return nova;
}

/** Id do botão de uma linha, para devolver o foco depois que a lista muda. */
const idDoBotao = (base: string, cursoId: string, acao: string) =>
  `${base}-${cursoId}-${acao}`;

const tituloDoCurso = (c: CursoNaVisao) => c.titulo;

function Candidato(c: CursoNaVisao) {
  return (
    <ComboboxItem className="py-2.5 text-sm" key={c.id} value={c}>
      <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
      {c.status === "em_producao" ? (
        <span className="shrink-0 text-muted-foreground text-xs">
          Em produção
        </span>
      ) : null}
    </ComboboxItem>
  );
}

function DadosDaTrilha({
  aoMudar,
  base,
  campos,
  erros,
}: {
  aoMudar: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  base: string;
  campos: Campos;
  erros: Erros;
}) {
  return (
    <div className="grid gap-5 p-5">
      <Field data-invalid={erros.titulo ? true : undefined}>
        <FieldLabel className={ROTULO} htmlFor={`${base}-titulo`}>
          Título
        </FieldLabel>
        <Input
          aria-invalid={erros.titulo ? true : undefined}
          autoComplete="off"
          className={cn(CAMPO, "h-11")}
          id={`${base}-titulo`}
          maxLength={120}
          name="titulo"
          onChange={aoMudar}
          placeholder="Fábrica e montagem"
          value={campos.titulo}
        />
        {erros.titulo ? (
          <FieldError className="text-sm">{erros.titulo}</FieldError>
        ) : null}
      </Field>
      <Field data-invalid={erros.slug ? true : undefined}>
        <FieldLabel className={ROTULO} htmlFor={`${base}-slug`}>
          Endereço
        </FieldLabel>
        <Input
          aria-describedby={`${base}-slug-ajuda`}
          aria-invalid={erros.slug ? true : undefined}
          autoCapitalize="none"
          autoComplete="off"
          className={cn(CAMPO, "h-11")}
          id={`${base}-slug`}
          maxLength={80}
          name="slug"
          onChange={aoMudar}
          placeholder="fabrica-e-montagem"
          spellCheck={false}
          value={campos.slug}
        />
        {erros.slug ? (
          <FieldError className="text-sm" id={`${base}-slug-ajuda`}>
            {erros.slug}
          </FieldError>
        ) : (
          <FieldDescription
            className="text-muted-foreground text-sm"
            id={`${base}-slug-ajuda`}
          >
            Letras minúsculas, números e hífen.
          </FieldDescription>
        )}
      </Field>
      <Field data-invalid={erros.descricao ? true : undefined}>
        <FieldLabel className={ROTULO} htmlFor={`${base}-descricao`}>
          Descrição
        </FieldLabel>
        <Textarea
          aria-invalid={erros.descricao ? true : undefined}
          className={cn(CAMPO, "min-h-28 py-3 leading-relaxed")}
          id={`${base}-descricao`}
          maxLength={600}
          name="descricao"
          onChange={aoMudar}
          placeholder="O que a pessoa aprende do primeiro ao último curso."
          value={campos.descricao}
        />
        {erros.descricao ? (
          <FieldError className="text-sm">{erros.descricao}</FieldError>
        ) : null}
      </Field>
    </div>
  );
}

function LinhaDoCurso({
  aoMover,
  aoTirar,
  base,
  curso,
  cursoId,
  indice,
  total,
}: {
  aoMover: (indice: number, passo: -1 | 1) => void;
  aoTirar: (indice: number) => void;
  base: string;
  /** undefined: o curso saiu do catálogo depois que a página abriu. */
  curso: CursoNaVisao | undefined;
  cursoId: CursoId;
  indice: number;
  total: number;
}) {
  const nome = curso?.titulo ?? "Curso apagado do catálogo";
  const subir = useCallback(() => aoMover(indice, -1), [aoMover, indice]);
  const descer = useCallback(() => aoMover(indice, 1), [aoMover, indice]);
  const tirar = useCallback(() => aoTirar(indice), [aoTirar, indice]);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-muted font-semibold text-foreground text-sm tabular-nums"
      >
        {indice + 1}
      </span>
      <span className="grid min-w-0 flex-1 basis-40 gap-1">
        <span className="font-medium text-foreground leading-snug">
          <span className="sr-only">{indice + 1}º: </span>
          {nome}
        </span>
        {curso?.status === "em_producao" ? (
          <span className={EM_PRODUCAO}>Em produção</span>
        ) : null}
      </span>
      <span className="flex items-center gap-2">
        <Button
          aria-label={`Subir ${nome}`}
          className={SETA}
          disabled={indice === 0}
          id={idDoBotao(base, cursoId, "subir")}
          onClick={subir}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Descer ${nome}`}
          className={SETA}
          disabled={indice === total - 1}
          id={idDoBotao(base, cursoId, "descer")}
          onClick={descer}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Tirar ${nome} da trilha`}
          className={cn(BOTAO_CONTORNO, PEQUENO)}
          id={idDoBotao(base, cursoId, "tirar")}
          onClick={tirar}
        >
          Tirar
        </Button>
      </span>
    </li>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className={AVISO}>
      <TriangleAlert
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-sol"
      />
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function AvisoDeQuemTem({
  alunos,
  tirados,
}: {
  alunos: number;
  tirados: number;
}) {
  if (alunos === 0) {
    return null;
  }
  let tirado = "";
  if (tirados > 0) {
    tirado =
      tirados === 1
        ? " O curso tirado some para quem só tinha a trilha."
        : " Os cursos tirados somem para quem só tinha a trilha.";
  }
  return (
    <Aviso>
      <p>
        {plural(alunos, "pessoa tem", "pessoas têm")} esta trilha liberada, e a
        mudança vale na hora. Curso que alguém já começou continua aberto.
        {tirado}
      </p>
    </Aviso>
  );
}

function ApagarTrilha({ edicao }: { edicao: EdicaoDaTrilha }) {
  const router = useRouter();
  const id = useId();
  const remocao = useAcao();
  const [chave, pedir] = useState<string | null>(null);
  const fechar = useCallback(
    (minha: string) => pedir((atual) => (atual === minha ? null : atual)),
    []
  );
  const linhaAberta: LinhaAberta = { chave, fechar, pedir };
  const { titulo, id: trilhaId } = edicao.documento;
  const apagar = useCallback(
    () =>
      remocao.executar(
        () => trpcClient.admin.catalogo.apagarTrilha.mutate({ id: trilhaId }),
        {
          depois: () => router.push(CATALOGO),
          sucesso: (r) =>
            r.apagado
              ? `"${titulo}" foi apagada.`
              : `"${titulo}" já tinha sido apagada.`,
        }
      ),
    [remocao.executar, router, titulo, trilhaId]
  );
  return (
    <section
      aria-labelledby={id}
      className="mt-12 grid max-w-[70ch] gap-3 border-border border-t pt-6"
    >
      <h2 className="font-bold text-lg text-titulo tracking-tight" id={id}>
        Apagar a trilha
      </h2>
      {edicao.podeApagar ? (
        <ConfirmacaoNaLinha
          botao={{ nome: `Confirmar: apagar ${titulo}`, rotulo: "Apagar" }}
          chave="apagar"
          className="grid gap-3"
          confirmar={apagar}
          enviando={remocao.pendente}
          gatilho={{ nome: `Apagar ${titulo}`, rotulo: "Apagar" }}
          linhaAberta={linhaAberta}
          pergunta={
            <span className="text-foreground text-sm">
              Ninguém recebeu esta trilha. Apagar? Os cursos dela continuam no
              catálogo, soltos.
            </span>
          }
        />
      ) : (
        <p className="text-muted-foreground text-sm leading-relaxed">
          Esta trilha já foi liberada para alguém, mesmo que depois revogada, ou
          já foi concluída, e por isso não se apaga. Para tirá-la de uso, tire
          os cursos dela.
        </p>
      )}
    </section>
  );
}

export function EditorDaTrilha({
  cursos,
  edicao,
}: {
  /** O catálogo inteiro: os nomes da lista e os candidatos do seletor. */
  cursos: readonly CursoNaVisao[];
  edicao: EdicaoDaTrilha;
}) {
  const { documento: salvo } = edicao;
  const nova = salvo.versao === null;
  const router = useRouter();
  const base = useId();
  const { executar, pendente } = useAcao();

  const [campos, setCampos] = useState<Campos>({
    descricao: salvo.descricao,
    slug: salvo.slug,
    titulo: salvo.titulo,
  });
  const [lista, setLista] = useState<CursoId[]>(salvo.cursos);
  const [erros, setErros] = useState<Erros>({});
  const [versaoMudou, setVersaoMudou] = useState(false);
  const [busca, setBusca] = useState("");
  /** Ids de botão, em ordem de preferência, que recebem o foco no próximo render. */
  const [foco, setFoco] = useState<string[]>([]);

  const porId = useMemo(() => new Map(cursos.map((c) => [c.id, c])), [cursos]);
  const candidatos = useMemo(
    () =>
      cursos.filter(
        (c) =>
          !lista.includes(c.id) &&
          (c.trilha === null || c.trilha.id === salvo.id)
      ),
    [cursos, lista, salvo.id]
  );
  const tirados = salvo.cursos.filter((c) => !lista.includes(c)).length;

  // Mover e tirar mudam a ordem do DOM: o foco volta ao botão da mesma linha, ou
  // ao vizinho quando o botão ficou desabilitado ou a linha sumiu.
  useEffect(() => {
    if (foco.length === 0) {
      return;
    }
    setFoco([]);
    const alvo = foco
      .map((i) => document.getElementById(i))
      .find((el) => el && !(el as HTMLButtonElement).disabled);
    alvo?.focus();
  }, [foco]);

  const aoMudar = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      if (ehCampo(name)) {
        setCampos((c) => ({ ...c, [name]: value }));
      }
    },
    []
  );

  const aoMover = useCallback(
    (indice: number, passo: -1 | 1) => {
      const cursoId = lista[indice];
      if (!cursoId) {
        return;
      }
      setLista((l) => mover(l, indice, indice + passo));
      const [primeiro, segundo] =
        passo === -1 ? ["subir", "descer"] : ["descer", "subir"];
      setFoco([
        idDoBotao(base, cursoId, primeiro),
        idDoBotao(base, cursoId, segundo),
      ]);
    },
    [base, lista]
  );

  const aoTirar = useCallback(
    (indice: number) => {
      const vizinho = lista[indice + 1] ?? lista[indice - 1];
      setLista((l) => l.filter((_, j) => j !== indice));
      setFoco([
        vizinho ? idDoBotao(base, vizinho, "tirar") : `${base}-acrescentar`,
      ]);
    },
    [base, lista]
  );

  const acrescentar = useCallback((c: CursoNaVisao | null) => {
    if (c) {
      setLista((l) => [...l, c.id]);
      setBusca("");
    }
  }, []);

  const recarregar = useCallback(() => router.refresh(), [router]);

  const salvar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const lido = documentoDaTrilha.safeParse({
        ...campos,
        cursos: lista,
        id: salvo.id,
        versao: salvo.versao,
      });
      if (!lido.success) {
        const novos: Erros = {};
        for (const { path } of lido.error.issues) {
          const [campo] = path;
          if (ehCampo(campo)) {
            novos[campo] = ERRO_DO_CAMPO[campo];
          }
        }
        setErros(novos);
        const [primeiro] = Object.keys(novos);
        document.getElementById(`${base}-${primeiro}`)?.focus();
        return;
      }
      setErros({});
      executar(() => trpcClient.admin.catalogo.salvarTrilha.mutate(lido.data), {
        aoRecusar: (motivo) => {
          if (motivo === "versao_mudou") {
            setVersaoMudou(true);
          } else if (motivo === "slug_repetido") {
            setErros({ slug: "Já existe uma trilha com este endereço." });
          }
        },
        depois: () => {
          if (nova) {
            router.replace(`/admin/catalogo/trilhas/${salvo.id}` as Route);
          }
        },
        sucesso: nova ? "Trilha criada." : "Trilha salva.",
      });
    },
    [base, campos, executar, lista, nova, router, salvo.id, salvo.versao]
  );

  return (
    <>
      <Link
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full pr-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2"
        href={CATALOGO}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Catálogo
      </Link>
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
        <h1 className="min-w-0 break-words font-bold text-3xl text-titulo tracking-tight">
          {nova ? "Nova trilha" : salvo.titulo}
        </h1>
        <p className="text-muted-foreground">
          O curso seguinte abre quando o anterior é concluído
        </p>
      </header>

      <form className="grid gap-10" noValidate onSubmit={salvar}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
          <Secao
            id={`${base}-dados`}
            resumo="Aparece em Meus cursos"
            titulo="Dados"
          >
            <DadosDaTrilha
              aoMudar={aoMudar}
              base={base}
              campos={campos}
              erros={erros}
            />
          </Secao>

          <Secao
            id={`${base}-cursos`}
            resumo={plural(lista.length, "curso", "cursos")}
            titulo="Cursos da trilha"
          >
            {lista.length === 0 ? (
              <Vazio>Nenhum curso ainda. Acrescente o primeiro abaixo.</Vazio>
            ) : (
              <ol className="divide-y divide-border">
                {lista.map((cursoId, i) => (
                  <LinhaDoCurso
                    aoMover={aoMover}
                    aoTirar={aoTirar}
                    base={base}
                    curso={porId.get(cursoId)}
                    cursoId={cursoId}
                    indice={i}
                    key={cursoId}
                    total={lista.length}
                  />
                ))}
              </ol>
            )}
            <div className="grid gap-2 border-border border-t p-5">
              <label className={ROTULO} htmlFor={`${base}-acrescentar`}>
                Acrescentar curso no fim
              </label>
              <Combobox
                inputValue={busca}
                items={candidatos}
                itemToStringLabel={tituloDoCurso}
                onInputValueChange={setBusca}
                onValueChange={acrescentar}
                value={null}
              >
                <ComboboxInput
                  aria-describedby={`${base}-acrescentar-ajuda`}
                  className="h-11 w-full rounded-[12px] border-muted-foreground bg-background pl-1 *:data-[slot=input-group-control]:text-sm dark:border-muted-foreground dark:bg-background"
                  id={`${base}-acrescentar`}
                  placeholder="Buscar pelo nome"
                />
                <ComboboxContent>
                  <ComboboxEmpty className="px-3 py-2.5 text-muted-foreground text-sm">
                    Nenhum curso livre com esse nome.
                  </ComboboxEmpty>
                  <ComboboxList>{Candidato}</ComboboxList>
                </ComboboxContent>
              </Combobox>
              <p
                className="text-muted-foreground text-sm"
                id={`${base}-acrescentar-ajuda`}
              >
                Curso que está em outra trilha não aparece aqui. Use as setas
                para pôr na posição certa.
              </p>
            </div>
          </Secao>
        </div>

        <div className="grid max-w-[70ch] gap-5">
          {versaoMudou ? (
            <Aviso>
              <p>
                Outra pessoa salvou esta trilha depois que você abriu. O que
                você mudou continua aqui. Recarregar mostra a versão nova e
                descarta as suas mudanças.
              </p>
              <Button
                className={cn(BOTAO_CONTORNO, PEQUENO, "w-fit")}
                onClick={recarregar}
              >
                Recarregar
              </Button>
            </Aviso>
          ) : null}
          <AvisoDeQuemTem
            alunos={edicao.uso.alunosComATrilha}
            tirados={tirados}
          />
          <div>
            <Button
              aria-busy={pendente}
              className={cn(BOTAO, "disabled:opacity-100")}
              disabled={pendente}
              focusableWhenDisabled
              type="submit"
            >
              <Carregando ativo={pendente} />
              {nova ? "Criar trilha" : "Salvar"}
            </Button>
          </div>
        </div>
      </form>

      {nova ? null : <ApagarTrilha edicao={edicao} />}
    </>
  );
}
