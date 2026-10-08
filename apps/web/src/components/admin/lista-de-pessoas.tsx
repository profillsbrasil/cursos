import type { ResultadoDaBusca } from "@cursos/api/dominio/tipos";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { fmtNum, plural } from "@/lib/formato";

import { FotoDaPessoa } from "./foto-da-pessoa";
import { Secao, Vazio } from "./partes";

export function ListaDePessoas({
  resultado: { pessoas, total },
  termo,
}: {
  resultado: ResultadoDaBusca;
  termo: string;
}) {
  const cortada = total > pessoas.length;
  return (
    <Secao
      id="pessoas"
      resumo={
        cortada
          ? `${fmtNum(pessoas.length)} de ${plural(total, "pessoa", "pessoas")}`
          : plural(pessoas.length, "pessoa", "pessoas")
      }
      titulo={termo ? `Resultado para "${termo}"` : "Ativos recentemente"}
    >
      {pessoas.length === 0 ? (
        <Vazio>
          {termo
            ? `Ninguém com "${termo}" no nome ou no e-mail. A pessoa precisa ter entrado na plataforma uma vez.`
            : "Ninguém entrou na plataforma ainda."}
        </Vazio>
      ) : (
        <ul className="divide-y divide-border">
          {pessoas.map((p) => (
            <li key={p.userId}>
              <Link
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:-outline-offset-2"
                href={`/admin/alunos/${p.userId}`}
              >
                <FotoDaPessoa foto={p.foto} nome={p.nome} />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate font-medium text-foreground">
                    {p.nome}
                  </span>
                  <span className="truncate text-muted-foreground text-sm">
                    {p.email ?? p.userId}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
          {cortada ? (
            <li className="px-5 py-3.5 text-muted-foreground text-sm">
              {termo
                ? `Mostrando as ${fmtNum(pessoas.length)} primeiras. Refine a busca com o nome completo ou o e-mail para achar quem falta.`
                : `Mostrando as ${fmtNum(pessoas.length)} com atividade mais recente. Busque pelo nome ou pelo e-mail para achar outra pessoa.`}
            </li>
          ) : null}
        </ul>
      )}
    </Secao>
  );
}
