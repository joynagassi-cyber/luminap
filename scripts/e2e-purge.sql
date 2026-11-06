-- =============================================================================
-- Lumina — purge des artefacts E2E (chantier R-A, 2026-11-04)
-- =============================================================================
-- Supprime les comptes et organisations créés par la suite Cypress quand elle
-- tourne contre la base de PRODUCTION (voir cypress.yml). Le nettoyage Cypress
-- (`cy.cleanupTestArtifacts`) est NON FATAL et n'efface ni les organisations
-- ni les `auth.users` : sans ce balayage, la pollution est illimitée (mesuré :
-- 262 orgs vides + 97 comptes `ss-e2e-*` au 2026-11-04).
--
-- NE TOUCHE PAS aux comptes/orgs de test PERSISTANTS et partagés :
--   lumina-org-e2e@lumina.dev / lumina-org-unconfigured@lumina.dev
-- ni aux organisations réelles (Église Espoir, org-central, …).
--
-- Atomicité : tout est dans un seul bloc DO. Si une étape échoue, rien n'est
-- appliqué. Le trigger « dernier administrateur » (`trg_org_admins_not_last`)
-- est désactivé le temps de la purge puis RÉACTIVÉ (les orgs E2E vides
-- perdraient sinon leur unique grant, ce qui est justement le but).
--
-- Idempotent : ré-exécutable sans erreur (DELETE de 0 ligne = no-op).
-- =============================================================================
do $purge$
declare
  v_msg text := '';
  n bigint;
begin
  execute 'alter table public.org_admins disable trigger trg_org_admins_not_last';

  -- Enfants directs des organisations E2E (org_id).
  execute $q$delete from public.audit_entries
    where org_id in (select id from public.organizations
                     where name like 'Self-Serve E2E%' or name like 'Annexe%')$q$;
  get diagnostics n=row_count; v_msg := v_msg||'audit_by_org='||n||'; ';

  execute $q$delete from public.org_admins
    where org_id in (select id from public.organizations
                     where name like 'Self-Serve E2E%' or name like 'Annexe%')$q$;
  get diagnostics n=row_count; v_msg := v_msg||'org_admins_by_org='||n||'; ';

  execute $q$delete from public.org_memberships
    where org_id in (select id from public.organizations
                     where name like 'Self-Serve E2E%' or name like 'Annexe%')$q$;
  get diagnostics n=row_count; v_msg := v_msg||'memberships_by_org='||n||'; ';

  execute $q$delete from public.profiles
    where org_id in (select id from public.organizations
                     where name like 'Self-Serve E2E%' or name like 'Annexe%')$q$;
  get diagnostics n=row_count; v_msg := v_msg||'profiles_by_org='||n||'; ';

  execute $q$delete from public.organizations
    where name like 'Self-Serve E2E%' or name like 'Annexe%'$q$;
  get diagnostics n=row_count; v_msg := v_msg||'orgs='||n||'; ';

  -- Références directes aux comptes éphémères `ss-e2e-*@lumina.dev`.
  execute $q$delete from public.transactions
    where created_by_id in (select id from auth.users where email like 'ss-e2e-%@lumina.dev')
       or approved_by_id in (select id from auth.users where email like 'ss-e2e-%@lumina.dev')$q$;
  get diagnostics n=row_count; v_msg := v_msg||'tx_by_user='||n||'; ';

  execute $q$delete from public.audit_entries
    where user_id in (select id from auth.users where email like 'ss-e2e-%@lumina.dev')$q$;
  get diagnostics n=row_count; v_msg := v_msg||'audit_by_user='||n||'; ';

  execute $q$delete from public.org_admins
    where admin_profile_id in (select id from auth.users where email like 'ss-e2e-%@lumina.dev')
       or granted_by in (select id from auth.users where email like 'ss-e2e-%@lumina.dev')$q$;
  get diagnostics n=row_count; v_msg := v_msg||'org_admins_by_user='||n||'; ';

  execute $q$delete from public.org_memberships
    where user_id in (select id from auth.users where email like 'ss-e2e-%@lumina.dev')$q$;
  get diagnostics n=row_count; v_msg := v_msg||'memberships_by_user='||n||'; ';

  execute $q$delete from public.tag_assignments
    where user_id in (select id from auth.users where email like 'ss-e2e-%@lumina.dev')$q$;
  get diagnostics n=row_count; v_msg := v_msg||'tag_assignments='||n||'; ';

  execute $q$delete from public.profiles
    where id in (select id from auth.users where email like 'ss-e2e-%@lumina.dev')$q$;
  get diagnostics n=row_count; v_msg := v_msg||'profiles_by_user='||n||'; ';

  execute $q$delete from auth.users where email like 'ss-e2e-%@lumina.dev'$q$;
  get diagnostics n=row_count; v_msg := v_msg||'users='||n||'; ';

  execute 'alter table public.org_admins enable trigger trg_org_admins_not_last';

  raise notice 'PURGE %', v_msg;
end
$purge$;

-- Résumé post-purge (retourné par l'API, une ligne).
select
  (select count(*) from public.organizations) as orgs,
  (select count(*) from auth.users) as users,
  (select count(*) from public.organizations
     where name like 'Self-Serve E2E%' or name like 'Annexe%') as e2e_orgs_left,
  (select count(*) from auth.users where email like 'ss-e2e-%@lumina.dev') as ss_users_left;
