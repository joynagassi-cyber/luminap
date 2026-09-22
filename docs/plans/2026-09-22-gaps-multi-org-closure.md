# Plan d'implémentation — Rendre Lumina « une vraie organisation » (gap-closure B.1–B.8)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Objectif :** clôturer les 21 gaps majeurs confirmés par l'audit de complétude (2026-09-21) pour que l'application soit réellement utilisable en multi-organisation : brancher `canAccess` dans l'UI, activer le flux d'invitation scopé, réconcilier les users avec l'organisation invitée, réparer le workflow transactionnel et les garde-fous d'édition.

**Architecture :**
- Le socle (Vagues 1-3 : tables, triggers, RLS, helpers) est **complet et fonctionnel** — on ne le touche pas.
- Ce plan comble uniquement les couches **UI → capability → dataLayer** qui sont inactives.
- Chaque tâche est autonome, TDD, avec un commit granulaire et vérifiable.

**Stack technique :** React 19 + Vite, Supabase (edge functions + RLS), PowerSync (offline sync), Vitest (unit), TypeScript 5.9.

---

## Inventaire des gaps (issue tracker interne)

| ID | Description | Gravité | Impact utilisateur |
|----|-------------|---------|-------------------|
| B.1 | Brancher `canAccess` dans l'UI (UI → capability) | major | Le gate réel reste le role+grant admin legacy — le socle Vague 2/3 est inerte |
| B.2 | Brancher `listOrgs` avec `org_memberships` | major | Un user multi-org sans profil legacy ne voit aucune org |
| B.3 | Activer l'émission d'invitations scopées (UI → payload) | major | Les grants/tags/scope n'existent pas encore ; le flux Vague 3 est inactif |
| B.4 | Rendre le claim manuel possible hors-ligne | major | Le claim par code échoue si l'invitation n'est pas synchronisée localement |
| B.5 | Réconcilier `signup` + claim multi-org | major | L'auth user nouvellement créé reste sur org='org-1' + role='TREASURER' |
| B.6 | Corriger `transactionGuard` REJECTED (workflow) | major | PENDING→REJECTED échoue avec TRANSACTION_APPROVED_IMMUTABLE |
| B.7 | Émettre des notifications app locales sur approve/reject/reverse | major | Les stores in-app (createNotification/markRead) sont en mémoire uniquement |
| B.8 | Rendre `OrgUnits` accessible + ajouter des garde-fous locaux sur l'édition | major | L'édition sans vérification du grant échoue en production (RLS serveur seul) |

---

## Tâche B.1 — Brancher `canAccess` dans l'UI

**Fichiers :**
- Modifier : `src/pages/CentralAdmin.tsx:360` (hook `useCanAccessCentral`)
- Créer : `src/hooks/useCanAccessMulti.ts` (nouveau hook qui wrappe `federation.canAccess`)
- Modifier : `src/pages/Reports.tsx:94-95`, `src/pages/Groups.tsx:62,113`, `src/pages/TransactionDetail.tsx:125,144`
- Tester : `src/hooks/__tests__/useCanAccessMulti.test.tsx` (nouveau)

**Contrat du nouveau hook :**
```ts
// src/hooks/useCanAccessMulti.ts
export function useCanAccessMulti(
  userId: string,
  orgId: string,
  resource: string, // "report" | "transaction" | "member" | "group" | ...
  action: string,   // "read" | "approve" | "reject" | "delete" | ...
  scope?: AccessScope
): { allowed: boolean; loading: boolean }
```

- Retourne `true` si `federation.canAccess(userId, orgId, resource, action, scope)` est `true` **OU** si le legacy `security.hasPermission(role, resource:action)` est `true` (fallback pendant la transition multi-org).
- Met en cache par `(userId, orgId, resource, action)` dans un Map à module-level pour éviter le double-appel.

