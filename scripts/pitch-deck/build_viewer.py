#!/usr/bin/env python3
"""Prépare le lecteur web du pitch deck Lumina.

Le lecteur n'essaie pas de convertir le PPTX en HTML : il affiche les pages du
PDF assorti comme aperçu fidèle, extrait le texte et les notes du PPTX original,
et propose les deux fichiers en téléchargement.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import pymupdf
from PIL import Image
from pptx import Presentation

ROOT = Path(__file__).resolve().parents[2]
DECK_DIR = ROOT / "docs" / "pitch-deck"
VIEWER_DIR = Path(__file__).resolve().parent / "viewer"
PDF_PATH = DECK_DIR / "lumina-pitch-eglises.pdf"
PPTX_PATH = DECK_DIR / "lumina-pitch-eglises.pptx"
MARK_PATH = Path(__file__).resolve().parent / "assets" / "lumina-mark.png"

FOOTER_RE = re.compile(r"^\d{2}\s*/\s*\d{2}$")


def clean_text(value: str) -> str:
    return value.replace("\v", "\n").strip()


def is_footer(value: str) -> bool:
    return value.startswith("Lumina · Présentation") or bool(FOOTER_RE.fullmatch(value))


def extract_blocks(slide) -> list[dict]:
    blocks = []
    for shape in slide.shapes:
        if not getattr(shape, "has_text_frame", False):
            continue
        value = clean_text(shape.text_frame.text)
        if not value or is_footer(value):
            continue
        sizes = [
            run.font.size.pt
            for paragraph in shape.text_frame.paragraphs
            for run in paragraph.runs
            if run.font.size is not None
        ]
        bold = any(run.font.bold for paragraph in shape.text_frame.paragraphs for run in paragraph.runs)
        blocks.append(
            {
                "text": value,
                "size": max(sizes) if sizes else 12.0,
                "bold": bool(bold),
                "top": round(shape.top / 914400, 3),
                "left": round(shape.left / 914400, 3),
            }
        )
    blocks.sort(key=lambda b: (b["top"], b["left"]))
    return blocks


def pick_title(blocks: list[dict]) -> dict | None:
    candidates = [b for b in blocks if b["top"] < 2.35]
    if not candidates:
        return None
    return max(candidates, key=lambda b: (b["size"], -b["top"]))


def pick_kicker(blocks: list[dict], title: dict | None) -> dict | None:
    for block in blocks:
        if block is title:
            continue
        if block["top"] < 1.65 and block["size"] <= 12.5 and block["text"].isupper():
            return block
    return None


def save_webp(pix: pymupdf.Pixmap, path: Path, width: int | None = None, quality: int = 88) -> tuple[int, int]:
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    if width and image.width > width:
        height = round(image.height * width / image.width)
        image = image.resize((width, height), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=quality, method=6)
    return image.width, image.height


def main() -> None:
    if not PDF_PATH.exists() or not PPTX_PATH.exists():
        raise SystemExit("PDF ou PPTX introuvable dans docs/pitch-deck/. Générez d'abord le deck.")

    prs = Presentation(PPTX_PATH)
    pdf = pymupdf.open(PDF_PATH)
    if len(prs.slides) != len(pdf):
        raise SystemExit(f"Le PPTX contient {len(prs.slides)} slides mais le PDF {len(pdf)} pages.")

    slides_dir = VIEWER_DIR / "slides"
    thumbs_dir = VIEWER_DIR / "thumbs"
    assets_dir = VIEWER_DIR / "assets"
    slides_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)
    assets_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(MARK_PATH, assets_dir / "lumina-mark.png")

    slides = []
    for index, (pptx_slide, page) in enumerate(zip(prs.slides, pdf), start=1):
        blocks = extract_blocks(pptx_slide)
        title_block = pick_title(blocks)
        kicker_block = pick_kicker(blocks, title_block)
        title = title_block["text"] if title_block else f"Diapositive {index}"
        kicker = kicker_block["text"] if kicker_block else ""
        body = [b for b in blocks if b is not title_block and b is not kicker_block]
        notes = ""
        if pptx_slide.has_notes_slide:
            notes = clean_text(pptx_slide.notes_slide.notes_text_frame.text)

        pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
        image_name = f"slide-{index:02d}.webp"
        thumb_name = f"slide-{index:02d}.webp"
        width, height = save_webp(pix, slides_dir / image_name, quality=88)
        save_webp(pix, thumbs_dir / thumb_name, width=360, quality=80)

        slides.append(
            {
                "number": index,
                "title": title,
                "kicker": kicker,
                "image": f"slides/{image_name}",
                "thumbnail": f"thumbs/{thumb_name}",
                "width": width,
                "height": height,
                "blocks": body,
                "notes": notes,
            }
        )

    data = {
        "title": "Lumina — Pitch deck églises",
        "subtitle": "La gestion financière de votre église, même hors connexion.",
        "slideCount": len(slides),
        "files": {
            "pptx": {
                "href": "files/lumina-pitch-eglises.pptx",
                "name": "lumina-pitch-eglises.pptx",
                "bytes": PPTX_PATH.stat().st_size,
            },
            "pdf": {
                "href": "files/lumina-pitch-eglises.pdf",
                "name": "lumina-pitch-eglises.pdf",
                "bytes": PDF_PATH.stat().st_size,
            },
        },
        "slides": slides,
    }
    (VIEWER_DIR / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Lecteur prêt : {len(slides)} diapositives, {len(pdf)} pages PDF, notes PPTX extraites.")
    print(VIEWER_DIR)


if __name__ == "__main__":
    main()
