"use client";

import { CARACTERES } from "@cursos/api/dominio/limites-do-curso";
import type { ModuloId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldLabel } from "@cursos/ui/components/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronDown, ChevronUp, CircleAlert, Plus, Users } from "lucide-react";
import { type Dispatch, type MouseEvent, useCallback } from "react";

import {
  BOTAO_CONTORNO,
  CONTORNO_DESLIGADO,
  PEQUENO,
} from "@/components/casca/botoes";
import { ROTULO } from "@/components/casca/campos";
import { CARTAO } from "@/components/casca/cartoes";
import { DICA } from "@/components/casca/estilo";
import { SELO } from "@/components/casca/selos";
import {
  type Direcao,
  focarDepois,
  novoId,
  setaDepoisDeMover,
  vizinhoQueFica,
} from "@/lib/editor";
import { fmtHoras, plural } from "@/lib/formato";
import { AulasDoModulo } from "./aulas-do-modulo";
import { CampoDeTexto, CampoLido } from "./campo-lido";
import { ConfirmacaoNaLinha, type LinhaAberta } from "./confirmacao-na-linha";
import { ErroDoCampo, useErroDoCampo } from "./erros-do-editor";
import { ICONE, Vazio } from "./partes";
import {
  ID,
  type ModuloDoRascunho,
  type RascunhoDoCurso,
  segundosDas,
} from "./rascunho-do-curso";
import {
  type Abertos,
  type AcaoDoAdmin,
  type Bloco,
  blocoDoModulo,
  type Escolhas,
  type Marcados,
  type Mudanca,
} from "./rascunho-do-editor";
import { Selecao } from "./selecao";

type Despachar = Dispatch<AcaoDoAdmin>;
type Niveis = RascunhoDoCurso["niveis"];

/** Âncora e alvos de foco do bloco; os campos que o schema marca usam o ID. */
const ALVO = {
  bloco: (id: ModuloId) => `modulo-${id}`,
  cabeca: (id: ModuloId) => `modulo-${id}-cabeca`,
  conteudo: (id: ModuloId) => `modulo-${id}-conteudo`,
  novoModulo: "modulo-novo",
};

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

const nomeFalado = (n: string, titulo: string) =>
  titulo.trim() ? `módulo ${n} (${titulo.trim()})` : `módulo ${n}`;

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

