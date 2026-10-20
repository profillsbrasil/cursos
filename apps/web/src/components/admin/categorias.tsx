"use client";

import {
  type CategoriaNaLista,
  categoriaEmUso,
} from "@cursos/api/dominio/categoria";
import { CARACTERES } from "@cursos/api/dominio/edicao-do-curso";
import type { CategoriaId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldError } from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

import {
  BOTAO,
  BOTAO_CONTORNO,
  CONTORNO_DESLIGADO,
  PEQUENO,
} from "@/components/casca/botoes";
import { CAMPO } from "@/components/casca/campos";
import { CARTAO } from "@/components/casca/cartoes";
import { DICA } from "@/components/casca/estilo";
import { SELO } from "@/components/casca/selos";
import { plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";
import {
  Carregando,
  ConfirmacaoNaLinha,
  type LinhaAberta,
} from "./confirmacao-na-linha";
import { Secao, Vazio } from "./partes";

const NOME_VAZIO = "Escreva o nome da categoria.";
const TODAS = "todas";

type EstadoDaLinha = "lendo" | "renomeando" | "confirmando";

const novoId = () => crypto.randomUUID() as CategoriaId;

function useSalvarCategoria(id: CategoriaId, depois: () => void) {
  const { executar, pendente } = useAcao();
  const [erro, setErro] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const marcar = useCallback((mensagem: string) => {
    setErro(mensagem);
    campo.current?.focus();
  }, []);
  const salvar = useCallback(
    (nome: string) => {
      if (nome === "") {
        marcar(NOME_VAZIO);
        return;
      }
      setErro(null);
      executar(() => trpcClient.admin.categorias.salvar.mutate({ id, nome }), {
        aoRecusar: (_motivo, mensagem) => {
          if (mensagem) {
            marcar(mensagem);
          }
        },
        depois,
        sucesso: (r) =>
          r.novo
            ? `Categoria "${nome}" criada.`
            : `Categoria renomeada para "${nome}".`,
      });
    },
    [executar, id, depois, marcar]
  );
  const limpar = useCallback(() => setErro(null), []);
  return { campo, erro, limpar, pendente, salvar };
}

function CampoDoNome({
  ajuda,
  aoCancelar,
  aoEnviar,
  campo,
  children,
  enviando,
  erro,
  focarAoAbrir,
  inicial,
  limpar,
  rotulo,
}: {
  ajuda?: string;
  aoCancelar?: () => void;
  aoEnviar: (nome: string) => void;
  campo: RefObject<HTMLInputElement | null>;
  children: ReactNode;
  enviando: boolean;
  erro: string | null;
  focarAoAbrir: boolean;
  inicial: string;
  limpar: () => void;
  rotulo: string;
}) {
  const id = useId();
  const enviar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      aoEnviar(String(new FormData(e.currentTarget).get("nome") ?? "").trim());
    },
    [aoEnviar]
  );
  const cancelar = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && aoCancelar && !enviando) {
        e.preventDefault();
        aoCancelar();
      }
    },
    [aoCancelar, enviando]
  );
  const descritoPor =
    [erro ? `${id}-erro` : null, ajuda ? `${id}-ajuda` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Escape fecha o renomear de qualquer controle do formulário.
    <form
      className="col-span-full flex flex-wrap items-start gap-2.5"
      noValidate
      onKeyDown={cancelar}
      onSubmit={enviar}
    >
      <Field className="min-w-48 flex-1 gap-1.5">
        <Input
          aria-describedby={descritoPor}
          aria-invalid={erro ? true : undefined}
          aria-label={rotulo}
          autoComplete="off"
          autoFocus={focarAoAbrir}
          className={CAMPO}
          defaultValue={inicial}
          maxLength={CARACTERES.categoria}
          name="nome"
          onChange={limpar}
          placeholder={rotulo}
          ref={campo}
        />
        {erro ? (
          <FieldError className="text-xs" id={`${id}-erro`}>
            {erro}
          </FieldError>
        ) : null}
      </Field>
      <div className="flex flex-wrap gap-2">{children}</div>
      {ajuda ? (
        <p
          className="basis-full text-pretty text-muted-foreground text-xs"
          id={`${id}-ajuda`}
        >
          {ajuda}
        </p>
      ) : null}
    </form>
  );
}

