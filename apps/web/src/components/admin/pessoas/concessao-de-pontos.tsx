"use client";

import {
  MOTIVO_DA_CONCESSAO_MAX,
  TETO_DA_CONCESSAO,
} from "@cursos/api/dominio/concessao";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldError, FieldLabel } from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import {
  type ChangeEvent,
  type FormEvent,
  type RefObject,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

import { BOTAO, CONTORNO_DESLIGADO } from "@/components/casca/botoes";
import { CAMPO, ROTULO } from "@/components/casca/campos";
import { fmtNum, fmtPts, fmtPtsComSinal } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import { Carregando } from "../confirmacao-na-linha";
import { OPCAO_DA_TRILHA, TRILHA } from "../partes";

type Sentido = "dar" | "tirar";

const SENTIDOS: readonly { rotulo: string; valor: Sentido }[] = [
  { rotulo: "Dar pontos", valor: "dar" },
  { rotulo: "Tirar pontos", valor: "tirar" },
];

/** Os valores que o admin mais concede; o resto vai em Outro valor. */
const ATALHOS = [500, 1000, 3000, 5000] as const;

/** Um atalho, Outro valor (o campo Pontos) ou nada escolhido ainda. */
type Escolha = number | "outro" | null;

const OUTRO = "outro";

const QUANTIDADE_INVALIDA = `Escreva um número inteiro de 1 a ${fmtNum(TETO_DA_CONCESSAO)}.`;
const MOTIVO_VAZIO = "Escreva o motivo.";
const SEM_VALOR = "Escolha um dos valores ou Outro valor.";
const SEM_OUTRO = "Escreva o valor em Pontos.";

const SO_ALGARISMOS = /^\d+$/;

// O rádio fica por baixo do label: as setas andam entre as opções, e o label
// acende com o foco do input pela variante hover: do globals.css.
const OPCAO_DO_SENTIDO = cn(
  OPCAO_DA_TRILHA,
  "has-disabled:cursor-not-allowed has-checked:bg-titulo has-checked:text-sobre-cor has-checked:hover:bg-foreground has-checked:hover:text-sobre-cor"
);

// O data-campo do label dá a borda Céu do index.css sob o cursor e com o foco.
const ATALHO =
  "inline-flex h-9 cursor-pointer items-center rounded-full border border-muted-foreground px-3.5 font-semibold text-[13px] text-foreground transition-colors has-checked:border-sol has-checked:text-sol has-disabled:cursor-not-allowed has-disabled:opacity-50";

/** "3.000" e "3000" valem 3000; o resto, null. */
function lerQuantidade(texto: string): number | null {
  const limpo = texto.replaceAll(".", "").replaceAll(" ", "");
  if (!SO_ALGARISMOS.test(limpo)) {
    return null;
  }
  const n = Number(limpo);
  return n >= 1 && n <= TETO_DA_CONCESSAO ? n : null;
}

type Envio =
  | { razao: string; rotulo: string; tipo: "desligado" }
  | { pontos: number; rotulo: string; tipo: "pronto" };

/**
 * O que o botão diz e se ele envia. Tirar mais que o saldo nem vai ao servidor;
 * o servidor recusa por conta própria do mesmo jeito.
 */
function envioDe(
  saldo: number,
  sentido: Sentido,
  escolha: Escolha,
  outro: string
): Envio {
  const n = escolha === OUTRO ? lerQuantidade(outro) : escolha;
  if (n === null) {
    let razao = SEM_VALOR;
    if (escolha === OUTRO) {
      razao = outro.trim() === "" ? SEM_OUTRO : QUANTIDADE_INVALIDA;
    }
    return { razao, rotulo: "Escolha o valor", tipo: "desligado" };
  }
  const pontos = sentido === "dar" ? n : -n;
  const novo = saldo + pontos;
  if (novo < 0) {
    return {
      razao: `Tirar ${fmtPts(n)} deixaria o saldo negativo.`,
      rotulo:
        saldo <= 0
          ? "A pessoa não tem pontos"
          : `A pessoa tem só ${fmtPts(saldo)}`,
      tipo: "desligado",
    };
  }
  const verbo = sentido === "dar" ? "Dar" : "Tirar";
  return {
    pontos,
    rotulo: `${verbo} ${fmtPts(n)}. Saldo vai a ${fmtNum(novo)}`,
    tipo: "pronto",
  };
}

interface Erros {
  motivo: string | null;
  /** A recusa do servidor, sob o valor. */
  valor: string | null;
}

const SEM_ERRO: Erros = { motivo: null, valor: null };

/** Os atalhos e o Outro valor, rádios de um grupo só, com a recusa embaixo. */
function GrupoDoValor({
  aoEscolher,
  erro,
  escolha,
  grupoRef,
  id,
  pendente,
}: {
  aoEscolher: (e: ChangeEvent<HTMLInputElement>) => void;
  erro: string | null;
  escolha: Escolha;
  grupoRef: RefObject<HTMLFieldSetElement | null>;
  id: string;
  pendente: boolean;
}) {
  const opcoes: readonly { rotulo: string; valor: number | "outro" }[] = [
    ...ATALHOS.map((n) => ({ rotulo: fmtNum(n), valor: n })),
    { rotulo: "Outro valor", valor: OUTRO },
  ];
  const erroDoValor = `${id}-valor-erro`;
  return (
    <fieldset
      aria-describedby={erro ? erroDoValor : undefined}
      className="m-0 grid min-w-0 gap-2 border-0 p-0"
      ref={grupoRef}
    >
      <legend className={cn(ROTULO, "mb-2 p-0")}>Valor</legend>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => (
          <label className={ATALHO} data-campo key={o.valor}>
            <input
              checked={escolha === o.valor}
              className="sr-only"
              disabled={pendente}
              name={`${id}-valor`}
              onChange={aoEscolher}
              type="radio"
              value={o.valor}
            />
            {o.rotulo}
          </label>
        ))}
      </div>
      {erro ? (
        <FieldError className="text-xs" id={erroDoValor}>
          {erro}
        </FieldError>
      ) : null}
    </fieldset>
  );
}

