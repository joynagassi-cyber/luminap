# Guide visuel — captures d'écrans, tutoriel annoté et PDF

Cette chaîne produit, à partir de l'application réelle, la documentation
visuelle de Lumina : captures mobiles, images **annotées** intégrées au
tutoriel in-app, et un **PDF** « chaque écran : à quoi il sert ».

## Pipeline

```
screens_manifest.py  ──►  (source unique du contenu)
        │
        ▼
cypress/e2e/screenshots.cy.ts   (capture chaque écran en PNG, données de démo)
        │   cypress/screenshots/screenshots.cy.ts/<slug>.png
        ▼
scripts/visual-docs/build.py
        ├── public/tutorial/screens/<slug>.webp       (capture nue)
        ├── public/tutorial/screens/<slug>.ann.webp   (capture ANNOTÉE)
        ├── src/lib/screenGuide.ts                    (manifeste typé, généré)
        └── docs/agent/GUIDE_ECRANS.pdf               (guide PDF groupé)
```

Le tutoriel in-app (`src/pages/Tutorial.tsx` → `ScreenGuideGallery`) lit
`src/lib/screenGuide.ts` et affiche, dans chaque section, les captures
annotées rattachées à cette section.

## Régénérer

```bash
# 1. Serveur de dev sur :8080 (dans un autre terminal)
npm run dev

# 2. Capturer les écrans (données de démonstration réalistes)
npm run docs:screens

# 3. Construire WebP + annotations + manifeste + PDF
npm run docs:visual
```

`--no-pdf` saute l'étape PDF (utile si `reportlab` n'est pas installé) :

```bash
python3 scripts/visual-docs/build.py --no-pdf
```

## Ajouter / modifier un écran

Tout se pilote depuis `screens_manifest.py` (source unique) :

- `slug` / `path` : identifiant de capture et route visitée ;
- `feature` : regroupement dans le PDF ;
- `section` : id de la section du tutoriel où insérer la capture (`None` =
  pas dans le tutoriel) ;
- `purpose` / `steps` : texte du PDF et de la légende ;
- `annotations` : repères numérotés posés sur l'image (`x`/`y` en %).

Après modification, relancer `npm run docs:visual`. La capture doit exister
dans `cypress/screenshots/screenshots.cy.ts/` : ajouter la route à
`cypress/e2e/screenshots.cy.ts` puis relancer `npm run docs:screens`.

## Dépendances

- `Pillow` (conversion WebP + annotations) — présent dans l'environnement.
- `reportlab` (PDF) — présent ; si absent, `pip install reportlab`.

## Garde-fous

- `src/components/__tests__/screen-guide-gallery.test.tsx` vérifie que le
  manifeste est cohérent (sections connues) et que **chaque capture nue ET
  annotée existe** sur le disque.
- `cypress/e2e/screen-guide.cy.ts` vérifie de bout en bout que la capture
  annotée est réellement **servie** (`naturalWidth > 0`) dans le tutoriel.
