import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const withVarlock = varlockNextConfigPlugin();

import type { NextConfig } from "next";

import { withPwa } from "./pwa.config";

const nextConfig: NextConfig = {
  experimental: {
    // O proxy guarda o corpo do pedido até este teto e corta o resto sem erro. O
    // padrão de 10 MB truncava o material de apoio, que vai até 50 MB (mais o
    // envelope do multipart).
    proxyClientMaxBodySize: "51mb",
  },
  reactCompiler: true,
  typedRoutes: true,
};

export default withVarlock(withPwa(nextConfig));
