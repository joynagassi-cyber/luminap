# Jetons — P1 lot 2

`semantic.css` expose les alias `--lu-*` sur les jetons historiques sans
changer les 10 accents existants. La seule modification visuelle de l'existant
est C6 : `--text-tertiary` atteint 3:1 sur les surfaces courantes ; cela ne
signifie pas 4,5:1 pour du texte normal. Les placeholders restent distincts.

`generator.ts` produit des échelles OKLCH internes et des jetons sémantiques
sRGB à partir d'un `ThemeSpec`, avec sélection noir/blanc par contraste réel.
`pnpm generate:tokens` régénère `themes.generated.css` de façon déterministe ;
le test compare le fichier au générateur pour bloquer toute dérive en CI. Le
CSS est disponible sur `html`, y compris pour les overlays. Le thème violet
est sélectionnable en clair et sombre ; `violet-legacy.css` raccorde les
anciens jetons et un miroir généré synchronise les triplets Ionic. L’accent
est ajusté par mode pour assurer le contraste du texte sur les surfaces ;
il utilise un texte noir sur fond violet en sombre et blanc en clair. Le générateur est importable pour
le futur `custom`, mais n'est pas chargé dans le bundle initial.

Les alias de l'ancien thème conservent ses couleurs historiques, notamment
`--on-accent` : le contraste de chaque accent historique n'est pas garanti à
ce stade. Le contrôle complet et la correction des paires sont à réaliser au
lot 5 avant le gate P1 ; ne pas annoncer ce thème comme AA sur tous ses accents.
Les dix accents historiques et leurs préférences sont conservés.
