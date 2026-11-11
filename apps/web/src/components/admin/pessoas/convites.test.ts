import { describe, expect, test } from "bun:test";
import type {
  ConvidadoNaTela,
  Email,
  ResultadoDoConvite,
} from "@cursos/api/dominio/convite";
import type { ConviteId, CursoId, DiaISO } from "@cursos/api/dominio/tipos";

import {
  contagemDeConvidados,
  cursosDoConvidado,
  envioDasFichas,
  type Ficha,
  fichasCom,
  fraseDoResultado,
  quandoDoConvidado,
  seloDoConvidado,
  textoDoEnvio,
} from "./convites";

const email = (texto: string) => texto as Email;
const boa = (texto: string): Ficha => ({ email: email(texto), texto });
const ruim = (texto: string): Ficha => ({ email: null, texto });

describe("fichasCom", () => {
  test("a lista colada vira uma ficha por e-mail, e o que não é e-mail fica marcado", () => {
    expect(fichasCom([], "Ana@x.com, bia@x.com; carla@exemplo\n")).toEqual([
      boa("ana@x.com"),
      boa("bia@x.com"),
      ruim("carla@exemplo"),
    ]);
  });

  test("não repete o e-mail nem o pedaço ruim que já está no campo", () => {
    const antes = [boa("ana@x.com"), ruim("carla@exemplo")];
    expect(fichasCom(antes, "ANA@x.com carla@exemplo bia@x.com")).toEqual([
      ...antes,
      boa("bia@x.com"),
    ]);
  });
});

describe("envioDasFichas", () => {
  test("com fichas boas, o botão diz quantos convites saem", () => {
    expect(envioDasFichas([boa("ana@x.com")], 0)).toEqual({
      emails: [email("ana@x.com")],
      rotulo: "Enviar 1 convite",
      tipo: "pronto",
    });
    expect(envioDasFichas([boa("ana@x.com"), boa("bia@x.com")], 3)).toEqual({
      emails: [email("ana@x.com"), email("bia@x.com")],
      rotulo: "Enviar 2 convites",
      tipo: "pronto",
    });
  });

  test("a ficha que não é e-mail trava o envio e diz qual é", () => {
    expect(
      envioDasFichas([boa("ana@x.com"), ruim("carla@exemplo")], 0)
    ).toEqual({
      razao: "carla@exemplo não é um e-mail. Corrija ou apague para enviar.",
      rotulo: "Enviar 1 convite",
      tipo: "desligado",
    });
  });

  test("sem ficha, o botão espera um e-mail", () => {
    expect(envioDasFichas([], 0)).toEqual({
      razao: "Escreva pelo menos um e-mail.",
      rotulo: "Enviar convites",
      tipo: "desligado",
    });
  });

  test("mais de 20 e-mails ou mais de 50 cursos travam o envio", () => {
    const muitas = Array.from({ length: 22 }, (_, i) => boa(`p${i}@x.com`));
    expect(envioDasFichas(muitas, 0)).toMatchObject({
      razao: "Um envio leva até 20 e-mails. Tire 2 para enviar.",
      tipo: "desligado",
    });
    expect(envioDasFichas(muitas.slice(0, 20), 0).tipo).toBe("pronto");
    expect(envioDasFichas([boa("ana@x.com")], 51)).toMatchObject({
      razao: "Um convite libera até 50 cursos.",
      tipo: "desligado",
    });
  });
});

describe("fraseDoResultado", () => {
  const frase = (r: Record<string, unknown>) =>
    fraseDoResultado({ email: email("ana@x.com"), ...r } as ResultadoDoConvite);

  test("cada recusa do envio tem a frase que diz o que fazer", () => {
    expect(frase({ tipo: "ja_tem_conta", userId: "user_ana" })).toBe(
      "Já tem conta. Mude na ficha dela."
    );
    expect(frase({ enviado: true, tipo: "ja_convidado" })).toBe(
      "Já tem convite pendente. Reenvie ou cancele em Convidados."
    );
    expect(frase({ enviado: false, tipo: "ja_convidado" })).toBe(
      "Já tem convite, mas o e-mail não saiu. Envie em Convidados."
    );
    expect(frase({ motivo: { tipo: "falha" }, tipo: "nao_enviado" })).toBe(
      "O convite ficou guardado, mas o e-mail não saiu. Envie em Convidados."
    );
  });

  test("o limite diz a hora de São Paulo em que dá para enviar de novo", () => {
    expect(
      frase({
        motivo: { tentarEm: "2026-11-11T18:40:00.000Z", tipo: "limite" },
        tipo: "nao_enviado",
      })
    ).toBe(
      "O convite ficou guardado, mas o limite de envios desta hora acabou. Envie em Convidados depois das 15h40."
    );
  });
});

