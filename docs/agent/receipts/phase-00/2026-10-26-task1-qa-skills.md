# Receipt — Tâche 1 : installation des skills QA

- **Date** : 2026-10-26
- **Branche** : `agent/task1-qa-skills`
- **Tâche** : installer les skills QA (`cypress-e2e`, `claude-code-qa`,
  `playwright-suite`, `api-testing-toolkit`) via `npx @qaskills/cli add <skill>`
  et vérifier `.claude/skills/`.
- **Statut** : **terminé** (avec rectification des noms).

## Résultat

`@qaskills/cli` (v0.4.1) installé et utilisé. Le registre `qaskills.sh` **ne
connaît pas** `playwright-suite` ni `api-testing-toolkit` (recherche → 0
résultat). Les équivalents canoniques du registre ont été installés :

| Skill demandé | Nom au registre | Résultat |
|---|---|---|
| `cypress-e2e` | `cypress-e2e` | ✅ installé |
| `claude-code-qa` | `claude-code-qa` | ✅ installé |
| `playwright-suite` | *(inexistant)* → `playwright-e2e` | ✅ équivalent installé |
| `api-testing-toolkit` | *(inexistant)* → `supertest-api` | ✅ équivalent installé |

```
npx @qaskills/cli add cypress-e2e     -d .claude/skills -y
npx @qaskills/cli add claude-code-qa  -d .claude/skills -y
npx @qaskills/cli add playwright-e2e  -d .claude/skills -y
npx @qaskills/cli add supertest-api   -d .claude/skills -y
```

Chaque skill produit un `SKILL.md` (frontmatter `name`/`description`/`version`).
Les 4 sont mirrorés dans `.agents/skills/` (convention du dépôt : les deux
dossiers sont versionnés et synchronisés).

## Vérifications

| Contrôle | Résultat |
|---|---|
| `.claude/skills/{cypress-e2e,claude-code-qa,playwright-e2e,supertest-api}/SKILL.md` | présents |
| Mirror `.agents/skills/` identique (`diff -r`) | identique |
| Motifs dangereux (`curl|sh`, `npmrc`, `registry=`, `eval $(…)`, `rm -rf /`) | **aucun** |
| Build/tests impactés | non (fichiers Markdown de skills, hors `src/`) |

## Honnêteté (R12)

- **[Prouvé]** : 4 skills installés, format valide, aucun contenu dangereux.
- **[Rectifié]** : 2 des 4 noms de la consigne n'existent pas au registre ;
  j'ai installé les équivalents réels plutôt que d'inventer un dépôt source.
- **[Limite]** : `npx @qaskills/cli add` écrit aussi dans
  `.github/copilot-instructions/` (déjà présent avant la session) — non inclus
  dans ce commit pour garder la PR focalisée ; à aligner si le propriétaire
  veut l'uniformisation des trois cibles.
