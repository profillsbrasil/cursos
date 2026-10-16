import type { BuscaDeAlunos } from "@cursos/api/dominio/acompanhamento";
import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";

import { ColunaDoLote } from "./coluna-do-lote";
import { ListaDePessoas } from "./lista-de-pessoas";

/**
 * A lista da busca e, à direita, a coluna da liberação para várias pessoas. O
 * container decide: abaixo de 760 px de conteúdo, a coluna sobe para antes da
 * lista e deixa de ficar presa.
 */
export function TelaDeAlunos({
  cursos,
  resultado,
  termo,
}: {
  cursos: readonly CursoNaVisao[];
  resultado: BuscaDeAlunos;
  termo: string;
}) {
  return (
    <div className="@container">
      <div className="grid @min-[47.5rem]:grid-cols-[minmax(0,1fr)_20rem] items-start gap-7">
        <ListaDePessoas resultado={resultado} termo={termo} />
        <ColunaDoLote
          className="@min-[47.5rem]:order-none order-first"
          cursos={cursos}
        />
      </div>
    </div>
  );
}
