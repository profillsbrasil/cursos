import {
  bucket,
  defineRailway,
  github,
  postgres,
  preserve,
  project,
  service,
  volume,
} from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "iad" });
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const postgresVolume = volume("postgres-volume", {
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
    allowOnlineResize: true,
    region: "iad",
    sizeMB: 500,
  });
  const capas = bucket("capas", { region: "iad" });
  // O material de apoio dos cursos. Privado como o das capas; o app serve cada
  // arquivo pela rota /material/[id], só a quem pode ver o curso.
  const materiais = bucket("materiais", { region: "iad" });
  const web = service("web", {
    build: {
      buildCommand: "bun run --cwd apps/web build",
      buildEnvironment: "V3",
      builder: "RAILPACK",
    },
    domains: ["cursos.profills.com"],
    env: {
      CLERK_PUBLISHABLE_KEY: preserve(),
      CLERK_SECRET_KEY: preserve(),
      CORS_ORIGIN: "https://cursos.profills.com",
      DATABASE_URL: preserve(),
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: preserve(),
      S3_ACCESS_KEY_ID: preserve(),
      S3_BUCKET: preserve(),
      S3_ENDPOINT: preserve(),
      // Referências ao bucket materiais, postas no painel como as do capas; o
      // endpoint e a região de S3_ENDPOINT e S3_REGION valem para os dois.
      S3_MATERIAIS_ACCESS_KEY_ID: preserve(),
      S3_MATERIAIS_BUCKET: preserve(),
      S3_MATERIAIS_SECRET_ACCESS_KEY: preserve(),
      S3_REGION: preserve(),
      S3_SECRET_ACCESS_KEY: preserve(),
    },
    healthcheck: "/entrar",
    preDeploy: "bun run --cwd packages/db db:migrate:deploy",
    replicas: { iad: 1 },
    source: github("profillsbrasil/cursos", { branch: "main" }),
    start: "bun run --cwd apps/web start",
  });

  return project("cursos", {
    resources: [Postgres, web, postgresVolume, capas, materiais],
    variables: { managed: true },
  });
});
