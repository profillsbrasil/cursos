import { describe, expect, test } from "bun:test";
import {
  type Email,
  ehVivo,
  estadoDoConvite,
  type LinhaDoConvidado,
  type LinhaDoConvite,
  lerEmail,
  lerEmails,
  montarPainelDeConvites,
} from "./convite";
import type { ConviteId, CursoId } from "./tipos";

describe("lerEmail", () => {
  test("apara e põe em minúsculas", () => {
    expect(lerEmail("  Ana.Ribeiro@Exemplo.COM \n")).toBe(
      "ana.ribeiro@exemplo.com" as Email
    );
  });

  test("recusa o que não é e-mail", () => {
    const ruins = [
      "",
      "carla",
      "carla@exemplo",
      "@exemplo.com",
      "carla@.com",
      "carla@exemplo.",
      "carla@@exemplo.com",
      "carla silva@exemplo.com",
      "carla@exem plo.com",
      "carla\u0085@exemplo.com",
      "carla @exemplo.com",
    ];
    expect(ruins.map(lerEmail)).toEqual(ruins.map(() => null));
  });

  test("aceita até 254 caracteres e recusa 255", () => {
    const dominio = "@exemplo.com";
    const limite = `${"a".repeat(254 - dominio.length)}${dominio}`;
    expect(lerEmail(limite)).toBe(limite as Email);
    expect(lerEmail(`a${limite}`)).toBeNull();
  });
});

describe("lerEmails", () => {
  test("separa por vírgula, ponto e vírgula, espaço e quebra de linha", () => {
    expect(
      lerEmails("ana@x.com, bia@x.com;caio@x.com\ndani@x.com\teva@x.com")
    ).toEqual({
      emails: [
        "ana@x.com",
        "bia@x.com",
        "caio@x.com",
        "dani@x.com",
        "eva@x.com",
      ] as Email[],
      ruins: [],
    });
  });

  test("não repete o e-mail escrito com outra caixa", () => {
    expect(lerEmails("ana@x.com Ana@X.com ana@x.com").emails).toEqual([
      "ana@x.com",
    ] as Email[]);
  });

  test("devolve à parte o pedaço que não é e-mail, como veio", () => {
    expect(lerEmails("ana@x.com, Carla@exemplo ;; ")).toEqual({
      emails: ["ana@x.com"] as Email[],
      ruins: ["Carla@exemplo"],
    });
  });

  test("texto vazio não tem e-mail nem pedaço ruim", () => {
    expect(lerEmails("  \n ")).toEqual({ emails: [], ruins: [] });
  });
});

const AGORA = new Date("2026-11-11T15:00:00Z");
const ANTES = new Date("2026-11-10T15:00:00Z");
const DEPOIS = new Date("2026-12-10T15:00:00Z");

const linha = (mudar: Partial<LinhaDoConvite> = {}): LinhaDoConvite => ({
  aceitoEm: null,
  aceitoPor: null,
  canceladoEm: null,
  canceladoPor: null,
  comoAdmin: false,
  enviadoEm: ANTES,
  expiraEm: DEPOIS,
  papelAplicadoEm: null,
  ...mudar,
});

