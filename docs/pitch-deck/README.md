# Pitch deck Lumina — églises

Livrables :

- `lumina-pitch-eglises.pptx` : PowerPoint éditable, 13 slides, formes et texte natifs, notes orateur.
- `lumina-pitch-eglises.pdf` : PDF assorti, même mise en page, 13 pages.

## Contenu

1. Couverture — promesse offline-first
2. Problème vécu par les églises
3. Lumina en une phrase
4. Périmètre fonctionnel
5. Écrans réels de démonstration : budgets et détail budget
6. Fonctionnement hors connexion
7. Confiance et traçabilité
8. Rapports et pilotage
9. Réseaux et méga-églises
10. Trois offres mensuelles : 2 500 / 5 000 / 12 000 FCFA
11. Mise en place accompagnée
12. Transparence : paiements, pièces jointes, stockage, engagement de service
13. Prochaine étape : démonstration

## Garde-fous commerciaux

- Les captures sont réelles mais utilisent des données de démonstration.
- Les offres sont une proposition commerciale. Les quotas, l'activation et le blocage applicatif ne sont pas présentés comme déjà implémentés.
- L'offre Essentiel limite la consultation aux 30 derniers jours ; les données anciennes restent conservées.
- L'offre Réseau inclut jusqu'à 5 organisations dans la proposition.
- Aucune promesse d'utilisateurs ou de stockage illimité, de SLA contractuel, ni de paiement mobile intégré.
- Les pièces jointes nécessitent une connexion au moment de l'upload.

## Régénération

```bash
python -m pip install -r scripts/pitch-deck/requirements.txt
PYTHONPATH=.venv/pitch-tools/python python scripts/pitch-deck/build_deck.py
```

Le script utilise les polices Manrope / Inter présentes dans `.venv/pitch-tools/fonts` si disponibles, avec repli Helvetica côté PDF. Les assets sont dans `scripts/pitch-deck/assets`.

## Lecteur web

Un lecteur statique permet de parcourir les diapositives, lire le texte extrait du PPTX, afficher les notes orateur, ouvrir le PDF original et télécharger les deux fichiers.

```bash
# Prépare les aperçus WebP + data.json depuis le PDF/PPTX existants
PYTHONPATH=.venv/pitch-tools/python python scripts/pitch-deck/build_viewer.py

# Lance le lecteur sur 0.0.0.0:4173
node scripts/pitch-deck/serve-viewer.mjs
```

Le lecteur n'essaie pas de convertir le PPTX en HTML : l'aperçu visuel utilise le PDF assorti, tandis que le texte et les notes sont extraits du PPTX original. Les fichiers originaux restent téléchargeables.

## Lien avec l'audit coûts

Le deck ne montre pas les coûts internes. Voir `docs/audit-couts/` pour le simulateur et le rapport d'infrastructure. Les prix restent proposés tant que les factures réelles et les frais d'encaissement ne sont pas validés.
