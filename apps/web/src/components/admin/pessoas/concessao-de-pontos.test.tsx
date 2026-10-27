import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

// Fora do App Router o useRouter lança; o resto do módulo fica o de verdade.
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({
    push: () => undefined,
    refresh: () => undefined,
    replace: () => undefined,
  }),
}));

const { ConcessaoDePontos } = await import("./concessao-de-pontos");

const TAG = /<[^>]+>/g;
const texto = (html: string) =>
  html.replace(TAG, " ").replace(/\s+/g, " ").trim();
const BOTAO = /<button[^>]*type="submit"[^>]*>.*?<\/button>/;
const RADIO = /<input[^>]*type="radio"[^>]*>/g;
const DESCRITO_POR = /aria-describedby="([^"]+)"/;
const MOTIVO_COM_TETO = /<input[^>]*maxLength="200"[^>]*name="motivo"/;

const tela = renderToStaticMarkup(
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
