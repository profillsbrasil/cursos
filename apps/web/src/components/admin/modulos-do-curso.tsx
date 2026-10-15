"use client";

import { CARACTERES } from "@cursos/api/dominio/edicao-do-curso";
import type { AulaId, ModuloId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldLabel } from "@cursos/ui/components/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@cursos/ui/components/native-select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Eye,
  Plus,
  Trash2,
} from "lucide-react";
import {
  type ChangeEvent,
  type Dispatch,
  type MouseEvent,
  useCallback,
} from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { DICA } from "@/components/casca/estilo";
import {
  type Direcao,
  focarDepois,
  novoId,
  setaDepoisDeMover,
  vizinhoQueFica,
} from "@/lib/editor";
import { fmtHoras, plural } from "@/lib/formato";

import { CampoDeTexto, CampoLido } from "./campo-lido";
import { ConfirmacaoNaLinha, type LinhaAberta } from "./confirmacao-na-linha";
import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";
import {
  type Abertos,
  type AcaoNosBlocos,
  type Bloco,
  blocoDoModulo,
  type Marcados,
  type Mudanca,
} from "./estado-do-editor";
import {
  CONTORNO_DESLIGADO,
  ICONE,
  ROTULO,
  SELECAO,
  SELO,
  Vazio,
} from "./partes";
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
type MudarBlocos = Dispatch<AcaoNosBlocos>;
type Niveis = RascunhoDoCurso["niveis"];

/** Âncora e alvos de foco do bloco; os campos que o schema marca usam o ID. */
const ALVO = {
  bloco: (id: ModuloId) => `modulo-${id}`,
  cabeca: (id: ModuloId) => `modulo-${id}-cabeca`,
  conteudo: (id: ModuloId) => `modulo-${id}-conteudo`,
  novaAula: (id: ModuloId) => `modulo-${id}-nova-aula`,
  novoModulo: "modulo-novo",
  removerAula: (id: AulaId) => `aula-${id}-remover`,
};

const SELECAO_PEQUENA =
  "w-36 *:data-[slot=native-select]:h-10 *:data-[slot=native-select]:rounded-full *:data-[slot=native-select]:border-muted-foreground *:data-[slot=native-select]:bg-background *:data-[slot=native-select]:pl-3.5 *:data-[slot=native-select]:text-[13px] md:*:data-[slot=native-select]:h-9";
const GRADE_DA_AULA =
  "xl:grid-cols-[2rem_minmax(0,1fr)_7rem_minmax(0,0.9fr)_16.5rem] xl:gap-x-3";

/** No lugar da lixeira: o ícone em Céu é informação, não botão desligado. */
const AULA_ASSISTIDA =
  "grid size-10 cursor-help place-items-center rounded-full text-ceu hover:bg-muted md:size-9";

/** O número do módulo no cabeçalho e no índice: aberto em Sol suave, erro em contorno. */
const NUMERO: Record<Bloco["tipo"], string> = {
  aberto: "bg-sol/14 text-sol",
  com_erro: "text-destructive ring-1 ring-destructive ring-inset",
  fechado: "bg-popover text-foreground",
};

const NUMERO_SOB_O_CURSOR: Record<Bloco["tipo"], string> = {
  aberto: "hover:bg-sol/24",
  com_erro: "hover:bg-destructive/12",
  fechado: "hover:bg-trilho hover:text-titulo",
};

const nomeFalado = (tipo: string, n: number | string, titulo: string) =>
  titulo.trim() ? `${tipo} ${n} (${titulo.trim()})` : `${tipo} ${n}`;

const nomeDoModulo = (m: ModuloDoRascunho) =>
  m.titulo.trim() ? `Módulo ${m.numero} · ${m.titulo}` : `Módulo ${m.numero}`;

const numeroNaTela = (m: ModuloDoRascunho) => m.numero.trim() || "?";

const camposParaCorrigir = (n: number) =>
  plural(n, "campo para corrigir", "campos para corrigir");

function focarNoBotao(
  prefixo: string,
  direcao: Direcao,
  chegouNaBorda: boolean
) {
  focarDepois(`${prefixo}-${setaDepoisDeMover(direcao, chegouNaBorda)}`);
}

