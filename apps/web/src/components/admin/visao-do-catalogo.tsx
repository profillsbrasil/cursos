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

import { fmtNum, fmtPts, plural } from "@/lib/formato";

import { CABECA, CELULA, NUMERO, SELO, Secao, Vazio } from "./partes";

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