function NovaCategoria({ aoCriar }: { aoCriar: (id: CategoriaId) => void }) {
  const [idQueReenviarNaoDuplica, trocarId] = useState(novoId);
  const [criou, setCriou] = useState(false);
  const depois = useCallback(() => {
    aoCriar(idQueReenviarNaoDuplica);
    setCriou(true);
    trocarId(novoId());
  }, [aoCriar, idQueReenviarNaoDuplica]);
  const nome = useSalvarCategoria(idQueReenviarNaoDuplica, depois);
  return (
    <CampoDoNome
      aoEnviar={nome.salvar}
      campo={nome.campo}
      enviando={nome.pendente}
      erro={nome.erro}
      focarAoAbrir={criou}
      inicial=""
      key={idQueReenviarNaoDuplica}
      limpar={nome.limpar}
      rotulo="Nome da nova categoria"
    >
      <Button
        aria-busy={nome.pendente}
        className={BOTAO}
        disabled={nome.pendente}
        focusableWhenDisabled
        type="submit"
      >
        {nome.pendente ? <Carregando ativo /> : <Plus aria-hidden="true" />}
        Criar categoria
      </Button>
    </CampoDoNome>
  );
}

const focarSeVoltou =
  (voltou: { current: boolean }) => (el: HTMLHeadingElement | null) => {
    if (el && voltou.current) {
      voltou.current = false;
      el.focus({ preventScroll: true });
    }
  };

function ApagarEmUso({ categoria }: { categoria: CategoriaNaLista }) {
  const id = useId();
  const motivo = categoriaEmUso(categoria.cursos.length);
  return (
    <Tooltip>
      <TooltipTrigger
        aria-describedby={id}
        aria-label={`Apagar ${categoria.nome}`}
        render={
          <Button
            className={cn(CONTORNO_DESLIGADO, PEQUENO)}
            disabled
            focusableWhenDisabled
          />
        }
      >
        <Trash2 aria-hidden />
        Apagar
      </TooltipTrigger>
      <TooltipContent className={DICA}>{motivo}</TooltipContent>
      <span className="sr-only" id={id}>
        {motivo}
      </span>
    </Tooltip>
  );
}

const SELO_DE_USO = cn(SELO, "bg-popover text-foreground tabular-nums");
const SELO_LIVRE = cn(
  SELO,
  "bg-transparent text-muted-foreground ring-1 ring-muted-foreground ring-inset"
);

