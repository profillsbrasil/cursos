"use client";

import type {
  AulaDoDocumento,
  DocumentoDoCurso,
  ModuloDoDocumento,
} from "@cursos/api/dominio/edicao-do-curso";
import type { AulaId, ModuloId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldLabel } from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@cursos/ui/components/native-select";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { type ChangeEvent, type Dispatch, useCallback } from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { fmtHoras, mmss, plural } from "@/lib/formato";

import {
  CampoLido,
  lerDuracao,
  lerNumeroDoModulo,
  lerVideo,
} from "./campo-lido";
import { ConfirmacaoNaLinha, type LinhaAberta } from "./confirmacao-na-linha";
import type { Direcao, Edicao } from "./estado-do-editor";
import { CAMPO, ICONE, ROTULO, SELECAO } from "./partes";

type Despachar = Dispatch<Edicao>;

const SELECAO_PEQUENA =
  "w-36 *:data-[slot=native-select]:h-10 *:data-[slot=native-select]:rounded-full *:data-[slot=native-select]:border-muted-foreground *:data-[slot=native-select]:bg-background *:data-[slot=native-select]:pl-3.5 *:data-[slot=native-select]:text-[13px] md:*:data-[slot=native-select]:h-9";
/** Colunas da aula a partir de xl; abaixo disso a aula empilha. */
const GRADE_DA_AULA =
  "xl:grid-cols-[2rem_minmax(0,1fr)_7rem_minmax(0,0.9fr)_16.5rem] xl:gap-x-3";

/** Foca o elemento depois que o React pôs a lista na ordem nova. */
export const focarDepois = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

export const novoId = <T extends string>() => crypto.randomUUID() as T;

/** O nome nos rótulos dos botões: "aula 2 (Ajuste da válvula)". */
const nomeFalado = (tipo: string, n: number, titulo: string) =>
  titulo.trim() ? `${tipo} ${n} (${titulo.trim()})` : `${tipo} ${n}`;

const nomeDoModulo = (m: ModuloDoDocumento) =>
  m.titulo.trim() ? `Módulo ${m.numero} · ${m.titulo}` : `Módulo ${m.numero}`;

const linkDoVideo = (v: AulaDoDocumento["video"]) =>
  v ? `https://www.youtube.com/watch?v=${v.id}` : "";

/**
 * Depois de subir ou descer, o foco fica no mesmo botão; se a linha chegou à
 * borda e o botão desligou, vai para o outro.
 */
function focarNoBotao(
  prefixo: string,
  direcao: Direcao,
  chegouNaBorda: boolean
) {
  const outra = direcao === "acima" ? "abaixo" : "acima";
  focarDepois(`${prefixo}-${chegouNaBorda ? outra : direcao}`);
}

