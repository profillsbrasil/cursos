import type { DependenciasDaSessao, FimDaSessao } from "./sessao";

type Ligacoes = Pick<DependenciasDaSessao, "aoConquistar" | "enviar">;

export interface RefreshDaSaida extends Ligacoes {
  aoEncerrar: (fim: FimDaSessao) => void;
}

/**
 * O refresh que mantém em dia o "Continuar" do rodapé, o único dono dessa regra no
 * player. A conquista pede um refresh na hora. A saída pede outro só se o servidor
 * aceitou um envio depois do último refresh e os envios assentaram antes do teto: o
 * refresh atrasado chegaria em outra tela.
 *
 * O `enviar` e o `aoConquistar` devolvidos são os que vão para a sessão.
 */
export function criarRefreshDaSaida(
  deps: Ligacoes & { pedirRefresh: () => void }
): RefreshDaSaida {
  let gravouSemRefresh = false;
  return {
    aoConquistar(c) {
      gravouSemRefresh = false;
      deps.pedirRefresh();
      deps.aoConquistar(c);
    },
    aoEncerrar(fim) {
      if (fim === "assentou" && gravouSemRefresh) {
        gravouSemRefresh = false;
        deps.pedirRefresh();
      }
    },
    enviar: (pedido) =>
      deps.enviar(pedido).then((r) => {
        if (r.tipo === "ok" && !r.registro.conquista) {
          gravouSemRefresh = true;
        }
        return r;
      }),
  };
}
