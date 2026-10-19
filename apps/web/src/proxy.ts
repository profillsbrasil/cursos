import { clerkMiddleware } from "@clerk/nextjs/server";

import { CRIAR_CONTA, ENTRAR } from "@/lib/rotas";

// O auth.protect() de src/server/api.ts manda quem não tem sessão para este signInUrl.
export default clerkMiddleware({ signInUrl: ENTRAR, signUpUrl: CRIAR_CONTA });

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