function NivelDoModulo({
  id,
  mudar,
  niveis,
  valor,
}: {
  id: string;
  mudar: (valor: string) => void;
  niveis: Niveis;
  valor: number | null;
}) {
  const { aria, mensagem } = useErroDoCampo(id);
  return (
    <Field
      className="@2xl:col-span-1 @sm:col-span-2 gap-1.5"
      data-invalid={mensagem ? true : undefined}
    >
      <FieldLabel className={ROTULO} htmlFor={id}>
        Nível
      </FieldLabel>
      <Selecao
        {...aria}
        aoMudar={mudar}
        className="md:h-10"
        id={id}
        opcoes={[
          { rotulo: "Sem nível", valor: "" },
          ...niveis.map((n) => ({
            rotulo: n.nome || `Nível ${n.ordem}`,
            valor: String(n.ordem),
          })),
        ]}
        valor={valor === null ? "" : String(valor)}
      />
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
          "group/bloco grid w-full cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_1rem] items-center gap-x-3 gap-y-1.5 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-white/8 aria-disabled:cursor-default",
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
        <span className="min-w-0 text-pretty font-semibold text-base text-foreground group-hover/bloco:text-titulo md:truncate">
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
            <span className={cn(SELO, "text-muted-foreground")}>
              <Users aria-hidden="true" className="text-ceu" />
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
  escolhas,
  indice,
  linhaAberta,
  marcados,
  modulo,
  modulos,
  niveis,
}: {
  assistidasPorAula: Readonly<Record<string, number>>;
  bloco: Bloco;
  despachar: Despachar;
  escolhas: Escolhas;
  indice: number;
  linhaAberta: LinhaAberta;
  marcados: Marcados;
  modulo: ModuloDoRascunho;
  modulos: readonly ModuloDoRascunho[];
  niveis: Niveis;
}) {
  const { id } = modulo;
  const nome = nomeFalado(modulo.numero, modulo.titulo);
  const assistidas = modulo.aulas.filter(
    (a) => (assistidasPorAula[a.id] ?? 0) > 0
  ).length;
  const ultimo = modulos.length - 1;

  // Com erro na tela o bloco não fecha, e a linha diz por quê.
  const alternar = useCallback(() => {
    if (bloco.tipo !== "com_erro") {
      despachar({
        id,
        tipo: bloco.tipo === "fechado" ? "aberto" : "fechado",
      });
    }
  }, [bloco.tipo, id, despachar]);
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
    (titulo: string) => editarModulo({ titulo }),
    [editarModulo]
  );
  const mudarNivel = useCallback(
    (nivel: string) =>
      editarModulo({ nivelOrdem: nivel === "" ? null : Number(nivel) }),
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
  return (
    <section
      aria-label={nome}
      className="border-border border-t first:border-t-0"
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
        // A largura do bloco, e não a da janela, decide a grade: em 768 px com a
        // sidebar aberta, o nível de 16rem na mesma linha deixava o título com 42 px.
        <div className="@container" id={ALVO.conteudo(id)}>
          <div className="grid @2xl:grid-cols-[6rem_minmax(0,1fr)_16rem] @sm:grid-cols-[6rem_minmax(0,1fr)] @sm:items-start gap-3 bg-muted/30 px-5 pt-1 pb-4">
            <CampoLido
              aoMudar={mudarNumero}
              aoSair={ordenar}
              id={ID.modulo(id, "numero")}
              inputMode="numeric"
              required
              rotulo={
                <>
                  Número<span className="sr-only"> do módulo</span>
                </>
              }
              texto={modulo.numero}
            />
            <CampoDeTexto
              aoMudar={mudarTitulo}
              campoClasse="gap-1.5"
              className="font-semibold"
              id={ID.modulo(id, "titulo")}
              maxLength={CARACTERES.tituloDoModulo}
              placeholder="Limpeza e higienização"
              required
              rotulo="Título do módulo"
              texto={modulo.titulo}
            />
            <NivelDoModulo
              id={ID.modulo(id, "nivel")}
              mudar={mudarNivel}
              niveis={niveis}
              valor={modulo.nivelOrdem}
            />
            <div className="col-span-full flex flex-wrap items-center gap-1">
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
          <AulasDoModulo
            assistidasPorAula={assistidasPorAula}
            despachar={despachar}
            escolhas={escolhas}
            marcados={marcados}
            modulo={modulo}
            modulos={modulos}
          />
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
          "relative grid h-9 min-w-9 place-items-center rounded-full px-2.5 font-semibold text-[13px] tabular-nums transition-colors duration-150",
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

/**
 * O salto do índice e o foco do teclado param abaixo do índice preso. A altura
 * dele muda: a fila quebra em duas linhas entre 768 e 1040 px de janela. Sem
 * nada de fora da função, porque o teste a roda no Chromium pelo texto dela.
 */
export function reservarOTopo(nav: HTMLElement | null) {
  if (!nav) {
    return;
  }
  const folga = 12;
  const raiz = document.documentElement;
  const medir = () => {
    const topo = Number.parseFloat(getComputedStyle(nav).top) || 0;
    raiz.style.scrollPaddingTop = `${topo + nav.offsetHeight + folga}px`;
  };
  const observador = new ResizeObserver(medir);
  observador.observe(nav);
  return () => {
    observador.disconnect();
    raiz.style.removeProperty("scroll-padding-top");
  };
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
      className={cn(
        CARTAO,
        "sticky top-[calc(var(--topo-da-casca,0px)+--spacing(3))] z-10 flex items-center gap-3 bg-card/95 py-2 pr-2 pl-4 backdrop-blur-sm"
      )}
      ref={reservarOTopo}
    >
      <span
        aria-hidden="true"
        className="shrink-0 text-muted-foreground text-xs"
      >
        Ir para
      </span>
      <ol
        // O pr-11 do celular passa da faixa de 2,5rem da máscara: no fim da rolagem, o último número sai inteiro.
        className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none] max-md:pr-11 md:flex-wrap max-md:[mask-image:linear-gradient(to_right,#000_calc(100%_-_2.5rem),transparent)]"
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
  escolhas,
  linhaAberta,
  marcados,
  rascunho,
}: {
  abertos: Abertos;
  assistidasPorAula: Readonly<Record<string, number>>;
  despachar: Despachar;
  escolhas: Escolhas;
  linhaAberta: LinhaAberta;
  marcados: Marcados;
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
      despachar({ id, tipo: "aberto" });
      requestAnimationFrame(() => {
        document.getElementById(ALVO.bloco(id))?.scrollIntoView();
        document
          .getElementById(ALVO.cabeca(id))
          ?.focus({ preventScroll: true });
      });
    },
    [despachar]
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
      <div className={cn(CARTAO, "overflow-hidden")}>
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
              escolhas={escolhas}
              indice={i}
              key={modulo.id}
              linhaAberta={linhaAberta}
              marcados={marcados}
              modulo={modulo}
              modulos={modulos}
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
