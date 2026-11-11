import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import { Search } from "lucide-react";
import type { Route } from "next";
import Form from "next/form";
import Link from "next/link";

import { CAMPO } from "@/components/casca/campos";
import { fmtNum, plural } from "@/lib/formato";

import { CONTAGEM_DA_OPCAO, OPCAO_DA_TRILHA, TRILHA } from "./partes";

export interface OpcaoDaBarra {
  ativa: boolean;
  href: Route;
  n: number | null;
  rotulo: string;
}

export interface BuscaDaBarra {
  acao: Route;
  campos?: Record<string, string>;
  id: string;
  /** O que a busca casa, no rótulo e no placeholder. Sem ele, "Nome ou e-mail". */
  rotulo?: string;
  termo: string;
}

const ROTULO_DA_BUSCA = "Nome ou e-mail";

/**
 * A contagem cresce mil vezes mais que a busca: na linha única, ela empurra a
 * busca para a ponta e a busca fica nos 320 px da base; quando a busca desce
 * para a linha de baixo, sozinha, ela cresce até a largura inteira. A contagem
 * repete o termo da busca, que pode ser uma palavra só de 100 letras: ela quebra
 * a palavra em vez de alargar a página.
 */
export const BARRA = "mb-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-2.5";
export const CONTAGEM_DA_BARRA =
  "min-w-0 grow-[999] break-words text-right text-muted-foreground";
export const BUSCA_DA_BARRA = "block min-w-0 grow basis-80";

/**
 * A contagem das listas de pessoas, que no lugar do título diz também o termo:
 * 2 pessoas para "ana", ou 50 de 120 pessoas quando a lista vem cortada.
 */
export function contagemDePessoas(
  mostradas: number,
  total: number,
  termo: string
) {
  const quantas =
    total > mostradas
      ? `${fmtNum(mostradas)} de ${plural(total, "pessoa", "pessoas")}`
      : plural(mostradas, "pessoa", "pessoas");
  return termo ? `${quantas} para "${termo}"` : quantas;
}

/**
 * O topo das listas do admin numa linha só: as opções à esquerda, a contagem
 * e a busca à direita. A busca não tem botão; o Enter envia o formulário.
 */
export function BarraDaLista({
  busca,
  contagem,
  opcoes,
  rotuloDasOpcoes,
}: {
  busca?: BuscaDaBarra;
  contagem: string;
  opcoes: OpcaoDaBarra[];
  rotuloDasOpcoes: string;
}) {
  return (
    <div className={BARRA}>
      <nav aria-label={rotuloDasOpcoes} className="min-w-0 max-w-full">
        <ul className={TRILHA}>
          {opcoes.map((o) => (
            <li key={o.rotulo}>
              <Link
                aria-current={o.ativa ? "page" : undefined}
                className={OPCAO_DA_TRILHA}
                href={o.href}
              >
                {o.rotulo}
                {o.n === null ? null : (
                  <span className={CONTAGEM_DA_OPCAO}>{fmtNum(o.n)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className={CONTAGEM_DA_BARRA}>{contagem}</p>
      {busca ? (
        <search className={BUSCA_DA_BARRA}>
          <Form action={busca.acao} className="relative">
            {Object.entries(busca.campos ?? {}).map(([nome, valor]) => (
              <input key={nome} name={nome} type="hidden" value={valor} />
            ))}
            <label className="sr-only" htmlFor={busca.id}>
              {busca.rotulo ?? ROTULO_DA_BUSCA}
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoComplete="off"
              className={cn(CAMPO, "pr-4 pl-10")}
              defaultValue={busca.termo}
              id={busca.id}
              key={busca.termo}
              maxLength={100}
              name="q"
              placeholder={busca.rotulo ?? ROTULO_DA_BUSCA}
              type="search"
            />
          </Form>
        </search>
      ) : null}
    </div>
  );
}
