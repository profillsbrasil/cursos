"use client";

import type {
  CursoNaGrade,
  GradeDosPerfis,
} from "@cursos/api/dominio/grade-dos-perfis";
import type { Perfil } from "@cursos/api/dominio/perfil";
import type { LiberacaoDoPerfilId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { Check } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

import { BOTAO, BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { CARTAO } from "@/components/casca/cartoes";
import { fmtNum, plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";
import { Carregando } from "./confirmacao-na-linha";
import { ORDEM_DOS_PERFIS, SOBRE_O_PERFIL } from "./pessoas/perfis";

const COLUNAS =
  "grid-cols-[minmax(0,1fr)] @min-[52rem]:grid-cols-[minmax(0,1fr)_repeat(3,8.5rem)]";

interface Pedido {
  liberacao: LiberacaoDoPerfilId;
  perfil: Perfil;
}

function BotaoDoPerfil({
  curso,
  enviando,
  liberar,
  pedirRevogar,
  perfil,
}: {
  curso: CursoNaGrade;
  enviando: boolean;
  liberar: (perfil: Perfil) => void;
  pedirRevogar: (p: Pedido) => void;
  perfil: Perfil;
}) {
  const liberacao = curso.liberacoes[perfil];
  const nome = SOBRE_O_PERFIL[perfil].plural;
  const aoClicar = useCallback(
    () => (liberacao ? pedirRevogar({ liberacao, perfil }) : liberar(perfil)),
    [liberacao, liberar, pedirRevogar, perfil]
  );
  return (
    <Button
      aria-label={
        liberacao
          ? `${curso.titulo}: liberado a ${nome}. Revogar`
          : `Liberar ${curso.titulo} a ${nome}`
      }
      aria-pressed={liberacao !== null}
      className={cn(
        liberacao ? BOTAO : BOTAO_CONTORNO,
        PEQUENO,
        "w-full justify-center"
      )}
      disabled={enviando}
      focusableWhenDisabled
      onClick={aoClicar}
    >
      {liberacao ? <Check aria-hidden="true" strokeWidth={2.6} /> : null}
      <span className="@min-[52rem]:hidden">{nome}:</span>
      {liberacao ? "Liberado" : "Liberar"}
    </Button>
  );
}

function LinhaDoCurso({
  contagem,
  curso,
}: {
  contagem: GradeDosPerfis["contagem"];
  curso: CursoNaGrade;
}) {
  const { executar, pendente } = useAcao();
  const [pedido, pedir] = useState<Pedido | null>(null);
  const liberar = useCallback(
    (perfil: Perfil) =>
      executar(
        () =>
          trpcClient.admin.perfis.liberar.mutate({ cursoId: curso.id, perfil }),
        {
          sucesso: `${curso.titulo} liberado a ${SOBRE_O_PERFIL[perfil].plural}.`,
        }
      ),
    [curso.id, curso.titulo, executar]
  );
  const revogar = useCallback(() => {
    if (!pedido) {
      return;
    }
    executar(
      () => trpcClient.admin.perfis.revogar.mutate({ id: pedido.liberacao }),
      {
        depois: () => pedir(null),
        sucesso: `${curso.titulo} fechado a ${SOBRE_O_PERFIL[pedido.perfil].plural}.`,
      }
    );
  }, [curso.titulo, executar, pedido]);
  const cancelar = useCallback(() => pedir(null), []);
  const alcance = pedido ? contagem[pedido.perfil] : 0;
  return (
    <li className="grid gap-3 px-5 py-3.5">
      <div className={cn("grid items-center gap-x-3 gap-y-2.5", COLUNAS)}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-[8px] ring-1 ring-border">
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="56px"
              src={curso.capa.url}
            />
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className="truncate font-medium text-foreground">
              {curso.titulo}
            </span>
            <span className="text-muted-foreground text-xs">
              {curso.status === "em_producao"
                ? "Em produção"
                : plural(curso.aulas, "aula", "aulas")}
            </span>
          </span>
        </div>
        {ORDEM_DOS_PERFIS.map((p) => (
          <BotaoDoPerfil
            curso={curso}
            enviando={pendente}
            key={p}
            liberar={liberar}
            pedirRevogar={pedir}
            perfil={p}
          />
        ))}
      </div>
      {pedido ? (
        <fieldset className="m-0 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-[14px] border-0 bg-sol/10 px-3.5 py-3 ring-1 ring-sol/40">
          <legend className="sr-only">Revogar</legend>
          <p className="m-0 text-foreground text-sm">
            Fechar {curso.titulo} a {SOBRE_O_PERFIL[pedido.perfil].plural}?{" "}
            {alcance === 0
              ? "Ninguém com o perfil entrou no app ainda."
              : `${plural(alcance, "pessoa perde", "pessoas perdem")} o acesso pelo perfil; o estudo ${alcance === 1 ? "dela" : "delas"} fica guardado.`}
          </p>
          <span className="flex flex-wrap gap-2">
            <Button
              aria-busy={pendente}
              autoFocus
              className={cn(BOTAO, PEQUENO)}
              disabled={pendente}
              focusableWhenDisabled
              onClick={revogar}
            >
              <Carregando ativo={pendente} />
              Revogar
            </Button>
            <Button
              className={cn(BOTAO_CONTORNO, PEQUENO)}
              disabled={pendente}
              onClick={cancelar}
            >
              Cancelar
            </Button>
          </span>
        </fieldset>
      ) : null}
    </li>
  );
}

export function GradeDosPerfisDoAdmin({ grade }: { grade: GradeDosPerfis }) {
  const abertos = grade.cursos.filter((c) =>
    ORDEM_DOS_PERFIS.every((p) => c.liberacoes[p] !== null)
  ).length;
  return (
    <section aria-labelledby="cursos-por-perfil" className="grid gap-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          className="font-bold text-2xl text-titulo tracking-tight"
          id="cursos-por-perfil"
        >
          Cursos
        </h2>
        <p className="text-muted-foreground text-sm tabular-nums">
          {plural(grade.cursos.length, "curso", "cursos")}, {fmtNum(abertos)}{" "}
          liberados a todos
        </p>
      </div>
      <div className={cn(CARTAO, "@container overflow-hidden")}>
        <div
          aria-hidden="true"
          className={cn(
            "@min-[52rem]:grid hidden gap-x-3 px-5 pt-3 pb-2.5 font-semibold text-muted-foreground text-xs",
            COLUNAS
          )}
        >
          <span>Curso</span>
          {ORDEM_DOS_PERFIS.map((p) => (
            <span key={p}>
              {SOBRE_O_PERFIL[p].plural}{" "}
              <span className="font-normal tabular-nums">
                · {fmtNum(grade.contagem[p])}
              </span>
            </span>
          ))}
        </div>
        {grade.cursos.length === 0 ? (
          <p className="border-border border-t px-5 py-4 text-muted-foreground text-sm">
            Nenhum curso no catálogo.
          </p>
        ) : (
          <ul className="divide-y divide-border border-border border-t">
            {grade.cursos.map((c) => (
              <LinhaDoCurso contagem={grade.contagem} curso={c} key={c.id} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
