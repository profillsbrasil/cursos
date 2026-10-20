// Só do titulo-nao-encontrado.test.tsx, que roda este arquivo num processo próprio:
// troca o @/server/api por um que não acha nada, chama o generateMetadata da aula,
// do curso e do certificado e escreve em JSON o título de cada um, ou "notFound()".

import { plugin } from "bun";
import {
  getAccessFallbackHTTPStatus,
  isHTTPAccessFallbackError,
} from "next/dist/client/components/http-access-fallback/http-access-fallback";

const nada = () => Promise.resolve(null);
plugin({
  name: "server-api-sem-nada",
  setup(construtor) {
    construtor.module("@/server/api", () => ({
      exports: {
        carregarAula: nada,
        carregarPaginaDoCertificado: nada,
        carregarPaginaDoCurso: nada,
      },
      loader: "object",
    }));
  },
});

const daAula = await import("./aulas/[aulaId]/page");
const doCurso = await import("./page");
const doCertificado = await import("./certificado/page");

/** O título, "notFound()" ou a mensagem do erro, para o teste mostrar qual. */
async function titulo(gerar: () => Promise<{ title?: unknown }>) {
  try {
    return (await gerar()).title;
  } catch (erro) {
    if (
      isHTTPAccessFallbackError(erro) &&
      getAccessFallbackHTTPStatus(erro) === 404
    ) {
      return "notFound()";
    }
    return String(erro);
  }
}

const slug = () => Promise.resolve({ slug: "nao-existe" });
console.log(
  JSON.stringify({
    aula: await titulo(() =>
      daAula.generateMetadata({
        params: Promise.resolve({ aulaId: "nao-existe", slug: "nao-existe" }),
      })
    ),
    certificado: await titulo(() =>
      doCertificado.generateMetadata({ params: slug() })
    ),
    curso: await titulo(() => doCurso.generateMetadata({ params: slug() })),
  })
);
