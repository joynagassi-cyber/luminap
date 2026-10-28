# Architecture — Agent conversationnel Lumina

> **Statut** : spécification, aucune ligne de code applicatif écrite.
> **Date** : 2026-10-28 · **Périmètre** : assistant org-scopé, modes d'approbation, skills, rendu.
> **Vérifié** : versions npm interrogées le jour de rédaction (registre), contraintes lues dans le dépôt.

---

## 1. Périmètre — ce que l'agent fait, et ce qu'il ne fera jamais

### Dans le périmètre (l'agent exécute)

Manipuler les fonctionnalités **d'une organisation existante** pour gagner du temps :
événements, budgets, postes budgétaires, transactions, caisses de groupe, campagnes de
dons, rapports.

### Hors périmètre (l'agent **explique**, il n'exécute pas)

| Action | Traitement |
|---|---|
| Créer une organisation | jamais exposée comme outil → renvoie un **tutoriel guidé** |
| Émettre une invitation | idem |
| Assigner / révoquer un rôle | idem |

**Le choix d'implémentation est le garde-fou** : ces trois actions ne sont pas « interdites
par le prompt ». Elles **n'existent pas** dans le registre d'outils. Un modèle ne peut pas
appeler ce qu'on ne lui donne pas — c'est la seule garantie qui résiste à l'injection de
prompt. Si un utilisateur écrit « crée-moi une organisation », le modèle n'a aucun outil
pour le faire : il ne peut que proposer le parcours manuel.

> **Décision structurante D-AG1** — Le périmètre de sécurité est défini par *absence* dans
> le registre d'outils, pas par une instruction du prompt système. Les consignes textuelles
> sont consultatives ; l'absence d'outil est mécanique.

---

## 2. Contraintes vérifiées (état du 2026-10-28)

| Contrainte | Valeur mesurée | Conséquence |
|---|---|---|
| `ai` (Vercel AI SDK) | latest **7.0.155** | à installer |
| peer `zod` de `ai@7` | `^3.25.76 \|\| ^4.1.8` | dépôt = **3.25.76** → **compatible sans migration** |
| `@ai-sdk/react` | 4.0.159, peer `react ^18 \|\| ~19.0.1 \|\| ~19.1.2 \|\| ^19.2.1` | dépôt = **19.2.8** → OK |
| engines `ai@7` | `node >= 22` | CI = **Node 22.23.3** → OK |
| `zod` réellement importé dans `src/` | **aucun** | terrain vierge → choix libre |
| Composants UI | **49** fichiers shadcn | rendu pro déjà disponible |
| Permissions canoniques | **28** (`src/lib/rbac.ts`) | vocabulaire d'outils borné |
| Décision de permission | RPC `has_permission(...)` `SECURITY DEFINER`, `GRANT … TO authenticated` | réutilisable côté client |
| Capacités métier | 13 modules, **~60 méthodes publiques** dans `src/capabilities/` | surface trop large → cf. §6 |
| Données | **offline-first PowerSync** (`getPowerSyncDatabase()` navigateur seulement) | cf. D-AG2 |
| Documentation existante | `Tutorial.tsx` : `SECTIONS[]` typé (titres, paragraphes, tips, warnings, FAQ, erreurs) | source pour les tutoriels |
| Routes | `/events`, `/event/new`, `/budgets`, `/transaction/new`, `/groups`, `/giving`, `/reports`, `/invitation/emit`, `/invitation/manage`… | liens profonds possibles |

**Conclusion sur la « friction »** : il n'y en a aucune. `ai@7` accepte exactement votre
version de Zod, votre version de React et votre version de Node. Aucune montée de version
n'est nécessaire pour démarrer.

---

## 3. Décisions d'architecture

Format identique à `docs/agent/DECISIONS.md` (Décision / Raison / Alternative écartée).

### D-AG2 — Les outils s'exécutent dans le navigateur, pas dans l'edge function

**Décision** : `supabase/functions/agent-chat` ne fait **que** l'appel au modèle
(clé API, prompt système, filtrage des outils, streaming). L'exécution des outils se fait
côté client, dans les services `src/capabilities/*` existants.

