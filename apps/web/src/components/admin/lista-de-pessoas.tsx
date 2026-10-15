import type { BuscaDeAlunos } from "@cursos/api/dominio/acompanhamento";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { fmtNum, plural } from "@/lib/formato";

import { fraseDaPessoa, SeloDeSituacao, seloDaPessoa } from "./acompanhamento";
import { FotoDaPessoa } from "./foto-da-pessoa";
import { Secao, Vazio } from "./partes";

export function ListaDePessoas({
  resultado: { hoje, pessoas, total },
  termo,
}: {
  resultado: BuscaDeAlunos;
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
        <ul className="@container divide-y divide-border">
          {pessoas.map((p) => (
            <li key={p.userId}>
              {/* Sob o cursor e com o foco de teclado: o fundo, o nome em titulo e a seta em Céu (#44).
                  Em container estreito, o selo desce para baixo da frase. */}
              <Link
                className="group/pessoa grid @xl:grid-cols-[2.5rem_minmax(0,1fr)_auto_1rem] grid-cols-[2.5rem_minmax(0,1fr)_1rem] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-muted/40"
                href={`/admin/alunos/${p.userId}`}
              >
                <span className="@xl:row-span-1 row-span-2 self-start @xl:self-center">
                  <FotoDaPessoa foto={p.foto} nome={p.nome} />
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-medium text-foreground transition-colors group-hover/pessoa:text-titulo">
                    {p.nome}
                  </span>
                  <span className="truncate text-muted-foreground text-sm">
                    {p.email ?? p.userId}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {fraseDaPessoa(p.resumo, hoje)}
                  </span>
                </span>
                <SeloDeSituacao
                  className="@xl:col-start-3 col-start-2 @xl:row-start-1 row-start-2 justify-self-start"
                  selo={seloDaPessoa(p.resumo)}
                />
                <ChevronRight
                  aria-hidden="true"
                  className="@xl:col-start-4 col-start-3 @xl:row-span-1 row-span-2 row-start-1 size-4 shrink-0 text-muted-foreground transition-[color,translate] group-hover/pessoa:translate-x-0.5 group-hover/pessoa:text-ceu motion-reduce:transition-none"
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
