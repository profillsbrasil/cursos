import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";
import type { NextConfig } from "next";

import { withPwa } from "./pwa.config";

const withVarlock = varlockNextConfigPlugin();

const nextConfig: NextConfig = {
  experimental: {
    // WARNING: o proxy corta sem erro o corpo acima deste teto; o padrão de 10 MB truncava o material de 50 MB.
    proxyClientMaxBodySize: "51mb",
  },
  reactCompiler: true,
  redirects: () =>
    Promise.resolve([
      {
        destination: "/admin/liberacoes",
        permanent: true,
        source: "/admin/alunos",
      },
      {
        destination: "/admin/liberacoes/:userId",
        permanent: true,
        source: "/admin/alunos/:userId",
      },
    ]),
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withVarlock(withPwa(nextConfig));
