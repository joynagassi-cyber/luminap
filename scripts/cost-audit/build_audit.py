#!/usr/bin/env python3
"""Génère le simulateur XLSX et le rapport PDF de l'audit coûts Lumina.

Version « lancement 0–20 églises » :
- pas de Vercel, domaine, SMTP payant ou Sentry payant au lancement ;
- PowerSync Free puis Pro à 49 $ ; les 25 $ officiels sont une instance
  supplémentaire, pas un plan d'entrée ;
- données de test exclues du modèle, schéma restant à remesurer ;
- compression des fichiers traitée comme cible de 80 %, pas comme garantie.

Aucun appel réseau, aucune donnée secrète. Les valeurs par défaut sont des
hypothèses de travail explicites, pas des factures constatées.
"""
from __future__ import annotations

import math
from pathlib import Path

import xlsxwriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "audit-couts"
OUT.mkdir(parents=True, exist_ok=True)
FONTS = ROOT / ".venv" / "pitch-tools" / "fonts"

ORANGE = "#FF6B00"
DARK = "#121212"
GRAY = "#5B6470"
LIGHT = "#F5F6F8"
BLUE = "#1F5FBF"
GREEN = "#1E7A46"
RED = "#B3261E"

# ---------------------------------------------------------------------------
# Hypothèses centrales (modifiables dans le XLSX)
# ---------------------------------------------------------------------------
H = {
    "churches": 20,
    "users_per_church": 5,
    "devices_per_user": 1.2,
    "mobile_share": 1.0,
    "peak_fraction": 0.6,
    "files_per_church": 100,
    "file_mb": 1.0,
    "compression_reduction": 0.80,
    "downloads_per_file": 2.0,
    "members": 200,
    "services_per_month": 4,
    "transactions": 200,
    "events": 4,
    "notifications": 200,
    "audit_per_mutation": 2,
    "new_members": 5,
    "cotis_kb": 0.5,
    "tx_kb": 0.8,
    "event_kb": 2.0,
    "notif_kb": 0.5,
    "audit_kb": 1.0,
    "member_kb": 0.5,
    "other_kb": 50.0,
    "update_factor": 1.5,
    "sync_overhead": 1.2,
    "db_factor": 2.5,
    "ps_history": 1.5,
    "resync_year": 1.0,
    "baseline_db_mb": 20.0,
    "fx": 600.0,
    "contingency": 0.15,
    "domain_year": 0.0,
    "vercel_monthly": 0.0,
    "resend_monthly": 0.0,
    "sentry_team_monthly": 0.0,
    "backup_offsite": 0,
    "sentry_sessions_user": 20,
    "sentry_replay_rate": 0.0,
    "emails_user": 0.0,
    "supabase_egress_other_gb": 0.5,
    "backup_compress": 0.2,
    "backup_retention_days": 30,
    "backup_files": 1,
    "web_push_per_user": 0.0,
    "psp_pct": 0.0,
    "psp_fixed": 0.0,
}

T = {
    "supabase_pro": 25.0,
    "supabase_db_incl": 8.0,
    "supabase_db_over": 0.125,
    "supabase_storage_incl": 100.0,
    "supabase_storage_over": 0.0213,
    "supabase_egress_incl": 250.0,
    "supabase_egress_over": 0.09,
    "supabase_cached_incl": 250.0,
    "supabase_cached_over": 0.03,
    "supabase_mau_incl": 100000,
    "supabase_mau_over": 0.00325,
    "supabase_edge_incl": 2_000_000,
    "supabase_edge_over_m": 2.0,
    "powersync_pro": 49.0,
    "powersync_extra_instance": 25.0,
    "powersync_sync_incl": 30.0,
    "powersync_sync_over": 1.0,
    "powersync_hosted_incl": 10.0,
    "powersync_hosted_over": 1.0,
    "powersync_concurrent_incl": 1000,
    "powersync_concurrent_block": 30.0,
    "vercel_pro": 20.0,
    "render_pro": 25.0,
    "onesignal_growth": 19.0,
    "onesignal_mobile": 0.012,
    "onesignal_web": 0.004,
    "onesignal_free_mau": 1000,
    "sentry_team": 26.0,
    "resend_pro": 20.0,
    "resend_incl": 50000,
    "resend_over_k": 0.90,
    "r2_incl": 10.0,
    "r2_over": 0.015,
    "cypress_team": 67.0,
}


def effective_file_mb(h: dict) -> float:
    return h["file_mb"] * (1 - h["compression_reduction"])


def model(n: int, m: int = 12, h: dict | None = None, free: bool = False):
    h = h or H
    cotis = h["members"] * h["services_per_month"]
    audit = (cotis + h["transactions"]) * h["audit_per_mutation"]
    sync_mb = (
        cotis * h["cotis_kb"] * h["update_factor"]
        + h["transactions"] * h["tx_kb"] * h["update_factor"]
        + h["events"] * h["event_kb"]
        + h["notifications"] * h["notif_kb"]
        + h["new_members"] * h["member_kb"]
        + h["other_kb"]
    ) * h["sync_overhead"] / 1000
    db_mb = (
        cotis * h["cotis_kb"]
        + h["transactions"] * h["tx_kb"]
        + h["events"] * h["event_kb"]
        + h["notifications"] * h["notif_kb"]
        + audit * h["audit_kb"]
        + h["new_members"] * h["member_kb"]
        + h["other_kb"]
    ) * h["db_factor"] / 1000
    users = n * h["users_per_church"]
    devices = users * h["devices_per_user"]
    mobile = devices * h["mobile_share"]
    concurrent = devices * h["peak_fraction"]
    file_mb = effective_file_mb(h)
    files_new_gb = n * h["files_per_church"] * file_mb / 1000
    storage_gb = files_new_gb * m
    db_gb = (h["baseline_db_mb"] + n * db_mb * m) / 1000
    synced_gb = users * h["devices_per_user"] * sync_mb / 1000 * (1 + m / 12 * h["resync_year"])
    hosted_gb = n * sync_mb * m * h["users_per_church"] * h["ps_history"] / 1000
    file_egress = files_new_gb * h["downloads_per_file"]
    egress = file_egress + h["supabase_egress_other_gb"]
    emails = users * h["emails_user"]
    sessions = devices * h["sentry_sessions_user"]
    replays = sessions * h["sentry_replay_rate"]
    backup_gb = db_gb * h["backup_compress"] * h["backup_retention_days"] + storage_gb * h["backup_files"]

    supabase = 0.0 if free else (
        T["supabase_pro"]
        + max(0, db_gb - T["supabase_db_incl"]) * T["supabase_db_over"]
        + max(0, storage_gb - T["supabase_storage_incl"]) * T["supabase_storage_over"]
        + max(0, egress - T["supabase_egress_incl"]) * T["supabase_egress_over"]
        + max(0, users - T["supabase_mau_incl"]) * T["supabase_mau_over"]
    )
    powersync = 0.0 if free else (
        T["powersync_pro"]
        + max(0, synced_gb - T["powersync_sync_incl"]) * T["powersync_sync_over"]
        + max(0, hosted_gb - T["powersync_hosted_incl"]) * T["powersync_hosted_over"]
        + math.ceil(max(0, concurrent - T["powersync_concurrent_incl"]) / 1000) * T["powersync_concurrent_block"]
    )
    hosting = h["vercel_monthly"]
    onesignal = 0.0
    if mobile >= T["onesignal_free_mau"]:
        onesignal = T["onesignal_growth"] + mobile * T["onesignal_mobile"] + users * h["web_push_per_user"] * T["onesignal_web"]
    sentry = h["sentry_team_monthly"]
    resend = h["resend_monthly"]
    if resend > 0:
        resend += math.ceil(max(0, emails - T["resend_incl"]) / 1000) * T["resend_over_k"]
    r2 = max(0, backup_gb - T["r2_incl"]) * T["r2_over"] if h["backup_offsite"] else 0.0
    usd = supabase + powersync + hosting + onesignal + sentry + resend + r2
    xof = usd * h["fx"] * (1 + h["contingency"]) + h["domain_year"] / 12
    return locals()


