// biome-ignore-all lint/performance/noBarrelFile: drizzle.config.ts e defineRelations leem o schema inteiro por este arquivo
export * from "./acesso";
export * from "./catalogo";
export {
  cursoStatus,
  liberacaoOrigem,
  motivoPonto,
  videoProvedor,
} from "./comum";
export * from "./comunicado";
export * from "./estudo";
export * from "./pontos";