**Raison** : ces services dépendent de `getPowerSyncDatabase()`, qui n'existe que dans le
navigateur. Les réimplémenter en Deno signifierait dupliquer ~60 méthodes et 3 847 lignes
de `dataLayer.ts`, avec dérive garantie entre les deux implémentations. En exécutant côté
client, l'agent hérite **gratuitement** de la RLS, de `has_permission`, de l'audit
(invariant #6) et de la file de synchronisation PowerSync.

**Alternative écartée** : outils exécutés côté serveur avec `service_role`. Cela
resoudrait le streaming plus simplement, mais **détruirait le modèle de sécurité** : un
libellé de transaction est un texte contrôlé par l'utilisateur ; une phrase d'injection
deviendrait une escalade de privilèges.

### D-AG3 — Le JWT de l'utilisateur, jamais `service_role`

**Décision** : l'edge function relaie le JWT de l'appelant. Toute écriture passe par
`has_permission` + RLS avec ce JWT.

**Raison** : conséquence directe de D-AG2. Le pire cas d'une injection devient « l'agent
propose une action que l'utilisateur pouvait déjà faire ».

**Alternative écartée** : `service_role` comme dans `create_org`. Justifié là-bas
(bootstrap du tout premier admin, impossible autrement) ; **injustifiable ici**.

### D-AG4 — Adopter Zod 4 maintenant, pas plus tard

**Décision** : passer `zod` de `^3.25.76` à `^4.x`.

**Raison** : `zod` est déclaré dans `package.json` mais **importé nulle part** dans `src/`
(vérifié par recherche exhaustive). Le coût de migration est donc **nul aujourd'hui** et
deviendra croissant dès le premier schéma écrit. Zod 4 apporte `z.toJSONSchema()` natif :
un seul schéma produit à la fois la validation runtime, le type TypeScript **et** le JSON
Schema envoyé au modèle. C'est exactement la « friction minimale » demandée.

**Alternative écartée** : rester en 3.25.76 (supporté par `ai@7`). Valide, mais il faudrait
la dépendance `zod-to-json-schema` (déjà présente en transitive) pour obtenir le JSON Schema.
**Filet** : si un imprévu survient, `zod@3.25.76` reste un retour arrière d'une ligne, et
`ai@7` accepte les deux.

### D-AG5 — Un schéma, quatre usages

**Décision** : chaque outil déclare **un seul** schéma Zod, utilisé pour (1) l'`inputSchema`
donné au modèle, (2) le type TypeScript de `execute`, (3) la validation défensive à
l'exécution, (4) le rendu de la carte de confirmation.

**Raison** : c'est le point de friction principal dans ce genre de projet — trois
définitions qui divergent (prompt, schéma, formulaire). Ici, `description()` et `meta()`
portent les libellés humains, donc la carte d'approbation se génère depuis le schéma.

**Alternative écartée** : JSON Schema écrit à la main + types TS séparés. Divergence
inévitable, aucune vérification possible.

### D-AG6 — Le mode est décidé côté serveur, appliqué des deux côtés

**Décision** : le client envoie `mode` + `skillIds` (jamais un prompt). Le serveur valide,
construit la liste d'outils correspondante, et renvoie aussi le mode retenu. Le client
re-vérifie avant d'exécuter.

**Raison** : défense en profondeur. Un client compromis ne peut pas s'auto-attribuer le
mode `autonome` : le serveur ne lui aura pas envoyé les outils en question… et le client
re-vérifie quand même. Le prompt système n'est **jamais** fourni par le client.

**Alternative écartée** : faire confiance à un `mode` purement client. Un simple
`localStorage` modifierait les droits.

### D-AG7 — Pas de JSX généré par le modèle

**Décision** : le modèle émet des **objets typés** (`view: "event-card"`, `view: "diff"`…)
validés par Zod, rendus par un registre de composants fermé.

**Raison** : le rendu doit être professionnel **et** sûr. Un modèle qui produit du JSX ou
du HTML est un vecteur XSS. Un registre fermé garantit qu'aucun composant non audité ne
peut apparaître, tout en gardant l'apparence shadcn existante.

**Alternative écartée** : `dangerouslySetInnerHTML` / rendu Markdown libre. Rejeté :
dépôt public, app contenant des données financières.

### D-AG8 — Découverte progressive des outils (skills)

**Décision** : ne jamais exposer les ~60 méthodes. Un classifieur d'intention sélectionne
1 à 3 *skills*, et seuls leurs outils (5 à 7) sont envoyés au modèle.

**Raison** : la fiabilité du *tool calling* s'effondre au-delà de ~15-20 outils ; le modèle
choisit mal et invente des paramètres. C'est aussi une économie directe de tokens.

**Alternative écartée** : exposer tous les outils. Plus simple à écrire, beaucoup moins
fiable et plus cher.

### D-AG9 — Le mode `autonome` reste borné

**Décision** : même en `autonome`, quatre catégories exigent **toujours** une approbation :
suppression, approbation de versement, transaction au-dessus d'un seuil (à définir, par
défaut 50 000 XOF), et toute action sur un rôle ou une organisation (déjà absente, cf. D-AG1).

