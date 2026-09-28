/**
 * Autonoma — auth callback (runner de tests).
 *
 * L'`auth` de `createNodeHandler` reçoit le premier User créé dans
 * `refs` (ici : le profile seedé par la factory `profiles`) et doit
 * retourner des credentials **réelles** pour le test runner.
 *
 * Lumina : le login web passe par Supabase email/password (docs
 * plans §16). La factory `profiles` crée déjà le profil PG ; le compte
 * Supabase Auth correspondant est semé via le signup (trigger
 * `handle_new_user` crée le profile). L'env Autonoma fournit :
 *
 *   - `AUTONOMA_TEST_PASSWORD` — password du compte de test (semé au
 *     seed de preview, jamais commité).
 *
 * Le callback renvoie `{ credentials: { email, password } }` :
 *   - email  = l'email du profile seedé (déjà dans `refs`),
 *   - password = `AUTONOMA_TEST_PASSWORD` (env, non placeholder).
 *
 * Si l'env est absent, on renvoie le même shape avec une valeur
 * explicite et le planner échouera — c'est voulu : on n'invente pas
 * de credentials, on signale l'absence.
 */
import type { AuthContext, AuthResult } from "@autonoma-ai/sdk";

export async function autonomaAuth(
  user: Record<string, unknown> | null,
  _context: AuthContext,
): Promise<AuthResult> {
  const email =
    (user?.email as string | undefined) ??
    process.env.AUTONOMA_TEST_EMAIL ??
    "";
  const password = process.env.AUTONOMA_TEST_PASSWORD ?? "";

  return {
    credentials: {
      email,
      password,
    },
  };
}
