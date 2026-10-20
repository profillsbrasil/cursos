// O que a coleta de órfãos (scripts/coletar-orfaos.ts) lê do banco. Só lê.

import { curso, material } from "@cursos/db/schema/index";

import type { ChavesEmUso } from "../dominio/orfaos";
import type { Executor } from "./comum";

export async function chavesEmUso(exec: Executor): Promise<ChavesEmUso> {
  const [capas, materiais] = await Promise.all([
    exec.select({ url: curso.capaUrl }).from(curso),
    exec.select({ chave: material.chave }).from(material),
  ]);
  return {
    capaUrls: capas.map((c) => c.url),
    chavesDeMaterial: materiais.map((m) => m.chave),
  };
}