/** O campo do Outro valor: aceita "3.000" e "3000". */
function CampoPontos({
  aoEscrever,
  campoRef,
  id,
  invalido,
  pendente,
  texto,
}: {
  aoEscrever: (e: ChangeEvent<HTMLInputElement>) => void;
  campoRef: RefObject<HTMLInputElement | null>;
  id: string;
  invalido: boolean;
  pendente: boolean;
  texto: string;
}) {
  const erro = `${id}-outro-erro`;
  return (
    <Field
      className="max-w-40 gap-1.5"
      data-invalid={invalido ? true : undefined}
    >
      <FieldLabel className={ROTULO} htmlFor={`${id}-quantidade`}>
        Pontos
      </FieldLabel>
      <Input
        aria-describedby={invalido ? erro : undefined}
        aria-invalid={invalido ? true : undefined}
        autoComplete="off"
        className={CAMPO}
        disabled={pendente}
        id={`${id}-quantidade`}
        inputMode="numeric"
        name="quantidade"
        onChange={aoEscrever}
        placeholder="3.000"
        ref={campoRef}
        value={texto}
      />
      {invalido ? (
        <FieldError className="text-xs" id={erro}>
          {QUANTIDADE_INVALIDA}
        </FieldError>
      ) : null}
    </Field>
  );
}

/**
 * O formulário da concessão: dar ou tirar, o valor por atalho ou no campo
 * Pontos, e o motivo. O botão diz o saldo que fica. A recusa do servidor
 * aparece sob o valor e no toast.
 */