function AulaAssistida({
  alunos,
  id,
  nome,
}: {
  alunos: number;
  id: AulaId;
  nome: string;
}) {
  const frase = `Assistida por ${plural(alunos, "aluno", "alunos")}. Não se apaga, mas dá para trocar o vídeo e o título.`;
  return (
    <Tooltip>
      <TooltipTrigger
        aria-describedby={`aula-${id}-uso`}
        aria-disabled="true"
        aria-label={`Remover a ${nome}`}
        className={AULA_ASSISTIDA}
        id={ALVO.removerAula(id)}
        type="button"
      >
        <Eye aria-hidden="true" className="size-4" />
      </TooltipTrigger>
      <TooltipContent className={DICA} side="left">
        {frase}
      </TooltipContent>
      <span className="sr-only" id={`aula-${id}-uso`}>
        {frase}
      </span>
    </Tooltip>
  );
}

function LinhaDaAula({
  assistida,
  aula,
  despachar,
  modulo,
  modulos,
  posicao,
  total,
  vizinho,
}: {
  assistida: number;
  aula: AulaDoRascunho;
  despachar: Despachar;
  modulo: ModuloDoRascunho;
  modulos: readonly ModuloDoRascunho[];
  posicao: number;
  total: number;
  vizinho: AulaId | null;
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
  // O destino abre no reducer dos blocos, e o foco segue a aula até lá.
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
  const remover = useCallback(() => {
    despachar({ id, tipo: "aula_removida" });
    focarDepois(vizinho ? ALVO.removerAula(vizinho) : ALVO.novaAula(modulo.id));
  }, [despachar, id, modulo.id, vizinho]);

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
        {assistida > 0 ? (
          <AulaAssistida alunos={assistida} id={id} nome={nome} />
        ) : (
          <Button
            aria-label={`Remover a ${nome}`}
            className={ICONE}
            id={ALVO.removerAula(id)}
            onClick={remover}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
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
  niveis: Niveis;
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

function nomeDoNivel(niveis: Niveis, ordem: number | null) {
  if (ordem === null) {
    return null;
  }
  return niveis.find((n) => n.ordem === ordem)?.nome.trim() || `Nível ${ordem}`;
}

/** A linha que resume o módulo e abre ou fecha o bloco. */
function CabecaDoBloco({
  alternar,
  assistidas,
  bloco,
  modulo,
  niveis,
}: {
  alternar: () => void;
  assistidas: number;
  bloco: Bloco;
  modulo: ModuloDoRascunho;
  niveis: Niveis;
}) {
  const aberto = bloco.tipo !== "fechado";
  const duracao = segundosDas(modulo.aulas);
  const titulo = modulo.titulo.trim();
  const resumo = [
    plural(modulo.aulas.length, "aula", "aulas"),
    duracao > 0 ? fmtHoras(duracao) : null,
    nomeDoNivel(niveis, modulo.nivelOrdem),
  ]
    .filter((t): t is string => t !== null)
    .join(" · ");
  return (
    <h3>
      <button
        aria-controls={aberto ? ALVO.conteudo(modulo.id) : undefined}
        aria-disabled={bloco.tipo === "com_erro" ? true : undefined}
        aria-expanded={aberto}
        className={cn(
          "group/bloco grid w-full cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_1rem] items-center gap-x-3 gap-y-1.5 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-white/8 aria-disabled:cursor-default motion-reduce:transition-none",
          aberto && "bg-muted/30"
        )}
        id={ALVO.cabeca(modulo.id)}
        onClick={alternar}
        type="button"
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid size-7 place-items-center rounded-full font-semibold text-xs tabular-nums",
            NUMERO[bloco.tipo]
          )}
        >
          {numeroNaTela(modulo)}
        </span>
        <span className="min-w-0 text-pretty font-semibold text-[15px] text-foreground group-hover/bloco:text-titulo md:truncate">
          <span className="sr-only">Módulo {modulo.numero}: </span>
          {titulo || (
            <span className="font-normal text-muted-foreground">
              Sem título
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 text-muted-foreground group-hover/bloco:text-titulo",
            aberto && "rotate-180"
          )}
        />
        <span className="col-start-2 col-end-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-xs tabular-nums">
          <span>{resumo}</span>
          {assistidas > 0 ? (
            <span className={cn(SELO, "gap-1.5 text-muted-foreground")}>
              <Eye aria-hidden="true" className="size-3 text-ceu" />
              {plural(assistidas, "aula assistida", "aulas assistidas")}
            </span>
          ) : null}
          {bloco.tipo === "com_erro" ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-destructive">
              <CircleAlert aria-hidden="true" className="size-3.5" />
              {camposParaCorrigir(bloco.campos)}
            </span>
          ) : null}
        </span>
      </button>
    </h3>
  );
}

export function BlocoDoModulo({
  assistidasPorAula,
  bloco,
  despachar,
  indice,
  linhaAberta,
  modulo,
  modulos,
  mudarBlocos,
  niveis,
}: {
  assistidasPorAula: Readonly<Record<string, number>>;
  bloco: Bloco;
  despachar: Despachar;
  indice: number;
  linhaAberta: LinhaAberta;
  modulo: ModuloDoRascunho;
  modulos: readonly ModuloDoRascunho[];
  mudarBlocos: MudarBlocos;
  niveis: Niveis;
}) {
  const { id } = modulo;
  const nome = nomeFalado("módulo", modulo.numero, modulo.titulo);
  const assistidas = modulo.aulas.filter(
    (a) => (assistidasPorAula[a.id] ?? 0) > 0
  ).length;
  const ultimo = modulos.length - 1;

  // Com erro na tela o bloco não fecha, e a linha diz por quê.
  const alternar = useCallback(() => {
    if (bloco.tipo !== "com_erro") {
      mudarBlocos({
        id,
        tipo: bloco.tipo === "fechado" ? "aberto" : "fechado",
      });
    }
  }, [bloco.tipo, id, mudarBlocos]);
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
    const vizinho = vizinhoQueFica(modulos, indice);
    focarDepois(vizinho ? ALVO.cabeca(vizinho.id) : ALVO.novoModulo);
  }, [despachar, id, indice, linhaAberta, modulos]);
  const adicionarAula = useCallback(() => {
    const aula = novoId<AulaId>();
    despachar({ id: aula, moduloId: id, tipo: "aula_nova" });
    focarDepois(ID.aula(aula, "titulo"));
  }, [despachar, id]);

  return (
    <section
      aria-label={nome}
      className="scroll-mt-20 border-border border-t first:border-t-0"
      id={ALVO.bloco(id)}
    >
      <CabecaDoBloco
        alternar={alternar}
        assistidas={assistidas}
        bloco={bloco}
        modulo={modulo}
        niveis={niveis}
      />
      {bloco.tipo === "fechado" ? null : (
        <div id={ALVO.conteudo(id)}>
          <div className="grid gap-3 bg-muted/30 px-5 pt-1 pb-4 md:grid-cols-[6rem_minmax(0,1fr)_16rem] md:items-start">
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
                    className={cn(CONTORNO_DESLIGADO, PEQUENO, "ml-1")}
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
                  gatilho={{
                    nome: `Remover o ${nome}`,
                    rotulo: "Remover módulo",
                  }}
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
                  vizinho={vizinhoQueFica(modulo.aulas, i)?.id ?? null}
                />
              ))}
            </ol>
          )}
          <div className="border-border border-t px-5 py-3">
            <Button
              className={cn(BOTAO_CONTORNO, PEQUENO)}
              id={ALVO.novaAula(id)}
              onClick={adicionarAula}
            >
              <Plus aria-hidden="true" className="size-4" />
              Adicionar aula
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function estadoFalado(bloco: Bloco) {
  if (bloco.tipo === "com_erro") {
    return `, ${camposParaCorrigir(bloco.campos)}`;
  }
  return bloco.tipo === "aberto" ? ", aberto" : "";
}

