/**
 * Autonoma SDK handler — Environment Factory
 *
 * Le planificateur Autonoma pilote la preview via POST /api/autonoma
 * (payload signé HMAC par `AUTONOMA_SHARED_SECRET`, signature du refs
 * token par `AUTONOMA_SIGNING_SECRET`). Voir
 * docs/plans/2026-09-26-lumina-test-suite-autonoma.md et
 * node_modules/@autonoma-ai/server-node/docs/implement.md pour le
 * contrat.
 *
 * Montage : Nitro expose `defineMiddleware` depuis server/middleware/.
 * Le handler n'est armé QUE si les secrets sont présents, sinon la
 * route renvoie 404 — jamais un endpoint demeuré public.
 *
 * Les secrets proviennent de l'env Autonoma (AUTONOMA_SHARED_SECRET est
 * aussi connu du planner ; AUTONOMA_SIGNING_SECRET est privé). S'ils
 * sont absents localement, on dérives le signing secret de manière
 * déterministe à partir du shared secret (uniquement pour le dev local,
 * jamais commuté) afin que l'endpoint reste testable.
 */
import { createHash } from "node:crypto";
import { type H3Event, defineMiddleware } from "h3";
import { createNodeHandler } from "@autonoma-ai/server-node";
import { factories } from "../autonoma/factories";
import { autonomaAuth } from "../autonoma/auth";
import { closeAutDb } from "../autonoma/pg-db";

const sharedSecret = process.env.AUTONOMA_SHARED_SECRET;
const signingSecret =
  process.env.AUTONOMA_SIGNING_SECRET ||
  createHash("sha256")
    .update(`autonoma-signing:${sharedSecret ?? ""}`)
    .digest("hex");

const handler =
  sharedSecret
    ? createNodeHandler({
        scopeField: "orgId",
        sharedSecret,
        signingSecret,
        factories,
        auth: autonomaAuth,
        beforeDown: async () => {
          // Libère la connexion pg singleton avant la sortie du proc.
          await closeAutDb();
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
