import { ID_DO_YOUTUBE } from "@cursos/db/schema/formatos";

import type { VideoDaAula, VideoId, VideoProvedor } from "./tipos";

export function videoDaAula(
  provedor: VideoProvedor | null,
  id: string | null
): VideoDaAula | null {
  if (provedor === null || id === null) {
    return null;
  }
  switch (provedor) {
    case "youtube":
      return { id: id as VideoId, provedor };
    default: {
      const nenhum: never = provedor;
      throw new Error(`Provedor de vídeo sem leitor: ${String(nenhum)}`);
    }
  }
}

const ID = new RegExp(ID_DO_YOUTUBE);
const HOSTS_DO_YOUTUBE = new Set(["youtube.com", "m.youtube.com"]);
const CAMINHO_COM_ID = /^\/(?:embed|shorts|live)\/([^/]+)/;
const WWW = /^www\./;

function idDoLink(url: URL): string | null {
  const host = url.hostname.replace(WWW, "");
  if (host === "youtu.be") {
    return url.pathname.split("/")[1] ?? null;
  }
  if (!HOSTS_DO_YOUTUBE.has(host)) {
    return null;
  }
  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }
  return CAMINHO_COM_ID.exec(url.pathname)?.[1] ?? null;
}

/**
 * O que o admin cola no campo de vídeo: o id puro ou um link do YouTube (watch?v=,
 * youtu.be, embed, shorts). null quando não é um vídeo que o check
 * aula_video_formato aceite. Roda no editor para mostrar o erro no campo; o zod do
 * documento confere o id de novo no servidor.
 */
export function videoDoTexto(texto: string): VideoDaAula | null {
  const s = texto.trim();
  if (ID.test(s)) {
    return { id: s as VideoId, provedor: "youtube" };
  }
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const id = idDoLink(url);
  return id !== null && ID.test(id)
    ? { id: id as VideoId, provedor: "youtube" }
    : null;
}