**Raison** : « full approved » ne doit pas signifier « irréversible sans témoin ». Une
erreur de l'agent sur une suppression n'a pas de retour arrière.

**Alternative écartée** : `autonome` = aucune confirmation. Rejeté pour une application
manipulant de l'argent associatif.

### D-AG10 — Persistance des conversations en base, org-scopée

**Décision** : `agent_conversations` + `agent_messages` + `agent_usage`, avec RLS par
organisation et par utilisateur.

**Raison** : multi-appareil, et surtout **traçabilité** : on doit pouvoir relire ce que
l'agent a proposé et ce que l'humain a approuvé. Cela complète l'audit métier (invariant #6)
par un audit de conversation.

**Alternative écartée** : état en mémoire ou `localStorage` seul. Perdu au changement
d'appareil, non auditable.

---

## 4. Flux d'exécution

```
┌──────────── Navigateur (React 19, Vite) ────────────┐      ┌──── Edge Function ────┐
│                                                     │      │  agent-chat (Deno)    │
│  1. useAgentChat.sendMessage({ text })              │      │                       │
│     body = { mode, skillIds, orgId? }  ─────────────┼─────▶│  2. valide (Zod)      │
│                                                     │      │  3. dérive org du JWT │
│                                                     │      │  4. classifie l'intent│
│                                                     │      │     → skills retenus  │
│                                                     │      │  5. construit tools   │
│                                                     │      │     selon mode        │
│                                                     │      │  6. streamText()      │
│  8. reçoit des parts `tool-<nom>`                   │◀─────┼──  7. SSE (parts)      │
│     · input validé Zod (défense en profondeur)      │      │                       │
│     · mode → approbation requise ?                  │      └───────────────────────┘
│        ├─ oui → ApprovalCard (diff avant/après)     │
│        │        └─ refus → modèle prévenu, stop     │
│        └─ non → exécution                            │
│  9. has_permission(uid, org, res, action, scope)    │
│ 10. capability existante (invitation…, events, budget)│
│     → PowerSync local → sync → audit log            │
│ 11. résultat renvoyé → 12. le tour continue         │
└─────────────────────────────────────────────────────┘
```

**Pourquoi pas `needsApproval` du SDK ?** La fonctionnalité existe (`needsApproval`,
ou `toolApproval` en v7), mais elle suppose que le **serveur** exécute l'outil après
approbation. Nos outils s'exécutent côté client (D-AG2) : l'approbation doit donc être
gérée par notre *runner*, avec un état explicite `pending-approval`. C'est plus de code,
mais c'est le seul endroit où la décision d'exécuter a lieu. Si les outils migraient un
jour côté serveur, `toolApproval` deviendrait pertinent — la décision est réversible.

**Hors ligne** : `useAgentChat` expose `isOnline`. Hors ligne, la saisie est désactivée
avec un message explicite (« l'assistant a besoin du réseau ; vos saisies manuelles
continuent de fonctionner »). Pas de file d'attente : rejouer un tour de conversation
plus tard produirait des actions incohérentes avec l'état.

