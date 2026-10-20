// Server Component: cada linha é um link para a ficha, sem estado no cliente.

import type {
  ListaDePessoas,
  PessoaNaLista,
} from "@cursos/api/dominio/pessoas";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { diaEmSaoPaulo, fmtNum, plural, quando } from "@/lib/formato";

import { SeloDeSituacao } from "../acompanhamento";
import { FotoDaPessoa } from "../foto-da-pessoa";
import { Secao, Vazio } from "../partes";
import { SELO_DE_ADMIN, SOBRE_O_PERFIL, seloDoPerfil } from "./perfis";

export const fichaDaPessoa = (userId: string) =>
  `/admin/pessoas/${userId}` as Route;

function LinhaDaPessoa({ hoje, p }: { hoje: string; p: PessoaNaLista }) {
  return (
    <li>
      <Link
        className="grid @min-[44rem]:grid-cols-[2.5rem_minmax(0,1fr)_9.5rem_5.5rem_7.5rem_1rem] grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-center @min-[44rem]:gap-x-4 gap-x-3 gap-y-1.5 @min-[44rem]:px-5 px-3.5 @min-[44rem]:py-3.5 py-3 transition-colors hover:bg-muted/40"
        href={fichaDaPessoa(p.userId)}
      >
        <FotoDaPessoa
          className="@min-[44rem]:size-10 size-9"
          foto={p.foto}
          nome={p.nome}
        />
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate font-medium text-foreground">{p.nome}</span>
          <span className="truncate text-muted-foreground text-sm">
            {p.email ?? p.userId}
          </span>
          {p.perfil.doCadastro ? (
            <span className="text-muted-foreground text-xs">
              Ainda não entrou no app
            </span>
          ) : null}
        </span>
        <span className="@min-[44rem]:block hidden">
          <SeloDeSituacao selo={seloDoPerfil(p.perfil.perfil)} />
        </span>
        <span className="@min-[44rem]:block hidden">
          {p.papel === "admin" ? (
            <SeloDeSituacao selo={SELO_DE_ADMIN} />
          ) : (
            <span className="text-muted-foreground text-sm">Aluno</span>
          )}
        </span>
        <span className="@min-[44rem]:block hidden text-muted-foreground text-sm tabular-nums">
          {p.ultimoAcesso
            ? quando(diaEmSaoPaulo(p.ultimoAcesso.toISOString()), hoje)
            : "Nunca"}
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
    : "Ativos recentemente";
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
