import { badgeVariants } from "@cursos/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cursos/ui/components/table";
import { cn } from "@cursos/ui/lib/utils";
import type { ReactNode } from "react";

import { fmtNum, fmtPts, plural } from "@/lib/formato";
import type { carregarCatalogo } from "@/server/api";

type Visao = Awaited<ReturnType<typeof carregarCatalogo>>;
type CursoNaVisao = Visao["cursos"][number];

const CABECA = "h-11 px-5 font-semibold text-muted-foreground text-xs";
const CELULA = "px-5 py-3.5 text-sm";
const NUMERO = "text-right tabular-nums";

const STATUS: Record<
  CursoNaVisao["status"],
  { classe: string; rotulo: string }
> = {
  em_producao: {
    classe:
      "bg-transparent text-muted-foreground ring-1 ring-muted-foreground ring-inset",
    rotulo: "Em produção",
  },
  publicado: { classe: "bg-ceu/14 text-ceu", rotulo: "Publicado" },
};

function Secao({
  children,
  id,
  resumo,
  titulo,
}: {
  children: ReactNode;
  id: string;
  resumo: string;
  titulo: string;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-bold text-titulo text-xl tracking-tight" id={id}>
          {titulo}
        </h2>
        <p className="text-muted-foreground text-sm tabular-nums">{resumo}</p>
      </div>
      <div className="overflow-hidden rounded-[20px] bg-card ring-1 ring-border">
        {children}
      </div>
    </section>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="px-5 py-4 text-muted-foreground">{children}</p>;
}

function SeloDeStatus({ status }: { status: CursoNaVisao["status"] }) {
  const { classe, rotulo } = STATUS[status];
  return (
    <span
      className={cn(
        badgeVariants({ variant: "secondary" }),
        "h-6 rounded-full px-2.5 font-semibold text-xs",
        classe
      )}
    >
      {rotulo}
    </span>
  );
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
            Alunos com acesso
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trilhas.map((t) => (
          <TableRow key={t.id}>
            <TableCell className={cn(CELULA, "font-medium text-foreground")}>
              {t.titulo}
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
              {c.titulo}
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
      </Secao>
      <Secao
        id="cursos"
        resumo={`${plural(visao.cursos.length, "curso", "cursos")}, ${plural(publicados, "publicado", "publicados")}`}
        titulo="Cursos"
      >
        <CursosDoCatalogo cursos={visao.cursos} />
      </Secao>
    </div>
  );
}