---

## 5. Les modes

### Définition

| Mode | Outils envoyés au modèle | Approbation | Usage |
|---|---|---|---|
| **`lecture`** | lecture seule | aucune | consultation, questions, rapports |
| **`assiste`** *(défaut)* | lecture + écriture | **toute écriture** | usage courant |
| **`autonome`** | lecture + écriture | seulement les 4 catégories de D-AG9 | tâches répétitives, utilisateur averti |

### Règles

- Le mode est **par conversation**, jamais global. Une nouvelle conversation repart en
  `assiste`.
- Le passage en `autonome` demande une **confirmation explicite** dans l'UI, avec la liste
  de ce qui reste protégé.
- Un mode ne peut qu'**élargir** dans la limite des permissions réelles de l'utilisateur :
  `autonome` ne donne jamais un droit refusé par `has_permission`. Le mode gouverne
  l'**autonomie**, pas les **droits** — les deux sont orthogonaux.

### Matrice d'approbation (source de vérité unique)

```ts
// src/agent/modes.ts
export type AgentMode = "lecture" | "assiste" | "autonome";

/** Un outil est décrit par son effet, pas par son nom. */
export type Effect = "read" | "write" | "destructive" | "money";

export function requiresApproval(mode: AgentMode, tool: ToolMeta, input: unknown): boolean {
  if (tool.effect === "read") return false;              // jamais, tous modes
  if (tool.effect === "destructive") return true;        // toujours
  if (tool.effect === "money" && tool.exceedsThreshold?.(input)) return true;
  return mode !== "autonome";                            // assiste → tout
}
```

`effect` est déclaré **par l'outil**, pas déduit d'une convention de nommage.

---

## 6. Le contrat d'outil

### Définition canonique

```ts
// src/agent/types.ts
import { z } from "zod";
import type { Permission } from "@/lib/rbac";

export interface AgentTool<S extends z.ZodType, O extends z.ZodType> {
  /** "event.create", "budget.addLine" — namespace stable. */
  id: string;
  /** Skill de rattachement (cf. §7). */
  skill: SkillId;
  /** Description lue par le modèle. Verbe à l'infinitif, une phrase. */
  description: string;
  /** Schéma d'entrée — SEULE source de vérité (D-AG5). */
  input: S;
  /** Schéma de sortie, rendu au modèle et à l'UI. */
  output: O;
  /** Permission réellement vérifiée par has_permission avant exécution. */
  permission: Permission;
  /** Nature de l'effet (cf. matrice d'approbation). */
  effect: Effect;
  /** Vue de rendu (cf. §8). */
  view: AgentViewId;
  /** Exécution : appelle un service de src/capabilities, jamais du SQL. */
  execute: (input: z.infer<S>, ctx: ToolContext) => Promise<z.infer<O>>;
}

export interface ToolContext {
  orgId: string;      // dérivé de getOrganizationId(), jamais du modèle
  userId: string;
  actorRole: string;  // pour l'audit actorRoleAtTime
}
```

### Exemple concret

