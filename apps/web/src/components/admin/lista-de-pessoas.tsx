"use client";

import type {
  BuscaDeAlunos,
  PessoaComSituacao,
} from "@cursos/api/dominio/acompanhamento";
import { Checkbox } from "@cursos/ui/components/checkbox";
import { cn } from "@cursos/ui/lib/utils";
import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

import { CAIXA } from "@/components/casca/campos";
import { fmtNum, plural } from "@/lib/formato";

import {
  fraseDaPessoa,
  type Selo,
  SeloDeSituacao,
  seloDaPessoa,
} from "./acompanhamento";
import { FotoDaPessoa } from "./foto-da-pessoa";
import { jaTem } from "./lote";
import { Secao, Vazio } from "./partes";
import { useLote } from "./provedor-do-lote";

const JA_TEM: Selo = {
  classe: "bg-popover text-foreground",
  icone: Check,
  rotulo: "Já tem",
};

function LinhaDaPessoa({ hoje, p }: { hoje: string; p: PessoaComSituacao }) {
  const { despachar, estado } = useLote();
  const marcada = estado.marcadas.some((m) => m.userId === p.userId);
  const curso = estado.fase.tipo === "marcando" ? estado.fase.curso : null;
  const temOCurso = jaTem(p, curso);
  const frase = temOCurso ?? fraseDaPessoa(p.situacao, hoje);
  const href = `/admin/liberacoes/${p.userId}` as const;
  const { email, foto, nome, userId } = p;
  const marcar = useCallback(
    (sim: boolean) =>
      despachar(
        sim
          ? { pessoa: { email, foto, nome, userId }, tipo: "marcar" }
          : { tipo: "desmarcar", userId }
      ),
    [despachar, email, foto, nome, userId]
  );
  return (
    <li
      className={cn(
        "grid @min-[35rem]:grid-cols-[1.25rem_2.5rem_minmax(0,1fr)_auto_1rem] grid-cols-[1.25rem_2.25rem_minmax(0,1fr)_1rem] items-center @min-[35rem]:gap-x-4 gap-x-3 gap-y-1.5 @min-[35rem]:px-5 px-3.5 @min-[35rem]:py-3.5 py-3 transition-colors",
        marcada ? "bg-sol/6" : "hover:bg-muted/40"
      )}
    >
      <span className="@min-[35rem]:row-span-1 row-span-2 grid place-items-center">
        {temOCurso ? null : (
          <Checkbox
            aria-label={`Marcar ${p.nome}`}
            checked={marcada}
            className={CAIXA}
            onCheckedChange={marcar}
          />
        )}
      </span>
      <FotoDaPessoa
        className="@min-[35rem]:row-span-1 row-span-2 @min-[35rem]:size-10 size-9 self-start @min-[35rem]:self-center"
        foto={p.foto}
        nome={p.nome}
      />
      <span className="grid min-w-0 gap-0.5">
        <Link
          className="max-w-full justify-self-start truncate font-medium text-base text-foreground underline-offset-4 transition-colors hover:text-titulo hover:underline"
          href={href}
        >
          {p.nome}
        </Link>
        <span className="truncate text-muted-foreground text-sm">
          {p.email ?? p.userId}
        </span>
        {frase === null ? null : (
          <span className="text-muted-foreground text-xs tabular-nums">
            {frase}
          </span>
        )}
      </span>
      <SeloDeSituacao
        className="@min-[35rem]:col-start-4 col-start-3 @min-[35rem]:row-start-1 row-start-2 justify-self-start"
        selo={temOCurso ? JA_TEM : seloDaPessoa(p.situacao)}
      />
      <Link
        aria-label={`Abrir ${p.nome}`}
        className="group/seta toque @min-[35rem]:col-start-5 col-start-4 @min-[35rem]:row-span-1 row-span-2 row-start-1 -m-1.5 grid size-7 place-items-center rounded-full"
        href={href}
      >
        <ChevronRight
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-[color,translate] group-hover/seta:translate-x-0.5 group-hover/seta:text-ceu motion-reduce:transition-colors"
        />
      </Link>
    </li>
  );
}

export function ListaDePessoas({
  resultado: { hoje, pessoas, total },
  termo,
}: {
  resultado: BuscaDeAlunos;
  termo: string;
}) {
  const { estado } = useLote();
  const marcadas = estado.marcadas.length;
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
          {marcadas > 0
            ? ` ${marcadas === 1 ? "A marcada continua marcada." : `As ${fmtNum(marcadas)} marcadas continuam marcadas.`}`
            : null}
        </Vazio>
      ) : (
        <ul className="@container divide-y divide-border">
          {pessoas.map((p) => (
            <LinhaDaPessoa hoje={hoje} key={p.userId} p={p} />
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
