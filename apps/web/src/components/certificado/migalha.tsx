import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@cursos/ui/components/breadcrumb";
import Link from "next/link";

import { caminhoDoCurso } from "@/lib/rotas";

const LINK = "text-ceu underline-offset-4 hover:text-ceu hover:underline";

export function MigalhaDoCertificado({
  slug,
  titulo,
}: {
  slug: string;
  titulo: string;
}) {
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
            render={<Link href={caminhoDoCurso(slug)} />}
          >
            {titulo}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-muted-foreground">
            Certificado
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