export function ConcessaoDePontos({
  nome,
  saldo,
  userId,
}: {
  nome: string;
  saldo: number;
  userId: string;
}) {
  const id = useId();
  const { executar, pendente } = useAcao();
  const [sentido, setSentido] = useState<Sentido>("dar");
  const [escolha, setEscolha] = useState<Escolha>(null);
  const [outro, setOutro] = useState("");
  const [erros, setErros] = useState<Erros>(SEM_ERRO);
  const valores = useRef<HTMLFieldSetElement>(null);
  const quantidade = useRef<HTMLInputElement>(null);
  const motivo = useRef<HTMLInputElement>(null);

  const envio = envioDe(saldo, sentido, escolha, outro);
  const outroInvalido =
    escolha === OUTRO && outro.trim() !== "" && lerQuantidade(outro) === null;

  const escolherSentido = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSentido(e.currentTarget.value as Sentido);
    setErros((x) => ({ ...x, valor: null }));
  }, []);
  const escolherValor = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value;
    setEscolha(v === OUTRO ? OUTRO : Number(v));
    setErros((x) => ({ ...x, valor: null }));
  }, []);
  const escreverOutro = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setOutro(e.currentTarget.value);
    setErros((x) => ({ ...x, valor: null }));
  }, []);
  const limparMotivo = useCallback(
    () => setErros((x) => ({ ...x, motivo: null })),
    []
  );

  const enviar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // O botão desligado segue focável, e o Enter no Motivo ainda envia.
      if (envio.tipo !== "pronto") {
        if (escolha === OUTRO) {
          quantidade.current?.focus();
        } else {
          valores.current
            ?.querySelector<HTMLInputElement>("input:checked, input")
            ?.focus();
        }
        return;
      }
      const texto = (motivo.current?.value ?? "").trim();
      if (texto === "") {
        setErros({ motivo: MOTIVO_VAZIO, valor: null });
        motivo.current?.focus();
        return;
      }
      setErros(SEM_ERRO);
      const { pontos } = envio;
      executar(
        () =>
          trpcClient.admin.pessoas.concederPontos.mutate({
            motivo: texto,
            pontos,
            userId,
          }),
        {
          aoRecusar: (_motivo, mensagem) => {
            if (mensagem) {
              setErros({ motivo: null, valor: mensagem });
            }
          },
          depois: () => {
            setSentido("dar");
            setEscolha(null);
            setOutro("");
            if (motivo.current) {
              motivo.current.value = "";
            }
          },
          sucesso: (r) =>
            `${fmtPtsComSinal(pontos)} para ${nome}. Saldo: ${fmtPts(r.saldo)}.`,
        }
      );
    },
    [envio, escolha, executar, nome, userId]
  );

  const erroDoOutro = `${id}-outro-erro`;
  const erroDoMotivo = `${id}-motivo-erro`;
  const razao = `${id}-razao`;
  let descricaoDoBotao: string | undefined;
  if (envio.tipo === "desligado") {
    descricaoDoBotao = outroInvalido ? erroDoOutro : razao;
  }
  return (
    <form
      className="grid gap-4 border-border border-t px-[22px] py-4"
      noValidate
      onSubmit={enviar}
    >
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">O que fazer</legend>
        <div
          className={cn(
            TRILHA,
            "grid w-full max-w-80 grid-cols-2 bg-background ring-muted-foreground"
          )}
        >
          {SENTIDOS.map((s) => (
            <label className={OPCAO_DO_SENTIDO} key={s.valor}>
              <input
                checked={sentido === s.valor}
                className="sr-only"
                disabled={pendente}
                name={`${id}-sentido`}
                onChange={escolherSentido}
                type="radio"
                value={s.valor}
              />
              {s.rotulo}
            </label>
          ))}
        </div>
      </fieldset>
      <GrupoDoValor
        aoEscolher={escolherValor}
        erro={erros.valor}
        escolha={escolha}
        grupoRef={valores}
        id={id}
        pendente={pendente}
      />
      {escolha === OUTRO ? (
        <CampoPontos
          aoEscrever={escreverOutro}
          campoRef={quantidade}
          id={id}
          invalido={outroInvalido}
          pendente={pendente}
          texto={outro}
        />
      ) : null}
      <Field className="gap-1.5" data-invalid={erros.motivo ? true : undefined}>
        <FieldLabel className={ROTULO} htmlFor={`${id}-motivo`}>
          Motivo
        </FieldLabel>
        <Input
          aria-describedby={erros.motivo ? erroDoMotivo : undefined}
          aria-invalid={erros.motivo ? true : undefined}
          autoComplete="off"
          className={CAMPO}
          disabled={pendente}
          id={`${id}-motivo`}
          maxLength={MOTIVO_DA_CONCESSAO_MAX}
          name="motivo"
          onChange={limparMotivo}
          placeholder="Pedido do RH para a campanha de vendas"
          ref={motivo}
        />
        {erros.motivo ? (
          <FieldError className="text-xs" id={erroDoMotivo}>
            {erros.motivo}
          </FieldError>
        ) : null}
      </Field>
      <Button
        aria-busy={pendente}
        aria-describedby={descricaoDoBotao}
        className={cn(
          envio.tipo === "pronto" ? BOTAO : CONTORNO_DESLIGADO,
          "justify-self-start"
        )}
        disabled={envio.tipo !== "pronto" || pendente}
        focusableWhenDisabled
        type="submit"
      >
        <Carregando ativo={pendente} />
        {envio.rotulo}
      </Button>
      {envio.tipo === "desligado" && !outroInvalido ? (
        <span className="sr-only" id={razao}>
          {envio.razao}
        </span>
      ) : null}
    </form>
  );
}
