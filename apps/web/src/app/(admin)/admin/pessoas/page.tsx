import { diaLocal } from "@cursos/api/dominio/sequencia";
import { Button } from "@cursos/ui/components/button";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import { Search } from "lucide-react";
import type { Metadata, Route } from "next";
import Form from "next/form";
import Link from "next/link";

import { ListaDePessoasDoAdmin } from "@/components/admin/pessoas/lista-de-pessoas";
import {
  ehPerfil,
  ORDEM_DOS_PERFIS,
  SOBRE_O_PERFIL,
} from "@/components/admin/pessoas/perfis";
import { BOTAO } from "@/components/casca/botoes";
import { CAMPO } from "@/components/casca/campos";
import { fmtNum } from "@/lib/formato";
import { carregarListaDePessoas } from "@/server/api";

export const metadata: Metadata = { title: "Pessoas" };

const FILTRO =
  "inline-flex h-9 items-center gap-2 rounded-full px-3.5 font-semibold text-[13px] ring-1 ring-inset transition-colors";
const FILTRO_SOLTO = "text-foreground ring-muted-foreground hover:ring-titulo";
const FILTRO_ATIVO = "bg-sol text-sobre-cor ring-sol";

const umTexto = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : "";

const comFiltro = (perfil: string | null, termo: string): Route => {
  const busca = new URLSearchParams();
  if (perfil) {
    busca.set("perfil", perfil);
  }
  if (termo) {
    busca.set("q", termo);
  }
  const texto = busca.toString();
  return (texto ? `/admin/pessoas?${texto}` : "/admin/pessoas") as Route;
};

export default async function Pessoas({
  searchParams,
}: {
  searchParams: Promise<{ perfil?: string | string[]; q?: string | string[] }>;
}) {
  const busca = await searchParams;
  const termo = umTexto(busca.q).trim().slice(0, 100);
  const pedido = umTexto(busca.perfil);
  const perfil = ehPerfil(pedido) ? pedido : null;
  const lista = await carregarListaDePessoas(termo, perfil);
  const filtros = [
    { href: comFiltro(null, termo), id: null, n: null, rotulo: "Todos" },
    ...ORDEM_DOS_PERFIS.map((p) => ({
      href: comFiltro(p, termo),
      id: p,
      n: lista.contagem[p],
      rotulo: SOBRE_O_PERFIL[p].plural,
    })),
  ];
  return (
    <>
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
        <h1 className="font-bold text-3xl text-titulo tracking-tight">
          Pessoas
        </h1>
        <p className="text-muted-foreground">
          Quem tem conta, o perfil e o papel de cada um
        </p>
      </header>
      <search className="mb-4 block">
        <Form action="/admin/pessoas" className="flex flex-wrap gap-2.5">
          {perfil ? <input name="perfil" type="hidden" value={perfil} /> : null}
          <label className="sr-only" htmlFor="busca-de-pessoas">
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
              id="busca-de-pessoas"
              key={termo}
              maxLength={100}
              name="q"
              placeholder="Nome ou e-mail"
              type="search"
            />
          </div>
          <Button className={BOTAO} type="submit">
            Buscar
          </Button>
        </Form>
      </search>
      <nav aria-label="Filtrar por perfil" className="mb-8">
        <ul className="flex flex-wrap gap-2">
          {filtros.map((f) => {
            const ativo = f.id === perfil;
            return (
              <li key={f.rotulo}>
                <Link
                  aria-current={ativo ? "page" : undefined}
                  className={cn(FILTRO, ativo ? FILTRO_ATIVO : FILTRO_SOLTO)}
                  href={f.href}
                >
                  {f.rotulo}
                  {f.n === null ? null : (
                    <span className="tabular-nums opacity-70">
                      {fmtNum(f.n)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <ListaDePessoasDoAdmin
        hoje={diaLocal(new Date())}
        lista={lista}
        termo={termo}
      />
    </>
  );
}
