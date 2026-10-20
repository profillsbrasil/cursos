// Server Component: a ficha monta no servidor, e só o cartão de Acesso é cliente.

import type { FichaDaPessoa } from "@cursos/api/dominio/pessoas";
import type { JeitoDeEntrar } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { SELO } from "@/components/casca/selos";
import {
  CABECALHO_DO_CARTAO,
  CARTAO,
  PE_DO_CARTAO,
  RESUMO_DA_SECAO,
  TITULO_DA_SECAO,
} from "@/components/minha-conta/partes";
import { diaCurto, diaEmSaoPaulo, fmtData, quando } from "@/lib/formato";
import { FotoDaPessoa } from "../foto-da-pessoa";
import { AcessoDaPessoa } from "./acesso-da-pessoa";

const NOME_DO_JEITO: Record<JeitoDeEntrar, string> = {
  google: "Google",
  senha: "E-mail e senha",
};

const LINHA_DA_CONTA =
  "grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 border-border border-t px-[22px] py-3 text-sm";

function Dado({
  children,
  rotulo,
}: {
  children: React.ReactNode;
  rotulo: string;
}) {
  return (
    <div className={LINHA_DA_CONTA}>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="m-0 min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

const diaDe = (d: Date) => diaEmSaoPaulo(d.toISOString());

function fraseDoPe({ mudanca, perfil }: FichaDaPessoa, hoje: string) {
  if (mudanca) {
    return `Perfil mudado por ${mudanca.por} em ${diaCurto(diaDe(mudanca.em), hoje)}.`;
  }
  return perfil.doCadastro
    ? "Perfil do cadastro, ainda sem registro no app. Ele fica gravado no próximo acesso dela, se ninguém mudar antes."
    : "Perfil do cadastro, sem mudança do admin.";
}

export function FichaDaPessoaDoAdmin({
  ficha,
  hoje,
}: {
  ficha: FichaDaPessoa;
  hoje: string;
}) {
  const { conta, perfil, souEu } = ficha;
  return (
    <>
      <Link
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full pr-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        href="/admin/pessoas"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Pessoas
      </Link>
      <header className="mb-7 flex items-center gap-4">
        <FotoDaPessoa foto={conta.foto} nome={conta.nome} size="lg" />
        <div className="grid min-w-0 gap-1">
          <h1 className="text-balance font-bold text-3xl text-titulo tracking-tight [overflow-wrap:anywhere]">
            {conta.nome}
          </h1>
          <p className="truncate text-muted-foreground">
            {conta.email ?? conta.userId}
          </p>
        </div>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section aria-labelledby="acesso" className={CARTAO}>
          <div className={CABECALHO_DO_CARTAO}>
            <h2 className={TITULO_DA_SECAO} id="acesso">
              Acesso
            </h2>
            <p className={RESUMO_DA_SECAO}>
              O perfil decide que cursos ela vê pela liberação do perfil. O
              papel decide se ela entra na área do admin.
            </p>
          </div>
          <AcessoDaPessoa
            nome={conta.nome}
            papel={conta.papel}
            perfil={perfil.perfil}
            souEu={souEu}
            userId={conta.userId}
          />
          <p className={cn(PE_DO_CARTAO, "text-muted-foreground text-xs")}>
            {fraseDoPe(ficha, hoje)}
          </p>
        </section>
        <section aria-labelledby="conta" className={CARTAO}>
          <div className={CABECALHO_DO_CARTAO}>
            <h2 className={TITULO_DA_SECAO} id="conta">
              Conta
            </h2>
            <p className={RESUMO_DA_SECAO}>
              Do login da plataforma. Só a pessoa muda, em Minha conta.
            </p>
          </div>
          <dl className="m-0">
            <Dado rotulo="Criada em">
              {fmtData(conta.criadaEm.toISOString())}
            </Dado>
            <Dado rotulo="Último acesso">
              {conta.ultimoAcesso
                ? quando(diaDe(conta.ultimoAcesso), hoje)
                : "Nunca entrou"}
            </Dado>
            <Dado rotulo="E-mail">
              <span className="flex flex-wrap items-center gap-2">
                {conta.email ?? "Sem e-mail"}
                {conta.email ? (
                  <span
                    className={cn(
                      SELO,
                      conta.emailVerificado
                        ? "bg-ceu/14 text-ceu"
                        : "bg-popover text-foreground"
                    )}
                  >
                    {conta.emailVerificado ? "Verificado" : "Por verificar"}
                  </span>
                ) : null}
              </span>
            </Dado>
            <Dado rotulo="Jeitos de entrar">
              {conta.jeitosDeEntrar.length === 0
                ? "Nenhum cadastrado"
                : conta.jeitosDeEntrar.map((j) => NOME_DO_JEITO[j]).join(", ")}
            </Dado>
          </dl>
          <div className={PE_DO_CARTAO}>
            <Link
              className="toque justify-self-start font-semibold text-[13px] text-ceu transition-colors hover:text-titulo"
              href={`/admin/liberacoes/${conta.userId}` as Route}
            >
              Ver as liberações e o estudo
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
