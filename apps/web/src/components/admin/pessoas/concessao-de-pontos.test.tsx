import { describe, expect, test } from "bun:test";

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ComRoteador, roteadorDeTeste } from "@/components/roteador.test-utils";

import { ConcessaoDePontos } from "./concessao-de-pontos";

const { chamadas, roteador } = roteadorDeTeste();

const renderizar = (no: ReactNode) =>
  renderToStaticMarkup(<ComRoteador roteador={roteador}>{no}</ComRoteador>);

const TAG = /<[^>]+>/g;

const texto = (html: string) =>
  html.replace(TAG, " ").replace(/\s+/g, " ").trim();

const BOTAO = /<button[^>]*type="submit"[^>]*>.*?<\/button>/;
const RADIO = /<input[^>]*type="radio"[^>]*>/g;
const DESCRITO_POR = /aria-describedby="([^"]+)"/;
const MOTIVO_COM_TETO = /<input[^>]*maxLength="200"[^>]*name="motivo"/;

const tela = renderizar(
  <ConcessaoDePontos nome="Carla Souza" saldo={3130} userId="user_1" />
);

const botao = BOTAO.exec(tela)?.[0] ?? "";

describe("concessão de pontos, ao abrir", () => {
  test("o segmento começa em Dar pontos, e nenhum valor vem marcado", () => {
    const radios = tela.match(RADIO) ?? [];
    const marcados = radios.filter((r) => r.includes("checked"));
    expect(marcados).toHaveLength(1);
    expect(marcados[0]).toContain('value="dar"');
    expect(texto(tela)).toContain(
      "Dar pontos Tirar pontos Valor 500 1.000 3.000 5.000 Outro valor"
    );
  });

  test("sem Outro valor, o campo Pontos não aparece", () => {
    expect(tela).not.toContain('name="quantidade"');
    expect(texto(tela)).not.toContain("Pontos Motivo");
  });

  test("o botão pede o valor, desligado e focável, com a razão descrita", () => {
    expect(texto(botao)).toBe("Escolha o valor");
    expect(botao).toContain('aria-disabled="true"');
    expect(botao).toContain("data-disabled");
    expect(botao).not.toContain(" disabled=");
    const alvo = DESCRITO_POR.exec(botao)?.[1];

    const razao = alvo
      ? new RegExp(`<[^>]*id="${alvo}"[^>]*>(.*?)</`).exec(tela)?.[1]
      : undefined;

    expect(razao).toBe("Escolha um dos valores ou Outro valor.");
  });

  test("o Motivo continua com o teto de 200 caracteres", () => {
    expect(tela).toMatch(MOTIVO_COM_TETO);
  });
});

test("renderizar não chama o roteador: nada navega no HTML do servidor", () => {
  expect(chamadas).toEqual([]);
});
