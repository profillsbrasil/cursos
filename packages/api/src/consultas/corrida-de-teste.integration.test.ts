// esperas() conta só as conexões do próprio teste: outra suíte ou outro agente
// no mesmo banco, parado num lock com o mesmo começo de SQL, não entra na conta.

import { afterAll, describe, expect, test } from "bun:test";
import { createDb } from "@cursos/db";
import { urlDeTeste } from "@cursos/db/seed/guarda-local";

import { esperas, urlDaCorrida } from "./corrida-de-teste";

const URL_TESTE = urlDeTeste();

describe.skipIf(URL_TESTE === null)("esperas", () => {
  const meu = createDb({ DATABASE_URL: urlDaCorrida(URL_TESTE ?? "") });
  const deFora = createDb({ DATABASE_URL: URL_TESTE ?? "" });

  afterAll(async () => {
    await meu.$client.end();
    await deFora.$client.end();
  });

  test("statement de outra conexão parado no mesmo lock não conta", async () => {
    const chave = `corrida-de-teste:${Date.now()}`;
    const dona = await deFora.$client.connect();
    const parada = await deFora.$client.connect();
    try {
      await dona.query("begin");
      await dona.query(
        "select pg_advisory_xact_lock(hashtextextended($1, 0))",
        [chave]
      );
      await parada.query("begin");
      const esperando = parada.query(
        "select pg_advisory_xact_lock(hashtextextended($1, 0))",
        [chave]
      );
      // A espera de fora aparece no banco antes de conferir a do teste.
      await esperas(deFora, 1, ["select pg_advisory_xact_lock"]);

      const minhas = await esperas(meu, 1, ["select pg_advisory_xact_lock"], 5)
        .then((e) => e.join(","))
        .catch((e: unknown) => String(e));

      await dona.query("commit");
      await esperando;
      await parada.query("commit");
      expect(minhas).toBe("Error: Só 0 de 1 statements pararam em lock.");
    } finally {
      dona.release();
      parada.release();
    }
  });
});
