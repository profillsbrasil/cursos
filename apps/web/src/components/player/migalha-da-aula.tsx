import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@cursos/ui/components/breadcrumb";
import type { Route } from "next";
import Link from "next/link";

const LINK =
  "text-ceu underline-offset-4 hover:text-ceu hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2";

export function MigalhaDaAula({ dados }: { dados: AulaNoPlayer }) {
  return (
    <Breadcrumb aria-label="Você está em" className="min-w-0">
      <BreadcrumbList className="gap-x-2.5 gap-y-1 text-muted-foreground text-sm">
        <BreadcrumbItem>
          <BreadcrumbLink
            className={LINK}
            render={<Link href="/meus-cursos" />}
          >
            Meus cursos
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink
            className={LINK}
            render={<Link href={`/cursos/${dados.curso.slug}` as Route} />}
          >
            {dados.curso.titulo}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-muted-foreground">
            Módulo {dados.aula.modulo.numero}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
