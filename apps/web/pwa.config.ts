import type { NextConfig } from "next";

/** Acrescenta os headers do /sw.js; em export estático eles ficam por conta da hospedagem. */
export function withPwa(config: NextConfig): NextConfig {
  if (config.output === "export") {
    return config;
  }

  return {
    ...config,
    async headers() {
      return [
        ...((await config.headers?.()) ?? []),
        {
          headers: [
            {
              key: "Content-Type",
              value: "application/javascript; charset=utf-8",
            },
            {
              key: "Cache-Control",
              value: "no-cache, no-store, must-revalidate",
            },
            {
              key: "Content-Security-Policy",
              value: "default-src 'self'; script-src 'self'",
            },
          ],
          source: "/sw.js",
        },
      ];
    },
  };
}