describe("textoDoEnvio", () => {
  const envio = (...tipos: string[]) => ({
    convites: tipos.map(
      (tipo, i) => ({ email: email(`p${i}@x.com`), tipo }) as ResultadoDoConvite
    ),
  });

  test("conta só os convites que saíram", () => {
    expect(textoDoEnvio(envio("enviado", "enviado", "enviado"))).toBe(
      "3 convites enviados"
    );
    expect(textoDoEnvio(envio("enviado", "ja_tem_conta"))).toBe(
      "1 convite enviado"
    );
  });

  test("sem nenhum enviado, não há o que dizer no toast", () => {
    expect(textoDoEnvio(envio("ja_tem_conta", "ja_convidado"))).toBe("");
  });
});

const HOJE = "2026-11-11" as DiaISO;

const convidado = (estado: ConvidadoNaTela["estado"]): ConvidadoNaTela => ({
  comoAdmin: false,
  convidadoEm: "2026-11-04" as DiaISO,
  cursos: [],
  email: email("ana@x.com"),
  estado,
  id: "c1" as ConviteId,
  perfil: "cliente",
});

describe("a linha do convidado", () => {
  test("o selo diz o estado, sem vermelho", () => {
    const selos = [
      {
        enviadoEm: HOJE,
        expiraEm: "2026-12-11" as DiaISO,
        tipo: "pendente" as const,
      },
      { em: HOJE, tipo: "expirado" as const },
      { tipo: "nao_enviado" as const },
    ].map(seloDoConvidado);
    expect(selos.map((s) => s.rotulo)).toEqual([
      "Pendente",
      "Expirado",
      "Não enviado",
    ]);
    expect(selos.map((s) => s.classe).join(" ")).not.toContain("destructive");
  });

  test("a segunda linha diz o dia do envio, do vencimento ou do convite", () => {
    expect(
      quandoDoConvidado(
        convidado({
          enviadoEm: HOJE,
          expiraEm: "2026-12-11" as DiaISO,
          tipo: "pendente",
        }),
        HOJE
      )
    ).toBe("Enviado hoje");
    expect(
      quandoDoConvidado(
        convidado({
          enviadoEm: "2026-11-04" as DiaISO,
          expiraEm: "2026-12-04" as DiaISO,
          tipo: "pendente",
        }),
        HOJE
      )
    ).toBe("Enviado em 4 de nov.");
    expect(
      quandoDoConvidado(
        convidado({ em: "2026-11-10" as DiaISO, tipo: "expirado" }),
        HOJE
      )
    ).toBe("Expirou ontem");
    expect(quandoDoConvidado(convidado({ tipo: "nao_enviado" }), HOJE)).toBe(
      "Convidado em 4 de nov., sem e-mail enviado"
    );
  });

  test("os cursos saem como nenhum, o título do único ou a quantidade", () => {
    const curso = (titulo: string) => ({ id: titulo as CursoId, titulo });
    expect(cursosDoConvidado([])).toBe("Nenhum curso");
    expect(cursosDoConvidado([curso("Envase")])).toBe("Envase");
    expect(cursosDoConvidado([curso("Envase"), curso("Rotulagem")])).toBe(
      "2 cursos"
    );
  });
});

describe("contagemDeConvidados", () => {
  test("diz quantos convidados, o termo da busca e o corte da lista", () => {
    expect(contagemDeConvidados(3, 3, "")).toBe("3 convidados");
    expect(contagemDeConvidados(1, 1, "")).toBe("1 convidado");
    expect(contagemDeConvidados(2, 9, "ana")).toBe('2 convidados para "ana"');
    expect(contagemDeConvidados(100, 250, "")).toBe("100 de 250 convidados");
  });
});
