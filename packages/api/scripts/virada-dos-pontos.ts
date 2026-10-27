// A virada dos pontos: antes da liberação do perfil passar a abrir só a amostra,
// todo Funcionário ganha o bônus (se ainda não tem) e troca pelo preço atual os
// cursos que já estudou e vê só pelo perfil.
// Uso: bun run virada-dos-pontos [-- --gravar], da raiz. Sem flag, só o ensaio,
// em transação read only. O varlock carrega o DATABASE_URL e o CLERK_SECRET_KEY
// pelo contrato de apps/web/.env.schema; sem a chave do Clerk, sai só o userId.
// A regra mora em src/dominio/virada.ts; a leitura e a gravação, em
// src/consultas/virada.ts.

import { parseArgs } from "node:util";
import { createClerkClient } from "@clerk/backend";
import { createDb } from "@cursos/db";

import { contagemPorPerfil } from "../src/consultas/perfil";
import { rodarVirada } from "../src/consultas/virada";
import {
  type MotivoDoPulo,
  nadaAFazer,
  recusaDaGravacao,
  totaisDaVirada,
} from "../src/dominio/virada";
import { LIMITE, pessoasDoClerk } from "../src/externos/pessoas";

const { values } = parseArgs({ options: { gravar: { type: "boolean" } } });
const gravar = values.gravar === true;

const { CLERK_SECRET_KEY, DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error("Falta o DATABASE_URL.");
}
const url = new URL(DATABASE_URL);
console.log(`Banco: ${url.host}${url.pathname}`);

const db = createDb({ DATABASE_URL });
try {
  const contagem = await contagemPorPerfil(db);
  const recusa = gravar
    ? recusaDaGravacao(Object.values(contagem).reduce((s, n) => s + n, 0))
    : null;
  if (recusa) {
    throw new Error(recusa);
  }

  const planos = await rodarVirada(db, { agora: new Date(), gravar });

  const nomes = new Map<string, string>();
  if (CLERK_SECRET_KEY) {
    const pessoas = pessoasDoClerk(
      createClerkClient({ secretKey: CLERK_SECRET_KEY })
    );
    const ids = planos.map((p) => p.userId);
    for (let i = 0; i < ids.length; i += LIMITE) {
      // biome-ignore lint/performance/noAwaitInLoops: uma página do Clerk por vez, longe do limite de taxa.
      const { pessoas: lote } = await pessoas.buscar(
        "",
        ids.slice(i, i + LIMITE)
      );
      for (const p of lote) {
        nomes.set(p.userId, p.nome.split(" ")[0] ?? p.nome);
      }
    }
  }

  const pts = new Intl.NumberFormat("pt-BR");
  const motivo = (m: MotivoDoPulo) => {
    switch (m.tipo) {
      case "sem_preco":
        return "sem preço";
      case "em_producao":
        return "em produção";
      case "saldo_curto":
        return `saldo curto, faltam ${pts.format(m.faltam)} pts`;
      default:
        return m satisfies never;
    }
  };

  console.log(
    gravar
      ? "Gravando: uma pessoa por vez, cada uma na transação dela."
      : "Ensaio: transação read only, nada se grava."
  );
  console.log(`Funcionários: ${planos.length}.`);
  for (const plano of planos) {
    const nome = nomes.get(plano.userId);
    console.log(`\n${plano.userId}${nome ? ` (${nome})` : ""}`);
    if (nadaAFazer(plano)) {
      console.log("  nada a fazer");
    }
    if (plano.bonus > 0) {
      console.log(`  bônus: +${pts.format(plano.bonus)} pts`);
    }
    for (const t of plano.trocas) {
      console.log(`  troca: ${t.titulo}  -${pts.format(t.preco)} pts`);
    }
    for (const p of plano.pulados) {
      console.log(`  pula: ${p.titulo}  (${motivo(p.motivo)})`);
    }
  }

  const t = totaisDaVirada(planos);
  console.log(
    `\nTotal: ${t.bonus} bônus, +${pts.format(t.entram)} pts; ${t.trocas} troca(s), -${pts.format(t.saem)} pts; ${t.pulados} curso(s) pulado(s); ${t.nadaAFazer} pessoa(s) sem nada a fazer.`
  );
  console.log(
    gravar
      ? `Gravado: ${t.bonus} bônus e ${t.trocas} troca(s). Pulados: ${t.pulados}.`
      : "Só o ensaio: nada foi gravado. Para gravar, rode com --gravar."
  );
} finally {
  await db.$client.end();
}
