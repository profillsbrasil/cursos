import { Button } from "@cursos/ui/components/button";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import { Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";

import { AbasDasLiberacoes } from "@/components/admin/abas-das-liberacoes";
import { TelaDeAlunos } from "@/components/admin/tela-de-alunos";
import { BOTAO_CONTORNO } from "@/components/casca/botoes";
import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { CAMPO } from "@/components/casca/campos";
import { carregarCatalogo, carregarPessoas } from "@/server/api";

export const metadata: Metadata = { title: "Liberações" };

export default async function Alunos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const termo = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const [resultado, catalogo] = await Promise.all([
    carregarPessoas(termo),
    carregarCatalogo(),
  ]);
  return (
    <>
      <CabecalhoDaPagina
        resumo="Marque pessoas para liberar um curso, ou abra uma para ver o acesso"
        titulo="Liberações"
      />
      <AbasDasLiberacoes ativa="pessoa" />
      <search className="mb-8 block">
        <Form action="/admin/liberacoes" className="flex flex-wrap gap-2.5">
          <label className="sr-only" htmlFor="busca-de-alunos">
            Nome ou e-mail
          </label>
          <div className="relative min-w-[min(100%,260px)] flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoComplete="off"
              className={cn(CAMPO, "pr-4 pl-10")}
              defaultValue={termo}
              id="busca-de-alunos"
              key={termo}
              maxLength={100}
              name="q"
              placeholder="Nome ou e-mail"
              type="search"
            />
          </div>
          <Button className={BOTAO_CONTORNO} type="submit">
            Buscar
          </Button>
        </Form>
      </search>
      <TelaDeAlunos
        cursos={catalogo.cursos}
        resultado={resultado}
        termo={termo}
      />
    </>
  );
}
