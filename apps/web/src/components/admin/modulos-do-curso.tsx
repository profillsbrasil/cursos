"use client";

import { CARACTERES } from "@cursos/api/dominio/edicao-do-curso";
import type { AulaId, ModuloId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldLabel } from "@cursos/ui/components/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@cursos/ui/components/native-select";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { type ChangeEvent, type Dispatch, useCallback } from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { focarDepois, novoId } from "@/lib/editor";
import { fmtHoras, plural } from "@/lib/formato";

import { CampoDeTexto, CampoLido } from "./campo-lido";
import { ConfirmacaoNaLinha, type LinhaAberta } from "./confirmacao-na-linha";
import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";
import type { Direcao, Mudanca } from "./estado-do-editor";
import { ICONE, ROTULO, SELECAO } from "./partes";
import {
  type AulaDoRascunho,
  ID,
  lerDuracao,
  lerNumeroDoModulo,
  lerVideo,
  type ModuloDoRascunho,
  type RascunhoDoCurso,
  segundosDas,
} from "./rascunho-do-curso";

type Despachar = Dispatch<Mudanca>;

const SELECAO_PEQUENA =
  "w-36 *:data-[slot=native-select]:h-10 *:data-[slot=native-select]:rounded-full *:data-[slot=native-select]:border-muted-foreground *:data-[slot=native-select]:bg-background *:data-[slot=native-select]:pl-3.5 *:data-[slot=native-select]:text-[13px] md:*:data-[slot=native-select]:h-9";
/** Colunas da aula a partir de xl; abaixo disso a aula empilha. */
const GRADE_DA_AULA =
  "xl:grid-cols-[2rem_minmax(0,1fr)_7rem_minmax(0,0.9fr)_16.5rem] xl:gap-x-3";

/** O nome nos rótulos dos botões: "aula 2 (Ajuste da válvula)". */
const nomeFalado = (tipo: string, n: number | string, titulo: string) =>
  titulo.trim() ? `${tipo} ${n} (${titulo.trim()})` : `${tipo} ${n}`;

