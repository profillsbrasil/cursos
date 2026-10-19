"use client";

import { useSession } from "@clerk/nextjs";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronDown, Monitor, Smartphone } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { plural } from "@/lib/formato";

import { type Aparelho, aparelhosDe } from "./aparelhos";
import { fraseDoErro } from "./erros";
import {
  ACAO_NA_LINHA,
  ACOES,
  CABECALHO_DO_CARTAO,
  CARTAO,
  CONTORNO_PEQUENO,
  DETALHE_DA_LINHA,
  ICONE_DO_APARELHO,
  LINHA,
  LINHA_BOTAO,
  NOME_DA_LINHA,
  PE_DO_CARTAO,
  RESUMO_DA_SECAO,
  SELO,
  TEXTO_DA_LINHA,
  TITULO_DA_SECAO,
} from "./partes";
import type { SessaoComAtividade, Usuario } from "./tipos";
import { useAcaoDaConta } from "./use-acao-da-conta";

/** As sessões e o instante em que chegaram, que mede o "ontem às 19h40". */
type Lista =
  | { estado: "carregando" }
  | { estado: "falhou"; frase: string }
  | { agora: Date; estado: "pronta"; sessoes: SessaoComAtividade[] };

function LinhaDoAparelho({
  aoSair,
  aparelho,
  pendente,
}: {
  aoSair: ((id: string) => void) | null;
  aparelho: Aparelho;
  pendente: boolean;
}) {
  const sair = useCallback(() => aoSair?.(aparelho.id), [aoSair, aparelho.id]);
  return (
    <li className={LINHA}>
      <span className={ICONE_DO_APARELHO}>
        {aparelho.celular ? (
          <Smartphone aria-hidden="true" />
        ) : (
          <Monitor aria-hidden="true" />
        )}
      </span>
      <div className={TEXTO_DA_LINHA}>
        <b className={NOME_DA_LINHA}>{aparelho.nome}</b>
        <span className={DETALHE_DA_LINHA}>{aparelho.onde}</span>
      </div>
      {aoSair ? (
        <button
          aria-label={`Sair do ${aparelho.nome}, ${aparelho.onde}`}
          className={ACAO_NA_LINHA}
          disabled={pendente}
          onClick={sair}
          type="button"
        >
          Sair
        </button>
      ) : (
        <span className={cn(SELO, "bg-sol/14 text-sol")}>Este aparelho</span>
      )}
    </li>
  );
}

function Esqueleto() {
  return (
    <div aria-busy="true" className="grid gap-3 px-[22px] pb-[22px]">
      <span className="sr-only">Carregando os aparelhos</span>
      <span className="h-[34px] animate-pulse rounded-[10px] bg-muted" />
      <span className="h-[34px] animate-pulse rounded-[10px] bg-muted" />
      <span className="h-[34px] animate-pulse rounded-[10px] bg-muted" />
    </div>
  );
}

function ListaDosAparelhos({
  agora,
  idDaAtual,
  sessoes,
  recarregar,
}: {
  agora: Date;
  idDaAtual: string | null;
  recarregar: () => void;
  sessoes: SessaoComAtividade[];
}) {
  const { executar, pendente } = useAcaoDaConta();
  const { antigos, atual, recentes } = aparelhosDe(sessoes, idDaAtual, agora);
  const outras = sessoes.filter((s) => s.id !== idDaAtual);
  const sairDe = useCallback(
    (alvo: SessaoComAtividade[], sucesso: string) =>
      executar(() => Promise.all(alvo.map((s) => s.revoke())), {
        depois: recarregar,
        sucesso,
      }),
    [executar, recarregar]
  );
  const sairDeUm = useCallback(
    (id: string) =>
      sairDe(
        sessoes.filter((s) => s.id === id),
        "Você saiu desse aparelho."
      ),
    [sairDe, sessoes]
  );
  const sairDosOutros = useCallback(
    () => sairDe(outras, "Você saiu de todos os outros aparelhos."),
    [outras, sairDe]
  );
  return (
    <>
      <ul className="grid">
        {atual ? (
          <LinhaDoAparelho aoSair={null} aparelho={atual} pendente={pendente} />
        ) : null}
        {recentes.map((a) => (
          <LinhaDoAparelho
            aoSair={sairDeUm}
            aparelho={a}
            key={a.id}
            pendente={pendente}
          />
        ))}
      </ul>
      {antigos.length > 0 ? (
        <details className="group">
          <summary className={LINHA_BOTAO}>
            Mais {plural(antigos.length, "acesso antigo", "acessos antigos")}
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 transition-transform duration-200 ease-forte group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <ul className="grid">
            {antigos.map((a) => (
              <LinhaDoAparelho
                aoSair={sairDeUm}
                aparelho={a}
                key={a.id}
                pendente={pendente}
              />
            ))}
          </ul>
        </details>
      ) : null}
      {outras.length > 0 ? (
        <div className={cn(PE_DO_CARTAO, ACOES)}>
          <button
            className={CONTORNO_PEQUENO}
            disabled={pendente}
            onClick={sairDosOutros}
            type="button"
          >
            Sair de todos os outros aparelhos
          </button>
        </div>
      ) : null}
    </>
  );
}

export function SecaoDosAparelhos({ user }: { user: Usuario }) {
  const id = useId();
  const { session } = useSession();
  const [lista, setLista] = useState<Lista>({ estado: "carregando" });
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a lista recarrega pela versão, e o objeto user muda a cada edição da conta.
  useEffect(() => {
    let vivo = true;
    user.getSessions().then(
      (sessoes) => {
        if (vivo) {
          setLista({ agora: new Date(), estado: "pronta", sessoes });
        }
      },
      (e: unknown) => {
        if (vivo) {
          setLista({ estado: "falhou", frase: fraseDoErro(e) });
        }
      }
    );
    return () => {
      vivo = false;
    };
  }, [user.id, versao]);

  return (
    <section aria-labelledby={id} className={CARTAO}>
      <header className={CABECALHO_DO_CARTAO}>
        <h2 className={TITULO_DA_SECAO} id={id}>
          Aparelhos
        </h2>
        <p className={RESUMO_DA_SECAO}>
          Onde sua conta está aberta. Saia de um aparelho que você não
          reconhece.
        </p>
      </header>
      {lista.estado === "carregando" ? <Esqueleto /> : null}
      {lista.estado === "falhou" ? (
        <p className={cn(DETALHE_DA_LINHA, "px-[22px] pb-[22px]")}>
          {lista.frase}
        </p>
      ) : null}
      {lista.estado === "pronta" ? (
        <ListaDosAparelhos
          agora={lista.agora}
          idDaAtual={session?.id ?? null}
          recarregar={recarregar}
          sessoes={lista.sessoes}
        />
      ) : null}
    </section>
  );
}