function LinhaDaCategoria({
  aoSalvar,
  categoria: c,
  linhaAberta,
  recente,
}: {
  aoSalvar: (id: CategoriaId) => void;
  categoria: CategoriaNaLista;
  linhaAberta: LinhaAberta;
  recente: boolean;
}) {
  const remocao = useAcao();
  const voltou = useRef(false);
  const { fechar, pedir } = linhaAberta;
  const chaveDoNome = `renomear:${c.id}`;
  const chaveDoApagar = `apagar:${c.id}`;
  const sair = useCallback(() => {
    voltou.current = true;
    fechar(chaveDoNome);
  }, [fechar, chaveDoNome]);
  const depoisDeSalvar = useCallback(() => {
    aoSalvar(c.id);
    sair();
  }, [aoSalvar, c.id, sair]);
  const nome = useSalvarCategoria(c.id, depoisDeSalvar);
  const { limpar } = nome;
  const abrir = useCallback(() => {
    limpar();
    pedir(chaveDoNome);
  }, [limpar, pedir, chaveDoNome]);
  const renomear = useCallback(
    (novo: string) => (novo === c.nome ? sair() : nome.salvar(novo)),
    [c.nome, sair, nome.salvar]
  );
  const apagar = useCallback(
    () =>
      remocao.executar(
        () => trpcClient.admin.categorias.apagar.mutate({ id: c.id }),
        {
          aoRecusar: () => {
            voltou.current = true;
            fechar(chaveDoApagar);
          },
          depois: () => {
            fechar(chaveDoApagar);
            document.getElementById(TODAS)?.focus();
          },
          sucesso: (r) =>
            r.apagado
              ? `"${c.nome}" foi apagada.`
              : `"${c.nome}" já tinha sido apagada.`,
        }
      ),
    [remocao.executar, c.id, c.nome, fechar, chaveDoApagar]
  );

  let estado: EstadoDaLinha = "lendo";
  if (linhaAberta.chave === chaveDoNome || nome.pendente) {
    estado = "renomeando";
  } else if (linhaAberta.chave === chaveDoApagar || remocao.pendente) {
    estado = "confirmando";
  }
  const cursos = c.cursos.length;

  return (
    <li
      className={cn(
        "grid @lg:grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5",
        recente && "bg-ceu/14"
      )}
    >
      {estado === "lendo" ? (
        <>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3
              className="font-semibold text-base text-titulo leading-normal"
              ref={focarSeVoltou(voltou)}
              tabIndex={-1}
            >
              {c.nome}
            </h3>
            {cursos > 0 ? (
              <span className={SELO_DE_USO}>
                {plural(cursos, "curso", "cursos")}
              </span>
            ) : (
              <span className={SELO_LIVRE}>Nenhum curso</span>
            )}
          </div>
          <p className="@lg:col-start-1 text-pretty text-[13px] text-muted-foreground">
            {cursos > 0
              ? c.cursos.join(", ")
              : "Escolha esta categoria no editor de um curso."}
          </p>
        </>
      ) : null}
      {estado === "renomeando" ? (
        <CampoDoNome
          ajuda={
            cursos > 0
              ? `O nome novo vale na hora para ${plural(cursos, "curso", "cursos")}.`
              : undefined
          }
          aoCancelar={sair}
          aoEnviar={renomear}
          campo={nome.campo}
          enviando={nome.pendente}
          erro={nome.erro}
          focarAoAbrir
          inicial={c.nome}
          limpar={limpar}
          rotulo="Nome da categoria"
        >
          <Button
            aria-busy={nome.pendente}
            className={BOTAO_CONTORNO}
            disabled={nome.pendente}
            focusableWhenDisabled
            type="submit"
          >
            <Carregando ativo={nome.pendente} />
            Salvar
          </Button>
          <Button
            className={cn(
              BOTAO_CONTORNO,
              "border-transparent dark:border-transparent"
            )}
            disabled={nome.pendente}
            onClick={sair}
          >
            Cancelar
          </Button>
        </CampoDoNome>
      ) : (
        <div
          className={cn(
            "flex flex-wrap items-center gap-1.5",
            estado === "lendo"
              ? "@lg:col-start-2 @lg:row-span-2 @lg:row-start-1 @lg:mt-0 mt-1.5"
              : "col-span-full"
          )}
        >
          {estado === "lendo" ? (
            <Button
              aria-label={`Renomear ${c.nome}`}
              className={cn(BOTAO_CONTORNO, PEQUENO)}
              onClick={abrir}
            >
              <Pencil aria-hidden />
              Renomear
            </Button>
          ) : null}
          {cursos > 0 ? (
            <ApagarEmUso categoria={c} />
          ) : (
            <ConfirmacaoNaLinha
              botao={{
                nome: `Confirmar: apagar ${c.nome}`,
                perigo: true,
                rotulo: "Apagar",
              }}
              chave={chaveDoApagar}
              className="flex flex-1 flex-wrap items-center gap-2.5 rounded-[12px] bg-muted/30 px-3 py-2.5 [&>:first-child]:flex-1"
              confirmar={apagar}
              enviando={remocao.pendente}
              gatilho={{
                nome: `Apagar ${c.nome}`,
                rotulo: (
                  <>
                    <Trash2 aria-hidden />
                    Apagar
                  </>
                ),
              }}
              linhaAberta={linhaAberta}
              pergunta={
                <p className="text-foreground text-sm">
                  Apagar <b className="font-semibold text-titulo">{c.nome}</b>?
                  Nenhum curso usa esta categoria.
                </p>
              }
            />
          )}
        </div>
      )}
    </li>
  );
}

export function Categorias({
  categorias,
}: {
  categorias: readonly CategoriaNaLista[];
}) {
  const [chave, pedir] = useState<string | null>(null);
  const fechar = useCallback(
    (minha: string) => pedir((atual) => (atual === minha ? null : atual)),
    []
  );
  const linhaAberta: LinhaAberta = { chave, fechar, pedir };
  const [recente, setRecente] = useState<CategoriaId | null>(null);
  return (
    <div className="grid gap-8">
      <div className={cn(CARTAO, "px-5 py-4")}>
        <NovaCategoria aoCriar={setRecente} />
      </div>
      <div className="grid gap-3">
        <Secao id={TODAS} resumo="Em ordem alfabética" titulo="Todas">
          {categorias.length === 0 ? (
            <Vazio>
              Nenhuma categoria ainda. A que você criar aparece no editor do
              curso.
            </Vazio>
          ) : (
            <ul className="@container divide-y divide-border">
              {categorias.map((c) => (
                <LinhaDaCategoria
                  aoSalvar={setRecente}
                  categoria={c}
                  key={c.id}
                  linhaAberta={linhaAberta}
                  recente={c.id === recente}
                />
              ))}
            </ul>
          )}
        </Secao>
        <p className="text-pretty text-muted-foreground text-xs">
          O editor do curso escolhe a categoria nesta lista. A que está em uso
          não se apaga.
        </p>
      </div>
    </div>
  );
}
