// Só do titulo-nao-encontrado.test.tsx do admin, que roda este arquivo num
// processo próprio: troca o @/server/api por um que não acha nada, chama o
// generateMetadata da ficha, do acesso e do editor e escreve em JSON o título
// de cada um, ou "notFound()".

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
        carregarAcessoDoAluno: nada,
        carregarCategorias: () => Promise.resolve([]),
        carregarCurso: nada,
        carregarFichaDaPessoa: nada,
      },
      loader: "object",
    }));
  },
});

const daFicha = await import("./pessoas/[userId]/page");
const doAcesso = await import("./liberacoes/[userId]/page");
const doEditor = await import("./catalogo/cursos/[id]/page");

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

const pessoa = () => Promise.resolve({ userId: "user_nao_existe" });
console.log(
  JSON.stringify({
    acesso: await titulo(() => doAcesso.generateMetadata({ params: pessoa() })),
    editor: await titulo(() =>
      doEditor.generateMetadata({
        params: Promise.resolve({ id: "8f1c2a4e-1b2c-4d5e-8f90-123456789abc" }),
        searchParams: Promise.resolve({}),
      })
    ),
    ficha: await titulo(() => daFicha.generateMetadata({ params: pessoa() })),
  })
);
