import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const withVarlock = varlockNextConfigPlugin();

import type { NextConfig } from "next";

import { withPwa } from "./pwa.config";

// salvarCurso grava em capa_url a URL pública do bucket "capas" deste projeto, e o
// next/image recusa host que não esteja aqui.
const capasDoSupabase = process.env.SUPABASE_URL
  ? new URL("/storage/v1/object/public/capas/**", process.env.SUPABASE_URL)
  : null;

const nextConfig: NextConfig = {
  images: capasDoSupabase ? { remotePatterns: [capasDoSupabase] } : undefined,
  reactCompiler: true,
  typedRoutes: true,
};

export default withVarlock(withPwa(nextConfig));
