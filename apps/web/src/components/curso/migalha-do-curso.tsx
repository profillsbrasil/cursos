import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@cursos/ui/components/breadcrumb";
import Link from "next/link";

export function MigalhaDoCurso({ titulo }: { titulo: string }) {
  return (
    <Breadcrumb aria-label="Você está em" className="min-w-0">
      <BreadcrumbList className="gap-x-2.5 gap-y-1 text-muted-foreground text-sm">
        <BreadcrumbItem>
          <BreadcrumbLink
            className="text-ceu underline-offset-4 hover:text-ceu hover:underline"
            render={<Link href="/meus-cursos" />}
          >
            Meus cursos
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-muted-foreground">
            {titulo}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