```ts
// src/agent/skills/evenements/tools.ts
import { z } from "zod";
import { defineTool } from "@/agent/registry";
import { addEventPS, type PSEvent } from "@/lib/dataLayer";

export const eventCreate = defineTool({
  id: "event.create",
  skill: "evenements",
  description:
    "Crée un événement (culte, conférence, semaine de prière) avec un budget prévisionnel. " +
    "Reste au statut PLANIFIED. Ne crée aucune transaction financière.",
  input: z.strictObject({
    name: z.string().min(3).max(120).describe("Nom de l'événement, tel qu'il apparaîtra dans les listes"),
    startDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : AAAA-MM-JJ")
      .describe("Date de début, au format ISO (AAAA-MM-JJ). Ne pas inventer : demander à l'utilisateur"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
      .describe("Date de fin. Omettre si l'événement dure un seul jour"),
    budget: z.number().int().nonnegative().max(100_000_000)
      .describe("Budget prévisionnel en FRANCS CFA (entier, pas de centimes, pas de décimales)"),
    description: z.string().max(2000).optional(),
  }),
  output: z.strictObject({
    id: z.string(),
    name: z.string(),
    status: z.literal("PLANIFIED"),
  }),
  permission: "event:create",
  effect: "write",
  view: "event-card",
  execute: async (input, ctx) => {
    // Service RÉEL utilisé par EventNew.tsx (`@/lib/dataLayer`). Pas d'invention,
    // pas de SQL dans un outil : on réutilise le chemin d'écriture existant, donc
    // PowerSync, la file de synchronisation et l'audit fonctionnent à l'identique.
    const id = await addEventPS({
      org_id: ctx.orgId,
      name: input.name,
      description: input.description ?? "",
      start_date: input.startDate,
      end_date: input.endDate ?? null,
      status: "PLANIFIED",
      budget: input.budget,
      budget_items: [],
    } satisfies Omit<PSEvent, "id" | "created_at" | "updated_at">);
    return { id, name: input.name, status: "PLANIFIED" as const };
  },
});
```

**Pourquoi ça minimise la friction avec Zod :**

| Choix | Effet |
|---|---|
| `.describe()` sur chaque champ | le modèle reçoit la doc **champ par champ**, sans prompt annexe à maintenir |
| `z.strictObject` | un champ halluciné est **rejeté** au lieu d'être ignoré silencieusement |
| `.regex()` sur les dates | les dates sont stockées en `text` (`start_date text NOT NULL`) — le piège classique |
| montants en `int` explicite | `budget bigint` en base ; un flottant produit des centimes fantômes |
| `output` typé | le rendu de la carte lit des champs garantis, pas du JSON libre |

### Règle d'écriture des outils

1. Un outil = **un** service de `src/capabilities` déjà testé. Aucun SQL, aucun accès direct
   à `dataLayer` depuis un outil.
2. Aucun paramètre d'identité dans `input` : jamais `orgId`, `userId`, `actorRole`. Ils
   viennent du contexte (D-AG3) — sinon le modèle pourrait choisir l'organisation cible.
3. Le nom de l'outil est un **contrat public** : le renommer casse les conversations
   persistées. Le préfixer par le domaine.

---

## 7. Les skills

Un *skill* = un module autonome : outils + garde-fous + documentation + mots-clés.

```ts
// src/agent/skills/types.ts
export interface Skill {
  id: SkillId;
  label: string;                 // « Événements »
  summary: string;               // injecté dans le prompt si le skill est actif
  keywords: string[];            // routage bon marché
  tools: AgentTool<any, any>[];
  /** Consignes spécifiques ajoutées au prompt quand ce skill est actif. */
  guidance: string;
  /** Parcours humains associés (cf. §7.2). */
  walkthroughs?: WalkthroughId[];
}
```

### 7.1 Catalogue v1

| Skill | Outils (indicatif) | Source métier | Effect |
|---|---|---|---|
| `evenements` | `event.create`, `event.update`, `event.addPurchase`, `event.setStatus` | `EventNew`, `event-service`, `workflow` | write |
| `budgets` | `budget.create`, `budget.addLine`, `budget.updateLine`, `budget.summary` | `capabilities/budgets` | write |
| `finances` | `transaction.create`, `transaction.list`, `balance.get` | `capabilities/cotisation`, `dataLayer` | write / read |
| `groupes` | `group.list`, `group.balance`, `group.createTransaction` | `capabilities/organization` | write / read |
| `dons` | `giving.createCampaign`, `giving.recordPledge`, `giving.list` | `capabilities/giving` | write |
| `rapports` | `report.generate`, `report.list` | `capabilities/policy`, pages `Reports` | read |
| `membres` | `member.search`, `member.list` — **lecture seule** | `Members.tsx`, `members` | read |
| `aide` | `help.explain` | `Tutorial.tsx#SECTIONS`, table de routes | read |

Aucun skill ne contient d'outil d'invitation, de rôle ou de création d'organisation.

