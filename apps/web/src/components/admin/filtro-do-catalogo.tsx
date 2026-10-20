"use client";

import type { CursoId, StatusDoCurso } from "@cursos/api/dominio/tipos";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import { Search } from "lucide-react";
import {
  type ChangeEvent,
  Fragment,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useState,
} from "react";

import { CAMPO } from "@/components/casca/campos";
import { fmtNum } from "@/lib/formato";

import {
  CURSOS_SEM_BUSCA,
  CURSOS_SEM_FILTRO,
  type FiltroDeStatus,
  GRADE_DO_CATALOGO,
  noFiltro,
} from "./grade-do-catalogo";
import { CONTAGEM_DA_OPCAO, OPCAO_DA_TRILHA, TRILHA } from "./partes";

/** O cartão vem pronto do servidor; o filtro só lê o título e o status. */
export interface CursoNaGrade {
  cartao: ReactNode;
  id: CursoId;
  status: StatusDoCurso;
  titulo: string;
}

const FILTROS: readonly { filtro: FiltroDeStatus; rotulo: string }[] = [
  { filtro: "todos", rotulo: "Todos" },
  { filtro: "publicado", rotulo: "Publicados" },
  { filtro: "em_producao", rotulo: "Em produção" },
];

function Filtros({
  cursos,
  filtro,
  aoFiltrar,
}: {
  cursos: readonly CursoNaGrade[];
  filtro: FiltroDeStatus;
  aoFiltrar: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <fieldset className={TRILHA}>
      <legend className="sr-only">Status</legend>
      {FILTROS.map((f) => {
        const ligado = f.filtro === filtro;
        const n =
          f.filtro === "todos"
            ? cursos.length
            : cursos.filter((c) => c.status === f.filtro).length;
        return (
          <button
            aria-pressed={ligado}
            className={OPCAO_DA_TRILHA}
            key={f.filtro}
            onClick={aoFiltrar}
            type="button"
            value={f.filtro}
          >
            {f.rotulo}
            <span className={CONTAGEM_DA_OPCAO}>{fmtNum(n)}</span>
          </button>
        );
      })}
    </fieldset>
  );
}

function Busca({
  busca,
  aoBuscar,
}: {
  busca: string;
  aoBuscar: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative min-w-[min(100%,260px)] max-w-[420px] flex-[1_1_260px]">
      <label className="sr-only" htmlFor="busca-no-catalogo">
        Buscar curso pelo título
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        autoComplete="off"
        className={cn(CAMPO, "pr-4 pl-10")}
        id="busca-no-catalogo"
        onChange={aoBuscar}
        placeholder="Buscar curso pelo título"
        type="search"
        value={busca}
      />
    </div>
  );
}

/**
 * A grade do catálogo com a barra: os filtros de status acima de 3 cursos e a
 * busca pelo título acima de 6, como no protótipo. O catálogo é pequeno, então
 * filtra no cliente. O atalho de novo curso fica sempre no fim da grade.
 */
export function GradeDoCatalogo({
  cursos,
  novo,
}: {
  cursos: readonly CursoNaGrade[];
  novo: ReactNode;
}) {
  const [filtro, setFiltro] = useState<FiltroDeStatus>("todos");
  const [busca, setBusca] = useState("");
  const visiveis = cursos.filter((c) => noFiltro(c, filtro, busca));
  const filtrar = useCallback(
    (e: MouseEvent<HTMLButtonElement>) =>
      setFiltro(e.currentTarget.value as FiltroDeStatus),
    []
  );
  const buscar = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setBusca(e.target.value),
    []
  );
  return (
    <>
      {cursos.length > CURSOS_SEM_FILTRO && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {cursos.length > CURSOS_SEM_BUSCA && (
            <Busca aoBuscar={buscar} busca={busca} />
          )}
          <Filtros aoFiltrar={filtrar} cursos={cursos} filtro={filtro} />
        </div>
      )}
      <div className={GRADE_DO_CATALOGO}>
        {visiveis.map((c) => (
          <Fragment key={c.id}>{c.cartao}</Fragment>
        ))}
        {novo}
      </div>
      <p className="text-center text-muted-foreground" role="status">
        {visiveis.length === 0 ? (
          <span className="block px-5 py-10">
            Nenhum curso com esse filtro.
          </span>
        ) : null}
      </p>
    </>
  );
}
