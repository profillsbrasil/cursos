"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useId, useState } from "react";

import {
  CamposDoNome,
  idDoErroDoNome,
  type NomeDigitado,
  SalvarNome,
} from "@/components/minha-conta/campos-do-nome";
import { problemaDoNome } from "@/components/minha-conta/nome";
import { ACOES } from "@/components/minha-conta/partes";
import type { Usuario } from "@/components/minha-conta/tipos";
import {
  type AcaoDaConta,
  useAcaoDaConta,
} from "@/components/minha-conta/use-acao-da-conta";

/**
 * O formulário com o Clerk: salvo o nome, o `router.refresh()` faz o servidor
 * reler a conta, e a página troca o cartão pela folha e pelo Baixar PDF.
 */
export function NomeQueFalta() {
  const { user } = useUser();
  const router = useRouter();
  const acao = useAcaoDaConta();

  return (
    <FormularioDoNome
      acao={acao}
      depois={() => router.refresh()}
      user={user ?? null}
    />
  );
}

export function FormularioDoNome({
  acao: { executar, pendente },
  depois,
  user,
}: {
  acao: AcaoDaConta;
  depois: () => void;
  /** `null` enquanto o Clerk carrega o usuário: os campos já aparecem, e o Salvar espera. */
  user: Pick<Usuario, "update"> | null;
}) {
  const id = useId();
  const [valor, setValor] = useState<NomeDigitado>({ nome: "", sobrenome: "" });

  const problema = problemaDoNome(valor.nome, valor.sobrenome);

  const digitou = valor.nome !== "" || valor.sobrenome !== "";
  const noCampo = digitou ? problema : null;
  const idDoErro = idDoErroDoNome(id);
  const idDoMotivo = `${id}-motivo`;

  const salvar = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (problema || !user) {
      return;
    }

    executar(
      () =>
        user.update({
          firstName: valor.nome.trim(),
          lastName: valor.sobrenome.trim(),
        }),
      { depois, sucesso: "Nome salvo." }
    );
  };

  return (
    <form className="@container grid w-full gap-4" onSubmit={salvar}>
      <CamposDoNome
        id={id}
        problema={noCampo}
        setValor={setValor}
        valor={valor}
      />
      <div className={ACOES}>
        <SalvarNome
          descritoPor={noCampo ? idDoErro : idDoMotivo}
          idDoMotivo={idDoMotivo}
          motivo={problema?.frase ?? "Carregando a sua conta."}
          parado={problema !== null || user === null}
          pendente={pendente}
        />
      </div>
    </form>
  );
}