function LinkDoIndice({
  bloco,
  irPara,
  modulo,
}: {
  bloco: Bloco;
  irPara: (id: ModuloId) => void;
  modulo: ModuloDoRascunho;
}) {
  const ir = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      irPara(modulo.id);
    },
    [irPara, modulo.id]
  );
  const titulo = modulo.titulo.trim() || "Sem título";
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          // relative: o sr-only é absolute e, sem isto, escapa da fila que rola e alarga a página.
          "relative grid h-9 min-w-9 place-items-center rounded-full px-2.5 font-semibold text-[13px] tabular-nums transition-colors duration-150 motion-reduce:transition-none",
          NUMERO[bloco.tipo],
          NUMERO_SOB_O_CURSOR[bloco.tipo]
        )}
        render={<a href={`#${ALVO.bloco(modulo.id)}`} onClick={ir} />}
      >
        <span className="sr-only">Módulo </span>
        {numeroNaTela(modulo)}
        <span className="sr-only">
          : {titulo}
          {estadoFalado(bloco)}
        </span>
      </TooltipTrigger>
      <TooltipContent className={DICA} side="bottom">
        {titulo}
      </TooltipContent>
    </Tooltip>
  );
}

/** Preso ao topo da seção: leva ao módulo e o abre. */
function IndiceDosModulos({
  blocos,
  irPara,
}: {
  blocos: readonly { bloco: Bloco; modulo: ModuloDoRascunho }[];
  irPara: (id: ModuloId) => void;
}) {
  return (
    <nav
      aria-label="Índice dos módulos"
      className="sticky top-3 z-10 flex items-center gap-3 rounded-[20px] bg-card/95 py-2 pr-2 pl-4 ring-1 ring-border backdrop-blur-sm"
    >
      <span
        aria-hidden="true"
        className="shrink-0 text-muted-foreground text-xs"
      >
        Ir para
      </span>
      <ol
        className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none] md:flex-wrap max-md:[mask-image:linear-gradient(to_right,#000_calc(100%_-_2.5rem),transparent)]"
        // biome-ignore lint/a11y/noRedundantRoles: o WebKit tira o papel de lista do `ol` sem marcador, e o VoiceOver não diz "lista".
        role="list"
      >
        {blocos.map(({ bloco, modulo }) => (
          <li key={modulo.id}>
            <LinkDoIndice bloco={bloco} irPara={irPara} modulo={modulo} />
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * A seção dos módulos. Não usa a Secao de partes.tsx porque o cartão dela tem
 * overflow-hidden, e o índice preso ao topo precisa ficar fora do cartão.
 */
export function ModulosDoCurso({
  abertos,
  assistidasPorAula,
  despachar,
  linhaAberta,
  marcados,
  mudarBlocos,
  rascunho,
}: {
  abertos: Abertos;
  assistidasPorAula: Readonly<Record<string, number>>;
  despachar: Despachar;
  linhaAberta: LinhaAberta;
  marcados: Marcados;
  mudarBlocos: MudarBlocos;
  rascunho: RascunhoDoCurso;
}) {
  const { modulos, niveis } = rascunho;
  const blocos = modulos.map((modulo) => ({
    bloco: blocoDoModulo(modulo, abertos, marcados),
    modulo,
  }));
  const aulas = modulos.reduce((s, m) => s + m.aulas.length, 0);

  const adicionarModulo = useCallback(() => {
    const id = novoId<ModuloId>();
    despachar({ id, tipo: "modulo_novo" });
    focarDepois(ID.modulo(id, "titulo"));
  }, [despachar]);
  // Sem rolagem suave: o salto vem do teclado tanto quanto do mouse.
  const irPara = useCallback(
    (id: ModuloId) => {
      mudarBlocos({ id, tipo: "aberto" });
      requestAnimationFrame(() => {
        document.getElementById(ALVO.bloco(id))?.scrollIntoView();
        document
          .getElementById(ALVO.cabeca(id))
          ?.focus({ preventScroll: true });
      });
    },
    [mudarBlocos]
  );

  return (
    // min-w-0 e a coluna minmax(0,1fr): a fila do índice rola por dentro em vez de alargar a página.
    <section
      aria-labelledby="modulos"
      className="grid min-w-0 grid-cols-1 gap-3.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          className="font-bold text-2xl text-titulo tracking-tight"
          id="modulos"
          tabIndex={-1}
        >
          Módulos e aulas
        </h2>
        <p className="text-muted-foreground text-sm tabular-nums">
          {plural(modulos.length, "módulo", "módulos")},{" "}
          {plural(aulas, "aula", "aulas")}
        </p>
      </div>
      {modulos.length > 1 ? (
        <IndiceDosModulos blocos={blocos} irPara={irPara} />
      ) : null}
      <div className="overflow-hidden rounded-[20px] bg-card ring-1 ring-border">
        {modulos.length === 0 ? (
          <Vazio>
            O curso ainda não tem módulos. Cada módulo agrupa aulas, e o aluno
            vê o número dele.
          </Vazio>
        ) : (
          blocos.map(({ bloco, modulo }, i) => (
            <BlocoDoModulo
              assistidasPorAula={assistidasPorAula}
              bloco={bloco}
              despachar={despachar}
              indice={i}
              key={modulo.id}
              linhaAberta={linhaAberta}
              modulo={modulo}
              modulos={modulos}
              mudarBlocos={mudarBlocos}
              niveis={niveis}
            />
          ))
        )}
        <div className="border-border border-t px-5 py-4">
          <Button
            className={cn(BOTAO_CONTORNO, PEQUENO)}
            id={ALVO.novoModulo}
            onClick={adicionarModulo}
          >
            <Plus aria-hidden="true" className="size-4" />
            Adicionar módulo
          </Button>
        </div>
      </div>
    </section>
  );
}
