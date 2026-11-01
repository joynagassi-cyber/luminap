#!/usr/bin/env python3
"""
Génère les ressources visuelles de la documentation Lumina à partir des
captures d'écrans produites par Cypress.

Entrées  : `cypress/screenshots/screenshots.cy.ts/<slug>.png` (captures mobile)
Sorties  :
  1. `public/tutorial/screens/<slug>.webp`      — captures optimisées (tutoriel)
  2. `public/tutorial/screens/<slug>.ann.webp`  — captures ANNOTÉES (repères)
  3. `src/lib/screenGuide.json`                 — manifeste lu par le tutoriel
  4. `docs/agent/GUIDE_ECRANS.pdf`              — guide PDF groupé par feature

Usage :
  python3 scripts/visual-docs/build.py            # tout construire
  python3 scripts/visual-docs/build.py --no-pdf   # sauter le PDF
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from screens_manifest import as_json_records  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SHOTS_DIR = ROOT / "cypress" / "screenshots" / "screenshots.cy.ts"
OUT_DIR = ROOT / "public" / "tutorial" / "screens"
# Module TypeScript (et non .json) : le projet n'active pas `resolveJsonModule`,
# un import JSON échouerait au type-check. Un .ts typé reste la source unique.
GUIDE_MODULE = ROOT / "src" / "lib" / "screenGuide.ts"
PDF_PATH = ROOT / "docs" / "agent" / "GUIDE_ECRANS.pdf"

# Qualité WebP : 82 est le bon compromis taille/qualité pour des captures d'UI.
WEBP_QUALITY = 82

# Palette (alignée sur la charte Lumina : accent orange).
ACCENT = (255, 107, 0)
INK = (17, 17, 17)
WHITE = (255, 255, 255)


def _font(size: int) -> ImageFont.FreeTypeFont:
    """Police sans-serif ; repli sur la police bitmap par défaut si absente."""
    for name in (
        "DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "Arial.ttf",
    ):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _fit(path: Path, max_w: int = 900) -> Image.Image:
    """Ouvre une capture et la réduit à `max_w` de large (ratio conservé)."""
    im = Image.open(path).convert("RGB")
    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    return im


def annotate(im: Image.Image, annotations: list[dict]) -> Image.Image:
    """
    Dessine des repères numérotés SUR l'image pour orienter l'utilisateur.

    Chaque repère = un disque orange numéroté + une étiquette avec le texte.
    Les coordonnées sont exprimées en pourcentage de la largeur/hauteur.
    """
    out = im.copy()
    draw = ImageDraw.Draw(out, "RGBA")
    w, h = out.size
    badge_r = max(16, round(w * 0.028))
    f_num = _font(round(badge_r * 1.15))
    f_lbl = _font(max(14, round(w * 0.022)))

    for i, a in enumerate(annotations, start=1):
        cx = int(w * a["x"] / 100)
        cy = int(h * a["y"] / 100)

        # Étiquette (fond sombre translucide + texte blanc), bornée à l'image.
        label = a["label"]
        tb = draw.textbbox((0, 0), label, font=f_lbl)
        tw, th = tb[2] - tb[0], tb[3] - tb[1]
        pad = 8
        lx = min(max(8, cx + badge_r + 6), w - tw - 2 * pad - 8)
        ly = min(max(8, cy - th // 2 - pad), h - th - 2 * pad - 8)
        draw.rounded_rectangle(
            [lx, ly, lx + tw + 2 * pad, ly + th + 2 * pad],
            radius=8,
            fill=(17, 17, 17, 210),
        )
        draw.text((lx + pad, ly + pad - tb[1]), label, font=f_lbl, fill=WHITE)

        # Ligne de rappel du repère vers l'étiquette.
        draw.line([(cx, cy), (lx, ly + (th + 2 * pad) // 2)], fill=ACCENT, width=3)

        # Disque numéroté.
        draw.ellipse(
            [cx - badge_r, cy - badge_r, cx + badge_r, cy + badge_r],
            fill=ACCENT,
            outline=WHITE,
            width=3,
        )
        nb = draw.textbbox((0, 0), str(i), font=f_num)
        draw.text(
            (cx - (nb[2] - nb[0]) // 2 - nb[0], cy - (nb[3] - nb[1]) // 2 - nb[1]),
            str(i),
            font=f_num,
            fill=WHITE,
        )
    return out


def build_images(records: list[dict]) -> dict:
    """Convertit les PNG en WebP (nues + annotées). Retourne des stats."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stats = {"png_bytes": 0, "webp_bytes": 0, "missing": [], "count": 0}
    for r in records:
        src = SHOTS_DIR / f"{r['slug']}.png"
        if not src.exists():
            stats["missing"].append(r["slug"])
            continue
        stats["png_bytes"] += src.stat().st_size
        im = _fit(src)

        plain = OUT_DIR / f"{r['slug']}.webp"
        im.save(plain, "WEBP", quality=WEBP_QUALITY, method=6)
        stats["webp_bytes"] += plain.stat().st_size

        ann = annotate(im, r["annotations"])
        ann_path = OUT_DIR / f"{r['slug']}.ann.webp"
        ann.save(ann_path, "WEBP", quality=WEBP_QUALITY, method=6)
        stats["webp_bytes"] += ann_path.stat().st_size
        stats["count"] += 1
    return stats


