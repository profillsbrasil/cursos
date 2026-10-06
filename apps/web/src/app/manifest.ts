import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    description: "my pwa app",
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
    name: "cursos",
    short_name: "cursos",
    start_url: "/",
    theme_color: "#000000",
  };
}