function LinhaDaAula({
  assistida,
  aula,
  despachar,
  modulo,
  modulos,
  posicao,
  total,
}: {
  assistida: number;
  aula: AulaDoDocumento;
  despachar: Despachar;
  modulo: ModuloDoDocumento;
  modulos: readonly ModuloDoDocumento[];
  posicao: number;
  total: number;
}) {
  const { id } = aula;
  const nome = nomeFalado("aula", posicao, aula.titulo);
  const outros = modulos.filter((m) => m.id !== modulo.id);

  const editarAula = useCallback(
    (mudanca: Extract<Edicao, { tipo: "aula_editada" }>["mudanca"]) =>
      despachar({ id, mudanca, tipo: "aula_editada" }),
    [despachar, id]
  );
  const mudarTitulo = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      editarAula({ titulo: e.target.value }),
    [editarAula]
  );
  const mudarDuracao = useCallback(
    (duracaoSeg: number) => editarAula({ duracaoSeg }),
    [editarAula]
  );
  const mudarVideo = useCallback(
    (video: AulaDoDocumento["video"]) => editarAula({ video }),
    [editarAula]
  );
  const subir = useCallback(() => {
    despachar({ direcao: "acima", id, tipo: "aula_movida" });
    focarNoBotao(`aula-${id}`, "acima", posicao - 1 === 1);
  }, [despachar, id, posicao]);
  const descer = useCallback(() => {
    despachar({ direcao: "abaixo", id, tipo: "aula_movida" });
    focarNoBotao(`aula-${id}`, "abaixo", posicao + 1 === total);
  }, [despachar, id, posicao, total]);
  const moverPara = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      despachar({
        id,
        moduloId: e.target.value as ModuloId,
        tipo: "aula_para_modulo",
      });
      focarDepois(`aula-${id}-modulo`);
    },
    [despachar, id]
  );
  const remover = useCallback(
    () => despachar({ id, tipo: "aula_removida" }),
    [despachar, id]
  );

  return (
    <li
      className={cn(
        "grid gap-3 border-border border-t px-5 py-4 xl:items-start",
        GRADE_DA_AULA
      )}
    >
      <span
        aria-hidden="true"
        className="hidden pt-2.5 text-right font-semibold text-muted-foreground text-sm tabular-nums xl:block"
      >
        {posicao}
      </span>
      <Field className="gap-1.5">
        <FieldLabel
          className={cn(ROTULO, "xl:sr-only")}
          htmlFor={`aula-${id}-titulo`}
        >
          Aula {posicao}
        </FieldLabel>
        <Input
          autoComplete="off"
          className={cn(CAMPO, "h-11 md:h-10")}
          id={`aula-${id}-titulo`}
          maxLength={160}
          onChange={mudarTitulo}
          placeholder="Título da aula"
          required
          value={aula.titulo}
        />
        {assistida > 0 ? (
          <p className="text-muted-foreground text-xs" id={`aula-${id}-uso`}>
            Assistida por {plural(assistida, "aluno", "alunos")}. Não se apaga,
            mas dá para trocar o vídeo e o título.
          </p>
        ) : null}
      </Field>
      <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 xl:contents">
        <CampoLido
          aoLer={mudarDuracao}
          inicial={aula.duracaoSeg > 0 ? mmss(aula.duracaoSeg) : ""}
          ler={lerDuracao}
          placeholder="12:30"
          required
          rotulo={
            <>
              Duração<span className="sr-only"> da {nome}</span>
            </>
          }
          rotuloClasse="xl:sr-only"
        />
        <CampoLido
          aoLer={mudarVideo}
          inicial={linkDoVideo(aula.video)}
          ler={lerVideo}
          placeholder="Link ou id do YouTube"
          rotulo={
            <>
              Vídeo<span className="sr-only"> da {nome}</span>
            </>
          }
          rotuloClasse="xl:sr-only"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          aria-label={`Subir a ${nome}`}
          className={ICONE}
          disabled={posicao === 1}
          id={`aula-${id}-acima`}
          onClick={subir}
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Descer a ${nome}`}
          className={ICONE}
          disabled={posicao === total}
          id={`aula-${id}-abaixo`}
          onClick={descer}
        >
          <ChevronDown aria-hidden="true" />
        </Button>
        {outros.length > 0 ? (
          <NativeSelect
            aria-label={`Mover a ${nome} para outro módulo`}
            className={SELECAO_PEQUENA}
            id={`aula-${id}-modulo`}
            onChange={moverPara}
            value=""
          >
            <NativeSelectOption disabled value="">
              Mover para…
            </NativeSelectOption>
            {outros.map((m) => (
              <NativeSelectOption key={m.id} value={m.id}>
                {nomeDoModulo(m)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : null}
        <Button
          aria-describedby={assistida > 0 ? `aula-${id}-uso` : undefined}
          aria-label={`Remover a ${nome}`}
          className={ICONE}
          disabled={assistida > 0}
          focusableWhenDisabled
          onClick={remover}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

export function BlocoDoModulo({
  assistidasPorAula,
  despachar,
  indice,
  linhaAberta,
  modulo,
  modulos,
  niveis,
}: {
  assistidasPorAula: Readonly<Record<string, number>>;
  despachar: Despachar;
  indice: number;
  linhaAberta: LinhaAberta;
  modulo: ModuloDoDocumento;
  modulos: readonly ModuloDoDocumento[];
  niveis: DocumentoDoCurso["niveis"];
}) {
  const { id } = modulo;
  const nome = nomeFalado("módulo", modulo.numero, modulo.titulo);
  const assistidas = modulo.aulas.filter(
    (a) => (assistidasPorAula[a.id] ?? 0) > 0
  ).length;
  const duracao = modulo.aulas.reduce((s, a) => s + a.duracaoSeg, 0);
  const ultimo = modulos.length - 1;

  const editarModulo = useCallback(
    (mudanca: Extract<Edicao, { tipo: "modulo_editado" }>["mudanca"]) =>
      despachar({ id, mudanca, tipo: "modulo_editado" }),
    [despachar, id]
  );
  const mudarNumero = useCallback(
    (numero: number) => editarModulo({ numero }),
    [editarModulo]
  );
  const ordenar = useCallback(
    () => despachar({ tipo: "modulos_ordenados" }),
    [despachar]
  );
  const mudarTitulo = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      editarModulo({ titulo: e.target.value }),
    [editarModulo]
  );
  const mudarNivel = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) =>
      editarModulo({
        nivelOrdem: e.target.value === "" ? null : Number(e.target.value),
      }),
    [editarModulo]
  );
  const subir = useCallback(() => {
    despachar({ direcao: "acima", id, tipo: "modulo_movido" });
    focarNoBotao(`modulo-${id}`, "acima", indice - 1 === 0);
  }, [despachar, id, indice]);
  const descer = useCallback(() => {
    despachar({ direcao: "abaixo", id, tipo: "modulo_movido" });
    focarNoBotao(`modulo-${id}`, "abaixo", indice + 1 === ultimo);
  }, [despachar, id, indice, ultimo]);
  const remover = useCallback(() => {
    despachar({ id, tipo: "modulo_removido" });
    linhaAberta.fechar(`modulo:${id}`);
  }, [despachar, id, linhaAberta]);
  const adicionarAula = useCallback(() => {
    const aula = novoId<AulaId>();
    despachar({ id: aula, moduloId: id, tipo: "aula_nova" });
    focarDepois(`aula-${aula}-titulo`);
  }, [despachar, id]);

  return (
    <section
      aria-label={nome}
      className="border-border border-t first:border-t-0"
    >
      <div className="grid gap-3 bg-muted/30 px-5 py-4 md:grid-cols-[6rem_minmax(0,1fr)_12rem] md:items-start">
        <CampoLido
          aoLer={mudarNumero}
          aoSair={ordenar}
          inicial={String(modulo.numero)}
          inputMode="numeric"
          ler={lerNumeroDoModulo}
          required
          rotulo={
            <>
              Número<span className="sr-only"> do módulo</span>
            </>
          }
        />
        <Field className="gap-1.5">
          <FieldLabel className={ROTULO} htmlFor={`modulo-${id}-titulo`}>
            Título do módulo
          </FieldLabel>
          <Input
            autoComplete="off"
            className={cn(CAMPO, "h-11 font-semibold md:h-10")}
            id={`modulo-${id}-titulo`}
            maxLength={160}
            onChange={mudarTitulo}
            placeholder="Limpeza e higienização"
            required
            value={modulo.titulo}
          />
          <p className="text-muted-foreground text-xs tabular-nums">
            {plural(modulo.aulas.length, "aula", "aulas")}
            {duracao > 0 ? `, ${fmtHoras(duracao)}` : ""}
          </p>
        </Field>
        <Field className="gap-1.5">
          <FieldLabel className={ROTULO} htmlFor={`modulo-${id}-nivel`}>
            Nível
          </FieldLabel>
          <NativeSelect
            className={cn(SELECAO, "md:*:data-[slot=native-select]:h-10")}
            id={`modulo-${id}-nivel`}
            onChange={mudarNivel}
            value={modulo.nivelOrdem === null ? "" : String(modulo.nivelOrdem)}
          >
            <NativeSelectOption value="">Sem nível</NativeSelectOption>
            {niveis.map((n) => (
              <NativeSelectOption key={n.ordem} value={String(n.ordem)}>
                {n.nome || `Nível ${n.ordem}`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <div className="flex flex-wrap items-center gap-1 md:col-span-3">
          <Button
            aria-label={`Subir o ${nome}`}
            className={ICONE}
            disabled={indice === 0}
            id={`modulo-${id}-acima`}
            onClick={subir}
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Descer o ${nome}`}
            className={ICONE}
            disabled={indice === ultimo}
            id={`modulo-${id}-abaixo`}
            onClick={descer}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
          {assistidas > 0 ? (
            <>
              <Button
                aria-describedby={`modulo-${id}-uso`}
                className={cn(BOTAO_CONTORNO, PEQUENO, "ml-1")}
                disabled
                focusableWhenDisabled
              >
                Remover módulo
              </Button>
              <p
                className="text-muted-foreground text-xs"
                id={`modulo-${id}-uso`}
              >
                Não se apaga:{" "}
                {plural(
                  assistidas,
                  "aula dele já foi assistida",
                  "aulas dele já foram assistidas"
                )}
                .
              </p>
            </>
          ) : (
            <ConfirmacaoNaLinha
              botao={{
                nome: `Confirmar: remover o ${nome}`,
                rotulo: "Remover",
              }}
              chave={`modulo:${id}`}
              className="ml-1 flex flex-wrap items-center gap-2"
              confirmar={remover}
              enviando={false}
              gatilho={{ nome: `Remover o ${nome}`, rotulo: "Remover módulo" }}
              linhaAberta={linhaAberta}
              pergunta={
                <span className="text-foreground text-sm">
                  {modulo.aulas.length > 0
                    ? `Remover com ${plural(modulo.aulas.length, "aula", "aulas")}?`
                    : "Remover o módulo?"}
                </span>
              }
            />
          )}
        </div>
      </div>
      {modulo.aulas.length === 0 ? (
        <p className="border-border border-t px-5 py-4 text-muted-foreground text-sm">
          Nenhuma aula neste módulo.
        </p>
      ) : (
        <ol aria-label={`Aulas do ${nome}`}>
          <li
            aria-hidden="true"
            className={cn(
              "hidden border-border border-t px-5 pt-3 font-semibold text-muted-foreground text-xs xl:grid",
              GRADE_DA_AULA
            )}
          >
            <span className="text-right">Nº</span>
            <span>Título</span>
            <span>Duração</span>
            <span>Vídeo</span>
          </li>
          {modulo.aulas.map((a, i) => (
            <LinhaDaAula
              assistida={assistidasPorAula[a.id] ?? 0}
              aula={a}
              despachar={despachar}
              key={a.id}
              modulo={modulo}
              modulos={modulos}
              posicao={i + 1}
              total={modulo.aulas.length}
            />
          ))}
        </ol>
      )}
      <div className="border-border border-t px-5 py-3">
        <Button className={cn(BOTAO_CONTORNO, PEQUENO)} onClick={adicionarAula}>
          <Plus aria-hidden="true" className="size-4" />
          Adicionar aula
        </Button>
      </div>
    </section>
  );
}
