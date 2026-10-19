import {
  bucket,
  defineRailway,
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
  const web = service("web", {
    build: {
      buildCommand: "bun run --cwd apps/web build",
      buildEnvironment: "V3",
      builder: "RAILPACK",
    },
    env: {
      CLERK_PUBLISHABLE_KEY: preserve(),
      CLERK_SECRET_KEY: preserve(),
      CORS_ORIGIN: preserve(),
      DATABASE_URL: preserve(),
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: preserve(),
      S3_ACCESS_KEY_ID: preserve(),
      S3_BUCKET: preserve(),
      S3_ENDPOINT: preserve(),
      S3_REGION: preserve(),
      S3_SECRET_ACCESS_KEY: preserve(),
    },
    healthcheck: "/entrar",
    preDeploy: "bun run --cwd packages/db db:migrate:deploy",
    replicas: { iad: 1 },
    start: "bun run --cwd apps/web start",
  });

  return project("cursos", {
    resources: [Postgres, web, postgresVolume, capas],
    variables: { managed: true },
  });
});