def write_guide_module(records: list[dict]) -> None:
    """Écrit le manifeste TypeScript consommé par le tutoriel in-app."""
    # `json.dumps` produit un JSON valide (donc un littéral TS valide pour des
    # objets/données simples). On l'indente sous la propriété `screens`.
    body = json.dumps(records, ensure_ascii=False, indent=2)
    indented = "\n".join(
        "    " + line if line.strip() else line for line in body.splitlines()
    )
    content = (
        "/**\n"
        " * GÉNÉRÉ AUTOMATIQUEMENT — ne pas éditer à la main.\n"
        " * Source : scripts/visual-docs/screens_manifest.py\n"
        " * Reconstruire : python3 scripts/visual-docs/build.py\n"
        " */\n\n"
        "export interface ScreenAnnotation {\n"
        "  x: number;\n"
        "  y: number;\n"
        "  label: string;\n"
        "}\n\n"
        "export interface ScreenGuideEntry {\n"
        "  slug: string;\n"
        "  path: string;\n"
        "  title: string;\n"
        "  feature: string;\n"
        "  section: string | null;\n"
        "  purpose: string;\n"
        "  steps: string[];\n"
        "  annotations: ScreenAnnotation[];\n"
        "}\n\n"
        "export interface ScreenGuide {\n"
        "  imageDir: string;\n"
        "  screens: ScreenGuideEntry[];\n"
        "}\n\n"
        "const SCREEN_GUIDE: ScreenGuide = {\n"
        '  imageDir: "/tutorial/screens",\n'
        "  screens: " + indented.strip() + ",\n"
        "};\n\n"
        "export default SCREEN_GUIDE;\n"
    )
    GUIDE_MODULE.write_text(content, encoding="utf-8")


