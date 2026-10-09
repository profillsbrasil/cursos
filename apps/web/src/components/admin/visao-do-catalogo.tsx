import type { VisaoDoCatalogo as Visao } from "@cursos/api/dominio/catalogo";
import type { StatusDoCurso } from "@cursos/api/dominio/tipos";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cursos/ui/components/table";
import { cn } from "@cursos/ui/lib/utils";
import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { fmtNum, fmtPts, plural } from "@/lib/formato";

import { CABECA, CELULA, NUMERO, SELO, Secao, Vazio } from "./partes";

const LINK_DA_LINHA =
  "rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2";

const STATUS: Record<StatusDoCurso, { classe: string; rotulo: string }> = {
  em_producao: {
    classe:
      "bg-transparent text-muted-foreground ring-1 ring-muted-foreground ring-inset",
    rotulo: "Em produção",
  },
  publicado: { classe: "bg-ceu/14 text-ceu", rotulo: "Publicado" },
};

function SeloDeStatus({ status }: { status: StatusDoCurso }) {
  const { classe, rotulo } = STATUS[status];
  return <span className={cn(SELO, classe)}>{rotulo}</span>;
}

function TrilhasDoCatalogo({ trilhas }: { trilhas: Visao["trilhas"] }) {
  if (trilhas.length === 0) {
    return <Vazio>Nenhuma trilha no catálogo.</Vazio>;
  }
  return (
    <Table className="min-w-[420px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={CABECA}>Trilha</TableHead>
          <TableHead className={cn(CABECA, NUMERO)}>Cursos</TableHead>
          <TableHead className={cn(CABECA, NUMERO)}>
            Alunos com a trilha liberada
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trilhas.map((t) => (
          <TableRow key={t.id}>
            <TableCell className={cn(CELULA, "font-medium text-foreground")}>
              <Link
                className="underline decoration-muted-foreground underline-offset-4 transition-colors hover:decoration-titulo focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2"
                href={`/admin/catalogo/trilhas/${t.id}` as Route}
              >
                {t.titulo}
              </Link>
            </TableCell>
            <TableCell className={cn(CELULA, NUMERO)}>
              {fmtNum(t.cursos)}
            </TableCell>
            <TableCell className={cn(CELULA, NUMERO)}>
              {fmtNum(t.alunos)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CursosDoCatalogo({ cursos }: { cursos: Visao["cursos"] }) {
  if (cursos.length === 0) {
    return <Vazio>Nenhum curso no catálogo.</Vazio>;
  }
  return (
    <Table className="min-w-[680px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={CABECA}>Curso</TableHead>
          <TableHead className={CABECA}>Status</TableHead>
          <TableHead className={CABECA}>Trilha</TableHead>
          <TableHead className={cn(CABECA, NUMERO)}>Aulas</TableHead>
          <TableHead className={cn(CABECA, NUMERO)}>Troca</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cursos.map((c) => (
          <TableRow key={c.id}>
            <TableCell className={cn(CELULA, "font-medium text-foreground")}>
              <Link
                className={LINK_DA_LINHA}
                href={`/admin/catalogo/cursos/${c.id}` as Route}
              >
                {c.titulo}
              </Link>
            </TableCell>
            <TableCell className={CELULA}>
              <SeloDeStatus status={c.status} />
            </TableCell>
            <TableCell className={CELULA}>
              {c.trilha ? (
                <>
                  {c.trilha.titulo}
                  <span className="text-muted-foreground tabular-nums">
                    {" "}
                    · {c.trilha.posicao}º
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Solto</span>
              )}
            </TableCell>
            <TableCell className={cn(CELULA, NUMERO)}>
              {fmtNum(c.aulas)}
            </TableCell>
            <TableCell className={cn(CELULA, NUMERO)}>
              {c.precoTroca === null ? (
                <span className="text-muted-foreground">Sem troca</span>
              ) : (
                fmtPts(c.precoTroca)
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function VisaoDoCatalogo({ visao }: { visao: Visao }) {
  const publicados = visao.cursos.filter(
    (c) => c.status === "publicado"
  ).length;
  return (
    <div className="grid gap-10">
      <Secao
        id="trilhas"
        resumo={plural(visao.trilhas.length, "trilha", "trilhas")}
        titulo="Trilhas"
      >
        <TrilhasDoCatalogo trilhas={visao.trilhas} />
        <div className="border-border border-t px-5 py-4">
          <Link
            className={cn(BOTAO_CONTORNO, PEQUENO)}
            href="/admin/catalogo/trilhas/novo"
          >
            <Plus aria-hidden="true" />
            Nova trilha
          </Link>
        </div>
      </Secao>
      <Secao
        id="cursos"
        resumo={`${plural(visao.cursos.length, "curso", "cursos")}, ${plural(publicados, "publicado", "publicados")}`}
        titulo="Cursos"
      >
        <CursosDoCatalogo cursos={visao.cursos} />
        <div className="border-border border-t px-5 py-4">
          <Link
            className={cn(BOTAO_CONTORNO, PEQUENO)}
            href="/admin/catalogo/cursos/novo"
          >
            <Plus aria-hidden="true" className="size-4" />
            Novo curso
          </Link>
        </div>
      </Secao>
    </div>
  );
}