**Étape 1 : Écrire le test de basculement.**
```ts
// src/hooks/__tests__/useCanAccessMulti.test.tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCanAccessMulti } from "@/hooks/useCanAccessMulti";

vi.mock("@/capabilities/federation", () => ({
  federation: {
    canAccess: vi.fn(async (_u: string, _o: string, _r: string, _a: string) => true),
  },
}));

describe("useCanAccessMulti", () => {
  it("retourne allowed=true si canAccess renvoie true", async () => {
    const { result } = renderHook(() => useCanAccessMulti("u1", "org-1", "report", "read"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });
});
```

**Étape 2 : Exécuter le test pour qu'il échoue.**
Exécuter : `npx vitest run src/hooks/__tests__/useCanAccessMulti.test.tsx -t "retourne allowed=true"`
Attente : échec — le hook n'existe pas encore.

**Étape 3 : Implémenter le hook minimal.**
```ts
// src/hooks/useCanAccessMulti.ts
import { useState, useEffect } from "react";
import { federation } from "@/capabilities/federation";
import type { AccessScope } from "@/types/federation";

const cache = new Map<string, Promise<boolean>>();

export function useCanAccessMulti(
  userId: string,
  orgId: string,
  resource: string,
  action: string,
  scope?: AccessScope
): { allowed: boolean; loading: boolean } {
  const [state, setState] = useState({ allowed: false, loading: true });
  const key = `${userId}|${orgId}|${resource}|${action}|${scope?.resource ?? ""}|${scope?.id ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    cache.get(key) ?? federation.canAccess(userId, orgId, resource, action, scope).then((r) => {
      if (cancelled) return;
      setState({ allowed: r, loading: false });
      return r;
    }).then((r) => {
      cache.set(key, Promise.resolve(r));
    });
    return () => { cancelled = true; };
  }, [key, userId, orgId, resource, action, scope]);

  return state;
}
```

**Étape 4 : Étoffer le test pour le chemin « fallback legacy » (cas ou canAccess échoue).**
```ts
it("retourne allowed=true via fallback hasPermission si canAccess est false mais le rôle a la permission", async () => {
  vi.mocked(federation.canAccess).mockResolvedValueOnce(false);
  // Le store local porte un rôle PASTEUR_PRINCIPAL qui a 'report:read' dans la matrice canonique
  // … (tester selon l'implémentation finale du fallback)
});
```

**Étape 5 : Brancher `useCanAccessMulti` dans `CentralAdmin.tsx`**
- Remplacer (ou compléter) le `useCanAccessCentral` (ligne 360) par `useCanAccessMulti(user.id, currentOrgId, resource, action)` pour les actions dangereuses (`approve`, `delete`, `revoke`).
- Mettre à jour les imports : `import { useCanAccessMulti } from "@/hooks/useCanAccessMulti";`

**Étape 6 : Brancher dans `Reports.tsx:94-95`, `Groups.tsx:62`, `TransactionDetail.tsx:125`.**
- Remplacer les checks `security.hasPermission(role, "report:read")` par `useCanAccessMulti(user.id, orgId, "report", "read").allowed` (ou le OR avec le legacy pour compat).

**Étape 7 : Exécuter les tests.**
Exécuter : `npx vitest run src/hooks/__tests__/useCanAccessMulti.test.tsx`
Attente : tous les tests passent.

**Étape 8 : Commit.**
```bash
git add src/hooks/useCanAccessMulti.ts src/hooks/__tests__/useCanAccessMulti.test.tsx src/pages/CentralAdmin.tsx src/pages/Reports.tsx src/pages/Groups.tsx src/pages/TransactionDetail.tsx
git commit -m "feat: brancher canAccess multi-org dans l'UI (B.1)"
```

---

## Tâche B.2 — Brancher `listOrgs` avec `org_memberships`

**Fichiers :**
- Modifier : `src/capabilities/federation/index.ts:132-159` (méthode `listOrgs`)
- Tester : `src/capabilities/__tests__/federation-canAccess.test.ts` (ajouter le cas « user multi-org sans profil legacy »)

**Contrat :**
- `listOrgs(actorId)` doit retourner l'UNION des 3 sources :
  1. `profiles.org_id` (legacy 1:1),
  2. `org_memberships.org_id` (multi-org, statuts ACTIVE|PENDING),
  3. `org_admins.org_id` (admin central avec grant actif).
- Le SQL actuel (lignes 132-159) ne fait que `EXISTS (SELECT 1 FROM org_admins … OR EXISTS (SELECT 1 FROM profiles …)` — le `org_memberships` est absent.

**Étape 1 : Écrire le test (cas utilisateur multi-org sans profil legacy).**
```ts
it("un user avec 2 memberships sans profil legacy voit les 2 orgs", async () => {
  // seed : user u2 a org_memberships (u2, org-A) et (u2, org-B) mais pas de profil
  const orgs = await federation.listOrgs("u2");
  expect(orgs.map((o) => o.id)).toContain("org-A");
  expect(orgs.map((o) => o.id)).toContain("org-B");
});
```

**Étape 2 : Exécuter le test pour qu'il échoue.**
Exécuter : `npx vitest run src/capabilities/__tests__/federation-canAccess.test.ts -t "un user avec 2 memberships"`
Attente : échec — `listOrgs` ne lit pas `org_memberships`.

**Étape 3 : Modifier `listOrgs` pour ajouter la 2ᵉ source.**
```ts
async listOrgs(actorId: string, filter?: { type?: string }): Promise<FederationOrg[]> {
  const db = getPowerSyncDatabase();
  const sql = `
    SELECT DISTINCT o.id, o.name, o.type, o.status, o.parent_org_id, o.created_at, o.updated_at
    FROM organizations o
    WHERE EXISTS (SELECT 1 FROM org_admins WHERE org_admins.org_id = o.id
                  AND org_admins.status = 'ACTIVE' AND org_admins.admin_profile_id = ?)
       OR EXISTS (SELECT 1 FROM profiles WHERE profiles.org_id = o.id AND profiles.id = ?)
       OR EXISTS (SELECT 1 FROM org_memberships WHERE org_memberships.org_id = o.id
                  AND org_memberships.user_id = ?
                  AND org_memberships.status IN ('ACTIVE','PENDING'))
    ORDER BY o.created_at DESC
  `;
  const params: any[] = [actorId, actorId, actorId];
  if (filter?.type) { /* ajouter AND o.type = ? + push param */ }
  const res = await db.execute(sql, params);
  return (res?.array ?? []).map((r: any) => ({
    id: String(r.id), name: String(r.name), type: String(r.type),
    status: String(r.status),
    parentOrgId: r.parent_org_id ? String(r.parent_org_id) : null,
    createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  }));
}
```

**Étape 4 : Vérifier que `dataLayer.canAccessOrganization` (ligne 2059) fait de même (si c'est le cas, ajouter le même terme).**
- Lire `src/lib/dataLayer.ts:2059-2077`.
- Si la fonction utilise `profiles + org_admins` seulement, ajouter l'union `org_memberships`.

**Étape 5 : Exécuter les tests.**
Exécuter : `npx vitest run src/capabilities/__tests__/federation-canAccess.test.ts`
Attente : le nouveau test passe + les 5 tests existants continuent de passer.

**Étape 6 : Commit.**
```bash
git add src/capabilities/federation/index.ts src/capabilities/__tests__/federation-canAccess.test.ts
git commit -m "feat: listOrgs lit org_memberships pour le multi-org (B.2)"
```

---

## Tâche B.3 — Activer l'émission d'invitations scopées (UI → payload)

**Fichiers :**
- Modifier : `src/capabilities/invitation/index.ts:71-80` (interface `CreateInvitationInput`)
- Modifier : `src/capabilities/invitation/index.ts:164-200` (méthode `createInvitation`)
- Modifier : `src/lib/dataLayer.ts:1784-1836` (`createInvitationPS`)
- Modifier : `src/pages/InvitationEmit.tsx:94-103` (appel de `createInvitation`)
- Créer : `src/pages/InvitationEmit.tsx` — étendre le formulaire avec un pickers de `grants` et `tags`
- Tester : `src/capabilities/__tests__/invitation-scope.test.ts` (ajouter un test « les 4 colonnes scopées sont écrites »)

**Contrat :**
```ts
// extension de CreateInvitationInput
export interface CreateInvitationInput {
  orgId: string;
  targetRole: string;
  targetScopeType: "ORG" | "GROUP" | "EVENT" | "REPORT";
  targetGroupId?: string;
  targetMemberId?: string;
  issuedBy: string;
  expiresAt?: string;
  maxUses?: number;
  // Vague 3 — nouveaux champs (libres, invariant 8/9)
  targetScopeResource?: string; // "group" | "event" | "report" | …
  targetScopeId?: string;
  grantsPayload?: Grant[];      // agnostique
  tagsPayload?: string[];       // tag_ids
}
```

- La méthode `createInvitation` appelle `createInvitationPS` avec les nouveaux champs.
- `createInvitationPS` écrit les 4 colonnes (déjà présentes dans le schéma SQL via la migration 20260921000006).
- L'UI `InvitationEmit.tsx` : le sélecteur de groupe cible était vide (`/* Groups would be loaded here */`, ligne ~236) ; le remplacer par un hook `useGroups()` filtré sur l'organisation cible.

**Étape 1 : Écrire le test qui vérifie les 4 colonnes.**
```ts
it("createInvitationPS écrit les 4 colonnes scopées", async () => {
  const sql: string[] = [];
  const params: any[] = [];
  vi.spyOn(dataLayer, "executeWrite").mockImplementation(async (s: string, p: any[]) => {
    sql.push(s); params.push(p); return 1;
  });

  await createInvitationPS(
    {
      org_id: "org-1", code: "LUM-1", target_role: "COMPTABLE",
      target_scope_type: "GROUP", target_group_id: "g-1",
      target_member_id: null, issued_by: "u-admin", max_uses: 1,
      target_scope_resource: "group",
      target_scope_id: "g-1",
      grants_payload: JSON.stringify([{ resource: "ai", action: "approve",
                                        scope: { resource: "org", id: "org-1" } }]),
      tags_payload: JSON.stringify(["tag-1"]),
    } as any,
    "2027-01-01T00:00:00.000Z",
  );

  expect(sql[0]).toContain("grants_payload");
  expect(sql[0]).toContain("tags_payload");
  expect(params[0]).toContain(JSON.stringify([{ resource: "ai", action: "approve",
                                                scope: { resource: "org", id: "org-1" } }]));
});
```

**Étape 2 : Exécuter le test pour qu'il échoue.**
Exécuter : `npx vitest run src/capabilities/__tests__/invitation-scope.test.ts -t "4 colonnes scopées"`
Attente : échec — `createInvitationPS` ne prend pas encore les 4 nouveaux champs.

**Étape 3 : Étendre `CreateInvitationInput` + `createInvitation` + `createInvitationPS`.**
- Ajouter les 4 champs dans l'interface (lignes 71-80).
- Passer les 4 champs dans `createInvitationPS` via `inv` (déjà étendu dans le PSInvitation).
- Ajouter `grants_payload`/`tags_payload`/`target_scope_resource`/`target_scope_id` dans le SQL de l'INSERT (déjà fait dans la Tâche 1 de la Vague 3 — vérifier que c'est là, sinon corriger).

**Étape 4 : Modifier l'UI `InvitationEmit.tsx` pour exposer les 4 champs.**
- `targetScopeResource` : `<select>` avec `ORG/GROUP/EVENT/REPORT/…` (libre, invariant 8).
- `grantsPayload` : un textarea JSON (minimal) ou un form builder (à décider).
- `tagsPayload` : un multi-select des `Tag` via `listUserTagsPS(user.id, orgId)` ou un nouveau `useTags()`.
- Le sélecteur de groupe cible : brancher `useGroups()` + filtrer sur `org_id`.

**Étape 5 : Exécuter les tests.**
Exécuter : `npx vitest run src/capabilities/__tests__/invitation-scope.test.ts`
Attente : tous les tests passent (4 existants + 1 nouveau).

**Étape 6 : Commit.**
```bash
git add src/capabilities/invitation/index.ts src/lib/dataLayer.ts src/pages/InvitationEmit.tsx src/capabilities/__tests__/invitation-scope.test.ts
git commit -m "feat: émissions d'invitations scopées (grants+tags+scope) actives (B.3)"
```

---

## Tâche B.4 — Rendre le claim manuel possible hors-ligne

**Fichiers :**
- Modifier : `src/pages/InvitationClaim.tsx:64-102` (`handleCodeSubmit`)
- Modifier : `src/capabilities/invitation/index.ts:339-346` (`getInvitationByCode`)
- Tester : `src/capabilities/__tests__/invitation-scope.test.ts` (ajouter un test de claim hors-ligne)

**Problème :**
- `handleCodeSubmit` fait `getInvitationByCode(code)` → `SELECT` PowerSync local.
- Si l'invitation n'est pas encore synchronisée (cas hors-ligne standard, ou l'émetteur est sur une autre app), la `SELECT` retourne `null` → le claim échoue.
- **Solution** : le `ClaimPayload` (QR ou code) porte déjà `invitationId` et `code` ; si la `SELECT` locale échoue, on peut créer **localement** un `invitation_claims` PENDING_SYNC qui sera réglé par le trigger serveur dès que l'invitation arrive (design §5 du module).

**Étape 1 : Écrire le test (claim hors-ligne).**
```ts
it("claimInvitationPS crée une claim PENDING_SYNC même si l'invitation locale n'existe pas", async () => {
  const sql: string[] = [];
  vi.spyOn(dataLayer, "executeWrite").mockImplementation(async (s: string) => { sql.push(s); return 1; });

  const claimId = await claimInvitationPS(
    "inv-unknown", "device-1", "u-new", "PENDING_SYNC", null,
  );

  expect(claimId).toBeDefined();
  expect(sql[0]).toContain("INSERT INTO invitation_claims");
  expect(sql[0]).toContain("PENDING_SYNC");
});
```

**Étape 2 : Exécuter le test pour qu'il échoue.**
Exécuter : `npx vitest run src/capabilities/__tests__/invitation-scope.test.ts -t "claim PENDING_SYNC même si"`
Attente : échec (ou le test passe déjà si `claimInvitationPS` ne fait qu'INSERT — à vérifier ; dans ce cas la tâche B.4 est déjà close côté client, et il reste à brancher l'UI).

**Étape 3 : Modifier `handleCodeSubmit` pour tolérer l'invitation inconnue.**
- Si `getInvitationByCode` retourne `null` : ne pas échouer ; appeler `claimInvitationPS(invitationId, deviceId, userId, "PENDING_SYNC", null)` qui crée la claim localement ; le trigger serveur la résoudra dès que l'invitation arrivera.
- Message UX : « claim enregistrée, sera confirmée au prochain sync ».

**Étape 4 : Exécuter les tests.**
Exécuter : `npx vitest run src/capabilities/__tests__/invitation-scope.test.ts`
Attente : tous les tests passent.

**Étape 5 : Commit.**
```bash
git add src/pages/InvitationClaim.tsx src/capabilities/invitation/index.ts src/capabilities/__tests__/invitation-scope.test.ts
git commit -m "feat: claim d'invitation possible hors-ligne (PENDING_SYNC) (B.4)"
```

---

## Tâche B.5 — Réconcilier `signup` + claim multi-org

**Fichiers :**
- Modifier : `supabase/functions/signup/index.ts:48-58, 108-119` (paramétrage de `role` et `org`)
- Modifier : `supabase/migrations/20260921000006_extend_settle_trigger.sql:128-132` (ajout d'un UPDATE du profil legacy)
- Tester : `src/capabilities/__tests__/invitation-scope.test.ts` (test d'end-to-end mocké)

**Problème :**
- La edge-fn `signup` hardcode `role: 'TREASURER', org_id: 'org-1'` : le nouvel auth user n'est PAS rattaché à l'org/role de l'invitation claimée.
- Le trigger `settle_invitation_claim` crée les `org_memberships`/`grants`/`tag_assignments` mais **n'écrit pas** `profiles.role`/`profiles.org_id` → le profil legacy reste désynchronisé.

**Étape 1 : Modifier `signup` pour accepter les paramètres `role` et `org` (avec fallback).
```ts
// supabase/functions/signup/index.ts
const targetOrg = req.headers.get("x-lumina-org") ?? "org-1";
const targetRole = req.headers.get("x-lumina-role") ?? "TREASURER";
// …
auth.users.signup({
  email, password,
  emailConfirm: false,
  data: {
    role: targetRole,
    org_id: targetOrg,
    // …
  },
});
```

**Étape 2 : Étendre le trigger pour écrire le profil legacy (si l'invitation a un target_role).**
```sql
-- à ajouter dans settle_invitation_claim, dans la branche IF c.resulting_user_id IS NOT NULL THEN
UPDATE public.profiles SET role = inv.target_role, org_id = inv.org_id
 WHERE id = c.resulting_user_id;
```

**Étape 3 : Exécuter le test (mocké).**
```ts
it("le trigger réconcilie le profil legacy avec l'invitation (role+org)", async () => {
  // mock du trigger + assert que profiles.role a été modifié
});
```

**Étape 4 : Commit.**
```bash
git add supabase/functions/signup/index.ts supabase/migrations/20260921000006_extend_settle_trigger.sql
git commit -m "fix: signup + trigger réconcilient le profil legacy avec l'invitation (B.5)"
```

---

## Tâche B.6 — Corriger `transactionGuard` pour REJECTED

**Fichiers :**
- Modifier : `src/capabilities/workflow/index.ts:88-95` (fonction `transactionGuard`)
- Modifier : `src/lib/dataLayer.ts:1033-1047` (`updateTransactionPS`)
- Tester : `src/capabilities/__tests__/e2e-transaction.test.ts` (ajouter le cas PENDING→REJECTED)

**Problème :**
- `transactionGuard` bloque `APPROVED → autre` (correct) mais **laisse passer `PENDING → REJECTED`** (line 94 : `if (currentStatus === "APPROVED" && targetStatus !== "APPROVED")`) — or l'UI `TransactionDetail.tsx:137` envoie `{status:'REJECTED'}` via `updateTransactionPS` dont le guard n'accepte QUE `updates.status === "APPROVED"` (ligne 1045). Résultat : PENDING→REJECTED échoue avec `TRANSACTION_APPROVED_IMMUTABLE` **faux positif**.

**Étape 1 : Écrire le test du cas réel (PENDING → REJECTED).**
```ts
it("le reject d'une transaction PENDING passe par updateTransactionPS", async () => {
  const tx = await addTransactionPS({ status: "PENDING", ... });
  await updateTransactionPS(tx.id, { status: "REJECTED" });
  const updated = await getTransactionPS(tx.id);
  expect(updated.status).toBe("REJECTED");
});
```

**Étape 2 : Exécuter le test pour qu'il échoue.**
Exécuter : `npx vitest run src/capabilities/__tests__/e2e-transaction.test.ts -t "le reject d'une transaction PENDING"`
Attente : échec — `updateTransactionPS` lève `TRANSACTION_APPROVED_IMMUTABLE`.

**Étape 3 : Corriger `updateTransactionPS` (dataLayer.ts:1045).**
```ts
// Ligne 1045 (actuel) :
if (tx?.status === "APPROVED" && updates.status !== "APPROVED") {
  throw new Error("TRANSACTION_APPROVED_IMMUTABLE");
}
// Corrigé : uniquement REJECTED est interdit, PENDING est le seul état d'où l'on peut rejeter
if (tx?.status === "APPROVED" && updates.status === "REJECTED") {
  throw new Error("TRANSACTION_APPROVED_IMMUTABLE");
}
// Autoriser PENDING → REJECTED (le reject)
if (tx?.status === "PENDING" && updates.status === "REJECTED") {
  // ok, pas d'exception
}
```

**Étape 4 : Aligner `transactionGuard` (workflow/index.ts:94) avec la sémantique.**
```ts
export const transactionGuard: WorkflowGuard = (currentStatus, targetStatus) => {
  // APPROVED est immuable (ni REJECT ni autre)
  if (currentStatus === "APPROVED" && targetStatus === "REJECTED") {
    return { allowed: false, reason: "TRANSACTION_APPROVED_IMMUTABLE" };
  }
  // PENDING → REJECTED est le chemin du reject
  if (currentStatus === "PENDING" && targetStatus === "REJECTED") {
    return { allowed: true };
  }
  if (currentStatus === targetStatus) return { allowed: true };
  return { allowed: true };
};
```

**Étape 5 : Exécuter les tests.**
Exécuter : `npx vitest run src/capabilities/__tests__/e2e-transaction.test.ts src/capabilities/__tests__/workflow.test.ts`
Attente : tous les tests passent (le nouveau + les existants).

**Étape 6 : Commit.**
```bash
git add src/capabilities/workflow/index.ts src/lib/dataLayer.ts src/capabilities/__tests__/e2e-transaction.test.ts
git commit -m "fix: transactionGuard PENDING→REJECTED aligné (B.6)"
```

---

## Tâche B.7 — Émettre des notifications app locales sur approve/reject/reverse

**Fichiers :**
- Modifier : `src/pages/TransactionDetail.tsx:124-160` (`handleApprove`/`handleReject`/`handleReverse`)
- Modifier : `src/store/useLocalStore.ts:371-382` (méthodes `createNotification`/`markNotificationRead`)
- Tester : `src/capabilities/__tests__/notification.test.ts` (ajouter un test « approve → notification créée »)

**Contrat :**
- Chaque mutation dangereuse (`approve`, `reject`, `reverse`) doit :
  1. Écrire la mutation (PowerSync) — déjà fait,
  2. Émettre une notification in-app locale (`store.createNotification`) avec le type d'action (`APPROVED`, `REJECTED`, `REVERSED`), le titre, l'org, et l'entité concernée.
- Le capability `notification.sendNotification` (ligne 94-139, `notification/index.ts`) est orphelin de production : il doit être appelé.

**Étape 1 : Écrire le test.**
```ts
it("approveTransactionPS crée une notification locale", async () => {
  const spy = vi.spyOn(notification, "sendNotification").mockResolvedValue("not-1");
  await approveTransactionPS("tx-1", "u-admin");
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({
    type: "APPROVED", orgId: expect.any(String), entityId: "tx-1",
  }));
});
```

**Étape 2 : Étoffer `notification.sendNotification` pour accepter le titre + l'entité.**
- Ajouter les paramètres optionnels `entityType` + `entityId` + `title` à la signature.

**Étape 3 : Appeler `notification.sendNotification` dans `TransactionDetail.tsx` sur chaque mutation.**
```ts
const { handleApprove, handleReject, handleReverse } = useTransactionMutations();
// …
async function handleApprove() {
  await approveTransactionPS(tx.id, user.id);
  await notification.sendNotification({
    type: "APPROVED",
    orgId: tx.org_id,
    entityType: "transaction",
    entityId: tx.id,
    title: `Transaction ${tx.id} approuvée`,
    actor: user,
  });
}
```

**Étape 4 : Exécuter les tests.**
Exécuter : `npx vitest run src/capabilities/__tests__/notification.test.ts`
Attente : tous les tests passent.

**Étape 5 : Commit.**
```bash
git add src/capabilities/notification/index.ts src/pages/TransactionDetail.tsx src/capabilities/__tests__/notification.test.ts
git commit -m "feat: émettre des notifications locales sur approve/reject/reverse (B.7)"
```

---

## Tâche B.8 — Rendre `OrgUnits` accessible + garde-fous locaux sur l'édition

**Fichiers :**
- Modifier : `src/ionic/routes/admin.tsx` (ajouter la route `/admin/org-units`)
- Modifier : `src/capabilities/organization/central.ts:74` (vérifier le grant avant de muter)
- Tester : `src/capabilities/__tests__/organization-central.test.ts`

**Étape 1 : Ajouter la route `OrgUnits`.**
```tsx
// src/ionic/routes/admin.tsx
import { OrgUnits } from "@/pages/OrgUnits";
// dans adminRoutes :
<Route key="/admin/org-units" path="/admin/org-units" element={<LazyRoute component={OrgUnits} />} />,
```

**Étape 2 : Vérifier le grant avant les mutations (suspend/archive/reactivate/grant).**
```ts
// src/capabilities/organization/central.ts
async suspendOrganization(orgId: string, actorId: string): Promise<void> {
  const allowed = await canAccess(actorId, orgId, "org", "suspend");
  if (!allowed) throw new Error("GRANT_MISSING");
  await setOrganizationStatusPS(orgId, "SUSPENDED", actorId);
}
// idem pour reactivate/archive/grant
```

**Étape 3 : Écrire le test.**
```ts
it("suspendOrganization lève GRANT_MISSING si l'acteur n'a pas le grant", async () => {
  await expect(central.suspendOrganization("org-1", "u-no-grant")).rejects.toThrow("GRANT_MISSING");
});
```

**Étape 4 : Commit.**
```bash
git add src/ionic/routes/admin.tsx src/capabilities/organization/central.ts src/capabilities/__tests__/organization-central.test.ts
git commit -m "feat: route OrgUnits + garde-fous locaux sur mutations org (B.8)"
```

---

## Critères de réussite globaux

- [ ] 915 tests existants + les nouveaux tests (B.1-B.8) → 0 échec
- [ ] `npx tsc --noEmit` → 0 erreur
- [ ] `no-cross-imports` → 34/34 (le nouveau hook `useCanAccessMulti` ne doit PAS être importé depuis `src/capabilities/*`)
- [ ] Le `git diff` des migrations (20260921000006 + 20260921000007) est propre (pas de régression)
- [ ] **À faire APRÈS** : le **redeploy PowerSync** du `sync-config.yaml` (4 nouveaux streams + double-scope) pour que le socle soit réellement en service — sinon les 4 streams ne sont pas déployés

## Ordre d'exécution recommandé

```
B.6  →  transactionGuard PENDING→REJECTED (bug utilisateur visible, le plus simple)
B.5  →  signup + trigger réconciliation (le plus sensible : auth)
B.1  →  branchement canAccess UI (le socle devient vivant)
B.2  →  listOrgs multi-org (complément de B.1)
B.3  →  invitations scopées UI (le socle Vague 3 devient actif)
B.4  →  claim hors-ligne (dépend de B.3 pour les payloads)
B.7  →  notifications locales (polish)
B.8  →  OrgUnits + garde-fous (polish)
```

## À noter (non inclus dans ce plan)

- **`bridge-auth.ts`** (Vague 3.5 optionnel) : si tu veux que les users Supabase authentiques héritent des memberships déjà présentes sur un PENDING profile → edge-fn idempotente sur l'email canonique.
- **Double-scope des 21 autres streams** (Étape 2) : le commentaire dans `powersync/sync-config.yaml` le documente ; à trancher à part.
- **Drift AppSchema 27/23** : à trancher à part.
