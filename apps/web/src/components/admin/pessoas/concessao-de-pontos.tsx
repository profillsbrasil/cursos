"use client";

import {
  MOTIVO_DA_CONCESSAO_MAX,
  TETO_DA_CONCESSAO,
} from "@cursos/api/dominio/concessao";
import { Button } from "@cursos/ui/components/button";
import { Field, FieldError, FieldLabel } from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import { type FormEvent, useCallback, useId, useRef, useState } from "react";

import { BOTAO, NAO_PODE } from "@/components/casca/botoes";
import { CAMPO, RADIO, ROTULO } from "@/components/casca/campos";
import { fmtNum, fmtPts, fmtPtsComSinal } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import { Carregando } from "../confirmacao-na-linha";

type Sentido = "dar" | "tirar";

const SENTIDOS: readonly { rotulo: string; valor: Sentido }[] = [
  { rotulo: "Dar", valor: "dar" },
  { rotulo: "Tirar", valor: "tirar" },
];

const QUANTIDADE_INVALIDA = `Escreva um número inteiro de 1 a ${fmtNum(TETO_DA_CONCESSAO)}.`;
const MOTIVO_VAZIO = "Escreva o motivo.";

const SO_ALGARISMOS = /^\d+$/;

/** "3.000" e "3000" valem 3000; o resto, null. */
function lerQuantidade(texto: string): number | null {
  const limpo = texto.replaceAll(".", "").replaceAll(" ", "");
  if (!SO_ALGARISMOS.test(limpo)) {
    return null;
  }
  const n = Number(limpo);
  return n >= 1 && n <= TETO_DA_CONCESSAO ? n : null;
}

interface Erros {
  motivo: string | null;
  quantidade: string | null;
}

const SEM_ERRO: Erros = { motivo: null, quantidade: null };

/**
 * O formulário da concessão: a quantidade, dar ou tirar e o motivo. A recusa do
 * servidor (a retirada maior que o saldo) aparece sob a quantidade e no toast.
 */
export function ConcessaoDePontos({
  nome,
  userId,
}: {
  nome: string;
  userId: string;
}) {
  const id = useId();
  const { executar, pendente } = useAcao();
  const [sentido, setSentido] = useState<Sentido>("dar");
  const [erros, setErros] = useState<Erros>(SEM_ERRO);
  const formulario = useRef<HTMLFormElement>(null);
  const quantidade = useRef<HTMLInputElement>(null);
  const motivo = useRef<HTMLInputElement>(null);

  const limparQuantidade = useCallback(
    () => setErros((e) => ({ ...e, quantidade: null })),
    []
  );
  const limparMotivo = useCallback(
    () => setErros((e) => ({ ...e, motivo: null })),
    []
  );
  const escolher = useCallback((novo: Sentido) => setSentido(novo), []);

  const enviar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const dados = new FormData(e.currentTarget);
      const n = lerQuantidade(String(dados.get("quantidade") ?? ""));
      const texto = String(dados.get("motivo") ?? "").trim();
      const novos: Erros = {
        motivo: texto === "" ? MOTIVO_VAZIO : null,
        quantidade: n === null ? QUANTIDADE_INVALIDA : null,
      };
      setErros(novos);
      if (n === null) {
        quantidade.current?.focus();
        return;
      }
      if (novos.motivo) {
        motivo.current?.focus();
        return;
      }
      const pontos = sentido === "dar" ? n : -n;
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
              setErros({ motivo: null, quantidade: mensagem });
              quantidade.current?.focus();
            }
          },
          depois: () => {
            formulario.current?.reset();
            setSentido("dar");
          },
          sucesso: (r) =>
            `${fmtPtsComSinal(pontos)} para ${nome}. Saldo: ${fmtPts(r.saldo)}.`,
        }
      );
    },
    [executar, nome, sentido, userId]
  );

  const erroDaQuantidade = `${id}-quantidade-erro`;
  const erroDoMotivo = `${id}-motivo-erro`;
  return (
    <form
      className="grid gap-4 border-border border-t px-[22px] py-4"
      noValidate
      onSubmit={enviar}
      ref={formulario}
    >
      <fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 border-0 p-0">
        <legend className={cn(ROTULO, "mb-2")}>O que fazer</legend>
        {SENTIDOS.map((s) => (
          <OpcaoDeSentido
            desligada={pendente}
            escolher={escolher}
            escolhida={sentido === s.valor}
            grupo={`${id}-sentido`}
            key={s.valor}
            rotulo={s.rotulo}
            valor={s.valor}
          />
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        <Field
          className="gap-1.5"
          data-invalid={erros.quantidade ? true : undefined}
        >
          <FieldLabel className={ROTULO} htmlFor={`${id}-quantidade`}>
            Pontos
          </FieldLabel>
          <Input
            aria-describedby={erros.quantidade ? erroDaQuantidade : undefined}
            aria-invalid={erros.quantidade ? true : undefined}
            autoComplete="off"
            className={CAMPO}
            disabled={pendente}
            id={`${id}-quantidade`}
            inputMode="numeric"
            name="quantidade"
            onChange={limparQuantidade}
            placeholder="3.000"
            ref={quantidade}
          />
          {erros.quantidade ? (
            <FieldError className="text-xs" id={erroDaQuantidade}>
              {erros.quantidade}
            </FieldError>
          ) : null}
        </Field>
        <Field
          className="gap-1.5"
          data-invalid={erros.motivo ? true : undefined}
        >
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
      </div>
      <Button
        aria-busy={pendente}
        className={cn(BOTAO, NAO_PODE, "justify-self-start")}
        disabled={pendente}
        focusableWhenDisabled
        type="submit"
      >
        <Carregando ativo={pendente} />
        {sentido === "dar" ? "Dar pontos" : "Tirar pontos"}
      </Button>
    </form>
  );
}

function OpcaoDeSentido({
  desligada,
  escolher,
  escolhida,
  grupo,
  rotulo,
  valor,
}: {
  desligada: boolean;
  escolher: (s: Sentido) => void;
  escolhida: boolean;
  grupo: string;
  rotulo: string;
  valor: Sentido;
}) {
  const aoEscolher = useCallback(() => escolher(valor), [escolher, valor]);
  return (
    <label className="flex cursor-pointer items-center gap-2.5 font-semibold text-titulo">
      <input
        checked={escolhida}
        className={RADIO}
        data-campo
        disabled={desligada}
        name={grupo}
        onChange={aoEscolher}
        type="radio"
        value={valor}
      />
      {rotulo}
    </label>
  );
}
