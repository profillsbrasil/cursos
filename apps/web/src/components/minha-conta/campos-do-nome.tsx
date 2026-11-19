import { Button } from "@cursos/ui/components/button";
import { FieldError } from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import type { Dispatch, SetStateAction } from "react";

import { CONTORNO_DESLIGADO, PEQUENO } from "@/components/casca/botoes";
import { CAMPO, ROTULO } from "@/components/casca/campos";

import { type CampoDoNome, LIMITE_DO_NOME, type ProblemaDoNome } from "./nome";
import { BOTAO_PEQUENO } from "./partes";

export interface NomeDigitado {
  nome: string;
  sobrenome: string;
}

export const idDoErroDoNome = (id: string) => `${id}-erro`;

export function CamposDoNome({
  id,
  problema,
  setValor,
  valor,
}: {
  id: string;
  problema: ProblemaDoNome | null;
  setValor: Dispatch<SetStateAction<NomeDigitado>>;
  valor: NomeDigitado;
}) {
  const idDoErro = idDoErroDoNome(id);

  const marcar = (campo: CampoDoNome) =>
    problema?.campos.includes(campo)
      ? { "aria-describedby": idDoErro, "aria-invalid": true }
      : {};

  return (
    <div className="grid gap-3 @min-[24rem]:grid-cols-2">
      <label className="grid min-w-0 gap-1.5" htmlFor={`${id}-nome`}>
        <span className={ROTULO}>Nome</span>
        <Input
          {...marcar("nome")}
          autoComplete="given-name"
          className={CAMPO}
          id={`${id}-nome`}
          maxLength={LIMITE_DO_NOME}
          name="nome"
          onChange={(e) => {
            const { value } = e.target;
            setValor((v) => ({ ...v, nome: value }));
          }}
          placeholder="Ana"
          required
          value={valor.nome}
        />
      </label>
      <label className="grid min-w-0 gap-1.5" htmlFor={`${id}-sobrenome`}>
        <span className={ROTULO}>Sobrenome</span>
        <Input
          {...marcar("sobrenome")}
          autoComplete="family-name"
          className={CAMPO}
          id={`${id}-sobrenome`}
          maxLength={LIMITE_DO_NOME}
          name="sobrenome"
          onChange={(e) => {
            const { value } = e.target;
            setValor((v) => ({ ...v, sobrenome: value }));
          }}
          placeholder="Souza"
          value={valor.sobrenome}
        />
      </label>
      {problema ? (
        <FieldError className="@min-[24rem]:col-span-2" id={idDoErro}>
          {problema.frase}
        </FieldError>
      ) : null}
    </div>
  );
}

/**
 * Parado (nada a salvar ou o nome não passa na regra), o Salvar é o contorno
 * desligado e focável, e diz por quê; enviando, fica Sol com o desligado.
 */
export function SalvarNome({
  descritoPor,
  idDoMotivo,
  motivo,
  parado,
  pendente,
}: {
  descritoPor: string;
  idDoMotivo: string;
  motivo: string;
  parado: boolean;
  pendente: boolean;
}) {
  return (
    <>
      <Button
        aria-describedby={parado ? descritoPor : undefined}
        className={
          parado && !pendente ? cn(CONTORNO_DESLIGADO, PEQUENO) : BOTAO_PEQUENO
        }
        disabled={pendente || parado}
        focusableWhenDisabled
        type="submit"
      >
        Salvar nome
      </Button>
      <span className="sr-only" id={idDoMotivo}>
        {motivo}
      </span>
    </>
  );
}
