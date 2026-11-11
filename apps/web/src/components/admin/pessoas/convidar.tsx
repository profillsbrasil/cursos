"use client";

import type {
  CursoDoConvite,
  ResultadoDoConvite,
} from "@cursos/api/dominio/convite";
import type { Perfil } from "@cursos/api/dominio/perfil";
import type { CursoId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Checkbox } from "@cursos/ui/components/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@cursos/ui/components/dialog";
import { Switch } from "@cursos/ui/components/switch";
import { cn } from "@cursos/ui/lib/utils";
import { UserPlus, X } from "lucide-react";
import Link from "next/link";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

import {
  BOTAO,
  BOTAO_CONTORNO,
  CONTORNO_DESLIGADO,
  LINK_NO_TEXTO,
} from "@/components/casca/botoes";
import { ALAVANCA, CAIXA, ROTULO } from "@/components/casca/campos";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import { Carregando } from "../confirmacao-na-linha";
import { OPCAO_DA_TRILHA, TRILHA } from "../partes";
import {
  anuncioDasFichas,
  envioDasFichas,
  type Ficha,
  fichasCom,
  fraseDoResultado,
  textoDoEnvio,
} from "./convites";
import { fichaDaPessoa } from "./lista-de-pessoas";
import { ORDEM_DOS_PERFIS, SOBRE_O_PERFIL } from "./perfis";

type FaseDoDialogo =
  | { tipo: "fechado" }
  | { tipo: "editando" }
  /** As fichas que não saíram no último envio, cada uma com o que o servidor disse. */
  | { tipo: "com_sobras"; sobras: readonly ResultadoDoConvite[] };

interface Rascunho {
  comoAdmin: boolean;
  cursoIds: readonly CursoId[];
  fichas: readonly Ficha[];
  perfil: Perfil;
  /** O que está escrito no campo e ainda não virou ficha. */
  texto: string;
}

const VAZIO: Rascunho = {
  comoAdmin: false,
  cursoIds: [],
  fichas: [],
  perfil: "publico",
  texto: "",
};

const SEPARADOR = /[\s,;]/;

// A moldura do campo de fichas: o data-campo dá a borda Céu do index.css sob o
// cursor e com o foco no input de dentro.
const CAMPO_DE_FICHAS =
  "flex min-h-11 flex-wrap items-center gap-1.5 rounded-[20px] border border-muted-foreground bg-background px-2 py-1.5 transition-colors";

const FICHA =
  "inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-popover pr-1 pl-2.5 font-medium text-[13px] text-foreground";

const FICHA_RUIM = "bg-destructive/10 text-destructive";

const TIRAR_FICHA =
  "relative grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-2 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed [&_svg]:size-3";

// O rádio fica por baixo do label, como no sentido da concessão de pontos.
const OPCAO_DE_PERFIL = cn(
  OPCAO_DA_TRILHA,
  "has-disabled:cursor-not-allowed has-checked:bg-titulo has-checked:text-sobre-cor has-checked:hover:bg-foreground has-checked:hover:text-sobre-cor"
);

const DICA = "text-[13px] text-muted-foreground";

function FichaDoEmail({
  desligada,
  ficha,
  tirar,
}: {
  desligada: boolean;
  ficha: Ficha;
  tirar: (texto: string) => void;
}) {
  const aoTirar = useCallback(() => tirar(ficha.texto), [tirar, ficha.texto]);
  return (
    <li className={cn(FICHA, ficha.email === null && FICHA_RUIM)}>
      <span className="truncate">{ficha.texto}</span>
      <button
        aria-label={`Tirar ${ficha.texto}`}
        className={TIRAR_FICHA}
        disabled={desligada}
        onClick={aoTirar}
        type="button"
      >
        <X aria-hidden="true" />
      </button>
    </li>
  );
}

/**
 * O campo com fichas: vírgula, ponto e vírgula, espaço, Enter ou sair do campo
 * fecham a ficha, e colar uma lista fecha várias. Backspace no campo vazio traz
 * a última ficha de volta para corrigir.
 */