describe("estadoDoConvite", () => {
  test("enviado e dentro da validade é pendente", () => {
    expect(estadoDoConvite(linha(), AGORA)).toEqual({
      enviadoEm: ANTES,
      expiraEm: DEPOIS,
      tipo: "pendente",
    });
  });

  test("sem envio é não enviado", () => {
    expect(estadoDoConvite(linha({ enviadoEm: null }), AGORA)).toEqual({
      expiraEm: DEPOIS,
      tipo: "nao_enviado",
    });
  });

  test("expira no instante de expiraEm, enviado ou não", () => {
    const umMsDepois = new Date(AGORA.getTime() + 1);
    expect(estadoDoConvite(linha({ expiraEm: umMsDepois }), AGORA).tipo).toBe(
      "pendente"
    );
    expect(estadoDoConvite(linha({ expiraEm: AGORA }), AGORA)).toEqual({
      em: AGORA,
      tipo: "expirado",
    });
    expect(
      estadoDoConvite(linha({ enviadoEm: null, expiraEm: ANTES }), AGORA).tipo
    ).toBe("expirado");
  });

  test("aceito vence expirado, e o papel diz se pediu, se aplicou ou se falta", () => {
    const aceito = { aceitoEm: ANTES, aceitoPor: "user_ana", expiraEm: ANTES };
    expect(estadoDoConvite(linha(aceito), AGORA)).toEqual({
      em: ANTES,
      papel: "nao_pediu",
      por: "user_ana",
      tipo: "aceito",
    });
    expect(
      estadoDoConvite(linha({ ...aceito, comoAdmin: true }), AGORA)
    ).toMatchObject({ papel: "por_aplicar" });
    expect(
      estadoDoConvite(
        linha({ ...aceito, comoAdmin: true, papelAplicadoEm: AGORA }),
        AGORA
      )
    ).toMatchObject({ papel: "aplicado" });
  });

  test("cancelado vence expirado", () => {
    expect(
      estadoDoConvite(
        linha({
          canceladoEm: ANTES,
          canceladoPor: "user_admin",
          expiraEm: ANTES,
        }),
        AGORA
      )
    ).toEqual({ em: ANTES, por: "user_admin", tipo: "cancelado" });
  });

  test("vivo é o que ainda se reenvia e se cancela", () => {
    const tipos = [
      linha(),
      linha({ enviadoEm: null }),
      linha({ expiraEm: ANTES }),
      linha({ aceitoEm: ANTES, aceitoPor: "user_ana" }),
      linha({ canceladoEm: ANTES, canceladoPor: "user_admin" }),
    ].map((l) => {
      const estado = estadoDoConvite(l, AGORA);
      return [estado.tipo, ehVivo(estado)];
    });
    expect(tipos).toEqual([
      ["pendente", true],
      ["nao_enviado", true],
      ["expirado", true],
      ["aceito", false],
      ["cancelado", false],
    ]);
  });
});

describe("montarPainelDeConvites", () => {
  const convidado = (
    email: string,
    mudar: Partial<LinhaDoConvite> = {}
  ): LinhaDoConvidado => ({
    ...linha(mudar),
    convidadoEm: ANTES,
    cursos: [{ id: "c1" as CursoId, titulo: "Envase" }],
    email: email as Email,
    id: `id-${email}` as ConviteId,
    perfil: "cliente",
  });

  test("cada convidado sai com o estado e os dias de São Paulo", () => {
    const painel = montarPainelDeConvites(
      {
        convidados: [
          // 02h de 11/11 em UTC ainda é dia 10 em São Paulo.
          convidado("ana@x.com", {
            enviadoEm: new Date("2026-11-11T02:00:00Z"),
          }),
          convidado("bia@x.com", { enviadoEm: null }),
          convidado("caio@x.com", { expiraEm: ANTES }),
        ],
        cursos: [],
        total: 7,
      },
      AGORA
    );
    expect<string>(painel.hoje).toBe("2026-11-11");
    expect(painel.total).toBe(7);
    expect<unknown>(painel.convidados.map((c) => [c.email, c.estado])).toEqual([
      [
        "ana@x.com",
        { enviadoEm: "2026-11-10", expiraEm: "2026-12-10", tipo: "pendente" },
      ],
      ["bia@x.com", { tipo: "nao_enviado" }],
      ["caio@x.com", { em: "2026-11-10", tipo: "expirado" }],
    ]);
    expect(painel.convidados[0]).toMatchObject({
      comoAdmin: false,
      convidadoEm: "2026-11-10",
      cursos: [{ id: "c1", titulo: "Envase" }],
      perfil: "cliente",
    });
  });

  test("convite aceito ou cancelado não chega à tela", () => {
    const painel = montarPainelDeConvites(
      {
        convidados: [
          convidado("ana@x.com", { aceitoEm: ANTES, aceitoPor: "user_ana" }),
          convidado("bia@x.com", {
            canceladoEm: ANTES,
            canceladoPor: "user_admin",
          }),
        ],
        cursos: [],
        total: 0,
      },
      AGORA
    );
    expect(painel.convidados).toEqual([]);
  });
});
