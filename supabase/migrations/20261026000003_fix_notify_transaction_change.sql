-- R101 — `notify_transaction_change()` malformée : toute écriture PENDING/APPROVED
-- d'une transaction échoue (42601) → le flux finance est cassé au niveau base.
--
-- Constat (prouvé sur l'instance dev, transactions annulées) :
--   * `notify_transaction_change()` (créée par 0012, toujours active) insère
--     dans `notifications` en listant 6 colonnes
--     (org_id, action_type, title, message, source_transaction_id, created_at)
--     mais ne fournit que 5 valeurs : le `message` manque, et `NEW.id` /
--     `NEW.created_at` glissent dans `message` / `source_transaction_id`.
--   * Résultat : `ERROR 42601: INSERT has more target columns than expressions`
--     dès qu'un trigger `AFTER INSERT OR UPDATE OR DELETE` s'exécute sur
--     `transactions` pour un statut PENDING/APPROVED/REJECTED.
--   * Preuves : INSERT status='PENDING' → 42601 ; UPDATE DRAFT→APPROVED → 42601.
--     Un INSERT status='DRAFT' passe (la garde `IF NEW.status IN (...)` est
--     fausse), ce qui masquait le défaut : la table transactions est vide.
--   * Conséquence : aucune transaction ne peut être soumise ni approuvée, ni
--     via l'UI ni via l'API — la fonctionnalité finance est inopérante.
--
-- Correctif : réécrire la fonction en fournissant le `message` manquant, et
-- rendre le trigger compatible DELETE (l'ancien code utilisait NEW dans la
-- branche DELETE → NULL). Le `message` est construit par cas, aligné sur les
-- fonctions sœurs (0040/0041).
CREATE OR REPLACE FUNCTION public.notify_transaction_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_action  text;
  v_title   text;
  v_message text;
  v_org_id  text;
  v_tx_id   text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.org_id;
    v_tx_id  := OLD.id;
  ELSE
    v_org_id := NEW.org_id;
    v_tx_id  := NEW.id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_action := 'TRANSACTION_DELETED';
    v_title  := 'Transaction supprimée';
    v_message := 'Une transaction a été supprimée';
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'PENDING' THEN
    v_action := 'TRANSACTION_SUBMITTED';
    v_title  := 'Nouvelle transaction soumise';
    v_message := 'Une nouvelle transaction de ' || NEW.amount || ' FCFA attend votre approbation';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'APPROVED' THEN
    v_action := 'TRANSACTION_APPROVED';
    v_title  := 'Transaction approuvée';
    v_message := 'Votre transaction a été approuvée';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'REJECTED' THEN
    v_action := 'TRANSACTION_REJECTED';
    v_title  := 'Transaction rejetée';
    v_message := 'Votre transaction a été rejetée';
  ELSE
    v_action := 'TRANSACTION_UPDATED';
    v_title  := 'Transaction modifiée';
    v_message := 'Une transaction a été modifiée';
  END IF;

  INSERT INTO public.notifications (
    org_id, action_type, title, message, source_transaction_id, created_at
  ) VALUES (
    v_org_id, v_action, v_title, v_message, v_tx_id, now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