### 7.2 Le skill `aide` — la demande explicite « expliquer sans se perdre »

C'est ce qui répond à votre contrainte : l'humain garde la main sur créer/inviter/assigner,
mais l'agent doit pouvoir **expliquer le chemin**.

```ts
// Le modèle appelle : help.explain({ task: "inviter-un-membre" })
// Réponse rendue sous forme de carte « parcours guidé » :
{
  title: "Inviter un membre",
  steps: [
    { label: "Ouvrir la page Invitations", detail: "Menu → Invitations" },
    { label: "Choisir « Émettre une invitation »" },
    { label: "Choisir le rôle cible", detail: "ANCIEN, TRÉSORIER, MEMBRE…" },
    { label: "Partager le QR code ou le code", detail: "Fonctionne hors ligne" },
  ],
  route: "/invitation/emit",       // ← bouton « Ouvrir la page »
  pitfalls: ["Un code expiré ne peut pas être réutilisé."],
}
```

**Source de vérité** : `src/pages/Tutorial.tsx` contient déjà `SECTIONS: SectionData[]`
avec titres, paragraphes, `tips`, `warnings`, `faqs`, `errors`. On ne rédige pas une
seconde documentation : on **dérive** les parcours de cette structure, en ajoutant un
`route` à chaque section. Une seule documentation, deux lecteurs (l'humain dans l'onglet
Tutoriel, l'agent dans le chat).

### 7.3 Découverte progressive

```
message utilisateur
   │
   ├─ 1. routage bon marché : correspondance de `keywords` (gratuit, déterministe)
   │      → si ≥1 skill correspond, on s'arrête là
   │
   └─ 2. sinon, un appel de classification court (modèle léger, sortie Zod :
          z.object({ skills: z.array(skillIdEnum).max(3) }))
          → coût d'un petit tour, sortie bornée
```

Toujours actifs : `aide` et `rapports` (lecture). Donc une question générale trouve
toujours une réponse.

---

## 8. Rendu professionnel

### Principe : registre fermé de vues

```ts
// src/agent/views/registry.ts
export const AGENT_VIEWS = {
  "event-card": EventCard,
  "budget-table": BudgetTable,
  "kpi-grid": KpiGrid,
  "diff": DiffView,              // avant → après, pour l'approbation
  "stepper": StepperView,        // plan en N étapes
  "walkthrough": WalkthroughCard, // parcours guidé + lien profond
  "data-table": DataTableView,
  "callout": CalloutView,        // avertissement, dépassement de budget…
} as const;
```

Le modèle choisit un identifiant **dans cette liste fermée**. Toute autre valeur échoue à
la validation Zod et retombe sur un rendu texte. Aucun composant arbitraire.

### La carte d'approbation

C'est le composant qui décide de la crédibilité de la fonctionnalité. Elle doit montrer
**exactement ce qui va changer** :

```
┌──────────────────────────────────────────────────────┐
│  Créer un événement                    [ à confirmer ]│
├──────────────────────────────────────────────────────┤
│  Nom          Conférence des femmes                  │
│  Début        2026-11-14                             │
│  Budget       250 000 F CFA                          │
│  ─────────────────────────────────────────────────  │
│  Effet        Nouvel événement · statut PLANIFIED    │
│               Aucune écriture financière             │
│  Droit requis event:create           ✓ vous l'avez   │
├──────────────────────────────────────────────────────┤
│  [ Refuser ]                        [ Confirmer ]    │
└──────────────────────────────────────────────────────┘
```

Trois informations non négociables : **les valeurs exactes**, **l'effet réel**, **le droit
vérifié**. Pour une modification, un `DiffView` montre l'avant → après champ par champ.

Utilise les composants déjà présents (`Card`, `Badge`, `Alert`, `Button`, `Table`,
`Collapsible`) et vos tokens `--data-*` / `CHART_COLORS` pour rester cohérent avec le
thème.

---

## 9. Base de données

```sql
-- agent_conversations : 1 fil par (org, user)
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      text NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode        text NOT NULL DEFAULT 'assiste'
              CHECK (mode IN ('lecture','assiste','autonome')),
  title       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- agent_messages : parts AI SDK stockées telles quelles (jsonb)
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','assistant','system')),
  parts           jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- agent_usage : garde-fou de coût
CREATE TABLE IF NOT EXISTS public.agent_usage (
  org_id      text NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period      date NOT NULL,            -- 1er du mois
  turns       int  NOT NULL DEFAULT 0,
  tokens_in   bigint NOT NULL DEFAULT 0,
  tokens_out  bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, user_id, period)
);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_usage         ENABLE ROW LEVEL SECURITY;

-- ATTENTION à la signature : public.is_org_member(uid UUID, org_id TEXT) — DEUX
-- arguments (migration 20260921000003_extend_is_org_member). Un appel à un seul
-- argument lève « function does not exist » et casse la policy au runtime.
CREATE POLICY agent_conv_own ON public.agent_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id))
  WITH CHECK (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));

CREATE POLICY agent_msg_own ON public.agent_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_conversations c
                 WHERE c.id = conversation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_conversations c
                 WHERE c.id = conversation_id AND c.user_id = auth.uid()));
```

Points d'attention :

- `is_org_member(uid, org_id)` **existe déjà** dans votre base (dernière version :
  `20260921000003_extend_is_org_member`, `STABLE`, `SECURITY DEFINER`, couvre
  `profiles` ∪ `org_memberships` ∪ `org_admins`) : on réutilise la fonction de scoping
  plutôt que d'en écrire une seconde. **Signature à deux arguments** — voir le
  commentaire dans le SQL ci-dessus.
- Une conversation est **privée à son auteur** : un administrateur ne lit pas les
  conversations d'un membre. Si vous voulez l'inverse (supervision), c'est un choix
  explicite à documenter — par défaut, la vie privée l'emporte.
- Rétention : purger `agent_messages` au-delà de 90 jours, sinon la base (quota 500 Mo,
  plan gratuit) grossit sans fin avec des `jsonb` volumineux.

---

## 10. Arborescence

```
supabase/functions/agent-chat/
  index.ts                 # proxy LLM : JWT, mode, skills → streamText
  prompt.ts                # prompt système, versionné
  intent.ts                # routage keywords + classification
  schemas.ts               # schémas partagés client ↔ serveur

src/agent/
  types.ts                 # AgentTool, ToolContext, Effect, AgentMode
  registry.ts              # defineTool(), AGENT_TOOLS (source de vérité)
  modes.ts                 # requiresApproval()
  runner.ts                # Zod → has_permission → execute → audit
  useAgentChat.ts          # wrapper useChat + transport + offline + quota
  skills/
    types.ts
    evenements/{index,tools,guidance}.ts
    budgets/ finances/ groupes/ dons/ rapports/ membres/ aide/
  views/
    registry.ts
    DiffView.tsx EventCard.tsx BudgetTable.tsx KpiGrid.tsx
    StepperView.tsx WalkthroughCard.tsx

src/components/agent/
  AgentPanel.tsx           # panneau latéral / plein écran
  MessageList.tsx MessageBubble.tsx Composer.tsx
  ApprovalCard.tsx ModeSelector.tsx QuotaBanner.tsx

supabase/migrations/2026…_agent_conversations.sql
docs/agent/ARCHITECTURE-AGENT.md   # ce document
docs/agent/SKILLS-AGENT.md         # catalogue des skills (à produire en P2)
```

**Intégration UI** : l'agent est un panneau, pas une page. Une route `/assistant`
pour le plein écran mobile, et un bouton flottant ailleurs. Il ne remplace aucun
formulaire existant : les 63 pages restent la voie nominale.

---

## 11. Phasage

| Phase | Contenu | Risque | Critère de sortie |
|---|---|---|---|
| **P0 — Socle** (2-3 j) | `ai@7` + `zod@4`, types, registry vide, edge function qui streame *sans aucun outil*, panneau UI, migration des tables | nul | on discute, ça streame, ça coûte ~0 |
| **P1 — Lecture** (3-4 j) | skills `rapports` + `membres` + `aide`, mode `lecture` uniquement, `WalkthroughCard` | nul | « combien de cotisations en retard ? », « comment j'invite ? » |
| **P2 — Écriture assistée** (1 sem.) | skills `evenements` + `budgets`, `ApprovalCard`, `runner`, audit | faible | créer un événement avec budget, après confirmation |
| **P3 — Autonomie bornée** (1 sem.) | skill `finances`, mode `autonome`, seuils, quotas, `DiffView` | **moyen** | tâches répétitives sans clic, sauf les 4 catégories protégées |

**Ne pas inverser P1 et P2.** La phase lecture valide le routage d'intention, le coût réel
et le rendu **sans jamais exposer une écriture**. C'est là qu'on apprend si l'architecture
tient, au moment où une erreur ne coûte rien.

---

## 12. Risques et parades

| Risque | Parade |
|---|---|
| **Injection de prompt** via un libellé de transaction | outils exécutés avec le JWT de l'utilisateur (D-AG3) → l'injection ne peut rien obtenir de plus que ses propres droits |
| **Hallucination de paramètres** | `z.strictObject` + `.describe()` + `has_permission` + `ApprovalCard` qui montre les valeurs |
| **Organisation cible choisie par le modèle** | aucun `orgId` dans les schémas d'entrée ; il vient de `getOrganizationId()` |
| **Coût incontrôlé** | quota mensuel par utilisateur (`agent_usage`), `maxOutputTokens`, `stopWhen` borné, P1 en lecture seule |
| **Régression de l'existant** | aucun formulaire modifié ; l'agent appelle les mêmes services que l'UI |
| **Confiance aveugle dans le mode `autonome`** | 4 catégories toujours confirmées (D-AG9), et un bandeau permanent rappelant le mode actif |
| **Dérive entre la doc et l'UI** | le skill `aide` dérive de `Tutorial.tsx`, pas d'une copie |
| **Fuite de données dans les logs** | ne jamais journaliser `parts` côté serveur ; les messages restent en base avec RLS |

---

## 13. Ce qu'il faudra vérifier à l'implémentation (honnêteté sur les inconnues)

Ces points sont **voulus** dans une spec : ils ne sont pas devinables depuis l'extérieur.

1. **API exacte des outils côté client** dans `@ai-sdk/react@4` : `onToolCall` +
   `addToolResult`, ou un état `input-available` à gérer manuellement. À trancher sur le
   premier jet de P0 — l'architecture ne change pas, seule la plomberie du hook.
2. **`toolApproval` vs `needsApproval`** : `needsApproval` est déprécié en faveur de
   `toolApproval` sur `streamText`. Non bloquant ici : nous gérons l'approbation nous-mêmes
   (§4). À revoir si un jour les outils passent côté serveur.
3. **Streaming depuis Deno** : `createUIMessageStreamResponse` doit fonctionner sur le
   runtime Edge de Supabase ; à confirmer en P0 avec un vrai appel avant de bâtir dessus.
4. **Seuil monétaire de D-AG9** : 50 000 XOF est une hypothèse. À fixer avec vous.
5. **Choix du modèle** : non tranché ici. Il doit supporter le *tool calling* en streaming ;
   le coût par tour dépend de ce choix.

---

## 14. Résumé exécutable

- **Aucune friction technique** : `ai@7` accepte votre Zod, votre React et votre Node actuels.
- **Un seul point de vérité par outil** : schéma Zod → validation, types, doc du modèle et
  rendu de la carte de confirmation.
- **La sécurité repose sur l'absence**, pas sur le prompt : créer/inviter/assigner n'existent
  pas comme outils.
- **L'exécution reste côté client**, dans vos services déjà testés → RLS, `has_permission`
  et audit gratuits.
- **Trois modes** (`lecture`, `assiste`, `autonome`), avec quatre catégories protégées en
  permanence.
- **Rendu par registre fermé** : professionnel, shadcn, sans JSX généré.
- **Démarrer en lecture seule**, livrer l'écriture après validation.