const nomeDoModulo = (m: ModuloDoRascunho) =>
  m.titulo.trim() ? `Módulo ${m.numero} · ${m.titulo}` : `Módulo ${m.numero}`;

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
  aula: AulaDoRascunho;
  despachar: Despachar;
  modulo: ModuloDoRascunho;
  modulos: readonly ModuloDoRascunho[];
  posicao: number;
  total: number;
}) {
  const { id } = aula;
  const nome = nomeFalado("aula", posicao, aula.titulo);
  const outros = modulos.filter((m) => m.id !== modulo.id);

  const editarAula = useCallback(
    (mudanca: Extract<Mudanca, { tipo: "aula_editada" }>["mudanca"]) =>
      despachar({ id, mudanca, tipo: "aula_editada" }),
    [despachar, id]
  );
  const mudarTitulo = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      editarAula({ titulo: e.target.value }),
    [editarAula]
  );
  const mudarDuracao = useCallback(
    (duracao: string) => editarAula({ duracao }),
    [editarAula]
  );
  const mudarVideo = useCallback(
    (video: string) => editarAula({ video }),
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
      <div className="grid gap-1.5">
        <CampoDeTexto
          campoClasse="gap-1.5"
          className="md:h-10"
          id={ID.aula(id, "titulo")}
          maxLength={CARACTERES.tituloDaAula}
          onChange={mudarTitulo}
          placeholder="Título da aula"
          required
          rotulo={`Aula ${posicao}`}
          rotuloClasse="xl:sr-only"
          value={aula.titulo}
        />
        {assistida > 0 ? (
          <p className="text-muted-foreground text-xs" id={`aula-${id}-uso`}>
            Assistida por {plural(assistida, "aluno", "alunos")}. Não se apaga,
            mas dá para trocar o vídeo e o título.
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 xl:contents">
        <CampoLido
          aoMudar={mudarDuracao}
          id={ID.aula(id, "duracao")}
          ler={lerDuracao}
          placeholder="12:30"
          required
          rotulo={
            <>
              Duração<span className="sr-only"> da {nome}</span>
            </>
          }
          rotuloClasse="xl:sr-only"
          texto={aula.duracao}
        />
        <CampoLido
          aoMudar={mudarVideo}
          id={ID.aula(id, "video")}
          ler={lerVideo}
          placeholder="Link ou id do YouTube"
          rotulo={
            <>
              Vídeo<span className="sr-only"> da {nome}</span>
            </>
          }
          rotuloClasse="xl:sr-only"
          texto={aula.video}
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

function NivelDoModulo({
  id,
  mudar,
  niveis,
  valor,
}: {
  id: string;
  mudar: (e: ChangeEvent<HTMLSelectElement>) => void;
  niveis: RascunhoDoCurso["niveis"];
  valor: number | null;
}) {
  const { aria, mensagem } = useErroDoCampo(id);
  return (
    <Field className="gap-1.5" data-invalid={mensagem ? true : undefined}>
      <FieldLabel className={ROTULO} htmlFor={id}>
        Nível
      </FieldLabel>
      <NativeSelect
        {...aria}
        className={cn(SELECAO, "md:*:data-[slot=native-select]:h-10")}
        id={id}
        onChange={mudar}
        value={valor === null ? "" : String(valor)}
      >
        <NativeSelectOption value="">Sem nível</NativeSelectOption>
        {niveis.map((n) => (
          <NativeSelectOption key={n.ordem} value={String(n.ordem)}>
            {n.nome || `Nível ${n.ordem}`}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <ErroDoCampo id={id} mensagem={mensagem} />
    </Field>
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
  modulo: ModuloDoRascunho;
  modulos: readonly ModuloDoRascunho[];
  niveis: RascunhoDoCurso["niveis"];
}) {
  const { id } = modulo;
  const nome = nomeFalado("módulo", modulo.numero, modulo.titulo);
  const assistidas = modulo.aulas.filter(
    (a) => (assistidasPorAula[a.id] ?? 0) > 0
  ).length;
  const duracao = segundosDas(modulo.aulas);
  const ultimo = modulos.length - 1;

  const editarModulo = useCallback(
    (mudanca: Extract<Mudanca, { tipo: "modulo_editado" }>["mudanca"]) =>
      despachar({ id, mudanca, tipo: "modulo_editado" }),
    [despachar, id]
  );
  const mudarNumero = useCallback(
    (numero: string) => editarModulo({ numero }),
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
    focarDepois(ID.aula(aula, "titulo"));
  }, [despachar, id]);

  return (
    <section
      aria-label={nome}
      className="border-border border-t first:border-t-0"
    >
      <div className="grid gap-3 bg-muted/30 px-5 py-4 md:grid-cols-[6rem_minmax(0,1fr)_12rem] md:items-start">
        <CampoLido
          aoMudar={mudarNumero}
          aoSair={ordenar}
          id={ID.modulo(id, "numero")}
          inputMode="numeric"
          ler={lerNumeroDoModulo}
          required
          rotulo={
            <>
              Número<span className="sr-only"> do módulo</span>
            </>
          }
          texto={modulo.numero}
        />
        <div className="grid gap-1.5">
          <CampoDeTexto
            campoClasse="gap-1.5"
            className="font-semibold md:h-10"
            id={ID.modulo(id, "titulo")}
            maxLength={CARACTERES.tituloDoModulo}
            onChange={mudarTitulo}
            placeholder="Limpeza e higienização"
            required
            rotulo="Título do módulo"
            value={modulo.titulo}
          />
          <p className="text-muted-foreground text-xs tabular-nums">
            {plural(modulo.aulas.length, "aula", "aulas")}
            {duracao > 0 ? `, ${fmtHoras(duracao)}` : ""}
          </p>
        </div>
        <NivelDoModulo
          id={ID.modulo(id, "nivel")}
          mudar={mudarNivel}
          niveis={niveis}
          valor={modulo.nivelOrdem}
        />
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
