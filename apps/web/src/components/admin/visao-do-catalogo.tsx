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

import { SeloDeSituacao, seloDoCurso } from "./acompanhamento";
import { CABECA, CELULA, NUMERO, SELO, Secao, Vazio } from "./partes";

const LINK_DA_LINHA =
  "rounded-sm underline decoration-muted-foreground underline-offset-4 transition-colors hover:decoration-titulo";

function SeloDeStatus({ status }: { status: StatusDoCurso }) {
  return status === "em_producao" ? (
    <SeloDeSituacao selo={seloDoCurso("em_producao")} />
  ) : (
    <span className={cn(SELO, "bg-ceu/14 text-ceu")}>Publicado</span>
  );
}

function CursosDoCatalogo({ cursos }: { cursos: Visao["cursos"] }) {
  if (cursos.length === 0) {
    return <Vazio>Nenhum curso no catálogo.</Vazio>;
  }
  return (
    <Table className="min-w-[560px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={CABECA}>Curso</TableHead>
          <TableHead className={CABECA}>Status</TableHead>
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
