"use client";

import { Input } from "@cursos/ui/components/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@cursos/ui/components/input-otp";
import { cn } from "@cursos/ui/lib/utils";
import { type FormEvent, useCallback, useId, useState } from "react";

import { CAMPO, ROTULO } from "@/components/casca/campos";
import { SELO } from "@/components/casca/selos";
import { MINHA_CONTA } from "@/lib/rotas";
import { contaDoGoogle, podeDesconectarOGoogle } from "./entrada";
import { IconeDoGoogle } from "./icone-do-google";
import {
  ACAO_NA_LINHA,
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
import type { EmailDaConta, Usuario } from "./tipos";
import { useAcaoDaConta } from "./use-acao-da-conta";

const POSICOES_DO_CODIGO = [0, 1, 2, 3, 4, 5] as const;

const SLOT =
  "size-12 rounded-xl border border-muted-foreground bg-background font-mono font-semibold text-xl first:rounded-xl first:border-l last:rounded-xl data-[active=true]:border-ceu data-[active=true]:ring-0 dark:bg-background";

/** Adicionar um e-mail: o endereço, depois o código que chega nele. */
type Novo =
  | { passo: "fechado" }
  | { passo: "endereco" }
  | { email: EmailDaConta; passo: "codigo" };

function PedirCodigo({
  fechar,
  irAoCodigo,
  user,
}: {
  fechar: () => void;
  irAoCodigo: (email: EmailDaConta) => void;
  user: Usuario;
}) {
  const id = useId();
  const { executar, pendente } = useAcaoDaConta();
  const mandar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const endereco = String(
        new FormData(e.currentTarget).get("email") ?? ""
      ).trim();
      executar(
        async () => {
          const criado = await user.createEmailAddress({ email: endereco });
          return await criado.prepareVerification({ strategy: "email_code" });
        },
        { depois: irAoCodigo, sensivel: true }
      );
    },
    [executar, irAoCodigo, user]
  );
  return (
    <form className="grid gap-3" onSubmit={mandar}>
      <label className="grid gap-1.5" htmlFor={`${id}-email`}>
        <span className={ROTULO}>E-mail novo</span>
        <Input
          autoComplete="email"
          autoFocus
          className={CAMPO}
          id={`${id}-email`}
          name="email"
          placeholder="voce@empresa.com.br"
          required
          type="email"
        />
        <span className={AJUDA}>
          Mandamos um código de 6 dígitos para confirmar que o e-mail é seu.
        </span>
      </label>
      <div className={ACOES}>
        <button className={BOTAO_PEQUENO} disabled={pendente} type="submit">
          Mandar código
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

function ConfirmarCodigo({
  email,
  fechar,
}: {
  email: EmailDaConta;
  fechar: () => void;
}) {
  const id = useId();
  const { executar, pendente } = useAcaoDaConta();
  const [codigo, setCodigo] = useState("");
  const confirmar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      executar(() => email.attemptVerification({ code: codigo }), {
        depois: fechar,
        sucesso: "E-mail confirmado.",
      });
    },
    [codigo, email, executar, fechar]
  );
  const reenviar = useCallback(
    () =>
      executar(() => email.prepareVerification({ strategy: "email_code" }), {
        sucesso: "Mandamos outro código.",
      }),
    [email, executar]
  );
  return (
    <form className="grid gap-3" onSubmit={confirmar}>
      <div className="grid gap-1.5">
        <span className={ROTULO} id={`${id}-codigo`}>
          Código que chegou em {email.emailAddress}
        </span>
        <InputOTP
          aria-labelledby={`${id}-codigo`}
          autoFocus
          containerClassName="gap-2"
          maxLength={POSICOES_DO_CODIGO.length}
          onChange={setCodigo}
          pattern="^\d+$"
          value={codigo}
        >
          <InputOTPGroup className="gap-2">
            {POSICOES_DO_CODIGO.map((posicao) => (
              <InputOTPSlot className={SLOT} index={posicao} key={posicao} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <span className={AJUDA}>
          Não chegou? Olhe o spam ou{" "}
          <button
            className={ACAO_NA_LINHA}
            disabled={pendente}
            onClick={reenviar}
            type="button"
          >
            mande outro código
          </button>
          .
        </span>
      </div>
      <div className={ACOES}>
        <button
          className={BOTAO_PEQUENO}
          disabled={pendente || codigo.length < POSICOES_DO_CODIGO.length}
          type="submit"
        >
          Confirmar
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

function AdicionarEmail({ user }: { user: Usuario }) {
  const [novo, setNovo] = useState<Novo>({ passo: "fechado" });
  const fechar = useCallback(() => setNovo({ passo: "fechado" }), []);
  const abrir = useCallback(() => setNovo({ passo: "endereco" }), []);
  const irAoCodigo = useCallback(
    (email: EmailDaConta) => setNovo({ email, passo: "codigo" }),
    []
  );
  if (novo.passo === "endereco") {
    return <PedirCodigo fechar={fechar} irAoCodigo={irAoCodigo} user={user} />;
  }
  if (novo.passo === "codigo") {
    return <ConfirmarCodigo email={novo.email} fechar={fechar} />;
  }
  return (
    <div className={ACOES}>
      <button className={CONTORNO_PEQUENO} onClick={abrir} type="button">
        Adicionar outro e-mail
      </button>
    </div>
  );
}

function LinhaDoEmail({ email, user }: { email: EmailDaConta; user: Usuario }) {
  const { executar, pendente } = useAcaoDaConta();
  const principal = email.id === user.primaryEmailAddressId;
  const confirmado = email.verification?.status === "verified";
  const tornarPrincipal = useCallback(
    () =>
      executar(() => user.update({ primaryEmailAddressId: email.id }), {
        sensivel: true,
        sucesso: "E-mail principal trocado.",
      }),
    [email, executar, user]
  );
  const remover = useCallback(
    () =>
      executar(() => email.destroy(), {
        sensivel: true,
        sucesso: "E-mail removido.",
      }),
    [email, executar]
  );
  let detalhe = "Ainda não confirmado. Remova e adicione de novo.";
  if (principal) {
    detalhe = "E-mail principal. Os códigos e avisos chegam aqui.";
  } else if (confirmado) {
    detalhe = "Também serve para entrar.";
  }
  return (
    <li className={LINHA}>
      <div className={TEXTO_DA_LINHA}>
        <b className={NOME_DA_LINHA}>{email.emailAddress}</b>
        <span className={DETALHE_DA_LINHA}>{detalhe}</span>
      </div>
      {principal ? (
        <span className={cn(SELO, "bg-ceu/14 text-ceu")}>Principal</span>
      ) : (
        <span className="flex shrink-0 flex-wrap justify-end gap-x-3 gap-y-1">
          {confirmado ? (
            <button
              className={ACAO_NA_LINHA}
              disabled={pendente}
              onClick={tornarPrincipal}
              type="button"
            >
              Tornar principal
            </button>
          ) : null}
          <button
            aria-label={`Remover ${email.emailAddress}`}
            className={ACAO_NA_LINHA}
            disabled={pendente}
            onClick={remover}
            type="button"
          >
            Remover
          </button>
        </span>
      )}
    </li>
  );
}

function LinhaDoGoogle({ user }: { user: Usuario }) {
  const { executar, pendente } = useAcaoDaConta();
  const google = contaDoGoogle(user);
  const conectar = useCallback(
    () =>
      executar(
        () =>
          user.createExternalAccount({
            redirectUrl: new URL(MINHA_CONTA, window.location.origin).href,
            strategy: "oauth_google",
          }),
        {
          depois: (conta) => {
            const destino = conta.verification?.externalVerificationRedirectURL;
            if (destino) {
              window.location.assign(destino);
            }
          },
          sensivel: true,
        }
      ),
    [executar, user]
  );
  const desconectar = useCallback(() => {
    if (google) {
      executar(() => google.destroy(), {
        sensivel: true,
        sucesso: "Google desconectado.",
      });
    }
  }, [executar, google]);

  let acao = (
    <button
      className={ACAO_NA_LINHA}
      disabled={pendente}
      onClick={conectar}
      type="button"
    >
      Conectar
    </button>
  );
  if (google && podeDesconectarOGoogle(user)) {
    acao = (
      <button
        className={ACAO_NA_LINHA}
        disabled={pendente}
        onClick={desconectar}
        type="button"
      >
        Desconectar
      </button>
    );
  } else if (google) {
    acao = (
      <span className={cn(DETALHE_DA_LINHA, "max-w-[22ch] text-right")}>
        Crie uma senha antes de desconectar
      </span>
    );
  }
  return (
    <li className={LINHA}>
      <IconeDoGoogle className="size-[18px] shrink-0" />
      <div className={TEXTO_DA_LINHA}>
        <b className={NOME_DA_LINHA}>Google</b>
        <span className={DETALHE_DA_LINHA}>
          {google
            ? `Conectado com ${google.emailAddress}`
            : "Entre com um clique, sem senha nem código."}
        </span>
      </div>
      {acao}
    </li>
  );
}

export function SecaoDaEntrada({ user }: { user: Usuario }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={CARTAO}>
      <header className={CABECALHO_DO_CARTAO}>
        <h2 className={TITULO_DA_SECAO} id={id}>
          Como você entra
        </h2>
      </header>
      <ul className="grid">
        {user.emailAddresses.map((email) => (
          <LinhaDoEmail email={email} key={email.id} user={user} />
        ))}
        <LinhaDoGoogle user={user} />
      </ul>
      <div className={PE_DO_CARTAO}>
        <AdicionarEmail user={user} />
      </div>
    </section>
  );
}
