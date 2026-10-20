"use client";

import { Checkbox } from "@cursos/ui/components/checkbox";
import { Input } from "@cursos/ui/components/input";
import { type FormEvent, useCallback, useId, useState } from "react";

import { CAIXA, CAMPO, ROTULO } from "@/components/casca/campos";

import {
  ACOES,
  AJUDA,
  BOTAO_PEQUENO,
  CABECALHO_DO_CARTAO,
  CARTAO,
  CONTORNO_PEQUENO,
  DETALHE_DA_LINHA,
  LINHA,
  NOME_DA_LINHA,
  PE_DO_CARTAO,
  TEXTO_DA_LINHA,
  TITULO_DA_SECAO,
} from "./partes";
import type { Usuario } from "./tipos";
import { useAcaoDaConta } from "./use-acao-da-conta";

const SENHA_MINIMA = 15;

function FormularioDaSenha({
  fechar,
  user,
}: {
  fechar: () => void;
  user: Usuario;
}) {
  const id = useId();
  const { executar, pendente } = useAcaoDaConta();
  const [sairDosOutros, setSairDosOutros] = useState(true);
  const trocando = user.passwordEnabled;
  const salvar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const dados = new FormData(e.currentTarget);
      const atual = String(dados.get("atual") ?? "");
      executar(
        () =>
          user.updatePassword({
            currentPassword: trocando ? atual : undefined,
            newPassword: String(dados.get("nova") ?? ""),
            signOutOfOtherSessions: sairDosOutros,
          }),
        {
          depois: fechar,
          sensivel: true,
          sucesso: trocando ? "Senha trocada." : "Senha criada.",
        }
      );
    },
    [executar, fechar, sairDosOutros, trocando, user]
  );
  return (
    <form className="grid gap-3" onSubmit={salvar}>
      {trocando ? (
        <label className="grid gap-1.5" htmlFor={`${id}-atual`}>
          <span className={ROTULO}>Senha atual</span>
          <Input
            autoComplete="current-password"
            autoFocus
            className={CAMPO}
            id={`${id}-atual`}
            name="atual"
            required
            type="password"
          />
        </label>
      ) : null}
      <label className="grid gap-1.5" htmlFor={`${id}-nova`}>
        <span className={ROTULO}>{trocando ? "Senha nova" : "Senha"}</span>
        <Input
          aria-describedby={`${id}-ajuda`}
          autoComplete="new-password"
          autoFocus={!trocando}
          className={CAMPO}
          id={`${id}-nova`}
          minLength={SENHA_MINIMA}
          name="nova"
          required
          type="password"
        />
        <span className={AJUDA} id={`${id}-ajuda`}>
          Pelo menos {SENHA_MINIMA} caracteres. Uma frase serve, como trocar o
          bico da envasadora.
        </span>
      </label>
      <label
        className="flex cursor-pointer items-start gap-2.5 text-[13px]"
        htmlFor={`${id}-sair`}
      >
        <Checkbox
          checked={sairDosOutros}
          className={CAIXA}
          id={`${id}-sair`}
          onCheckedChange={setSairDosOutros}
        />
        Sair dos outros aparelhos onde a conta está aberta
      </label>
      <div className={ACOES}>
        <button className={BOTAO_PEQUENO} disabled={pendente} type="submit">
          Salvar senha
        </button>
        <button
          className={CONTORNO_PEQUENO}
          disabled={pendente}
          onClick={fechar}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function SecaoDaSenha({ user }: { user: Usuario }) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const temSenha = user.passwordEnabled;
  const fechar = useCallback(() => setAberto(false), []);
  const abrir = useCallback(() => setAberto(true), []);
  return (
    <section aria-labelledby={id} className={CARTAO}>
      <header className={CABECALHO_DO_CARTAO}>
        <h2 className={TITULO_DA_SECAO} id={id}>
          Senha
        </h2>
      </header>
      <div className={LINHA}>
        <div className={TEXTO_DA_LINHA}>
          <b className={NOME_DA_LINHA}>
            {temSenha ? "Com senha" : "Sem senha"}
          </b>
          <span className={DETALHE_DA_LINHA}>
            {temSenha
              ? "Você também entra com o e-mail e esta senha."
              : "Você entra com o código no e-mail ou com o Google. Crie uma senha para entrar também com ela."}
          </span>
        </div>
      </div>
      <div className={PE_DO_CARTAO}>
        {aberto ? (
          <FormularioDaSenha fechar={fechar} user={user} />
        ) : (
          <div className={ACOES}>
            <button className={CONTORNO_PEQUENO} onClick={abrir} type="button">
              {temSenha ? "Trocar senha" : "Criar senha"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
