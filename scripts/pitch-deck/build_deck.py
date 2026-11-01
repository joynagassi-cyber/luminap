#!/usr/bin/env python3
"""Génère le pitch deck Lumina en PPTX éditable + PDF assorti.

Le même modèle de mise en page (DSL en pouces) est rendu dans PowerPoint via
python-pptx et dans le PDF via ReportLab, afin que les deux livrables restent
alignés. Aucune conversion LibreOffice n'est requise.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "pitch-deck"
ASSETS = Path(__file__).resolve().parent / "assets"
FONTS = ROOT / ".venv" / "pitch-tools" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 13.333, 7.5
BG = "#121212"
CARD = "#181818"
SURF = "#212121"
BORDER = "#282828"
ORANGE = "#FF6B00"
ORANGE_SOFT = "#2A170A"
TEXT = "#FFFFFF"
SEC = "#B3B3B3"
TER = "#808080"
GREEN = "#1DB954"
AMBER = "#FFB800"
BLUE = "#3B82F6"

FONT_HEAD = "Manrope"
FONT_BODY = "Inter"


def rgb(hexstr: str) -> RGBColor:
    return RGBColor.from_string(hexstr.lstrip("#"))


# ---------------------------------------------------------------------------
# DSL
# ---------------------------------------------------------------------------
def rect(x, y, w, h, fill, line=None, radius=0.12, line_w=1):
    return {"kind": "rect", "x": x, "y": y, "w": w, "h": h, "fill": fill, "line": line, "radius": radius, "line_w": line_w}


def text(x, y, w, h, s, size=16, color=TEXT, bold=False, align="left", font=FONT_BODY, leading=1.18):
    return {"kind": "text", "x": x, "y": y, "w": w, "h": h, "s": s, "size": size, "color": color, "bold": bold, "align": align, "font": font, "leading": leading}


def image(x, y, w, h, path):
    return {"kind": "image", "x": x, "y": y, "w": w, "h": h, "path": str(path)}


def line(x1, y1, x2, y2, color=BORDER, width=1):
    return {"kind": "line", "x1": x1, "y1": y1, "x2": x2, "y2": y2, "color": color, "width": width}


def slide(els, notes=""):
    return {"els": els, "notes": notes}


def footer(n, total, label="Lumina · Présentation églises"):
    return [
        line(0.55, 7.08, 12.78, 7.08, BORDER, 0.75),
        text(0.55, 7.14, 8, 0.25, label, 9, TER),
        text(11.7, 7.14, 1.08, 0.25, f"{n:02d} / {total:02d}", 9, TER, align="right"),
    ]


def header(title, kicker=None, n=None, total=13):
    els = [rect(0, 0, W, H, BG)]
    els.append(image(12.25, 0.42, 0.5, 0.53, ASSETS / "lumina-mark.png"))
    if kicker:
        els.append(text(0.55, 0.42, 10.8, 0.3, kicker.upper(), 11, ORANGE, bold=True))
        els.append(text(0.55, 0.74, 11.4, 0.7, title, 30, TEXT, bold=True, font=FONT_HEAD))
    else:
        els.append(text(0.55, 0.5, 11.4, 0.7, title, 30, TEXT, bold=True, font=FONT_HEAD))
    if n:
        els += footer(n, total)
    return els


def card(x, y, w, h, title, body, accent=ORANGE, title_size=16, body_size=12.5):
    return [
        rect(x, y, w, h, CARD, BORDER, 0.14),
        rect(x, y, 0.06, h, accent, radius=0.02),
        text(x + 0.24, y + 0.2, w - 0.44, 0.4, title, title_size, TEXT, bold=True, font=FONT_HEAD),
        text(x + 0.24, y + 0.66, w - 0.44, h - 0.82, body, body_size, SEC),
    ]


def bullet_list(x, y, w, items, size=14, gap=0.46, color=SEC, dot=ORANGE):
    els = []
    for i, item in enumerate(items):
        yy = y + i * gap
        els.append(rect(x, yy + 0.1, 0.09, 0.09, dot, radius=0.04))
        els.append(text(x + 0.24, yy, w - 0.24, gap, item, size, color))
    return els


def phone(x, y, w, h, img, caption):
    return [
        rect(x - 0.08, y - 0.08, w + 0.16, h + 0.16, SURF, BORDER, 0.22),
        image(x, y, w, h, img),
        text(x - 0.2, y + h + 0.22, w + 0.4, 0.5, caption, 12, SEC, align="center"),
    ]


# ---------------------------------------------------------------------------
# Contenu
# ---------------------------------------------------------------------------
SLIDES: list[dict[str, Any]] = []
TOTAL = 13

# 1 — Couverture
els = [rect(0, 0, W, H, BG)]
els.append(rect(8.35, 0, 4.98, H, CARD))
els.append(image(9.15, 2.1, 3.35, 3.55, ASSETS / "lumina-mark.png"))
els.append(text(0.7, 1.15, 7.2, 0.35, "PRÉSENTATION AUX RESPONSABLES D'ÉGLISE", 12, ORANGE, bold=True))
els.append(text(0.7, 1.65, 7.4, 1.2, "Lumina", 64, TEXT, bold=True, font=FONT_HEAD))
els.append(text(0.7, 2.95, 7.1, 1.2, "La gestion financière de votre église, même hors connexion.", 26, TEXT, bold=True, font=FONT_HEAD))
els.append(text(0.7, 4.35, 7.0, 0.8, "Caisse · Cotisations · Budgets · Rapports · Multi-églises", 16, SEC))
els.append(rect(0.7, 5.45, 2.5, 0.5, ORANGE, radius=0.25))
els.append(text(0.7, 5.53, 2.5, 0.34, "Démonstration", 14, TEXT, bold=True, align="center"))
els.append(text(0.7, 6.65, 7.2, 0.3, "Captures réelles de l'application — données de démonstration.", 10, TER))
SLIDES.append(slide(els, "Ouvrir sur la promesse : gérer l'argent et les activités de l'église sans dépendre d'une connexion permanente. Ne pas entrer dans la technique."))

# 2 — Problème
els = header("Le problème que vous vivez", "Constat", 2, TOTAL)
cards = [
    ("Informations dispersées", "Cahiers, fichiers Excel, messages et reçus vivent dans plusieurs endroits."),
    ("Visibilité limitée", "Soldes, cotisations et dépenses sont difficiles à consolider rapidement."),
    ("Rapports lents", "Le bilan ou le rapport demandé en urgence prend trop de temps à préparer."),
    ("Réseau instable", "La saisie se bloque quand la connexion tombe, surtout en déplacement."),
]
for i, (t, b) in enumerate(cards):
    x = 0.55 + (i % 2) * 6.2
    y = 1.75 + (i // 2) * 2.15
    els += card(x, y, 5.95, 1.9, t, b)
els.append(rect(0.55, 6.15, 12.23, 0.62, ORANGE_SOFT, radius=0.12))
els.append(text(0.8, 6.28, 11.8, 0.36, "Résultat : du temps perdu, des erreurs et des décisions moins sûres.", 15, TEXT, bold=True))
SLIDES.append(slide(els, "Faire réagir la salle : Quel problème est le plus fréquent ? Rester concret, pas culpabilisant."))

# 3 — Promesse
els = header("Lumina, en une phrase", "Solution", 3, TOTAL)
els.append(rect(0.55, 1.7, 12.23, 1.55, CARD, BORDER, 0.16))
els.append(text(0.9, 1.98, 11.5, 1.0, "Une application mobile et web pour suivre l'argent, les membres et les activités de votre église — avec ou sans réseau.", 22, TEXT, bold=True, font=FONT_HEAD))
pillars = [
    ("Offline-first", "La saisie continue localement, puis se synchronise dès que le réseau revient."),
    ("Simple pour l'équipe", "Une interface mobile pensée pour les trésoriers, responsables et pasteurs."),
    ("Pensé pour les églises", "Cultes, cotisations, groupes, budgets et rapports multi-sites."),
]
for i, (t, b) in enumerate(pillars):
    els += card(0.55 + i * 4.18, 3.7, 3.93, 2.55, t, b, accent=[ORANGE, GREEN, BLUE][i])
SLIDES.append(slide(els, "Insister : Lumina n'est pas un tableur générique. Le vocabulaire et les workflows sont ceux d'une église."))

# 4 — Périmètre
els = header("Ce que vous pouvez gérer", "Fonctionnalités", 4, TOTAL)
tiles = [
    ("Trésorerie", "Caisses, entrées, sorties, versements et soldes."),
    ("Cotisations & dons", "Collectes par culte, avances, campagnes et suivi."),
    ("Budgets", "Prévu, réel, restant et alertes de dépassement."),
    ("Membres & groupes", "Fiches, adhésions, responsables et caisses de groupe."),
    ("Événements & cultes", "Calendrier, tâches, préparation et suivi."),
    ("Documents", "Archives, justificatifs et rapports exportables."),
]
for i, (t, b) in enumerate(tiles):
    x = 0.55 + (i % 3) * 4.18
    y = 1.8 + (i // 3) * 2.35
    els += card(x, y, 3.93, 2.1, t, b, title_size=15, body_size=12.5)
SLIDES.append(slide(els, "Ne pas promettre de paiement mobile intégré : Lumina trace et organise, mais n'encaisse pas à la place d'un PSP."))

# 5 — Écrans
els = header("Un aperçu de l'application", "Écrans réels", 5, TOTAL)
els += phone(2.0, 1.75, 2.55, 3.56, ASSETS / "budgets.png", "Budgets : prévu, réel, restant")
els += phone(7.45, 1.75, 2.55, 3.56, ASSETS / "budget-detail.png", "Détail budget : prévu / réel par ligne")
els.append(rect(4.95, 2.35, 2.1, 2.3, CARD, BORDER, 0.14))
els.append(text(5.12, 2.6, 1.76, 1.8, "Lecture immédiate des montants et des statuts.", 14, SEC, align="center"))
els.append(text(0.55, 6.35, 12.2, 0.35, "Captures réelles de l'application avec des données de démonstration.", 11, TER, align="center"))
SLIDES.append(slide(els, "Montrer que l'app est réelle. Préciser que les chiffres affichés sont de la démonstration, pas des données d'une église cliente."))

# 6 — Offline
els = header("Même sans connexion, vous continuez", "Offline-first", 6, TOTAL)
steps = [
    ("1", "Saisie locale", "L'équipe enregistre transactions, cotisations et notes sur l'appareil."),
    ("2", "Synchronisation", "Quand le réseau revient, les données se synchronisent avec le cloud."),
    ("3", "Vision centralisée", "Les responsables retrouvent une vue consolidée et à jour."),
]
for i, (num, t, b) in enumerate(steps):
    x = 0.55 + i * 4.18
    els.append(rect(x, 1.85, 3.93, 3.1, CARD, BORDER, 0.16))
    els.append(rect(x + 0.28, 2.12, 0.62, 0.62, ORANGE, radius=0.31))
    els.append(text(x + 0.28, 2.22, 0.62, 0.4, num, 20, TEXT, bold=True, align="center"))
    els.append(text(x + 1.05, 2.2, 2.6, 0.45, t, 17, TEXT, bold=True, font=FONT_HEAD))
    els.append(text(x + 0.28, 3.0, 3.35, 1.6, b, 13.5, SEC))
els.append(rect(0.55, 5.35, 12.23, 1.05, SURF, BORDER, 0.14))
els.append(text(0.85, 5.55, 11.6, 0.65, "Bon à savoir : la consultation et la saisie fonctionnent hors ligne. L'envoi de pièces jointes nécessite une connexion au moment de l'upload.", 13.5, SEC))
SLIDES.append(slide(els, "Être transparent sur la limite des pièces jointes. L'offline-first couvre la saisie et la lecture, pas l'upload binaire hors réseau."))

# 7 — Confiance
els = header("Confiance et traçabilité", "Sécurité", 7, TOTAL)
items = [
    ("Rôles & permissions", "Chaque utilisateur voit et fait ce que son rôle autorise."),
    ("Journal d'audit", "Les actions importantes sont tracées pour faciliter le contrôle."),
    ("Organisations séparées", "Les données d'une église ou d'un site restent cloisonnées."),
    ("Historique conservé", "Les données anciennes restent stockées, même si l'offre limite la consultation."),
]
for i, (t, b) in enumerate(items):
    x = 0.55 + (i % 2) * 6.2
    y = 1.8 + (i // 2) * 2.2
    els += card(x, y, 5.95, 1.95, t, b, accent=[ORANGE, GREEN, BLUE, AMBER][i])
SLIDES.append(slide(els, "Ne pas promettre de SLA contractuel ni de sauvegarde illimitée. Parler de traçabilité, rôles et conservation, pas de certification."))

# 8 — Rapports
els = header("Des rapports pour décider", "Pilotage", 8, TOTAL)
els += bullet_list(0.65, 1.95, 5.6, [
    "Bilan par période, caisse et catégorie",
    "Exports PDF et Excel pour le conseil ou l'assemblée",
    "Suivi des budgets : prévu, réel, écart",
    "Historique consultable selon l'offre choisie",
], size=15, gap=0.62)
# mini chart
bx, by, bw, bh = 7.0, 2.0, 5.4, 3.6
els.append(rect(bx, by, bw, bh, CARD, BORDER, 0.16))
els.append(text(bx + 0.3, by + 0.25, bw - 0.6, 0.35, "Exemple de lecture budgétaire", 14, TEXT, bold=True))
bars = [("Prévu", 3.0, BLUE), ("Réel", 1.7, ORANGE), ("Restant", 1.3, GREEN)]
for i, (lab, val, col) in enumerate(bars):
    yy = by + 0.95 + i * 0.78
    els.append(text(bx + 0.3, yy, 1.2, 0.3, lab, 12, SEC))
    els.append(rect(bx + 1.55, yy + 0.02, 3.3, 0.28, SURF, radius=0.08))
    els.append(rect(bx + 1.55, yy + 0.02, val, 0.28, col, radius=0.08))
els.append(text(0.55, 6.05, 12.2, 0.6, "L'offre Essentiel limite la consultation aux 30 derniers jours ; l'offre Église ouvre l'historique et les rapports d'organisation.", 13, SEC))
SLIDES.append(slide(els, "Le graphique est illustratif, pas une donnée client. Faire le lien entre historique et valeur de pilotage."))

# 9 — Multi-églises
els = header("Pour les réseaux et méga-églises", "Multi-organisations", 9, TOTAL)
els += bullet_list(0.65, 1.95, 5.7, [
    "Administrer plusieurs organisations depuis un espace central",
    "Consolider les rapports inter-organisations",
    "Suivre les sites, annexes ou églises filles",
    "Donner des accès ciblés aux responsables centraux",
], size=15, gap=0.62)
# diagram
cx, cy = 9.35, 2.55
els.append(rect(cx - 1.15, cy - 0.45, 2.3, 0.9, ORANGE, radius=0.14))
els.append(text(cx - 1.15, cy - 0.24, 2.3, 0.45, "Administration centrale", 13, TEXT, bold=True, align="center"))
for i, lab in enumerate(["Site A", "Site B", "Site C"]):
    x = 7.25 + i * 1.75
    y = 4.35
    els.append(line(cx, cy + 0.45, x + 0.65, y, BORDER, 1.2))
    els.append(rect(x, y, 1.3, 0.7, CARD, BORDER, 0.12))
    els.append(text(x, y + 0.18, 1.3, 0.35, lab, 12, SEC, align="center"))
els.append(rect(0.55, 6.0, 12.23, 0.7, ORANGE_SOFT, radius=0.12))
els.append(text(0.8, 6.15, 11.7, 0.4, "Offre Réseau : jusqu'à 5 organisations incluses dans la proposition commerciale.", 14, TEXT, bold=True))
SLIDES.append(slide(els, "Le quota de 5 organisations est une recommandation commerciale, pas une limite technique déjà vérifiée dans l'app."))

# 10 — Offres
els = header("Trois offres mensuelles", "Tarifs en FCFA", 10, TOTAL)
offers = [
    ("Essentiel", "2 500", "Commencer à gérer", [
        "1 organisation",
        "Consultation des 30 derniers jours",
        "Données anciennes conservées",
        "Pas de rapports d'organisation",
        "Création d'organisations limitée",
    ], False),
    ("Église", "5 000", "Piloter toute l'année", [
        "1 organisation",
        "Historique et rapports d'organisation",
        "Budgets, cotisations et dons",
        "Exports PDF / Excel",
        "Pour une église locale",
    ], True),
    ("Réseau", "12 000", "Coordonner plusieurs sites", [
        "Jusqu'à 5 organisations",
        "Administration centrale",
        "Rapports inter-organisations",
        "Coordination multi-sites",
        "Pour méga-église ou réseau",
    ], False),
]
for i, (name, price, tag, feats, hot) in enumerate(offers):
    x = 0.55 + i * 4.18
    fill = CARD if not hot else SURF
    border = ORANGE if hot else BORDER
    els.append(rect(x, 1.65, 3.93, 4.95, fill, border, 0.16, 1.5 if hot else 1))
    if hot:
        els.append(rect(x + 1.15, 1.42, 1.65, 0.42, ORANGE, radius=0.21))
        els.append(text(x + 1.15, 1.49, 1.65, 0.28, "Recommandé", 10.5, TEXT, bold=True, align="center"))
    els.append(text(x + 0.28, 1.95, 3.35, 0.4, name, 20, TEXT, bold=True, font=FONT_HEAD))
    els.append(text(x + 0.28, 2.42, 3.35, 0.62, f"{price} F", 32, ORANGE if hot else TEXT, bold=True, font=FONT_HEAD))
    els.append(text(x + 0.28, 3.05, 3.35, 0.32, "par mois · " + tag, 11.5, SEC))
    els += bullet_list(x + 0.28, 3.55, 3.4, feats, size=11.8, gap=0.5, dot=ORANGE if hot else SEC)
els.append(text(0.55, 6.72, 12.2, 0.3, "Offres commerciales proposées en FCFA/mois. Périmètre exact, quotas et activation à valider au déploiement.", 9.5, TER))
SLIDES.append(slide(els, "Ne pas dire que l'app bloque déjà automatiquement les quotas : l'application des offres reste à implémenter/valider. Voir audit coûts : à 10 églises, le socle technique est un coût d'amorçage."))

# 11 — Mise en place
els = header("Mise en place accompagnée", "Démarrage", 11, TOTAL)
steps = [
    ("1", "Cadrage", "Caisses, rôles, exercice, catégories et besoins de rapport."),
    ("2", "Configuration", "Organisation, membres, groupes, budgets et modèles."),
    ("3", "Formation", "Prise en main par l'équipe de saisie et les responsables."),
    ("4", "Démarrage", "Saisie réelle, premiers rapports et ajustements."),
]
for i, (num, t, b) in enumerate(steps):
    x = 0.55 + i * 3.13
    els.append(rect(x, 1.9, 2.88, 3.4, CARD, BORDER, 0.16))
    els.append(rect(x + 0.25, 2.15, 0.58, 0.58, ORANGE, radius=0.29))
    els.append(text(x + 0.25, 2.24, 0.58, 0.38, num, 18, TEXT, bold=True, align="center"))
    els.append(text(x + 0.25, 2.95, 2.4, 0.4, t, 16.5, TEXT, bold=True, font=FONT_HEAD))
    els.append(text(x + 0.25, 3.45, 2.4, 1.5, b, 12.5, SEC))
els.append(text(0.55, 5.8, 12.2, 0.6, "Objectif : démarrer petit, avec une caisse, un culte et un budget, puis étendre à toute l'organisation.", 14, SEC))
SLIDES.append(slide(els, "Rassurer sur l'accompagnement sans promettre un délai contractuel non validé."))

# 12 — Bon à savoir
els = header("Bon à savoir avant de démarrer", "Transparence", 12, TOTAL)
els += card(0.55, 1.8, 5.95, 1.95, "Paiements", "Lumina organise et trace les dons et cotisations. L'encaissement mobile ou carte dépend d'un prestataire de paiement séparé.", accent=AMBER)
els += card(6.83, 1.8, 5.95, 1.95, "Pièces jointes", "Les justificatifs et archives sont envoyés lorsque la connexion est disponible. La saisie texte reste possible hors ligne.", accent=BLUE)
els += card(0.55, 4.0, 5.95, 1.95, "Stockage & utilisateurs", "Les offres ne promettent pas un stockage ou des utilisateurs illimités. Le dimensionnement se fait selon l'usage réel.", accent=GREEN)
els += card(6.83, 4.0, 5.95, 1.95, "Engagement de service", "Les délais d'assistance, sauvegardes avancées et engagements contractuels se définissent au déploiement.", accent=ORANGE)
SLIDES.append(slide(els, "Cette slide protège la confiance : elle évite les promesses d'illimité, de SLA ou de paiement intégré non vérifiées."))

# 13 — Prochaine étape
els = [rect(0, 0, W, H, BG)]
els.append(image(0.7, 0.65, 0.72, 0.76, ASSETS / "lumina-mark.png"))
els.append(text(1.6, 0.82, 6, 0.45, "Lumina", 24, TEXT, bold=True, font=FONT_HEAD))
els.append(text(0.7, 1.9, 11.8, 1.45, "Planifions une démonstration avec vos cas d'usage.", 34, TEXT, bold=True, font=FONT_HEAD))
els.append(text(0.7, 3.45, 11.5, 0.8, "Choisissez une caisse, un culte, un budget et un rapport : nous les déroumons ensemble dans Lumina.", 18, SEC))
els.append(rect(0.7, 4.65, 3.6, 0.62, ORANGE, radius=0.31))
els.append(text(0.7, 4.78, 3.6, 0.38, "Réserver une démonstration", 14.5, TEXT, bold=True, align="center"))
els.append(rect(4.55, 4.65, 3.6, 0.62, SURF, BORDER, 0.31))
els.append(text(4.55, 4.78, 3.6, 0.38, "Tester l'offre Église", 14.5, TEXT, bold=True, align="center"))
els += footer(13, TOTAL)
SLIDES.append(slide(els, "Clôturer sur une action simple. Ne pas inventer de contact email/téléphone non fourni ; utiliser le canal de la présentation."))


# ---------------------------------------------------------------------------
# Rendu PPTX
# ---------------------------------------------------------------------------
def render_pptx(path: Path):
    prs = Presentation()
    prs.slide_width = Inches(W)
    prs.slide_height = Inches(H)
    blank = prs.slide_layouts[6]
    for s in SLIDES:
        sl = prs.slides.add_slide(blank)
        for el in s["els"]:
            k = el["kind"]
            if k == "rect":
                shp = sl.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if el["radius"] else MSO_SHAPE.RECTANGLE, Inches(el["x"]), Inches(el["y"]), Inches(el["w"]), Inches(el["h"]))
                if el["radius"]:
                    try:
                        shp.adjustments[0] = min(0.5, el["radius"] / min(el["w"], el["h"]))
                    except Exception:
                        pass
                shp.fill.solid()
                shp.fill.fore_color.rgb = rgb(el["fill"])
                if el["line"]:
                    shp.line.color.rgb = rgb(el["line"])
                    shp.line.width = Pt(el["line_w"])
                else:
                    shp.line.fill.background()
                shp.shadow.inherit = False
            elif k == "text":
                tb = sl.shapes.add_textbox(Inches(el["x"]), Inches(el["y"]), Inches(el["w"]), Inches(el["h"]))
                tf = tb.text_frame
                tf.word_wrap = True
                tf.margin_left = 0
                tf.margin_right = 0
                tf.margin_top = 0
                tf.margin_bottom = 0
                tf.vertical_anchor = MSO_ANCHOR.TOP
                lines = el["s"].split("\n")
                for i, ln in enumerate(lines):
                    p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
                    p.text = ln
                    p.alignment = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}[el["align"]]
                    p.line_spacing = el["leading"]
                    for r in p.runs:
                        r.font.name = el["font"]
                        r.font.size = Pt(el["size"])
                        r.font.bold = el["bold"]
                        r.font.color.rgb = rgb(el["color"])
            elif k == "image":
                sl.shapes.add_picture(el["path"], Inches(el["x"]), Inches(el["y"]), Inches(el["w"]), Inches(el["h"]))
            elif k == "line":
                ln = sl.shapes.add_connector(1, Inches(el["x1"]), Inches(el["y1"]), Inches(el["x2"]), Inches(el["y2"]))
                ln.line.color.rgb = rgb(el["color"])
                ln.line.width = Pt(el["width"])
        if s["notes"]:
            sl.notes_slide.notes_text_frame.text = s["notes"]
    prs.save(path)


# ---------------------------------------------------------------------------
# Rendu PDF
# ---------------------------------------------------------------------------
def register_fonts():
    fonts = {
        "Manrope": "Manrope_400Regular.ttf",
        "Manrope-Bold": "Manrope_700Bold.ttf",
        "Inter": "Inter_400Regular.ttf",
        "Inter-Bold": "Inter_600SemiBold.ttf",
    }
    for name, file in fonts.items():
        p = FONTS / file
        if p.exists():
            pdfmetrics.registerFont(TTFont(name, str(p)))


def render_pdf(path: Path):
    register_fonts()
    c = canvas.Canvas(str(path), pagesize=(W * 72, H * 72))
    c.setTitle("Lumina — Présentation églises")
    c.setAuthor("Lumina")
    for s in SLIDES:
        for el in s["els"]:
            k = el["kind"]
            if k == "rect":
                c.setFillColor(HexColor(el["fill"]))
                if el["line"]:
                    c.setStrokeColor(HexColor(el["line"]))
                    c.setLineWidth(el["line_w"])
                else:
                    c.setStrokeColor(HexColor(el["fill"]))
                x, y, w, h = el["x"] * 72, (H - el["y"] - el["h"]) * 72, el["w"] * 72, el["h"] * 72
                r = min(el["radius"] * 72, w / 2, h / 2)
                if r > 0:
                    c.roundRect(x, y, w, h, r, stroke=1 if el["line"] else 0, fill=1)
                else:
                    c.rect(x, y, w, h, stroke=1 if el["line"] else 0, fill=1)
            elif k == "line":
                c.setStrokeColor(HexColor(el["color"]))
                c.setLineWidth(el["width"])
                c.line(el["x1"] * 72, (H - el["y1"]) * 72, el["x2"] * 72, (H - el["y2"]) * 72)
            elif k == "image":
                c.drawImage(el["path"], el["x"] * 72, (H - el["y"] - el["h"]) * 72, el["w"] * 72, el["h"] * 72, preserveAspectRatio=True, mask="auto")
            elif k == "text":
                fname = el["font"] + ("-Bold" if el["bold"] else "")
                if fname not in pdfmetrics.getRegisteredFontNames():
                    fname = "Helvetica-Bold" if el["bold"] else "Helvetica"
                c.setFillColor(HexColor(el["color"]))
                size = el["size"]
                c.setFont(fname, size)
                maxw = el["w"] * 72
                lines = []
                for para in el["s"].split("\n"):
                    lines.extend(simpleSplit(para, fname, size, maxw) or [""])
                lh = size * el["leading"]
                y = (H - el["y"]) * 72 - size * 0.9
                for ln in lines:
                    tw = pdfmetrics.stringWidth(ln, fname, size)
                    if el["align"] == "center":
                        x = el["x"] * 72 + (maxw - tw) / 2
                    elif el["align"] == "right":
                        x = el["x"] * 72 + maxw - tw
                    else:
                        x = el["x"] * 72
                    c.drawString(x, y, ln)
                    y -= lh
        c.showPage()
    c.save()


if __name__ == "__main__":
    pptx = OUT / "lumina-pitch-eglises.pptx"
    pdf = OUT / "lumina-pitch-eglises.pdf"
    render_pptx(pptx)
    render_pdf(pdf)
    print(pptx)
    print(pdf)
