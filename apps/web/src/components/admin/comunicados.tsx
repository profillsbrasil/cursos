"use client";

import {
  type ComunicadoNaTela,
  type ComunicadosDoAdmin,
  type CursoDoComunicado,
  TEXTO_MAX,
  TITULO_MAX,
} from "@cursos/api/dominio/comunicado";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldError, FieldLabel } from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@cursos/ui/components/native-select";
import { Textarea } from "@cursos/ui/components/textarea";
import { cn } from "@cursos/ui/lib/utils";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

import { BOTAO, BOTAO_CONTORNO } from "@/components/casca/botoes";
import { fmtData, plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import {
  Carregando,
  ConfirmacaoNaLinha,
  type LinhaAberta,
  PEQUENO,
} from "./confirmacao-na-linha";
import { SELO, Secao, Vazio } from "./partes";

const CAMPO =
  "rounded-[12px] border-muted-foreground bg-background px-3.5 text-sm md:text-sm dark:border-muted-foreground dark:bg-background";
const SELECAO =
  "w-full *:data-[slot=native-select]:h-11 *:data-[slot=native-select]:rounded-[12px] *:data-[slot=native-select]:border-muted-foreground *:data-[slot=native-select]:bg-background *:data-[slot=native-select]:pl-3.5 *:data-[slot=native-select]:text-sm";
const ROTULO = "font-semibold text-foreground text-sm";

/** O que o formulário envia; cursoId vazio é o comunicado geral. */
interface Rascunho {
  cursoId: string;
  texto: string;
  titulo: string;
}

const VAZIO: Rascunho = { cursoId: "", texto: "", titulo: "" };

function Formulario({
  aoCancelar,
  aoEnviar,
  botao,
  cursos,
  enviando,
  focarAoAbrir,
  inicial,
}: {
  aoCancelar?: () => void;
  aoEnviar: (r: Rascunho) => void;
  botao: string;
  cursos: readonly CursoDoComunicado[];
  enviando: boolean;
  focarAoAbrir: boolean;
  inicial: Rascunho;
}) {
  const id = useId();
  const [faltando, setFaltando] = useState(false);
  const enviar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const dados = new FormData(e.currentTarget);
      const r: Rascunho = {
        cursoId: String(dados.get("cursoId") ?? ""),
        texto: String(dados.get("texto") ?? "").trim(),
        titulo: String(dados.get("titulo") ?? "").trim(),
      };
      const incompleto = r.titulo === "" || r.texto === "";
      setFaltando(incompleto);
      if (!incompleto) {
        aoEnviar(r);
      }
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
  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Escape fecha a edição de qualquer campo do formulário.
    <form className="grid gap-5" onKeyDown={cancelar} onSubmit={enviar}>
      <Field>
        <FieldLabel className={ROTULO} htmlFor={`${id}-titulo`}>
          Título
        </FieldLabel>
        <Input
          aria-invalid={faltando || undefined}
          autoComplete="off"
          autoFocus={focarAoAbrir}
          className={cn(CAMPO, "h-11")}
          defaultValue={inicial.titulo}
          id={`${id}-titulo`}
          maxLength={TITULO_MAX}
          name="titulo"
          placeholder="Módulo 13 atualizado"
        />
      </Field>
      <Field>
        <FieldLabel className={ROTULO} htmlFor={`${id}-texto`}>
          Texto
        </FieldLabel>
        <Textarea
          aria-invalid={faltando || undefined}
          className={cn(CAMPO, "min-h-28 py-3 leading-relaxed")}
          defaultValue={inicial.texto}
          id={`${id}-texto`}
          maxLength={TEXTO_MAX}
          name="texto"
          placeholder="O que mudou e onde o aluno encontra."
        />
      </Field>
      <Field>
        <FieldLabel className={ROTULO} htmlFor={`${id}-para`}>
          Para quem
        </FieldLabel>
        <NativeSelect
          className={SELECAO}
          defaultValue={inicial.cursoId}
          id={`${id}-para`}
          name="cursoId"
        >
          <NativeSelectOption value="">Todos os alunos</NativeSelectOption>
          {cursos.length > 0 ? (
            <NativeSelectOptGroup label="Quem tem acesso ao curso">
              {cursos.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.titulo}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          ) : null}
        </NativeSelect>
      </Field>
      {faltando ? (
        <FieldError className="text-sm">
          Preencha o título e o texto antes de {botao.toLowerCase()}.
        </FieldError>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          aria-busy={enviando}
          className={cn(BOTAO, "disabled:opacity-100")}
          disabled={enviando}
          focusableWhenDisabled
          type="submit"
        >
          <Carregando ativo={enviando} />
          {botao}
        </Button>
        {aoCancelar ? (
          <Button
            className={BOTAO_CONTORNO}
            disabled={enviando}
            onClick={aoCancelar}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

const paraEnviar = (id: string, r: Rascunho) => ({
  cursoId: r.cursoId === "" ? null : r.cursoId,
  id,
  texto: r.texto,
  titulo: r.titulo,
});

/**
 * O id do comunicado novo nasce aqui: enviar duas vezes o mesmo formulário edita
 * o que já foi publicado, em vez de publicar outro. Depois do sucesso um id novo
 * remonta o formulário vazio.
 */
function NovoComunicado({ cursos }: { cursos: readonly CursoDoComunicado[] }) {
  const { executar, pendente } = useAcao();
  const [id, setId] = useState(() => crypto.randomUUID());
  const [publicou, setPublicou] = useState(false);
  const publicar = useCallback(
    (r: Rascunho) =>
      executar(
        () => trpcClient.admin.comunicados.salvar.mutate(paraEnviar(id, r)),
        {
          depois: () => {
            setPublicou(true);
            setId(crypto.randomUUID());
          },
          sucesso: "Comunicado publicado.",
        }
      ),
    [executar, id]
  );
  return (
    <div className="p-5">
      <Formulario
        aoEnviar={publicar}
        botao="Publicar"
        cursos={cursos}
        enviando={pendente}
        focarAoAbrir={publicou}
        inicial={VAZIO}
        key={id}
      />
    </div>
  );
}

// Fora da edição o foco volta ao título do item, que continua no lugar.
const focarSeVoltou =
  (voltou: { current: boolean }) => (el: HTMLHeadingElement | null) => {
    if (el && voltou.current) {
      voltou.current = false;
      el.focus({ preventScroll: true });
    }
  };

function ItemDoComunicado({
  c,
  cursos,
  linhaAberta,
}: {
  c: ComunicadoNaTela;
  cursos: readonly CursoDoComunicado[];
  linhaAberta: LinhaAberta;
}) {
  const edicao = useAcao();
  const remocao = useAcao();
  const voltou = useRef(false);
  const { fechar, pedir } = linhaAberta;
  const chaveDaEdicao = `editar:${c.id}`;
  const editando = linhaAberta.chave === chaveDaEdicao || edicao.pendente;
  const editar = useCallback(
    () => pedir(chaveDaEdicao),
    [pedir, chaveDaEdicao]
  );
  const sair = useCallback(() => {
    voltou.current = true;
    fechar(chaveDaEdicao);
  }, [fechar, chaveDaEdicao]);
  const salvar = useCallback(
    (r: Rascunho) =>
      edicao.executar(
        () => trpcClient.admin.comunicados.salvar.mutate(paraEnviar(c.id, r)),
        { depois: sair, sucesso: "Comunicado salvo." }
      ),
    [edicao.executar, c.id, sair]
  );
  const apagar = useCallback(
    () =>
      remocao.executar(
        () => trpcClient.admin.comunicados.apagar.mutate({ id: c.id }),
        {
          // O item some: o foco vai para o título da lista, se não estiver em outra linha.
          depois: () => {
            if (document.activeElement === document.body) {
              document.getElementById("publicados")?.focus();
            }
          },
          sucesso: (r) =>
            r.apagado
              ? `"${c.titulo}" foi apagado.`
              : `"${c.titulo}" já tinha sido apagado.`,
        }
      ),
    [remocao.executar, c.id, c.titulo]
  );

  if (editando) {
    return (
      <li className="bg-muted/30 px-5 py-5">
        <Formulario
          aoCancelar={sair}
          aoEnviar={salvar}
          botao="Salvar"
          cursos={cursos}
          enviando={edicao.pendente}
          focarAoAbrir
          inicial={{
            cursoId: c.curso?.id ?? "",
            texto: c.texto,
            titulo: c.titulo,
          }}
        />
      </li>
    );
  }
  return (
    <li className="grid gap-2.5 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="grid min-w-0 gap-1.5">
          <h3
            className="font-semibold text-foreground leading-snug focus:outline-none"
            ref={focarSeVoltou(voltou)}
            tabIndex={-1}
          >
            {c.titulo}
          </h3>
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-muted-foreground text-xs">
            {c.curso ? (
              <span
                className={cn(
                  SELO,
                  "max-w-full bg-transparent text-foreground ring-1 ring-muted-foreground ring-inset"
                )}
              >
                <span className="truncate">{c.curso.titulo}</span>
              </span>
            ) : (
              <span className={cn(SELO, "bg-ceu/14 text-ceu")}>
                Todos os alunos
              </span>
            )}
            <span className="tabular-nums">
              {fmtData(c.publicadoEm)}, por {c.publicadoPor}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {linhaAberta.chave === `apagar:${c.id}` || remocao.pendente ? null : (
            <Button
              aria-label={`Editar ${c.titulo}`}
              className={cn(BOTAO_CONTORNO, PEQUENO)}
              onClick={editar}
            >
              Editar
            </Button>
          )}
          <ConfirmacaoNaLinha
            botao={{ nome: `Confirmar: apagar ${c.titulo}`, rotulo: "Apagar" }}
            chave={`apagar:${c.id}`}
            className="flex flex-wrap items-center justify-end gap-2"
            confirmar={apagar}
            enviando={remocao.pendente}
            gatilho={{ nome: `Apagar ${c.titulo}`, rotulo: "Apagar" }}
            linhaAberta={linhaAberta}
            pergunta={
              <span className="text-foreground text-sm">
                Apagar para todos?
              </span>
            }
          />
        </div>
      </div>
      <p className="line-clamp-3 max-w-[70ch] whitespace-pre-line text-muted-foreground text-sm leading-relaxed">
        {c.texto}
      </p>
    </li>
  );
}

export function Comunicados({ comunicados, cursos }: ComunicadosDoAdmin) {
  const [chave, pedir] = useState<string | null>(null);
  const fechar = useCallback(
    (minha: string) => pedir((atual) => (atual === minha ? null : atual)),
    []
  );
  const linhaAberta: LinhaAberta = { chave, fechar, pedir };
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
      <Secao
        id="novo-comunicado"
        resumo="Aparece em Meus cursos"
        titulo="Novo comunicado"
      >
        <NovoComunicado cursos={cursos} />
      </Secao>
      <Secao
        id="publicados"
        resumo={plural(comunicados.length, "comunicado", "comunicados")}
        titulo="Publicados"
      >
        {comunicados.length === 0 ? (
          <Vazio>
            Nenhum comunicado ainda. O primeiro que você publicar aparece no
            topo de Meus cursos.
          </Vazio>
        ) : (
          <ul className="divide-y divide-border">
            {comunicados.map((c) => (
              <ItemDoComunicado
                c={c}
                cursos={cursos}
                key={c.id}
                linhaAberta={linhaAberta}
              />
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}
