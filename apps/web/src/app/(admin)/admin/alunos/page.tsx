import { Button } from "@cursos/ui/components/button";
import { Input } from "@cursos/ui/components/input";
import { Search } from "lucide-react";
import type { Metadata } from "next";

import { ListaDePessoas } from "@/components/admin/lista-de-pessoas";
import { BOTAO } from "@/components/casca/botoes";
import { carregarPessoas } from "@/server/api";

export const metadata: Metadata = { title: "Alunos · Admin" };

// A busca é um form GET: a página relê ?q= e chama o Clerk, e o endereço guarda a busca.
export default async function Alunos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const termo = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const resultado = await carregarPessoas(termo);
  return (
    <>
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
        <h1 className="font-bold text-3xl text-titulo tracking-tight">
          Alunos
        </h1>
        <p className="text-muted-foreground">
          Escolha uma pessoa para liberar ou revogar acesso
        </p>
      </header>
      <search className="mb-10 block">
        <form
          action="/admin/alunos"
          className="flex flex-wrap gap-2.5"
          method="get"
        >
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
              className="h-11 rounded-full border-muted-foreground bg-card pr-4 pl-10 text-sm md:text-sm dark:border-muted-foreground dark:bg-card"
              defaultValue={termo}
              id="busca-de-alunos"
              maxLength={100}
              name="q"
              placeholder="Nome ou e-mail"
              type="search"
            />
          </div>
          <Button className={BOTAO} type="submit">
            Buscar
          </Button>
        </form>
      </search>
      <ListaDePessoas resultado={resultado} termo={termo} />
    </>
  );
}
