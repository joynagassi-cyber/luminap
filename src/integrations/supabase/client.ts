// Client Supabase unique (R12).
//
// Ce module ré-exporte l'instance créée par `@/lib/auth`, qui est la SEULE
// propriétaire de la session persistée (`sb-<ref>-auth-token`) et du timer de
// rafraîchissement. Créer un second `createClient` ici instanciait un
// 2e `GoTrueClient` partageant la même clé de session → warning
// « Multiple GoTrueClient instances detected » et risque de course sur la
// session. Les importateurs (`storageService`, `orgBootstrap`,
// `SettingsPersonalisation`) utilisent donc l'unique client.
export { supabase } from "@/lib/auth";