def breach_month(per_month_gb: float, quota_gb: float, baseline_gb: float = 0.0) -> int | None:
    if per_month_gb <= 0:
        return None
    if baseline_gb >= quota_gb:
        return 1
    return math.floor((quota_gb - baseline_gb) / per_month_gb) + 1


def free_alerts(n: int, h: dict | None = None) -> dict:
    h = h or H
    r = model(n, 12, h)
    storage_m = breach_month(r["files_new_gb"], 1.0)
    db_m = breach_month(n * r["db_mb"] / 1000, 0.5, h["baseline_db_mb"] / 1000)
    hosted_m = breach_month(n * r["sync_mb"] * h["users_per_church"] * h["ps_history"] / 1000, 0.5)
    return {
        "storage_month": storage_m,
        "db_month": db_m,
        "ps_hosted_month": hosted_m,
        "ps_peak_over": r["concurrent"] > 50,
        "onesignal_over": r["mobile"] >= T["onesignal_free_mau"],
        "sentry_replay_over": r["replays"] > 50,
    }


# ---------------------------------------------------------------------------
# XLSX
# ---------------------------------------------------------------------------
def build_xlsx():
    path = OUT / "simulateur-couts-lumina.xlsx"
    wb = xlsxwriter.Workbook(path)
    wb.set_properties({
        "title": "Lumina — Simulateur de coûts cloud — lancement 0–20 églises",
        "subject": "Audit infrastructure lancement sobre",
        "author": "Lumina",
        "comments": "Hypothèses ajustables. Ne constitue pas une facture.",
    })
    fmt_title = wb.add_format({"bold": True, "font_size": 18, "font_color": DARK})
    fmt_sub = wb.add_format({"font_color": GRAY, "font_size": 10, "text_wrap": True, "valign": "top"})
    fmt_head = wb.add_format({"bold": True, "bg_color": DARK, "font_color": "white", "border": 1, "text_wrap": True, "valign": "vcenter"})
    fmt_label = wb.add_format({"text_wrap": True, "valign": "vcenter", "border": 1, "border_color": "#D9DDE3"})
    fmt_input = wb.add_format({"bg_color": "#E8F0FE", "font_color": BLUE, "border": 1, "border_color": "#D9DDE3", "num_format": "#,##0.00"})
    fmt_input_int = wb.add_format({"bg_color": "#E8F0FE", "font_color": BLUE, "border": 1, "border_color": "#D9DDE3", "num_format": "#,##0"})
    fmt_input_pct = wb.add_format({"bg_color": "#E8F0FE", "font_color": BLUE, "border": 1, "border_color": "#D9DDE3", "num_format": "0.0%"})
    fmt_num = wb.add_format({"border": 1, "border_color": "#D9DDE3", "num_format": "#,##0.00"})
    fmt_int = wb.add_format({"border": 1, "border_color": "#D9DDE3", "num_format": "#,##0"})
    fmt_xof = wb.add_format({"border": 1, "border_color": "#D9DDE3", "num_format": '#,##0 "F"'})
    fmt_usd = wb.add_format({"border": 1, "border_color": "#D9DDE3", "num_format": '$#,##0.00'})
    fmt_bold_xof = wb.add_format({"bold": True, "border": 1, "border_color": "#D9DDE3", "num_format": '#,##0 "F"', "bg_color": "#FFF1E6"})
    fmt_warn = wb.add_format({"font_color": RED, "text_wrap": True, "valign": "top"})
    fmt_ok = wb.add_format({"font_color": GREEN, "text_wrap": True, "valign": "top"})

    # --- Lisez-moi ---
    ws = wb.add_worksheet("Lisez-moi")
    ws.set_column("A:A", 3)
    ws.set_column("B:B", 115)
    ws.write("B2", "Lumina — Simulateur de coûts cloud — lancement 0–20 églises", fmt_title)
    notes = [
        "Objet : corriger l'audit pour un lancement sans Vercel, sans domaine, sans validation email payante et sans Sentry payant, jusqu'à 20 églises.",
        "PowerSync : le plan Cloud Pro officiel démarre à 49 $/mois. Les 25 $/mois correspondent à une instance PowerSync supplémentaire au-delà des 2 instances incluses, pas à un plan d'entrée.",
        "Scénario central : 20 églises, 5 utilisateurs actifs par église, 100 fichiers de 1 MB par église et par mois, avec cible de compression de 80 % non garantie.",
        "Les données de test CI/CD ne sont pas comptées comme données client. Une provision de schéma de 20 MB reste ajustable et doit être remplacée par une mesure après nettoyage.",
        "Sentry : replay à 0 % au lancement. Supprimer des événements ne rend pas le quota déjà consommé ; il faut filtrer/réduire à la source.",
        "Email : pas de validation à l'inscription au lancement. Les resets / invitations restent un sujet ; le SMTP Supabase par défaut est limité et non destiné à la production.",
        "Compression : 80 % de réduction transforme 10 MB en 2 MB, pas en quelques octets. Le gain dépend du fichier ; un PDF déjà compressé peut peu réduire.",
        "Les cellules bleues sont modifiables. Les autres cellules contiennent des formules recalculées à l'ouverture dans Excel / LibreOffice / Google Sheets.",
        "Taux USD→XOF de 600 F et provision de 15 % : hypothèses de budget, pas un taux en direct ni une facture.",
    ]
    r = 4
    for n in notes:
        ws.write(r, 1, "• " + n, fmt_sub)
        ws.set_row(r, 44)
        r += 1

    # --- Hypothèses ---
    ws = wb.add_worksheet("Hypothèses")
    ws.set_column("A:A", 48)
    ws.set_column("B:B", 16)
    ws.set_column("C:C", 78)
    ws.write("A1", "Hypothèses de lancement et de budget", fmt_title)
    ws.write("A2", "Bleu = entrée ajustable. Les valeurs par défaut sont des hypothèses, pas des mesures client.", fmt_sub)
    rows = [
        ("churches", "Églises (scénario central)", "#,##0", "Lancement visé : jusqu'à 20 églises."),
        ("users_per_church", "Utilisateurs actifs / église", "#,##0", "Personnes qui se connectent à l'app. Les membres non connectés ne comptent pas."),
        ("devices_per_user", "Appareils / utilisateur", "0.00", "Téléphone + tablette occasionnelle."),
        ("mobile_share", "Part des appareils mobiles", "0%", "OneSignal MAU mobile = subscriptions mobiles actives."),
        ("peak_fraction", "Fraction connectée au pic", "0%", "Pic dominical simultané côté PowerSync."),
        ("files_per_church", "Fichiers / église / mois", "#,##0", "Justificatifs, archives, rapports."),
        ("file_mb", "Taille moyenne fichier avant compression (MB)", "0.00", "Hypothèse utilisateur : 1 MB."),
        ("compression_reduction", "Réduction de taille fichier (cible)", "0%", "80 % = cible, pas garantie. 10 MB -> 2 MB si atteint. Ne pas compter comme mesure."),
        ("downloads_per_file", "Téléchargements / fichier / mois", "0.00", "Consultations / téléchargements générant de l'egress Supabase."),
        ("members", "Membres enregistrés / église", "#,##0", "Hypothèse de travail, indépendante des utilisateurs actifs."),
        ("services_per_month", "Cultes / mois", "#,##0", "Génère des cotisations : membres × cultes."),
        ("transactions", "Transactions / église / mois", "#,##0", "Entrées / sorties financières."),
        ("events", "Événements / église / mois", "#,##0", "Autres événements."),
        ("notifications", "Notifications / église / mois", "#,##0", "Lignes in-app + push."),
        ("audit_per_mutation", "Entrées d'audit / mutation", "#,##0", "Audit stocké dans Supabase, non synchronisé par PowerSync."),
        ("new_members", "Nouveaux membres / mois", "#,##0", "Croissance du référentiel membres."),
        ("cotis_kb", "Poids cotisation (KB)", "0.00", "Payload moyen synchronisé."),
        ("tx_kb", "Poids transaction (KB)", "0.00", "Payload moyen synchronisé."),
        ("event_kb", "Poids événement (KB)", "0.00", "Payload moyen synchronisé."),
        ("notif_kb", "Poids notification (KB)", "0.00", "Payload moyen synchronisé."),
        ("audit_kb", "Poids audit (KB)", "0.00", "Avant/après + métadonnées."),
        ("member_kb", "Poids membre (KB)", "0.00", "Payload moyen."),
        ("other_kb", "Autres données (KB / église / mois)", "0.00", "Groupes, comptes, champs, formulaires, etc."),
        ("update_factor", "Facteur de mise à jour sync", "0.00", "Une cotisation / transaction peut être modifiée plusieurs fois."),
        ("sync_overhead", "Overhead protocole sync", "0.00", "Enveloppe / métadonnées PowerSync."),
        ("db_factor", "Facteur index / WAL / bloat DB", "0.00", "Majoration du payload brut pour estimer le disque Postgres."),
        ("ps_history", "Facteur historique hébergé PowerSync", "0.00", "L'historique d'opérations peut dépasser la copie courante."),
        ("resync_year", "Resynchronisations complètes / appareil / an", "0.00", "Provision pour réinstallation / disconnectAndClear / déploiement de streams."),
        ("baseline_db_mb", "Provision schéma après nettoyage (MB)", "0.00", "Données de test exclues. 20 MB est une provision, pas une mesure ; remesurer après nettoyage."),
        ("fx", "Taux USD → XOF", "#,##0", "Hypothèse de budget, à actualiser."),
        ("contingency", "Provision change / taxes / aléas", "0%", "Appliquée au sous-total USD."),
        ("domain_year", "Nom de domaine (F / an)", "#,##0", "0 au lancement. À activer seulement après décision post-20 églises."),
        ("vercel_monthly", "Vercel / hébergement landing ($ / mois)", "0.00", "0 au lancement. 20 $ Pro seulement si landing Vercel plus tard."),
        ("resend_monthly", "SMTP / Resend payant ($ / mois)", "0.00", "0 au lancement. À réévaluer pour validation email / resets."),
        ("sentry_team_monthly", "Sentry Team ($ / mois)", "0.00", "0 au lancement. Replay à 0 % et filtrage des erreurs connues."),
        ("backup_offsite", "Sauvegarde hors-site R2 (1/0)", "#,##0", "0 par défaut au lancement. Le workflow GitHub existant reste limité à 14 jours."),
        ("sentry_sessions_user", "Sessions / utilisateur / mois", "#,##0", "Pour estimer le quota replay."),
        ("sentry_replay_rate", "Taux replay Sentry", "0%", "0 % au lancement. Supprimer des événements ne restaure pas le quota consommé."),
        ("emails_user", "Emails auth / utilisateur / mois", "#,##0", "0 si pas de validation et onboarding manuel. Resets à traiter séparément."),
        ("supabase_egress_other_gb", "Autre egress Supabase (GB / mois)", "0.00", "API, replication, auth, hors fichiers."),
        ("backup_compress", "Compression sauvegarde DB", "0%", "Taille compressée / taille DB."),
        ("backup_retention_days", "Rétention sauvegardes (jours)", "#,##0", "Copies quotidiennes conservées si sauvegarde hors-site activée."),
        ("backup_files", "Sauvegarder aussi les fichiers (1/0)", "#,##0", "1 = oui, 0 = base seule."),
        ("web_push_per_user", "Abonnés web push / utilisateur", "0.00", "0 par défaut ; navigateur séparé si activé."),
        ("psp_pct", "Frais encaissement (%)", "0.0%", "Inconnu : aucun PSP intégré. À renseigner après choix Mobile Money / carte."),
        ("psp_fixed", "Frais fixes encaissement (F / transaction)", "#,##0", "Inconnu : à renseigner."),
    ]
    cell = {}
    for i, (key, label, num, note) in enumerate(rows, start=3):
        ws.write(i, 0, label, fmt_label)
        f = fmt_input_pct if "%" in num else (fmt_input_int if num == "#,##0" else fmt_input)
        ws.write_number(i, 1, H[key], f)
        ws.write(i, 2, note, fmt_sub)
        ws.set_row(i, 30)
        cell[key] = f"Hypothèses!$B${i+1}"
    ws.freeze_panes(3, 0)

    def hr(key):
        return cell[key]

    # --- Tarifs ---
    ws = wb.add_worksheet("Tarifs officiels")
    ws.set_column("A:A", 34)
    ws.set_column("B:D", 22)
    ws.set_column("E:E", 78)
    ws.write("A1", "Tarifs officiels consultés le 2026-11-01", fmt_title)
    headers = ["Service", "Free / inclus", "Paid entry", "Overage / option", "Source / remarque"]
    for c, h in enumerate(headers):
        ws.write(2, c, h, fmt_head)
    tariffs = [
        ("Supabase", "500 MB DB, 1 GB fichiers, 5 GB egress, 50k MAU", "$25/mo Pro", "DB $0.125/GB, fichiers $0.0213/GB, egress $0.09/GB", "https://supabase.com/pricing"),
        ("PowerSync", "2 GB synced, 500 MB hosted, 50 pics, 2 instances", "$49/mo Pro", "$25/mo par instance supplémentaire ; $1/GB synced, $1/GB hosted", "https://powersync.com/pricing — 25 $ n'est pas un plan d'entrée."),
        ("Vercel", "Hobby non commercial", "$20/mo Pro", "Non retenu au lancement", "https://vercel.com/pricing"),
        ("Render (existant possible)", "Static site gratuit, bande passante limitée", "$25/mo Pro + compute", "Non budgété si pas de besoin supplémentaire", "https://render.com/pricing"),
        ("OneSignal", "Mobile push free si <1000 MAU org", "$19/mo Growth", "$0.012/MAU mobile + $0.004/web subscriber", "https://onesignal.com/pricing"),
        ("Sentry", "Developer : 5k errors, 50 replays, 1 user", "$26/mo Team (annuel)", "Non retenu au lancement ; replay 0 %", "https://sentry.io/pricing/"),
        ("Resend", "3k emails/mo, 100/jour", "$20/mo Pro", "Non retenu au lancement", "https://resend.com/pricing"),
        ("Cloudflare R2", "10 GB-month, 1M Class A, 10M Class B", "Usage", "$0.015/GB-month Standard, egress gratuit", "https://developers.cloudflare.com/r2/pricing/"),
        ("GitHub Actions", "Public repo : standard runners gratuits", "Private : crédit compute", "Artifacts/cache au-delà des quotas", "https://docs.github.com/en/billing/concepts/product-billing/github-actions"),
        ("Cypress Cloud", "Starter : 500 résultats/mo", "$67/mo Team (annuel)", "Désactiver record sur runs non nécessaires", "https://www.cypress.io/pricing"),
        ("Google Play", "—", "$25 une fois", "—", "https://support.google.com/googleplay/android-developer/answer/6112435"),
        ("Apple Developer", "—", "$99/an", "Optionnel iOS", "https://developer.apple.com/programs/enroll/"),
        ("Firebase FCM", "Gratuit", "—", "—", "https://firebase.google.com/pricing"),
    ]
    for r, row in enumerate(tariffs, start=3):
        for c, v in enumerate(row):
            ws.write(r, c, v, fmt_label if c < 4 else fmt_sub)
        ws.set_row(r, 46)
    ws.write(len(tariffs)+4, 0, "Les tarifs peuvent évoluer. Vérifier le checkout et la devise / taxe avant engagement.", fmt_warn)

    sync_expr = f"(({hr('members')}*{hr('services_per_month')}*{hr('cotis_kb')}*{hr('update_factor')}+{hr('transactions')}*{hr('tx_kb')}*{hr('update_factor')}+{hr('events')}*{hr('event_kb')}+{hr('notifications')}*{hr('notif_kb')}+{hr('new_members')}*{hr('member_kb')}+{hr('other_kb')})*{hr('sync_overhead')}/1000)"
    db_expr = f"(({hr('members')}*{hr('services_per_month')}*{hr('cotis_kb')}+{hr('transactions')}*{hr('tx_kb')}+{hr('events')}*{hr('event_kb')}+{hr('notifications')}*{hr('notif_kb')}+(({hr('members')}*{hr('services_per_month')}+{hr('transactions')})*{hr('audit_per_mutation')})*{hr('audit_kb')}+{hr('new_members')}*{hr('member_kb')}+{hr('other_kb')})*{hr('db_factor')}/1000)"
    file_mb_expr = f"({hr('file_mb')}*(1-{hr('compression_reduction')}))"

    # --- Lancement 0-20 ---
    ws = wb.add_worksheet("Lancement 0-20")
    ws.set_column("A:A", 46)
    ws.set_column("B:E", 20)
    ws.write("A1", "Scénarios de lancement — socle minimal payant", fmt_title)
    ws.write("A2", "Supabase Pro + PowerSync Pro. Pas de Vercel, domaine, SMTP payant ou Sentry payant. Compression cible 80 %.", fmt_sub)
    headers = ["Indicateur", "1 église", "5 églises", "10 églises", "20 églises"]
    for c, h in enumerate(headers):
        ws.write(2, c, h, fmt_head)
    ns = [1, 5, 10, 20]
    labels = [
        ("Nombre d'églises", "n", fmt_int),
        ("Utilisateurs actifs", "users", fmt_int),
        ("Appareils", "devices", fmt_int),
        ("Pic connexions PowerSync", "concurrent", fmt_int),
        ("MAU mobile OneSignal", "mobile", fmt_int),
        ("Taille fichier stockée cible (MB)", "file_mb", fmt_num),
        ("Nouveaux fichiers (GB/mo)", "files_new_gb", fmt_num),
        ("Stockage fichiers cumulé 12 mois (GB)", "storage_gb", fmt_num),
        ("Base Postgres estimée 12 mois (GB)", "db_gb", fmt_num),
        ("PowerSync synced (GB/mo à 12 mois)", "synced_gb", fmt_num),
        ("PowerSync hosted (GB à 12 mois)", "hosted_gb", fmt_num),
        ("Supabase Pro ($/mo)", "supabase", fmt_usd),
        ("PowerSync Pro ($/mo)", "powersync", fmt_usd),
        ("Autres lancement ($/mo)", "other_usd", fmt_usd),
        ("Total minimal ($/mo)", "usd", fmt_usd),
        ("Total minimal (F/mo)", "xof", fmt_bold_xof),
        ("Coût minimal / église (F/mo)", "per_church", fmt_xof),
        ("Free : stockage fichiers dépassé au mois", "storage_month", fmt_int),
        ("Free : DB 500 MB dépassée au mois", "db_month", fmt_int),
        ("Free : PowerSync hosted dépassé au mois", "ps_hosted_month", fmt_int),
        ("Free : pic > 50 connexions ?", "ps_peak_over", fmt_label),
    ]
    for r, (label, key, fmt) in enumerate(labels, start=3):
        ws.write(r, 0, label, fmt_label)
        for c, n in enumerate(ns, start=1):
            res = model(n)
            al = free_alerts(n)
            col = xlsxwriter.utility.xl_col_to_name(c)
            nc = f"{col}$4"
            formulas = {
                "n": f"={n}",
                "users": f"={nc}*{hr('users_per_church')}",
                "devices": f"={col}5*{hr('devices_per_user')}",
                "concurrent": f"={col}6*{hr('peak_fraction')}",
                "mobile": f"={col}6*{hr('mobile_share')}",
                "file_mb": f"={file_mb_expr}",
                "files_new_gb": f"={nc}*{hr('files_per_church')}*{col}9/1000",
                "storage_gb": f"={col}10*12",
                "db_gb": f"=({hr('baseline_db_mb')}+{nc}*{db_expr}*12)/1000",
                "synced_gb": f"={col}5*{hr('devices_per_user')}*{sync_expr}/1000*(1+{hr('resync_year')})",
                "hosted_gb": f"={nc}*{sync_expr}*12*{hr('users_per_church')}*{hr('ps_history')}/1000",
                "supabase": f"=25+MAX(0,{col}12-8)*0.125+MAX(0,{col}11-100)*0.0213+MAX(0,{col}10*{hr('downloads_per_file')}+{hr('supabase_egress_other_gb')}-250)*0.09+MAX(0,{col}5-100000)*0.00325",
                "powersync": f"=49+MAX(0,{col}13-30)*1+MAX(0,{col}14-10)*1+ROUNDUP(MAX(0,{col}7-1000)/1000,0)*30",
                "other_usd": f"={hr('vercel_monthly')}+{hr('resend_monthly')}+{hr('sentry_team_monthly')}+IF({col}8>=1000,19+{col}8*0.012+{col}5*{hr('web_push_per_user')}*0.004,0)+IF({hr('backup_offsite')}=1,MAX(0,({col}12*{hr('backup_compress')}*{hr('backup_retention_days')}+{col}11*{hr('backup_files')})-10)*0.015,0)",
                "usd": f"=SUM({col}15:{col}17)",
                "xof": f"={col}18*{hr('fx')}*(1+{hr('contingency')})+{hr('domain_year')}/12",
                "per_church": f"={col}19/{nc}",
                "storage_month": f"=IF({col}10<=0,\"\",INT(1/{col}10)+1)",
                "db_month": f"=IF({nc}*{db_expr}/1000<=0,\"\",INT((0.5-{hr('baseline_db_mb')}/1000)/({nc}*{db_expr}/1000))+1)",
                "ps_hosted_month": f"=IF({nc}*{sync_expr}*{hr('users_per_church')}*{hr('ps_history')}/1000<=0,\"\",INT(0.5/({nc}*{sync_expr}*{hr('users_per_church')}*{hr('ps_history')}/1000))+1)",
                "ps_peak_over": f"=IF({col}7>50,\"Oui\",\"Non\")",
            }
            val = res.get(key)
            if key == "per_church":
                val = res["xof"] / n
            elif key == "other_usd":
                val = res["usd"] - res["supabase"] - res["powersync"]
            elif key == "storage_month":
                val = al["storage_month"] or ""
            elif key == "db_month":
                val = al["db_month"] or ""
            elif key == "ps_hosted_month":
                val = al["ps_hosted_month"] or ""
            elif key == "ps_peak_over":
                val = "Oui" if al["ps_peak_over"] else "Non"
            ws.write_formula(r, c, formulas[key], fmt, val)
    ws.write(26, 0, "Lecture", fmt_head)
    alerts = [
        "Le gratuit peut servir au pilote, mais n'est pas un plan durable pour 20 églises avec 100 fichiers/mo/église, même avec 80 % de compression.",
        "À 20 églises et 5 utilisateurs/église, le pic modélisé est 72 connexions PowerSync (>50 free). Le Pro à 49 $ est le plan d'entrée Cloud ; 25 $ est une instance supplémentaire.",
        "La compression réduit le stockage et l'egress, mais ne supprime pas les limites DB / PowerSync hosted / pic.",
        "Vercel, domaine, validation email et Sentry payant sont reportés après le lancement, pas supprimés définitivement.",
    ]
    for i, a in enumerate(alerts):
        ws.merge_range(27+i, 0, 27+i, 4, a, fmt_warn if i < 3 else fmt_ok)
        ws.set_row(27+i, 32)
    ws.freeze_panes(3, 1)

    # --- Compression ---
    ws = wb.add_worksheet("Compression")
    ws.set_column("A:A", 18)
    ws.set_column("B:G", 22)
    ws.set_column("H:H", 64)
    ws.write("A1", "Compression des fichiers — cible, pas garantie", fmt_title)
    ws.write("A2", "80 % de réduction = 10 MB -> 2 MB. Pas « quelques octets ». Le gain réel dépend du type de PDF/image et doit être mesuré.", fmt_sub)
    heads = ["Réduction", "Fichier 1 MB devient (MB)", "Exemple 10 MB devient (MB)", "Nouveaux fichiers GB/mo (Hypothèses)", "Cumul 12 mois (GB)", "Supabase Free 1 GB dépassé au mois", "Supabase Pro overage 12 mois ($)", "Commentaire"]
    for c, h in enumerate(heads):
        ws.write(3, c, h, fmt_head)
    scenarios = [
        (0.0, "Référence sans compression."),
        (0.5, "Scénario prudent si les PDF sont déjà compressés."),
        (0.8, "Cible utilisateur. À valider sur un échantillon réel."),
        (0.9, "Agressif ; possible sur scans/photos, pas garanti sur PDF texte."),
        (0.99, "Non réaliste comme promesse générale pour PDF scannés."),
    ]
    nc = hr("churches")
    for r, (red, comment) in enumerate(scenarios, start=4):
        er = r + 1
        eff = H["file_mb"] * (1 - red)
        new_gb = H["churches"] * H["files_per_church"] * eff / 1000
        cum = new_gb * 12
        month = breach_month(new_gb, 1.0)
        over = max(0, cum - 100) * T["supabase_storage_over"]
        ws.write_number(r, 0, red, fmt_input_pct)
        ws.write_formula(r, 1, f"={hr('file_mb')}*(1-A{er})", fmt_num, eff)
        ws.write_formula(r, 2, f"=10*(1-A{er})", fmt_num, 10 * (1 - red))
        ws.write_formula(r, 3, f"={nc}*{hr('files_per_church')}*B{er}/1000", fmt_num, new_gb)
        ws.write_formula(r, 4, f"=D{er}*12", fmt_num, cum)
        ws.write_formula(r, 5, f"=IF(D{er}<=0,\"\",INT(1/D{er})+1)", fmt_int, month or "")
        ws.write_formula(r, 6, f"=MAX(0,E{er}-100)*0.0213", fmt_usd, over)
        ws.write(r, 7, comment, fmt_sub)
        ws.set_row(r, 34)
    ws.write(11, 0, "Règles produit", fmt_head)
    rules = [
        "Compresser avant upload, pas seulement à l'affichage. Si l'original reste stocké en plus de la version compressée, le stockage ne baisse pas.",
        "Pour les photos : redimensionner + WebP/JPEG avec qualité contrôlée. Pour les PDF : optimization lossless d'abord ; downsampling lossy seulement si la lisibilité reste acceptable.",
        "Conserver l'original si une valeur légale/archivage l'exige, ou faire choisir l'utilisateur. Ne pas promettre 80 % sur tous les fichiers.",
        "Mesurer le ratio réel sur 20 à 50 fichiers représentatifs, puis remplacer la cible par la moyenne observée.",
    ]
    for i, rule in enumerate(rules):
        ws.merge_range(12+i, 0, 12+i, 7, rule, fmt_sub)
        ws.set_row(12+i, 32)

    # --- Projection ---
    ws = wb.add_worksheet("Projection 12 mois")
    ws.set_column("A:A", 10)
    ws.set_column("B:I", 20)
    ws.write("A1", "Projection cumulative — lancement minimal payant", fmt_title)
    ws.write("A2", "Reprend le nombre d'églises des Hypothèses (20 par défaut) et la compression cible. Pas de Vercel/domaine/SMTP payant.", fmt_sub)
    heads = ["Mois", "Fichiers GB", "DB GB", "PS synced GB/mo", "PS hosted GB", "Supabase $", "PowerSync $", "Total minimal $", "Total minimal F"]
    for c, h in enumerate(heads):
        ws.write(3, c, h, fmt_head)
    nc = hr("churches")
    for m in range(1, 13):
        r = m + 3
        er = r + 1
        res = model(H["churches"], m)
        ws.write_number(r, 0, m, fmt_int)
        ws.write_formula(r, 1, f"=A{er}*{nc}*{hr('files_per_church')}*{file_mb_expr}/1000", fmt_num, res["storage_gb"])
        ws.write_formula(r, 2, f"=({hr('baseline_db_mb')}+{nc}*{db_expr}*A{er})/1000", fmt_num, res["db_gb"])
        ws.write_formula(r, 3, f"={nc}*{hr('users_per_church')}*{hr('devices_per_user')}*{sync_expr}/1000*(1+A{er}/12*{hr('resync_year')})", fmt_num, res["synced_gb"])
        ws.write_formula(r, 4, f"={nc}*{sync_expr}*A{er}*{hr('users_per_church')}*{hr('ps_history')}/1000", fmt_num, res["hosted_gb"])
        ws.write_formula(r, 5, f"=25+MAX(0,C{er}-8)*0.125+MAX(0,B{er}-100)*0.0213+MAX(0,{nc}*{hr('files_per_church')}*{file_mb_expr}/1000*{hr('downloads_per_file')}+{hr('supabase_egress_other_gb')}-250)*0.09+MAX(0,{nc}*{hr('users_per_church')}-100000)*0.00325", fmt_usd, res["supabase"])
        ws.write_formula(r, 6, f"=49+MAX(0,D{er}-30)*1+MAX(0,E{er}-10)*1+ROUNDUP(MAX(0,{nc}*{hr('users_per_church')}*{hr('devices_per_user')}*{hr('peak_fraction')}-1000)/1000,0)*30", fmt_usd, res["powersync"])
        mobile_expr = f"{nc}*{hr('users_per_church')}*{hr('devices_per_user')}*{hr('mobile_share')}"
        other_expr = f"{hr('vercel_monthly')}+{hr('resend_monthly')}+{hr('sentry_team_monthly')}+IF({mobile_expr}>=1000,19+{mobile_expr}*0.012+{nc}*{hr('users_per_church')}*{hr('web_push_per_user')}*0.004,0)+IF({hr('backup_offsite')}=1,MAX(0,(C{er}*{hr('backup_compress')}*{hr('backup_retention_days')}+B{er}*{hr('backup_files')})-10)*0.015,0)"
        ws.write_formula(r, 7, f"=F{er}+G{er}+{other_expr}", fmt_usd, res["usd"])
        ws.write_formula(r, 8, f"=H{er}*{hr('fx')}*(1+{hr('contingency')})+{hr('domain_year')}/12", fmt_xof, res["xof"])
    ws.freeze_panes(4, 1)

    # --- Rentabilité ---
    ws = wb.add_worksheet("Rentabilité")
    ws.set_column("A:A", 40)
    ws.set_column("B:D", 24)
    ws.write("A1", "Seuil de rentabilité technique — lancement minimal", fmt_title)
    ws.write("A2", "Hors salaires, support, acquisition, impôts société. Frais PSP inconnus par défaut.", fmt_sub)
    heads = ["Offre", "Prix mensuel (F)", "Organisations / abonnement", "Revenu net / organisation (F)"]
    for c, h in enumerate(heads):
        ws.write(3, c, h, fmt_head)
    offers = [("Essentiel", 2500, 1), ("Église", 5000, 1), ("Réseau", 12000, 5)]
    base = model(H["churches"])
    for r, (name, price, orgs) in enumerate(offers, start=4):
        ws.write(r, 0, name, fmt_label)
        ws.write_number(r, 1, price, fmt_xof)
        ws.write_number(r, 2, orgs, fmt_int)
        net = (price * (1 - H["psp_pct"]) - H["psp_fixed"]) / orgs
        ws.write_formula(r, 3, f"=(B{r+1}*(1-{hr('psp_pct')})-{hr('psp_fixed')})/C{r+1}", fmt_xof, net)
    ws.write(8, 0, "Coût minimal total à 12 mois (F/mo)", fmt_label)
    ws.write_formula(8, 1, "='Projection 12 mois'!I16", fmt_xof, base["xof"])
    ws.write(10, 0, "Organisations nécessaires", fmt_head)
    ws.write(10, 1, "Essentiel", fmt_head)
    ws.write(10, 2, "Église", fmt_head)
    ws.write(10, 3, "Réseau (5 orgs)", fmt_head)
    ws.write(11, 0, "Lancement minimal", fmt_label)
    for c, offer_row in enumerate([5, 6, 7], start=1):
        net_per_org = (offers[c-1][1] * (1-H["psp_pct"]) - H["psp_fixed"]) / offers[c-1][2]
        val = math.ceil(base["xof"] / net_per_org)
        ws.write_formula(11, c, f"=ROUNDUP($B$9/$D${offer_row},0)", fmt_int, val)
    ws.merge_range(13, 0, 15, 3, "Lecture : à 20 églises, 20 abonnements Église à 5 000 F donnent 100 000 F/mo. Le socle minimal modélisé est environ 51 060 F/mo, soit une marge technique brute avant support, PSP et frais de structure. Ce n'est pas un bénéfice net.", fmt_sub)

    # --- Sources ---
    ws = wb.add_worksheet("Sources & limites")
    ws.set_column("A:A", 32)
    ws.set_column("B:B", 110)
    ws.write("A1", "Sources, mesures et limites", fmt_title)
    sources = [
        ("Mesure Supabase historique", "Snapshot du 2026-11-01 : 47 926 419 octets de base, 0 fichier storage, 42 utilisateurs auth, environnement de test. Ces données ne sont pas des données client."),
        ("Nettoyage prévu", "Les données de test CI/CD doivent être supprimées puis la base remesurée. Le modèle utilise une provision de schéma de 20 MB, pas les 45 MB de test."),
        ("Supabase pricing", "https://supabase.com/pricing"),
        ("Supabase database size", "https://supabase.com/docs/guides/platform/database-size"),
        ("Supabase billing", "https://supabase.com/docs/guides/platform/billing-on-supabase"),
        ("Supabase SMTP", "https://supabase.com/docs/guides/auth/auth-smtp — SMTP par défaut limité, non production."),
        ("PowerSync pricing", "https://powersync.com/pricing — Pro dès 49 $/mo ; 25 $/mo par instance supplémentaire."),
        ("PowerSync billing FAQ", "https://docs.powersync.com/resources/usage-and-billing/usage-and-billing-faq"),
        ("OneSignal pricing", "https://onesignal.com/pricing"),
        ("Sentry pricing", "https://sentry.io/pricing/"),
        ("Sentry quota", "Supprimer des événements ne restaure pas le quota déjà consommé ; réduire à la source."),
        ("Vercel pricing", "https://vercel.com/pricing — non retenu au lancement."),
        ("Resend pricing", "https://resend.com/pricing — non retenu au lancement."),
        ("Cloudflare R2", "https://developers.cloudflare.com/r2/pricing/"),
        ("GitHub Actions billing", "https://docs.github.com/en/billing/concepts/product-billing/github-actions"),
        ("Cypress pricing", "https://www.cypress.io/pricing"),
        ("Ghostscript PDF", "https://ghostscript.readthedocs.io/en/latest/VectorDevices.html — compression / downsampling PDF ; ne garantit pas un ratio fixe."),
        ("Limites", "Plans payants actuels non vérifiés ; consommation PowerSync/OneSignal/Sentry non exportée ; taxes et frais PSP inconnus ; compression non mesurée ; poids de lignes à calibrer après 30 jours d'usage réel."),
    ]
    for r, (a, b) in enumerate(sources, start=3):
        ws.write(r, 0, a, fmt_label)
        ws.write(r, 1, b, fmt_sub)
        ws.set_row(r, 34)
    wb.close()
    return path


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------
def build_pdf():
    registered = set()
    for name, file in [
        ("Manrope", "Manrope_400Regular.ttf"),
        ("Manrope-Bold", "Manrope_700Bold.ttf"),
        ("Inter", "Inter_400Regular.ttf"),
    ]:
        fp = FONTS / file
        if fp.exists():
            pdfmetrics.registerFont(TTFont(name, str(fp)))
            registered.add(name)
    body_font = "Inter" if "Inter" in registered else "Helvetica"
    head_font = "Manrope-Bold" if "Manrope-Bold" in registered else "Helvetica-Bold"
    styles = getSampleStyleSheet()
    body = ParagraphStyle("Body", fontName=body_font, fontSize=9.2, leading=13.5, textColor=colors.HexColor(DARK), spaceAfter=6)
    small = ParagraphStyle("Small", parent=body, fontSize=7.6, leading=10.5, textColor=colors.HexColor(GRAY))
    h1 = ParagraphStyle("H1", fontName=head_font, fontSize=22, leading=27, textColor=colors.HexColor(DARK), spaceAfter=10)
    h2 = ParagraphStyle("H2", fontName=head_font, fontSize=13.5, leading=17, textColor=colors.HexColor(ORANGE), spaceBefore=12, spaceAfter=6)
    bullet = ParagraphStyle("Bullet", parent=body, leftIndent=10, bulletIndent=0, spaceAfter=4)

    path = OUT / "audit-couts-lumina.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=18*mm, bottomMargin=16*mm, title="Lumina — Audit des coûts cloud — lancement 0–20 églises", author="Lumina")
    story = []

    def p(txt, st=body):
        story.append(Paragraph(txt, st))

    head_cell = ParagraphStyle("HeadCell", parent=small, textColor=colors.white)

    def table(headers, rows, widths=None):
        data = [[Paragraph(f"<b>{h}</b>", head_cell) for h in headers]]
        for row in rows:
            data.append([Paragraph(str(c), small) for c in row])
        t = Table(data, colWidths=widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor(DARK)),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#D9DDE3")),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor(LIGHT)]),
            ("LEFTPADDING", (0,0), (-1,-1), 5),
            ("RIGHTPADDING", (0,0), (-1,-1), 5),
            ("TOPPADDING", (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ]))
        story.append(t)
        story.append(Spacer(1, 6))

    base = model(20)
    al = free_alerts(20)

    p("Lumina — Audit des coûts cloud", h1)
    p("Version corrigée : lancement 0–20 églises · pas de Vercel, domaine, validation email payante ou Sentry payant au démarrage", small)
    p("Date : 1er novembre 2026 · Devise : FCFA (XOF) · Taux de budget : 1 USD = 600 F + provision 15 %", small)
    story.append(Spacer(1, 8))

    p("1. Verdict corrigé", h2)
    p("<b>Le lancement peut rester très sobre, mais pas reposer sur un « PowerSync à 25 $ ».</b> Le plan PowerSync Cloud Pro démarre à <b>49 $/mois</b>. Les <b>25 $/mois</b> officiels sont le prix d'une <b>instance supplémentaire</b> au-delà des deux instances incluses, pas un abonnement d'entrée.")
    p("<b>Socle minimal payant estimé à 20 églises : Supabase Pro 25 $ + PowerSync Pro 49 $ = 74 $/mois</b>, soit environ <b>51 060 F/mo</b> au total, ou <b>2 553 F par église</b>. Ce chiffre exclut Vercel, domaine, SMTP payant, Sentry payant et sauvegarde hors-site optionnelle.")
    p("<b>Le gratuit reste possible pour un pilote</b>, mais avec 20 églises et 100 fichiers/mo/église, même en supposant 80 % de compression, les limites Supabase Storage, Supabase DB et PowerSync hosted sont atteintes en quelques mois. Le pic PowerSync modélisé dépasse aussi 50 connexions.")
    p("<b>Compression : 80 % de réduction sur 10 MB donne 2 MB, pas quelques octets.</b> C'est une cible utile, pas une garantie. Elle réduit le stockage et l'egress, mais ne règle pas à elle seule les limites de base, d'historique PowerSync et de connexions simultanées.")

    table(["Indicateur à 20 églises", "Valeur modélisée"], [
        ["Total minimal mensuel", f"{base['xof']:,.0f} F"],
        ["Coût moyen / église", f"{base['xof']/20:,.0f} F"],
        ["Fichiers stockés à 12 mois, cible -80 %", f"{base['storage_gb']:.2f} GB"],
        ["Fichiers stockés à 12 mois, sans compression", "24.00 GB"],
        ["Base Postgres estimée à 12 mois", f"{base['db_gb']:.2f} GB"],
        ["PowerSync hébergé à 12 mois", f"{base['hosted_gb']:.2f} GB"],
        ["Pic PowerSync modélisé", f"{base['concurrent']:.0f} connexions"],
    ], [95*mm, 75*mm])

    p("2. Ce qui change dans le modèle", h2)
    table(["Sujet", "Décision / correction"], [
        ["Vercel / landing page", "0 au lancement. À réévaluer après 20 églises, quand le produit et le budget sont confortables."],
        ["Domaine", "0 au lancement. Achat plus tard, avec la landing page et l'email."],
        ["Validation email", "Pas de validation à l'inscription pour les 20 premières églises. Onboarding manuel possible. Les resets / invitations restent à traiter."],
        ["Sentry", "Replay à 0 % au lancement. Filtrer les erreurs connues. Supprimer des événements ne rend pas le quota déjà consommé."],
        ["Données de test", "Les ~45 MB mesurés sont des données CI/CD, pas des données client. Elles sont exclues ; une provision de schéma de 20 MB reste à remesurer après nettoyage."],
        ["PowerSync", "Free pour pilote, puis Pro 49 $. Les 25 $ sont une instance supplémentaire, pas un plan moins cher."],
        ["Compression", "Cible 80 % avant upload. À mesurer sur fichiers réels. Ne pas stocker l'original en double si l'objectif est de réduire le stockage."],
    ], [38*mm, 132*mm])

    p("3. Services retenus au lancement", h2)
    table(["Service", "Lancement", "Plus tard, si besoin"], [
        ["Supabase", "Free au pilote ; Pro 25 $/mo si limites atteintes", "Compute / stockage / egress selon usage réel"],
        ["PowerSync", "Free au pilote ; Pro 49 $/mo si limites atteintes", "Instances supplémentaires 25 $ seulement si >2 instances"],
        ["OneSignal", "Free si <1000 MAU mobile org", "Growth si MAU dépassés"],
        ["Sentry", "Developer, replay 0 %, erreurs filtrées", "Team si besoin d'alertes / volume / équipe"],
        ["Hébergement landing", "Aucun budget Vercel", "Vercel Pro 20 $/mo après décision post-20"],
        ["Domaine / email", "0 ; pas de validation email", "Domaine + SMTP custom pour validation / resets"],
        ["Sauvegarde", "Workflow GitHub existant, rétention courte", "R2 / hors-site durable si exigence de conservation"],
        ["Cypress Cloud", "Limiter record pour rester sous 500 résultats/mo", "Team si le volume CI l'exige"],
    ], [34*mm, 70*mm, 66*mm])

    p("4. Points de rupture du gratuit à 20 églises", h2)
    p("Hypothèses : 5 utilisateurs actifs/église, 1,2 appareil/utilisateur, 60 % au pic, 100 fichiers de 1 MB avant compression, cible -80 %, 200 membres, 4 cultes, 200 transactions, 200 notifications, 2 000 lignes d'audit par église/mo.")
    table(["Limite free", "Point de rupture modélisé"], [
        ["Supabase Storage 1 GB", f"Mois {al['storage_month']} avec cible -80 % ; mois 1 sans compression."],
        ["Supabase DB 500 MB", f"Mois {al['db_month']} avec provision schéma 20 MB."],
        ["PowerSync hosted 500 MB", f"Mois {al['ps_hosted_month']}."],
        ["PowerSync 50 pics", f"{base['concurrent']:.0f} connexions modélisées à 20 églises ; dépassement probable au pic."],
        ["OneSignal 1000 MAU mobile", f"{base['mobile']:.0f} MAU modélisés ; pas de rupture à 20 églises."],
        ["Sentry 50 replays", "0 replay si désactivé. Les erreurs seules doivent rester sous 5k/mo."],
    ], [62*mm, 108*mm])

    p("5. Compression : ce qu'il faut promettre", h2)
    items = [
        "<b>Mathématique :</b> 10 MB avec -80 % = 2 MB. Pour arriver à quelques kilo-octets, il faudrait environ -99,9 %, ce qui n'est pas une promesse générale pour un PDF scanné.",
        "<b>Photos / scans :</b> un fort gain est possible en redimensionnant et en recompressant, mais avec perte de qualité. Il faut vérifier la lisibilité des justificatifs.",
        "<b>PDF texte / déjà compressés :</b> le gain lossless peut être faible. Un downsampling agressif peut dégrader le document et ne conserve pas nécessairement tous les éléments internes.",
        "<b>Produit :</b> compresser avant upload, mesurer le ratio réel, garder l'original si nécessaire, et ne pas vendre « 80 % garanti » avant benchmark.",
    ]
    for it in items:
        p("• " + it, bullet)

    p("6. Rentabilité technique à 20 églises", h2)
    table(["Offre", "Revenu à 20 organisations", "Lecture vs socle minimal"], [
        ["Essentiel 2 500 F", "50 000 F/mo", "Environ au niveau du socle minimal, avant PSP / support."],
        ["Église 5 000 F", "100 000 F/mo", "Marge technique brute positive avant PSP / support."],
        ["Réseau 12 000 F / 5 orgs", "48 000 F/mo si 4 abonnements couvrent 20 orgs", "Sous le socle minimal dans ce scénario extrême."],
    ], [42*mm, 48*mm, 80*mm])
    p("Seuils techniques avec le socle minimal : environ <b>21 organisations</b> à 2 500 F, <b>11</b> à 5 000 F, ou <b>22 organisations</b> via l'offre Réseau à 2 400 F de revenu par organisation. Hors support, salaires, acquisition, impôts, remboursements et frais PSP.", small)

    p("7. Plan d'action immédiat", h2)
    table(["Priorité", "Action"], [
        ["P0", "Nettoyer les données CI/CD, puis remesurer DB / auth / storage. Ne pas réutiliser les 45 MB comme baseline client."],
        ["P0", "Désactiver replay Sentry et filtrer les erreurs connues à la source. Ne pas compter sur la suppression pour récupérer du quota."],
        ["P0", "Benchmark compression sur 20–50 fichiers réels : PDF scannés, PDF texte, photos. Remplacer la cible 80 % par le ratio mesuré."],
        ["P1", "Surveiller chaque mois : Supabase DB/storage/egress, PowerSync synced/hosted/pic, OneSignal MAU."],
        ["P1", "Garder l'onboarding manuel pour les 20 premières églises ; définir une procédure de reset mot de passe sans SMTP production."],
        ["P2", "Après 20 églises : décider landing page, Vercel, domaine, validation email et sauvegarde durable."],
    ], [20*mm, 150*mm])

    p("8. Sources principales", h2)
    srcs = [
        "PowerSync : https://powersync.com/pricing",
        "Supabase : https://supabase.com/pricing · https://supabase.com/docs/guides/auth/auth-smtp",
        "Sentry : https://sentry.io/pricing/ · Ghostscript : https://ghostscript.readthedocs.io/en/latest/VectorDevices.html",
        "OneSignal : https://onesignal.com/pricing · Vercel : https://vercel.com/pricing · Resend : https://resend.com/pricing",
    ]
    for s in srcs:
        p(s, small)
    p("Document généré depuis scripts/cost-audit/build_audit.py. Le simulateur XLSX compagnon permet d'ajuster les hypothèses. Aucune clé, aucun secret et aucune donnée personnelle ne sont inclus.", small)

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(body_font, 7)
        canvas.setFillColor(colors.HexColor(GRAY))
        canvas.drawString(18*mm, 10*mm, "Lumina — Audit coûts cloud · lancement 0–20 églises · budgets estimatifs, pas factures")
        canvas.drawRightString(A4[0]-18*mm, 10*mm, f"{doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return path


if __name__ == "__main__":
    x = build_xlsx()
    p = build_pdf()
    print(x)
    print(p)
    for n in [1, 5, 10, 20]:
        r = model(n)
        a = free_alerts(n)
        print(n, round(r["xof"]), round(r["xof"]/n), round(r["db_gb"], 3), round(r["storage_gb"], 2), round(r["hosted_gb"], 3), a)
