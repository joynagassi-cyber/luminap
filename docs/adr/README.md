# Architecture Decision Records (ADR)

Une décision d'architecture = un fichier `NNNN-titre.md`, immuable une fois
accepté (on ajoute un ADR qui le remplace plutôt que de le réécrire).

**Règle de gouvernance** (cf. `docs/PLATFORM-GOVERNANCE.md` §4.2) : **chaque ADR
qui édicte une règle opposable doit citer la garde (test de scan) qui la fait
échouer si elle est violée.** Un ADR sans garde est un vœu.

| # | Titre | Garde |
|---|---|---|
| [0001](./0001-couche-plateforme-facades.md) | Couche de capacité plateforme (une façade par capacité native) | `src/lib/__tests__/platform-abstraction-guard.test.ts` |
