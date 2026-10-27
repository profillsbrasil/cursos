// Server Component: cada linha é um link para a ficha, sem estado no cliente.

import type {
  ListaDePessoas,
  PessoaNaLista,
} from "@cursos/api/dominio/pessoas";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { diaEmSaoPaulo, fmtNum, fmtPts, plural, quando } from "@/lib/formato";

import { SeloDeSituacao } from "../acompanhamento";
import { FotoDaPessoa } from "../foto-da-pessoa";
import { Secao, Vazio } from "../partes";
import { SELO_DE_ADMIN, SOBRE_O_PERFIL, seloDoPerfil } from "./perfis";

export const fichaDaPessoa = (userId: string) =>
  `/admin/pessoas/${userId}` as Route;

const ultimoAcesso = (p: PessoaNaLista, hoje: string) =>
  p.ultimoAcesso
    ? quando(diaEmSaoPaulo(p.ultimoAcesso.toISOString()), hoje)
    : null;

/**
 * O perfil, o papel e o último acesso têm colunas a partir de 52rem; abaixo,
 * descem para uma linha sob o e-mail. O saldo fica na coluna dele nas duas
 * larguras, para os números continuarem um embaixo do outro.
 */
function LinhaDaPessoa({ hoje, p }: { hoje: string; p: PessoaNaLista }) {
  const selo = seloDoPerfil(p.perfil);
  const acesso = ultimoAcesso(p, hoje);
  return (
    <li>
      <Link
        className="grid @min-[52rem]:grid-cols-[2.5rem_minmax(0,1fr)_9.5rem_5.5rem_6rem_7.5rem_1rem] grid-cols-[2.25rem_minmax(0,1fr)_auto_1rem] items-center @min-[52rem]:gap-x-4 gap-x-3 gap-y-1.5 @min-[52rem]:px-5 px-3.5 @min-[52rem]:py-3.5 py-3 transition-colors hover:bg-muted/40"
        href={fichaDaPessoa(p.userId)}
      >
        <FotoDaPessoa
          className="@min-[52rem]:size-10 size-9 self-start @min-[52rem]:self-center"
          foto={p.foto}
          nome={p.nome}
        />
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate font-medium text-base text-foreground">
            {p.nome}
          </span>
          <span className="truncate text-muted-foreground">
            {p.email ?? p.userId}
          </span>
          {p.perfil.doCadastro ? (
            <span className="text-muted-foreground text-xs">
              Perfil do cadastro, fora dos filtros
            </span>
          ) : null}
          <span className="mt-1.5 flex @min-[52rem]:hidden flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <SeloDeSituacao selo={selo} />
            {p.papel === "admin" ? (
              <SeloDeSituacao selo={SELO_DE_ADMIN} />
            ) : null}
            <span className="text-muted-foreground text-xs">
              {acesso
                ? `Último acesso: ${acesso.toLocaleLowerCase("pt-BR")}`
                : "Nunca acessou"}
            </span>
          </span>
        </span>
        <span className="@min-[52rem]:block hidden">
          <SeloDeSituacao selo={selo} />
        </span>
        <span className="@min-[52rem]:block hidden">
          {p.papel === "admin" ? (
            <SeloDeSituacao selo={SELO_DE_ADMIN} />
          ) : (
            <span className="text-muted-foreground">Aluno</span>
          )}
        </span>
        <span
          className={cn(
            "self-start @min-[52rem]:self-center whitespace-nowrap text-right leading-6",
            p.saldo === 0
              ? "font-medium text-muted-foreground"
              : "font-bold text-sol"
          )}
        >
          {fmtPts(p.saldo)}
        </span>
        <span className="@min-[52rem]:block hidden text-muted-foreground tabular-nums">
          {acesso ?? "Nunca"}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
      </Link>
    </li>
  );
}

const tituloDaLista = (termo: string, lista: ListaDePessoas) => {
  if (termo) {
    return `Resultado para "${termo}"`;
  }
  return lista.filtro
    ? SOBRE_O_PERFIL[lista.filtro].plural
    : "Por último acesso";
};

export function ListaDePessoasDoAdmin({
  hoje,
  lista,
  termo,
}: {
  hoje: string;
  lista: ListaDePessoas;
  termo: string;
}) {
  const { pessoas, total } = lista;
  const cortada = total > pessoas.length;
  const vazio = lista.filtro
    ? `Ninguém com o perfil ${SOBRE_O_PERFIL[lista.filtro].nome} ${termo ? `e "${termo}" no nome ou no e-mail ` : ""}entrou no app ainda.`
    : `Ninguém com "${termo}" no nome ou no e-mail.`;
  return (
    <Secao
      id="pessoas"
      resumo={
        cortada
          ? `${fmtNum(pessoas.length)} de ${plural(total, "pessoa", "pessoas")}`
          : plural(pessoas.length, "pessoa", "pessoas")
      }
      titulo={tituloDaLista(termo, lista)}
    >
      {pessoas.length === 0 ? (
        <Vazio>
          {termo || lista.filtro
            ? vazio
            : "Ninguém entrou na plataforma ainda."}
        </Vazio>
      ) : (
        <ul className="@container divide-y divide-border">
          {pessoas.map((p) => (
            <LinhaDaPessoa hoje={hoje} key={p.userId} p={p} />
          ))}
          {cortada ? (
            <li className="px-5 py-3.5 text-muted-foreground text-sm">
              Mostrando as {fmtNum(pessoas.length)} primeiras. Busque pelo nome
              ou pelo e-mail para achar quem falta.
            </li>
          ) : null}
        </ul>
      )}
    </Secao>
  );
}
