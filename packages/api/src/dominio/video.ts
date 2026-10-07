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
