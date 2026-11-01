-- ============================================================================
-- 20261031000008 — `transaction_attachments` : pièces justificatives (reçus)
-- ----------------------------------------------------------------------------
-- POURQUOI
--   PR9 (contrat `docs/agent/PROPOSALS.md`) : attacher un justificatif
--   (image ou PDF) à une TRANSACTION, pour la conformité comptable.
--   Il existait déjà une preuve de dépense portée par `documents`
--   (`entity_type='EXPENSE_PROOF'`, `entity_id=<txId>`) — mais cette table
--   n'est reliée à aucune transaction par une clé étrangère, n'a aucun index
--   sur `entity_id`, et surtout n'est PAS synchronisée (aucun stream dans
--   `powersync/sync-config.yaml`). On ne peut donc pas s'appuyer dessus pour
--   lister les justificatifs d'une transaction côté client.
--
-- FORME
--   Une table DÉDIÉE, reliée par FK à `transactions(id)` (TEXT, comme la PK de
--   `transactions`). Le blob vit dans le bucket Storage privé `expense_proofs`
--   (déjà scopé par organisation — cf. migration 20261022000013) ; cette table
--   ne porte que la métadonnée synchronisable.
--   `ON DELETE CASCADE` : supprimer une transaction ne doit pas laisser de
--   lignes orphelines (le nettoyage des BLOBS est fait côté client, best-effort,
--   car Storage n'est pas transactionnel).
--
-- SÉCURITÉ
--   Lecture : tout MEMBRE de l'organisation.
--   Écriture (INSERT/DELETE) : `transaction:update` (via `has_permission`),
--   aligné sur la politique d'écriture R141 : le client REST direct ne peut
--   pas attacher/supprimer un justificatif sans la permission. Le chemin
--   d'écriture applicatif passe par PowerSync (rôle BYPASSRLS).
--
-- RÉVERSIBILITÉ : rollback/20261031000008_rollback.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transaction_attachments (
  id             text PRIMARY KEY,
  org_id         text NOT NULL,
  transaction_id text NOT NULL
                 REFERENCES public.transactions(id) ON DELETE CASCADE,
  path           text NOT NULL,
  mime           text,
  size           bigint,
  uploaded_by    uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Index : lecture par transaction (écran détail) + couverture de la FK
-- (`transaction_id` en tête, pour la vérification de contrainte — advisor
-- `unindexed_foreign_keys`).
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS transaction_attachments_org_tx_idx
  ON public.transaction_attachments (org_id, transaction_id);
CREATE INDEX IF NOT EXISTS transaction_attachments_transaction_id_idx
  ON public.transaction_attachments (transaction_id);

-- ----------------------------------------------------------------------------
-- RLS (pattern `event_tasks` : policy par commande, FORCE RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_attachments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transaction_attachments_select ON public.transaction_attachments;
CREATE POLICY transaction_attachments_select ON public.transaction_attachments
  FOR SELECT TO authenticated
  USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS transaction_attachments_insert ON public.transaction_attachments;
CREATE POLICY transaction_attachments_insert ON public.transaction_attachments
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'transaction', 'update'));

DROP POLICY IF EXISTS transaction_attachments_delete ON public.transaction_attachments;
CREATE POLICY transaction_attachments_delete ON public.transaction_attachments
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'transaction', 'update'));

-- ----------------------------------------------------------------------------
-- Grants (pattern P0 : Data API + powersync_role en lecture pour la réplication)
-- La publication `powersync` est `FOR ALL TABLES` : aucune commande
-- `ALTER PUBLICATION` n'est nécessaire (la nouvelle table est répliquée).
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_attachments
  TO anon, authenticated, service_role;
GRANT SELECT ON public.transaction_attachments TO powersync_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_attachments TO postgres;
