import type { MetadataRoute } from "next";

import { PRODUTO } from "@/lib/marca";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#1A1D22",
    description:
      "Cursos da Profills Brasil sobre máquinas, envase, vendas e rotinas.",
    display: "standalone",
    icons: [
      {
        sizes: "192x192",
        src: "/favicon/web-app-manifest-192x192.png",
        type: "image/png",
      },
      {
        sizes: "512x512",
        src: "/favicon/web-app-manifest-512x512.png",
        type: "image/png",
      },
    ],
    name: PRODUTO,
    short_name: PRODUTO,
    start_url: "/",
    theme_color: "#1A1D22",
  };
}