def build_pdf(records: list[dict]) -> bool:
    """Produit le guide PDF groupé par fonctionnalité."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib.utils import ImageReader
        from reportlab.pdfgen import canvas as pdfcanvas
    except ImportError:
        print("reportlab absent : PDF ignoré (pip install reportlab)")
        return False

    PDF_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = pdfcanvas.Canvas(str(PDF_PATH), pagesize=A4)
    pw, ph = A4
    margin = 18 * mm

    def heading(text: str, size: int, y: float, color=INK) -> float:
        c.setFillColorRGB(*[v / 255 for v in color])
        c.setFont("Helvetica-Bold", size)
        c.drawString(margin, y, text)
        return y - size - 6

    def wrap(text: str, size: int, max_w: float) -> list[str]:
        c.setFont("Helvetica", size)
        words, lines, cur = text.split(), [], ""
        for w in words:
            trial = f"{cur} {w}".strip()
            if c.stringWidth(trial, "Helvetica", size) <= max_w:
                cur = trial
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines

    # Page de titre.
    c.setFillColorRGB(*[v / 255 for v in ACCENT])
    c.rect(0, ph - 60 * mm, pw, 60 * mm, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 34)
    c.drawString(margin, ph - 34 * mm, "Lumina — Guide des écrans")
    c.setFont("Helvetica", 15)
    c.drawString(margin, ph - 46 * mm, "Chaque écran : à quoi il sert et comment l'utiliser")
    c.setFillColorRGB(*[v / 255 for v in INK])
    c.setFont("Helvetica", 11)
    c.drawString(margin, ph - 78 * mm, f"{len(records)} écrans documentés, groupés par fonctionnalité.")
    c.drawString(margin, ph - 84 * mm, "Captures au format mobile (390 × 844), repères annotés sur l'image.")
    c.showPage()

    # Regroupement par fonctionnalité, en conservant l'ordre du manifeste.
    features: list[str] = []
    for r in records:
        if r["feature"] not in features:
            features.append(r["feature"])

    for feature in features:
        group = [r for r in records if r["feature"] == feature]
        y = ph - margin
        y = heading(feature, 20, y, ACCENT)
        y -= 4

        for r in group:
            img = OUT_DIR / f"{r['slug']}.ann.webp"
            if not img.exists():
                img = OUT_DIR / f"{r['slug']}.webp"
            if not img.exists():
                continue
            # Les captures sont affichées à ~62 mm de large : on les réduit
            # avant de les incorporer pour garder un PDF léger (les WebP
            # pleine résolution restent disponibles dans public/tutorial).
            thumb = Image.open(img).convert("RGB")
            if thumb.width > 300:
                thumb = thumb.resize(
                    (300, round(thumb.height * 300 / thumb.width)), Image.LANCZOS
                )
            reader = ImageReader(thumb)
            iw, ih = reader.getSize()
            disp_w = 62 * mm
            disp_h = disp_w * ih / iw

            block_h = disp_h + 8 * mm
            if y - block_h < margin:
                c.showPage()
                y = ph - margin
                y = heading(feature + " (suite)", 18, y, ACCENT)
                y -= 4

            # Image à gauche, texte à droite.
            c.drawImage(
                reader, margin, y - disp_h, width=disp_w, height=disp_h,
                preserveAspectRatio=True, mask="auto",
            )
            tx = margin + disp_w + 8 * mm
            tw = pw - tx - margin
            ty = y - 6
            c.setFillColorRGB(*[v / 255 for v in INK])
            c.setFont("Helvetica-Bold", 13)
            c.drawString(tx, ty, r["title"])
            ty -= 14
            # Le chemin technique (route interne) n'est PAS imprimé : le guide
            # est un document utilisateur, il ne doit exposer ni identifiants de
            # jeu de données ni routes internes.
            # (garde : src/lib/__tests__/tutorial-real-data.test.ts)
            c.setFillColorRGB(*[v / 255 for v in INK])
            for line in wrap(r["purpose"], 9, tw):
                c.drawString(tx, ty, line)
                ty -= 11
            ty -= 4
            c.setFont("Helvetica-Bold", 9)
            c.drawString(tx, ty, "Comment l'utiliser :")
            ty -= 11
            c.setFont("Helvetica", 9)
            for step in r["steps"]:
                for j, line in enumerate(wrap("• " + step, 9, tw)):
                    c.drawString(tx, ty, line)
                    ty -= 10
            ty -= 4
            c.setFont("Helvetica-Bold", 8)
            c.setFillColorRGB(*[v / 255 for v in ACCENT])
            c.drawString(tx, ty, "Repères sur l'image :")
            ty -= 10
            c.setFont("Helvetica", 8)
            c.setFillColorRGB(0.35, 0.35, 0.35)
            for i, a in enumerate(r["annotations"], start=1):
                for j, line in enumerate(wrap(f"{i}. {a['label']}", 8, tw)):
                    c.drawString(tx, ty, line)
                    ty -= 9

            y -= max(block_h, (y - ty) + 4 * mm) + 4 * mm
            c.setStrokeColorRGB(0.88, 0.88, 0.88)
            c.line(margin, y + 2 * mm, pw - margin, y + 2 * mm)

        c.showPage()

    c.save()
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-pdf", action="store_true")
    args = ap.parse_args()

    records = as_json_records()
    stats = build_images(records)
    write_guide_module(records)

    ratio = (1 - stats["webp_bytes"] / stats["png_bytes"]) * 100 if stats["png_bytes"] else 0
    print(f"Images : {stats['count']} écrans convertis en WebP (nues + annotées)")
    print(f"  PNG  : {stats['png_bytes'] / 1024:.0f} Kio")
    print(f"  WebP : {stats['webp_bytes'] / 1024:.0f} Kio  ({ratio:.0f} % de réduction)")
    if stats["missing"]:
        print(f"  Captures manquantes : {', '.join(stats['missing'])}")

    if not args.no_pdf and build_pdf(records):
        print(f"PDF   : {PDF_PATH.relative_to(ROOT)} ({PDF_PATH.stat().st_size / 1024:.0f} Kio)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
