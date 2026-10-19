import { describe, expect, test } from "bun:test";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";

import { PREFERENCIAS_PADRAO } from "@/lib/player/preferencias";
import { type EstadoDaSessao, estadoInicial } from "@/lib/player/sessao";

import { ProblemaDoPlayer } from "./problema-do-player";

const ESTADO = estadoInicial({
  duracaoSeg: 600,
  estudo: { assistida: false, trechos: SEM_TRECHOS },
  inicioSeg: 0,
  preferencias: PREFERENCIAS_PADRAO,
});

const html = (mudou: Partial<EstadoDaSessao>) =>
  renderToStaticMarkup(<ProblemaDoPlayer estado={{ ...ESTADO, ...mudou }} />);

describe("a linha de problema sob a barra", () => {
  test("a falha de envio aparece numa linha própria enquanto durar", () => {
    for (const envio of [
      { falhasSeguidas: 2, tipo: "esperando_nova_tentativa" },
      { falhasSeguidas: 1, tipo: "enviando" },
    ] as const) {
      const h = html({ envio });
      expect(h).toContain("Progresso não salvo. Tentando de novo.");
      expect(h).toContain('role="status"');
    }
  });

  test("primeiro envio, pendente e em dia não deixam linha", () => {
    for (const envio of [
      { falhasSeguidas: 0, tipo: "enviando" },
      { tipo: "pendente" },
      { tipo: "em_dia" },
    ] as const) {
      expect(html({ envio })).toBe("");
    }
  });

  test("o envio parado e o vídeo indisponível saem como alerta", () => {
    expect(
      html({ envio: { motivo: "sessao_expirada", tipo: "parado" } })
    ).toContain('role="alert"');
    expect(
      html({ reproducao: { motivo: "nao_encontrado", tipo: "indisponivel" } })
    ).toContain("Este vídeo não foi encontrado no YouTube.");
  });
});