function CampoDeEmails({
  descritoPor,
  desligado,
  fichas,
  id,
  mudar,
  texto,
}: {
  descritoPor: string | undefined;
  desligado: boolean;
  fichas: readonly Ficha[];
  id: string;
  mudar: (fichas: readonly Ficha[], texto: string) => void;
  texto: string;
}) {
  const aoEscrever = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { value } = e.currentTarget;
      if (SEPARADOR.test(value)) {
        mudar(fichasCom(fichas, value), "");
      } else {
        mudar(fichas, value);
      }
    },
    [fichas, mudar]
  );
  const aoTeclar = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && texto.trim() !== "") {
        e.preventDefault();
        mudar(fichasCom(fichas, texto), "");
        return;
      }
      const ultima = fichas.at(-1);
      if (e.key === "Backspace" && texto === "" && ultima) {
        e.preventDefault();
        mudar(fichas.slice(0, -1), ultima.texto);
      }
    },
    [fichas, mudar, texto]
  );
  // O input de uma linha apaga a quebra de linha do que se cola: a lista colada
  // de uma planilha chegaria ao onChange com os e-mails grudados.
  const aoColar = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      const colado = e.clipboardData.getData("text");
      if (SEPARADOR.test(colado)) {
        e.preventDefault();
        mudar(fichasCom(fichas, `${texto}${colado}`), "");
      }
    },
    [fichas, mudar, texto]
  );
  const aoSair = useCallback(() => {
    if (texto.trim() !== "") {
      mudar(fichasCom(fichas, texto), "");
    }
  }, [fichas, mudar, texto]);
  const campo = useRef<HTMLInputElement>(null);
  // O botão Tirar some com a ficha; sem isto, o foco do teclado cairia no corpo do diálogo.
  const tirar = useCallback(
    (qual: string) => {
      mudar(
        fichas.filter((f) => f.texto !== qual),
        texto
      );
      campo.current?.focus();
    },
    [fichas, mudar, texto]
  );
  const temRuim = fichas.some((f) => f.email === null);
  return (
    <div className={CAMPO_DE_FICHAS} data-campo>
      {fichas.length > 0 ? (
        <ul aria-label="E-mails escritos" className="contents">
          {fichas.map((f) => (
            <FichaDoEmail
              desligada={desligado}
              ficha={f}
              key={f.texto}
              tirar={tirar}
            />
          ))}
        </ul>
      ) : null}
      <input
        aria-describedby={descritoPor}
        aria-invalid={temRuim ? true : undefined}
        autoCapitalize="none"
        autoComplete="off"
        className="h-7 min-w-32 flex-1 bg-transparent px-1.5 text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed"
        disabled={desligado}
        id={id}
        inputMode="email"
        onBlur={aoSair}
        onChange={aoEscrever}
        onKeyDown={aoTeclar}
        onPaste={aoColar}
        placeholder={fichas.length === 0 ? "Cole ou digite os e-mails" : ""}
        ref={campo}
        spellCheck={false}
        value={texto}
      />
    </div>
  );
}

