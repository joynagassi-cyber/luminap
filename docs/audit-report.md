# Lumina Audit Report — snapshot auto-généré

Généré : 2026-09-12T14:14:06.231Z

## 1. Capacités (inventaire)

| Capacité | Exports publics | Tables | Hardcodés | Tests dédiés |
|---|---|---|---|---|
| `cotisation` | 11 | cotisations, events, group_memberships, members | 0 | `src\lib\__tests__\versement-cotisation.test.ts` |
| `federation` | 3 | org_admins, org_units, organizations, profiles | 0 | — |
| `invitation` | 14 | invitation_claims, invitations, profiles | 0 | `src\capabilities\__tests__\invitation-file-transport.test.ts` |
| `lifecycle` | 3 | audit | 0 | `src\capabilities\__tests__\lifecycle.test.ts` |
| `notification` | 3 |  | 0 | `src\capabilities\__tests__\notification.test.ts` |
| `organization` | 4 |  | 0 | `src\capabilities\__tests__\organization.test.ts` `src\capabilities\__tests__\organization-central.test.ts` |
| `policy` | 12 | Workflow, source | 0 | `src\capabilities\__tests__\policy.test.ts` |
| `relationship` | 4 |  | 0 | `src\capabilities\__tests__\relationship.test.ts` |
| `resource` | 6 | filters, query | 0 | `src\capabilities\__tests__\resource.test.ts` |
| `security` | 2 |  | 0 | `src\capabilities\__tests__\security.test.ts` |
| `workflow` | 7 |  | 0 | `src\capabilities\__tests__\workflow.test.ts` |

## 2. Pages (inventaire)

Pages déclarées : 44
Pages orphelines détectées (route sans navigation) : 17

  - `Archives`
  - `AuthPage`
  - `Balance`
  - `CustomFields`
  - `Federation`
  - `FormSubmissions`
  - `GroupCotisation`
  - `Groups`
  - `Help`
  - `InvitationEmit`
  - `Members`
  - `MembreDetail`
  - `ReportBuilder`
  - `Reports`
  - `Splash`
  - `Trace`
  - `Tutorial`

## 3. Violations de règles métier (montants hardcodés)

_Aucune violation détectée._

## 4. Signaux d'orchestration (fixes à corriger)

- **O1** archiveGroupWithState no-op placeholder — `src/capabilities/lifecycle/adapters.ts` — updater([], []) — état Zustand non mis à jour.
- **O2** policy non importé par aucune page ni cap — `src/capabilities/policy/index.ts` — le module de validation de montants n'est jamais appelé dans l'UI.
- **O3** workflow.transition ne persiste rien — `src/capabilities/workflow/index.ts` — retourne booléen, l'appelant doit faire l'UPDATE.
- **O4** notification.sendNotification sans backend — `src/capabilities/notification/index.ts` — log client-side uniquement.
- **O5** Deux sources de vérité sur organization — `src/capabilities/organization/index.ts + central.ts` — index in-mémoire (Map) vs central PS-backed.
- **O6** resource.list total incorrect — `src/capabilities/resource/index.ts` — conditions.slice(0,-1) retire le filtre org_id et décale params.
- **O7** Form submissions non affichées (data black hole) — `src/lib/dataLayer.ts` _(statut : corrigeable — FormSubmissions.tsx ajoutée (task 3 du plan))_ — listFormSubmissionsPS existe mais aucune page ne l'appelle.
- **O8** InvitationManage orpheline — `src/pages/InvitationManage.tsx` — route /invitation/manage déclarée, aucune entrée UI.
- **O9** Federation orpheline — `src/pages/Federation.tsx` — route /admin/federation déclarée, aucune entrée UI.
- **O10** ReportBuilder orpheline — `src/pages/ReportBuilder.tsx` — route /report-builder déclarée, Reports.tsx ne mène pas dedans.
- **O11** CulteDetail orpheline (en pratique) — `src/pages/CulteDetail.tsx` — route /culte/:id déclarée, aucune navigation qui y mène.
- **O12** TransactionEdit URL coquille — `src/pages/TransactionEdit.tsx` — navigue vers /transaction/edit/${id} alors que la route est /transaction/:id/edit → NotFound.