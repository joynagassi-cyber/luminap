/**
 * Autonoma SDK handler — Environment Factory
 *
 * Le planificateur Autonoma pilote la preview via POST /api/autonoma
 * (payload signé HMAC par AUTONOMA_SHARED_SECRET, secret de signature
 * AUTONOMA_SIGNING_SECRET). Voir docs/plans/2026-09-26-lumina-test-suite-autonoma.md
 * et node_modules/@autonoma-ai/server-node/docs/implement.md pour le contrat.
 *
 * Montage : Nitro expose `defineMiddleware` depuis server/middleware/.
 * Le handler n'est armé QUE si les deux secrets sont présents, sinon la
 * route renvoie 404 — jamais un endpoint demeuré public et sans gate HMAC.
 *
 * Le handler attend l'API standard Node `http` ; h3/Srvx enveloppe le
 * request sous le type `NodeServerRequest`, d'où le cast volontaire ici.
 */
import { type H3Event, defineMiddleware } from "h3";
import { createNodeHandler } from "@autonoma-ai/server-node";

const handler =
  process.env.AUTONOMA_SHARED_SECRET && process.env.AUTONOMA_SIGNING_SECRET
    ? createNodeHandler({
        scopeField: "orgId",
        sharedSecret: process.env.AUTONOMA_SHARED_SECRET,
        signingSecret: process.env.AUTONOMA_SIGNING_SECRET,
        // Factories à venir — le planificateur Autonoma génère une spec par
        // modèle ; chaque factory réutilise le code de création réel de
        // l'app (Supabase auth RPC `upsert_profile`, tables business).
        factories: {},
        auth: async (user) => {
          // Le runner teste le web via le login page : il a besoin de
          // credentials email + password. Le password de test est semé par
          // le seed de preview (docs §16) et jamais commité ici.
          return {
            credentials: {
              email:
                (user?.email as string) ??
                process.env.AUTONOMA_TEST_EMAIL ??
                "",
              password: process.env.AUTONOMA_TEST_PASSWORD ?? "",
            },
          };
        },
      })
    : null;

export default defineMiddleware(async (event: H3Event) => {
  const req = event.node.req;
  if (req.url !== "/api/autonoma" || req.method !== "POST") {
    return;
  }
  if (!handler) {
    event.node.res.statusCode = 404;
    event.node.res.end();
    return;
  }
  // h3/Srvx enveloppe le request/response sous des variantes node2/node17 ;
  // l'adaptateur Autonoma attend l'API standard Node `http` — cast volontaire.
  await handler(
    req as unknown as Parameters<typeof handler>[0],
    event.node.res as unknown as Parameters<typeof handler>[1],
  );
});