/** O que o servidor disse de cada ficha que não saiu. */
function SobrasDoEnvio({ sobras }: { sobras: readonly ResultadoDoConvite[] }) {
  return (
    <ul className={cn(DICA, "grid gap-1.5")}>
      {sobras.map((s) => (
        <li key={s.email}>
          <span className="font-semibold text-foreground">{s.email}</span>{" "}
          {fraseDoResultado(s)}
          {s.tipo === "ja_tem_conta" ? (
            <>
              {" "}
              <Link className={LINK_NO_TEXTO} href={fichaDaPessoa(s.userId)}>
                Abrir a ficha
              </Link>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CursoDaChegada({
  curso,
  desligado,
  marcado,
  marcar,
}: {
  curso: CursoDoConvite;
  desligado: boolean;
  marcado: boolean;
  marcar: (id: CursoId, sim: boolean) => void;
}) {
  const id = useId();
  const aoMarcar = useCallback(
    (sim: boolean) => marcar(curso.id, sim),
    [marcar, curso.id]
  );
  return (
    <li className="flex items-center gap-3 px-3.5 py-2.5">
      <Checkbox
        checked={marcado}
        className={CAIXA}
        disabled={desligado}
        id={id}
        onCheckedChange={aoMarcar}
      />
      <label className="min-w-0 flex-1 cursor-pointer" htmlFor={id}>
        <span className="text-foreground">{curso.titulo}</span>
        {curso.status === "em_producao" ? (
          <span className="text-muted-foreground"> (em produção)</span>
        ) : null}
      </label>
    </li>
  );
}

/**
 * O botão "Convidar" do cabeçalho de Pessoas e o diálogo dele. Quando todo
 * e-mail sai, o diálogo fecha; quando algum fica, ele segue aberto só com as
 * fichas que ficaram e a frase de cada uma.
 */
export function Convidar({ cursos }: { cursos: readonly CursoDoConvite[] }) {
  const id = useId();
  const { executar, pendente } = useAcao();
  const [fase, setFase] = useState<FaseDoDialogo>({ tipo: "fechado" });
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);

  const envio = envioDasFichas(rascunho.fichas, rascunho.cursoIds.length);
  const razao = `${id}-razao`;
  // A razão fica à vista quando há o que corrigir; com o campo vazio, só o leitor de tela a ouve.
  const razaoAVista = envio.tipo === "desligado" && rascunho.fichas.length > 0;

  const abrirOuFechar = useCallback(
    (aberto: boolean) => {
      if (pendente) {
        return;
      }
      setFase({ tipo: aberto ? "editando" : "fechado" });
      if (!aberto) {
        setRascunho(VAZIO);
      }
    },
    [pendente]
  );
  const mudarFichas = useCallback(
    (fichas: readonly Ficha[], texto: string) =>
      setRascunho((r) => ({ ...r, fichas, texto })),
    []
  );
  const escolherPerfil = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const perfil = e.currentTarget.value as Perfil;
    setRascunho((r) => ({ ...r, perfil }));
  }, []);
  const mudarAdmin = useCallback(
    (comoAdmin: boolean) => setRascunho((r) => ({ ...r, comoAdmin })),
    []
  );
  const marcarCurso = useCallback(
    (cursoId: CursoId, sim: boolean) =>
      setRascunho((r) => ({
        ...r,
        cursoIds: sim
          ? [...r.cursoIds, cursoId]
          : r.cursoIds.filter((c) => c !== cursoId),
      })),
    []
  );

  const enviar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // O Enter no campo com texto fecha a ficha; o clique no botão chega aqui com o blur já feito.
      if (envio.tipo !== "pronto" || rascunho.texto.trim() !== "") {
        return;
      }
      const { emails } = envio;
      executar(
        () =>
          trpcClient.admin.convites.enviar.mutate({
            comoAdmin: rascunho.comoAdmin,
            cursoIds: [...rascunho.cursoIds],
            emails,
            perfil: rascunho.perfil,
          }),
        {
          depois: (r) => {
            const ficaram = r.convites.filter((c) => c.tipo !== "enviado");
            if (ficaram.length === 0) {
              setRascunho(VAZIO);
              setFase({ tipo: "fechado" });
              return;
            }
            setRascunho((antes) => ({
              ...antes,
              fichas: ficaram.map((c) => ({ email: c.email, texto: c.email })),
              texto: "",
            }));
            setFase({ sobras: ficaram, tipo: "com_sobras" });
          },
          sucesso: textoDoEnvio,
        }
      );
    },
    [envio, executar, rascunho]
  );

  const naTela = new Set(rascunho.fichas.map((f) => f.email));
  const sobras =
    fase.tipo === "com_sobras"
      ? fase.sobras.filter((s) => naTela.has(s.email))
      : [];
  const temRascunho = rascunho.fichas.length > 0 || rascunho.texto !== "";
  return (
    <Dialog
      disablePointerDismissal={temRascunho}
      onOpenChange={abrirOuFechar}
      open={fase.tipo !== "fechado"}
    >
      <DialogTrigger render={<Button className={BOTAO} />}>
        <UserPlus aria-hidden="true" />
        Convidar
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] max-w-[min(34rem,calc(100%-2rem))] gap-0 overflow-hidden rounded-[22px] p-0 text-sm leading-5 shadow-black/45 shadow-xl ring-border sm:max-w-[34rem]"
        showCloseButton={false}
      >
        <form
          className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]"
          noValidate
          onSubmit={enviar}
        >
          <header className="grid gap-1 px-6 pt-6 pb-4">
            <DialogTitle className="font-semibold text-lg text-titulo">
              Convidar por e-mail
            </DialogTitle>
            <DialogDescription className={DICA}>
              A pessoa recebe um link para criar a conta e chega com o perfil, o
              papel e os cursos que você escolher aqui.
            </DialogDescription>
          </header>
          <div className="grid gap-5 overflow-y-auto px-6 pb-5">
            <div className="grid gap-1.5">
              <label className={ROTULO} htmlFor={`${id}-emails`}>
                E-mails
              </label>
              <CampoDeEmails
                descritoPor={envio.tipo === "desligado" ? razao : undefined}
                desligado={pendente}
                fichas={rascunho.fichas}
                id={`${id}-emails`}
                mudar={mudarFichas}
                texto={rascunho.texto}
              />
              {envio.tipo === "desligado" ? (
                <p
                  className={
                    razaoAVista ? "text-destructive text-xs" : "sr-only"
                  }
                  id={razao}
                >
                  {envio.razao}
                </p>
              ) : null}
              <p className="sr-only" role="status">
                {anuncioDasFichas(rascunho.fichas, envio)}
              </p>
              {/* Montada antes do envio, para o leitor de tela anunciar as sobras que chegam. */}
              <div
                aria-live="polite"
                className={sobras.length > 0 ? undefined : "sr-only"}
              >
                {sobras.length > 0 ? <SobrasDoEnvio sobras={sobras} /> : null}
              </div>
            </div>
            <fieldset className="m-0 grid min-w-0 gap-1.5 border-0 p-0">
              <legend className={cn(ROTULO, "mb-1.5 p-0")}>Perfil</legend>
              <div
                className={cn(TRILHA, "bg-background ring-muted-foreground")}
              >
                {ORDEM_DOS_PERFIS.map((p) => (
                  <label className={OPCAO_DE_PERFIL} key={p}>
                    <input
                      checked={rascunho.perfil === p}
                      className="sr-only"
                      disabled={pendente}
                      name={`${id}-perfil`}
                      onChange={escolherPerfil}
                      type="radio"
                      value={p}
                    />
                    {SOBRE_O_PERFIL[p].nome}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex items-start gap-3.5">
              <label
                className="grid flex-1 cursor-pointer gap-0.5"
                htmlFor={`${id}-admin`}
              >
                <span className={ROTULO}>Entrar como admin</span>
                <span className={DICA}>
                  Cria cursos, libera, revoga, publica comunicados e muda o
                  acesso das pessoas.
                </span>
              </label>
              <Switch
                checked={rascunho.comoAdmin}
                className={cn(ALAVANCA, "mt-0.5")}
                disabled={pendente}
                id={`${id}-admin`}
                onCheckedChange={mudarAdmin}
              />
            </div>
            <fieldset className="m-0 grid min-w-0 gap-1.5 border-0 p-0">
              <legend className={cn(ROTULO, "mb-1.5 p-0")}>
                Cursos liberados na chegada
              </legend>
              {cursos.length === 0 ? (
                <p className={DICA}>Nenhum curso no catálogo ainda.</p>
              ) : (
                <ul className="max-h-52 divide-y divide-border overflow-y-auto rounded-[14px] ring-1 ring-border ring-inset">
                  {cursos.map((c) => (
                    <CursoDaChegada
                      curso={c}
                      desligado={pendente}
                      key={c.id}
                      marcado={rascunho.cursoIds.includes(c.id)}
                      marcar={marcarCurso}
                    />
                  ))}
                </ul>
              )}
            </fieldset>
          </div>
          <footer className="flex flex-col-reverse gap-2 border-border border-t px-6 py-4 sm:flex-row sm:justify-end">
            <DialogClose
              disabled={pendente}
              render={<Button className={BOTAO_CONTORNO} type="button" />}
            >
              Cancelar
            </DialogClose>
            <Button
              aria-busy={pendente}
              aria-describedby={envio.tipo === "desligado" ? razao : undefined}
              className={envio.tipo === "pronto" ? BOTAO : CONTORNO_DESLIGADO}
              disabled={envio.tipo !== "pronto" || pendente}
              focusableWhenDisabled
              type="submit"
            >
              <Carregando ativo={pendente} />
              {envio.rotulo}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
