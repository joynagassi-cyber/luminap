/**
 * GÉNÉRÉ AUTOMATIQUEMENT — ne pas éditer à la main.
 * Source : scripts/visual-docs/screens_manifest.py
 * Reconstruire : python3 scripts/visual-docs/build.py
 */

export interface ScreenAnnotation {
  x: number;
  y: number;
  label: string;
}

export interface ScreenGuideEntry {
  slug: string;
  path: string;
  title: string;
  feature: string;
  section: string | null;
  purpose: string;
  steps: string[];
  annotations: ScreenAnnotation[];
}

export interface ScreenGuide {
  imageDir: string;
  screens: ScreenGuideEntry[];
}

const SCREEN_GUIDE: ScreenGuide = {
  imageDir: "/tutorial/screens",
  screens: [
      {
        "slug": "01-splash",
        "path": "/splash",
        "title": "Écran de démarrage",
        "feature": "Démarrage & accès",
        "section": "overview",
        "purpose": "Premier écran affiché au lancement : il confirme que l'application s'initialise et masque le temps de chargement.",
        "steps": [
          "Aucune action : l'écran disparaît seul dès que l'application est prête.",
          "Si un problème survient, un message d'erreur remplace le logo après quelques secondes."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 50,
            "label": "Logo Lumina : l'app charge"
          },
          {
            "x": 50,
            "y": 88,
            "label": "Indicateur de progression"
          }
        ]
      },
      {
        "slug": "02-welcome",
        "path": "/welcome",
        "title": "Écran d'accueil",
        "feature": "Démarrage & accès",
        "section": "organisation",
        "purpose": "Vitrine de bienvenue présentée avant la connexion : elle explique la promesse du produit et propose de commencer.",
        "steps": [
          "Appuyez sur « Commencer » pour créer un compte et une organisation.",
          "Appuyez sur « J'ai déjà un compte » pour vous connecter."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 40,
            "label": "Présentation du produit"
          },
          {
            "x": 50,
            "y": 78,
            "label": "« Commencer » : créer un compte"
          },
          {
            "x": 50,
            "y": 88,
            "label": "« J'ai déjà un compte » : se connecter"
          }
        ]
      },
      {
        "slug": "03-auth",
        "path": "/auth",
        "title": "Connexion / inscription",
        "feature": "Démarrage & accès",
        "section": "organisation",
        "purpose": "Porte d'entrée du compte : connexion par e-mail + mot de passe, ou inscription d'un nouvel utilisateur.",
        "steps": [
          "Saisissez votre e-mail et votre mot de passe, puis validez.",
          "Ou choisissez « Créer un compte » pour vous inscrire.",
          "Un lien vers « Rejoindre par code d'invitation » est proposé."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 38,
            "label": "Champs e-mail et mot de passe"
          },
          {
            "x": 50,
            "y": 60,
            "label": "Bouton de validation"
          },
          {
            "x": 50,
            "y": 84,
            "label": "Rejoindre avec un code d'invitation"
          }
        ]
      },
      {
        "slug": "04-onboarding",
        "path": "/onboarding",
        "title": "Onboarding guidé",
        "feature": "Démarrage & accès",
        "section": "organisation",
        "purpose": "Parcours en quelques étapes qui configure l'organisation (nom, type, thème) à la première connexion.",
        "steps": [
          "Renseignez le nom de votre église ou organisation.",
          "Choisissez le type et le thème de couleur.",
          "Validez chaque étape jusqu'à l'ouverture du tableau de bord."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Étape courante du parcours"
          },
          {
            "x": 50,
            "y": 58,
            "label": "Champ à renseigner"
          },
          {
            "x": 50,
            "y": 88,
            "label": "Bouton « Continuer »"
          }
        ]
      },
      {
        "slug": "05-sessions",
        "path": "/sessions",
        "title": "Sessions / choix d'organisation",
        "feature": "Démarrage & accès",
        "section": "roles",
        "purpose": "Liste les organisations auxquelles vous avez accès et permet de basculer de l'une à l'autre.",
        "steps": [
          "Repérez l'organisation voulue dans la liste.",
          "Appuyez dessus pour l'ouvrir et charger ses données.",
          "Le rôle affiché indique vos droits dans cette organisation."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Organisations accessibles"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Rôle dans l'organisation"
          },
          {
            "x": 50,
            "y": 80,
            "label": "Appuyer pour ouvrir"
          }
        ]
      },
      {
        "slug": "06-org-setup",
        "path": "/org-setup",
        "title": "Création de l'organisation",
        "feature": "Démarrage & accès",
        "section": "organisation",
        "purpose": "Crée votre première organisation : vous en devenez automatiquement administrateur.",
        "steps": [
          "Saisissez le nom et le sigle de l'organisation.",
          "Choisissez le type (église, association…).",
          "Validez : l'organisation est créée et vous y êtes rattaché comme administrateur."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 34,
            "label": "Nom de l'organisation"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Type d'organisation"
          },
          {
            "x": 50,
            "y": 84,
            "label": "Créer l'organisation"
          }
        ]
      },
      {
        "slug": "07-dashboard",
        "path": "/dashboard",
        "title": "Tableau de bord",
        "feature": "Tableau de bord",
        "section": "dashboard",
        "purpose": "Vue d'ensemble : solde de la caisse principale, derniers mouvements, échéances et raccourcis du quotidien.",
        "steps": [
          "Consultez le solde global en haut.",
          "Faites défiler pour voir les derniers mouvements et les alertes.",
          "Utilisez la barre du bas pour changer de domaine."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Solde de la caisse principale"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Mouvements récents"
          },
          {
            "x": 50,
            "y": 96,
            "label": "Navigation principale"
          }
        ]
      },
      {
        "slug": "08-notifications",
        "path": "/notifications",
        "title": "Notifications",
        "feature": "Tableau de bord",
        "section": "dashboard",
        "purpose": "Regroupe les alertes à traiter : transactions en attente d'approbation, rappels d'événements, etc.",
        "steps": [
          "Lisez les notifications non lues (badge).",
          "Appuyez sur « Tout marquer lu » pour les classer.",
          "Ouvrez une notification pour aller à l'élément concerné."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 20,
            "label": "Compteur de non-lus"
          },
          {
            "x": 82,
            "y": 20,
            "label": "Tout marquer comme lu"
          },
          {
            "x": 50,
            "y": 55,
            "label": "Liste des alertes"
          }
        ]
      },
      {
        "slug": "09-search",
        "path": "/search",
        "title": "Recherche",
        "feature": "Tableau de bord",
        "section": "parametres",
        "purpose": "Recherche globale dans les membres, transactions, groupes et événements de l'organisation.",
        "steps": [
          "Saisissez un mot-clé (nom, montant, intitulé).",
          "Filtrez par type de résultat si besoin.",
          "Appuyez sur un résultat pour ouvrir sa fiche."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 18,
            "label": "Champ de recherche"
          },
          {
            "x": 50,
            "y": 42,
            "label": "Filtres par type"
          },
          {
            "x": 50,
            "y": 70,
            "label": "Résultats"
          }
        ]
      },
      {
        "slug": "10-tutoriel",
        "path": "/tutoriel",
        "title": "Tutoriel",
        "feature": "Tableau de bord",
        "section": "faq",
        "purpose": "Guide pas-à-pas intégré à l'application, découpé par thème (transactions, groupes, membres…).",
        "steps": [
          "Choisissez un thème dans la liste.",
          "Lisez les explications, conseils et diagrammes.",
          "Naviguez avec « Précédent » / « Suivant »."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 14,
            "label": "Sélecteur de thème"
          },
          {
            "x": 50,
            "y": 50,
            "label": "Explications et visuels"
          },
          {
            "x": 50,
            "y": 92,
            "label": "Navigation du tutoriel"
          }
        ]
      },
      {
        "slug": "11-finance",
        "path": "/finance",
        "title": "Grand livre (finances)",
        "feature": "Finances",
        "section": "finance",
        "purpose": "Registre de toutes les entrées et sorties d'argent, avec filtres et totaux par période.",
        "steps": [
          "Filtrez par période ou par catégorie.",
          "Appuyez sur une ligne pour ouvrir le détail.",
          "Utilisez « + » pour créer une transaction."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 20,
            "label": "Filtres et totaux"
          },
          {
            "x": 50,
            "y": 55,
            "label": "Liste des mouvements"
          },
          {
            "x": 85,
            "y": 90,
            "label": "Créer une transaction"
          }
        ]
      },
      {
        "slug": "12-transaction-new",
        "path": "/transaction/new",
        "title": "Nouvelle transaction",
        "feature": "Finances",
        "section": "transactions",
        "purpose": "Enregistre une entrée (revenu) ou une sortie (dépense) d'argent dans la caisse.",
        "steps": [
          "Choisissez le type : recette ou dépense.",
          "Saisissez le montant, la catégorie, la date et un libellé.",
          "Validez : la transaction passe « en attente » puis « approuvée »."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Type : recette / dépense"
          },
          {
            "x": 50,
            "y": 44,
            "label": "Montant et catégorie"
          },
          {
            "x": 50,
            "y": 88,
            "label": "Enregistrer"
          }
        ]
      },
      {
        "slug": "13-transaction-detail",
        "path": "/transaction/demo-tx-1",
        "title": "Détail d'une transaction",
        "feature": "Finances",
        "section": "transactions",
        "purpose": "Fiche complète d'un mouvement : montant, statut, catégorie, historique et actions (approuver, corriger).",
        "steps": [
          "Vérifiez le montant et le statut.",
          "Approuvez la transaction si vous en avez le droit.",
          "Corrigez ou annulez via les actions disponibles."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Montant et statut"
          },
          {
            "x": 50,
            "y": 48,
            "label": "Détails (catégorie, date, auteur)"
          },
          {
            "x": 50,
            "y": 80,
            "label": "Actions : approuver / modifier"
          }
        ]
      },
      {
        "slug": "14-transaction-edit",
        "path": "/transaction/demo-tx-1/edit",
        "title": "Modifier une transaction",
        "feature": "Finances",
        "section": "transactions",
        "purpose": "Corrige une transaction non approuvée. Une transaction approuvée est verrouillée (intégrité comptable).",
        "steps": [
          "Modifiez le montant, la catégorie ou le libellé.",
          "Ajoutez un commentaire justifiant la correction.",
          "Enregistrez : la modification est tracée dans le journal d'audit."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Champs modifiables"
          },
          {
            "x": 50,
            "y": 62,
            "label": "Commentaire de correction"
          },
          {
            "x": 50,
            "y": 88,
            "label": "Enregistrer les modifications"
          }
        ]
      },
      {
        "slug": "15-transaction-group-new",
        "path": "/groups/demo-group-jeunesse/transaction/new",
        "title": "Transaction d'un groupe",
        "feature": "Finances",
        "section": "groupes",
        "purpose": "Enregistre un mouvement rattaché à la caisse d'un groupe précis (ex. la Jeunesse).",
        "steps": [
          "Le groupe est déjà sélectionné en haut.",
          "Saisissez le montant, la catégorie et le libellé.",
          "Validez : le mouvement alimente la caisse du groupe."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 20,
            "label": "Groupe concerné"
          },
          {
            "x": 50,
            "y": 46,
            "label": "Montant et catégorie"
          },
          {
            "x": 50,
            "y": 88,
            "label": "Enregistrer"
          }
        ]
      },
      {
        "slug": "16-balance",
        "path": "/balance",
        "title": "Bilan",
        "feature": "Finances",
        "section": "bilan",
        "purpose": "Compare recettes et dépenses sur une période pour dégager le solde net.",
        "steps": [
          "Choisissez la période d'analyse.",
          "Lisez les totaux recettes / dépenses / solde.",
          "Utilisez le graphique pour repérer les tendances."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Sélecteur de période"
          },
          {
            "x": 50,
            "y": 46,
            "label": "Totaux recettes / dépenses"
          },
          {
            "x": 50,
            "y": 72,
            "label": "Courbe d'évolution"
          }
        ]
      },
      {
        "slug": "17-versement",
        "path": "/versement",
        "title": "Versement entre caisses",
        "feature": "Finances",
        "section": "versement",
        "purpose": "Déplace de l'argent d'une caisse vers une autre (ex. d'une caisse de groupe vers la caisse principale).",
        "steps": [
          "Choisissez la caisse source et la caisse destinataire.",
          "Saisissez le montant à transférer.",
          "Validez : le versement attend approbation puis se comptabilise."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 28,
            "label": "Caisse source"
          },
          {
            "x": 50,
            "y": 42,
            "label": "Caisse destinataire"
          },
          {
            "x": 50,
            "y": 86,
            "label": "Valider le versement"
          }
        ]
      },
      {
        "slug": "18-saisie-rapide",
        "path": "/saisie-rapide/demo-group-jeunesse",
        "title": "Saisie rapide",
        "feature": "Finances",
        "section": "transactions",
        "purpose": "Saisie éclair de plusieurs mouvements d'affilée, pensée pour l'usage sur le terrain (clavier numérique).",
        "steps": [
          "Choisissez la catégorie et le montant.",
          "Validez pour enregistrer et enchaîner la saisie suivante.",
          "Consultez le récapitulatif en haut."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Clavier de montant"
          },
          {
            "x": 50,
            "y": 62,
            "label": "Catégorie rapide"
          },
          {
            "x": 50,
            "y": 88,
            "label": "Valider et continuer"
          }
        ]
      },
      {
        "slug": "19-budgets",
        "path": "/budgets",
        "title": "Budgets",
        "feature": "Finances",
        "section": "rapports",
        "purpose": "Liste les budgets prévisionnels par exercice, avec le montant prévu et le réalisé.",
        "steps": [
          "Ouvrez un budget pour voir ses lignes.",
          "Comparez le prévu et le réel par catégorie.",
          "Créez un nouveau budget pour l'exercice suivant."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Exercice et statut"
          },
          {
            "x": 50,
            "y": 55,
            "label": "Liste des budgets"
          },
          {
            "x": 85,
            "y": 90,
            "label": "Créer un budget"
          }
        ]
      },
      {
        "slug": "20-budget-detail",
        "path": "/budgets/demo-budget-2026",
        "title": "Détail d'un budget",
        "feature": "Finances",
        "section": "rapports",
        "purpose": "Détaille un budget : lignes par catégorie, montants prévus, réalisé et écart.",
        "steps": [
          "Lisez le total prévu en haut.",
          "Parcourez les lignes par catégorie.",
          "Repérez les écarts (dépassements) signalés."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Total budgété"
          },
          {
            "x": 50,
            "y": 50,
            "label": "Lignes par catégorie"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Écart prévu / réalisé"
          }
        ]
      },
      {
        "slug": "21-giving",
        "path": "/giving",
        "title": "Dons & campagnes",
        "feature": "Finances",
        "section": "rapports",
        "purpose": "Suivi des dons des fidèles, des campagnes de collecte et des reçus fiscaux.",
        "steps": [
          "Consultez les campagnes en cours et leur avancement.",
          "Ouvrez une campagne pour voir les promesses et les dons.",
          "Ajoutez un donateur ou enregistrez un don."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Campagnes en cours"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Dons et promesses"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Reçus fiscaux"
          }
        ]
      },
      {
        "slug": "22-giving-campaign",
        "path": "/giving/campaigns/demo-campaign-construction",
        "title": "Détail d'une campagne",
        "feature": "Finances",
        "section": "rapports",
        "purpose": "Fiche d'une campagne de collecte : objectif, montant collecté, promesses et échéances.",
        "steps": [
          "Suivez la jauge objectif / collecté.",
          "Consultez les promesses rattachées.",
          "Enregistrez un nouveau don pour cette campagne."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Objectif de la campagne"
          },
          {
            "x": 50,
            "y": 44,
            "label": "Montant collecté (jauge)"
          },
          {
            "x": 50,
            "y": 72,
            "label": "Promesses et dons"
          }
        ]
      },
      {
        "slug": "23-cotisations",
        "path": "/cotisations",
        "title": "Cotisations",
        "feature": "Finances",
        "section": "membres",
        "purpose": "Suivi des cotisations attendues et payées par les membres (cultes, campagnes).",
        "steps": [
          "Repérez les cotisations impayées.",
          "Enregistrez un paiement pour un membre.",
          "Filtrez par statut (payé, en retard)."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Résumé des cotisations"
          },
          {
            "x": 50,
            "y": 55,
            "label": "Liste par membre"
          },
          {
            "x": 50,
            "y": 82,
            "label": "Enregistrer un paiement"
          }
        ]
      },
      {
        "slug": "24-groups",
        "path": "/groups",
        "title": "Groupes",
        "feature": "Groupes & membres",
        "section": "groupes",
        "purpose": "Organise l'organisation en groupes (jeunesse, chorale, départements) avec leurs caisses dédiées.",
        "steps": [
          "Parcourez la liste des groupes.",
          "Appuyez sur un groupe pour ouvrir sa fiche.",
          "Créez un nouveau groupe via le bouton « + »."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Liste des groupes"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Nom et responsable"
          },
          {
            "x": 85,
            "y": 90,
            "label": "Créer un groupe"
          }
        ]
      },
      {
        "slug": "25-group-detail",
        "path": "/groups/demo-group-jeunesse",
        "title": "Détail d'un groupe",
        "feature": "Groupes & membres",
        "section": "groupes",
        "purpose": "Fiche d'un groupe : membres rattachés, solde de sa caisse et actions rapides.",
        "steps": [
          "Consultez les membres du groupe.",
          "Vérifiez le solde de la caisse du groupe.",
          "Utilisez les raccourcis (cotisation, saisie rapide)."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Nom du groupe"
          },
          {
            "x": 50,
            "y": 48,
            "label": "Membres rattachés"
          },
          {
            "x": 50,
            "y": 76,
            "label": "Solde de la caisse du groupe"
          }
        ]
      },
      {
        "slug": "26-group-cotisation",
        "path": "/groups/demo-group-jeunesse/cotisation",
        "title": "Cotisation de groupe",
        "feature": "Groupes & membres",
        "section": "membres",
        "purpose": "Enregistre en une fois les cotisations de plusieurs membres d'un groupe.",
        "steps": [
          "Cochez les membres qui ont payé.",
          "Saisissez le montant par membre.",
          "Validez : chaque paiement est comptabilisé."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Montant par membre"
          },
          {
            "x": 50,
            "y": 55,
            "label": "Membres à cocher"
          },
          {
            "x": 50,
            "y": 88,
            "label": "Enregistrer les cotisations"
          }
        ]
      },
      {
        "slug": "27-members",
        "path": "/members",
        "title": "Membres",
        "feature": "Groupes & membres",
        "section": "membres",
        "purpose": "Répertoire des membres de l'organisation avec leurs coordonnées et leur statut.",
        "steps": [
          "Recherchez un membre par nom.",
          "Appuyez sur une fiche pour voir le détail.",
          "Ajoutez un nouveau membre via « + »."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Recherche de membre"
          },
          {
            "x": 50,
            "y": 55,
            "label": "Liste des membres"
          },
          {
            "x": 85,
            "y": 90,
            "label": "Ajouter un membre"
          }
        ]
      },
      {
        "slug": "28-member-detail",
        "path": "/membre/demo-mem-1",
        "title": "Détail d'un membre",
        "feature": "Groupes & membres",
        "section": "membres",
        "purpose": "Fiche d'un membre : coordonnées, groupes, cotisations et historique de dons.",
        "steps": [
          "Vérifiez les coordonnées et le statut.",
          "Consultez les groupes d'appartenance.",
          "Enregistrez un don ou une cotisation depuis la fiche."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Identité et statut"
          },
          {
            "x": 50,
            "y": 48,
            "label": "Groupes du membre"
          },
          {
            "x": 50,
            "y": 76,
            "label": "Dons et cotisations"
          }
        ]
      },
      {
        "slug": "29-membres-en-avance",
        "path": "/membres-en-avance",
        "title": "Membres en avance",
        "feature": "Groupes & membres",
        "section": "membres",
        "purpose": "Liste les membres ayant payé des cotisations en avance (crédit disponible).",
        "steps": [
          "Parcourez les membres ayant un solde d'avance.",
          "Vérifiez le montant crédité.",
          "Imputez l'avance sur une cotisation future."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Membres en avance"
          },
          {
            "x": 50,
            "y": 55,
            "label": "Montant d'avance"
          },
          {
            "x": 50,
            "y": 80,
            "label": "Imputer une cotisation"
          }
        ]
      },
      {
        "slug": "30-events",
        "path": "/events",
        "title": "Événements",
        "feature": "Événements",
        "section": "evenements",
        "purpose": "Calendrier des événements et cultes, avec leur budget et leurs tâches.",
        "steps": [
          "Parcourez la liste par date.",
          "Ouvrez un événement pour son détail.",
          "Créez un événement via « + »."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Liste par date"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Statut et budget"
          },
          {
            "x": 85,
            "y": 90,
            "label": "Créer un événement"
          }
        ]
      },
      {
        "slug": "31-event-new",
        "path": "/event/new",
        "title": "Nouvel événement",
        "feature": "Événements",
        "section": "evenements",
        "purpose": "Crée un événement : nom, dates, statut et budget prévisionnel.",
        "steps": [
          "Renseignez le nom et les dates.",
          "Choisissez le statut (planifié, en cours…).",
          "Fixez le budget puis enregistrez."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Nom de l'événement"
          },
          {
            "x": 50,
            "y": 50,
            "label": "Dates de début et de fin"
          },
          {
            "x": 50,
            "y": 88,
            "label": "Créer l'événement"
          }
        ]
      },
      {
        "slug": "32-event-detail",
        "path": "/event/demo-event-retraite",
        "title": "Détail d'un événement",
        "feature": "Événements",
        "section": "evenements",
        "purpose": "Fiche d'un événement : informations, budget, tâches et dépenses rattachées.",
        "steps": [
          "Consultez les informations et le budget.",
          "Suivez l'avancement des tâches.",
          "Ajoutez une tâche ou une dépense."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Informations et statut"
          },
          {
            "x": 50,
            "y": 48,
            "label": "Budget de l'événement"
          },
          {
            "x": 50,
            "y": 74,
            "label": "Tâches à réaliser"
          }
        ]
      },
      {
        "slug": "33-event-edit",
        "path": "/event/demo-event-retraite/edit",
        "title": "Modifier un événement",
        "feature": "Événements",
        "section": "evenements",
        "purpose": "Corrige les informations d'un événement existant (nom, dates, statut, budget).",
        "steps": [
          "Modifiez les champs nécessaires.",
          "Ajustez le budget si besoin.",
          "Enregistrez les modifications."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Champs modifiables"
          },
          {
            "x": 50,
            "y": 58,
            "label": "Statut et budget"
          },
          {
            "x": 50,
            "y": 88,
            "label": "Enregistrer"
          }
        ]
      },
      {
        "slug": "34-culte-detail",
        "path": "/culte/demo-event-culte",
        "title": "Détail d'un culte",
        "feature": "Événements",
        "section": "evenements",
        "purpose": "Fiche d'un culte : présences, cotisations collectées et saisie rapide.",
        "steps": [
          "Consultez le récapitulatif des membres.",
          "Vérifiez les cotisations payées.",
          "Utilisez la saisie rapide pour enregistrer les paiements."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Date du culte"
          },
          {
            "x": 50,
            "y": 46,
            "label": "Présences et totaux"
          },
          {
            "x": 50,
            "y": 74,
            "label": "Cotisations collectées"
          }
        ]
      },
      {
        "slug": "35-reports",
        "path": "/reports",
        "title": "Rapports",
        "feature": "Rapports & archives",
        "section": "rapports",
        "purpose": "Génère des rapports financiers et d'activité, exportables en PDF.",
        "steps": [
          "Choisissez le type de rapport.",
          "Sélectionnez la période.",
          "Générez puis exportez en PDF."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Types de rapports"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Période d'analyse"
          },
          {
            "x": 50,
            "y": 80,
            "label": "Générer / exporter"
          }
        ]
      },
      {
        "slug": "36-report-builder",
        "path": "/report-builder",
        "title": "Générateur de rapports",
        "feature": "Rapports & archives",
        "section": "rapports",
        "purpose": "Compose un rapport sur mesure : source de données, dimensions, indicateurs et filtres.",
        "steps": [
          "Choisissez la source de données.",
          "Sélectionnez les dimensions et les indicateurs.",
          "Prévisualisez puis enregistrez le rapport."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 26,
            "label": "Source de données"
          },
          {
            "x": 50,
            "y": 50,
            "label": "Dimensions et indicateurs"
          },
          {
            "x": 50,
            "y": 84,
            "label": "Prévisualiser / enregistrer"
          }
        ]
      },
      {
        "slug": "37-archives",
        "path": "/archives",
        "title": "Archives (corbeille)",
        "feature": "Rapports & archives",
        "section": "archives",
        "purpose": "Corbeille : éléments supprimés mais récupérables (suppression douce). Rien n'est perdu définitivement.",
        "steps": [
          "Parcourez les éléments archivés par type.",
          "Appuyez sur « Restaurer » pour remettre un élément.",
          "Le motif d'archivage est indiqué pour chaque ligne."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Filtre par type d'élément"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Éléments archivés"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Restaurer un élément"
          }
        ]
      },
      {
        "slug": "38-history",
        "path": "/history",
        "title": "Historique",
        "feature": "Rapports & archives",
        "section": "historique",
        "purpose": "Historique des mouvements financiers dans le temps, avec évolution graphique.",
        "steps": [
          "Choisissez la période.",
          "Parcourez la chronologie des mouvements.",
          "Lisez la courbe d'évolution."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Sélecteur de période"
          },
          {
            "x": 50,
            "y": 44,
            "label": "Courbe d'évolution"
          },
          {
            "x": 50,
            "y": 74,
            "label": "Chronologie des mouvements"
          }
        ]
      },
      {
        "slug": "39-trace",
        "path": "/trace",
        "title": "Journal d'audit",
        "feature": "Rapports & archives",
        "section": "trace",
        "purpose": "Journal consultable des actions sensibles : qui a créé, approuvé ou modifié quoi, et quand.",
        "steps": [
          "Parcourez les entrées du plus récent au plus ancien.",
          "Repérez l'action, l'auteur et le rôle au moment des faits.",
          "Utilisez ce journal comme preuve en cas de litige."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Entrées d'audit"
          },
          {
            "x": 50,
            "y": 50,
            "label": "Action et auteur"
          },
          {
            "x": 50,
            "y": 76,
            "label": "Date et rôle au moment des faits"
          }
        ]
      },
      {
        "slug": "40-forms",
        "path": "/forms",
        "title": "Formulaires",
        "feature": "Formulaires",
        "section": "formulaires",
        "purpose": "Liste les formulaires personnalisés définis pour l'organisation (fiches de visite, sondages…).",
        "steps": [
          "Parcourez les formulaires disponibles.",
          "Ouvrez-en un pour le remplir ou le modifier.",
          "Créez un nouveau formulaire via « + »."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Formulaires disponibles"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Statut (publié / brouillon)"
          },
          {
            "x": 85,
            "y": 90,
            "label": "Créer un formulaire"
          }
        ]
      },
      {
        "slug": "41-form-fill",
        "path": "/form/fill/demo-form-visite",
        "title": "Remplir un formulaire",
        "feature": "Formulaires",
        "section": "formulaires",
        "purpose": "Saisie d'un formulaire : champs définis sur mesure, validés avant envoi.",
        "steps": [
          "Remplissez chaque champ obligatoire (*).",
          "Joignez une pièce si le formulaire le demande.",
          "Validez pour envoyer la soumission."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Champs du formulaire"
          },
          {
            "x": 50,
            "y": 62,
            "label": "Champ obligatoire (*)"
          },
          {
            "x": 50,
            "y": 88,
            "label": "Envoyer la soumission"
          }
        ]
      },
      {
        "slug": "42-form-submissions",
        "path": "/forms/demo-form-visite/submissions",
        "title": "Soumissions d'un formulaire",
        "feature": "Formulaires",
        "section": "formulaires",
        "purpose": "Liste les réponses reçues pour un formulaire, avec leur statut de traitement.",
        "steps": [
          "Parcourez les soumissions reçues.",
          "Ouvrez-en une pour lire les réponses.",
          "Marquez-la comme traitée ou rejetée."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Soumissions reçues"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Statut de traitement"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Ouvrir une soumission"
          }
        ]
      },
      {
        "slug": "43-custom-fields",
        "path": "/custom-fields",
        "title": "Champs personnalisés",
        "feature": "Formulaires",
        "section": "formulaires",
        "purpose": "Définit des champs supplémentaires sur les membres, transactions, etc. (au-delà des champs standards).",
        "steps": [
          "Choisissez l'entité à étendre.",
          "Ajoutez un champ (nom, type, options).",
          "Le champ apparaît ensuite dans les fiches concernées."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Entité concernée"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Champs personnalisés"
          },
          {
            "x": 85,
            "y": 90,
            "label": "Ajouter un champ"
          }
        ]
      },
      {
        "slug": "44-invitation-emit",
        "path": "/invitation/emit",
        "title": "Émettre une invitation",
        "feature": "Invitations",
        "section": "roles",
        "purpose": "Crée un code ou un QR code d'invitation pour faire rejoindre un nouveau membre à l'organisation.",
        "steps": [
          "Choisissez le rôle à attribuer à l'invité.",
          "Générez le code ou le QR code.",
          "Partagez-le (le code a une durée de validité)."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 28,
            "label": "Rôle de l'invité"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Code d'invitation"
          },
          {
            "x": 50,
            "y": 78,
            "label": "QR code à partager"
          }
        ]
      },
      {
        "slug": "45-invitation-claim",
        "path": "/invitation/claim",
        "title": "Rejoindre par code",
        "feature": "Invitations",
        "section": "roles",
        "purpose": "Permet à un nouvel utilisateur de rejoindre une organisation à partir d'un code ou d'un QR code.",
        "steps": [
          "Scannez le QR code ou saisissez le code manuellement.",
          "Vérifiez l'organisation proposée.",
          "Validez : votre compte rejoint l'organisation."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 34,
            "label": "Saisie du code d'invitation"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Scanner un QR code"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Rechercher l'invitation"
          }
        ]
      },
      {
        "slug": "46-invitation-manage",
        "path": "/invitation/manage",
        "title": "Gérer les invitations",
        "feature": "Invitations",
        "section": "roles",
        "purpose": "Suivi des invitations émises : statut (en attente, acceptée, expirée) et révocation.",
        "steps": [
          "Parcourez les invitations émises.",
          "Vérifiez leur statut.",
          "Révoquez une invitation non utilisée."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Invitations émises"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Statut de l'invitation"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Révoquer"
          }
        ]
      },
      {
        "slug": "47-admin",
        "path": "/admin",
        "title": "Administration",
        "feature": "Administration",
        "section": "roles",
        "purpose": "Tableau de bord d'administration : accès à la fédération, aux rôles, aux unités et aux rapports.",
        "steps": [
          "Choisissez la section d'administration voulue.",
          "Les entrées visibles dépendent de votre rôle.",
          "Revenez ici pour changer de section."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Sections d'administration"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Accès selon votre rôle"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Ouvrir une section"
          }
        ]
      },
      {
        "slug": "48-admin-federation",
        "path": "/admin/federation",
        "title": "Fédération",
        "feature": "Administration",
        "section": "roles",
        "purpose": "Gestion des organisations rattachées (annexes, églises filles) au sein d'une fédération.",
        "steps": [
          "Parcourez les organisations rattachées.",
          "Ouvrez une organisation pour la gérer.",
          "Créez une annexe si votre rôle le permet."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Organisations rattachées"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Statut et type"
          },
          {
            "x": 85,
            "y": 90,
            "label": "Créer une annexe"
          }
        ]
      },
      {
        "slug": "49-admin-federation-tree",
        "path": "/admin/federation/tree",
        "title": "Arbre de fédération",
        "feature": "Administration",
        "section": "roles",
        "purpose": "Vue arborescente de la hiérarchie des organisations (mère, filles, annexes).",
        "steps": [
          "Dépliez les nœuds pour explorer la hiérarchie.",
          "Repérez la position d'une organisation.",
          "Ouvrez un nœud pour accéder à sa fiche."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 26,
            "label": "Organisation mère"
          },
          {
            "x": 50,
            "y": 50,
            "label": "Organisations filles"
          },
          {
            "x": 50,
            "y": 74,
            "label": "Déplier / replier"
          }
        ]
      },
      {
        "slug": "50-admin-units",
        "path": "/admin/units",
        "title": "Unités / annexes",
        "feature": "Administration",
        "section": "roles",
        "purpose": "Gestion des unités organisationnelles (départements, annexes) et de leur rattachement.",
        "steps": [
          "Parcourez les unités existantes.",
          "Ouvrez une unité pour la modifier.",
          "Ajoutez une nouvelle unité."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Liste des unités"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Rattachement"
          },
          {
            "x": 85,
            "y": 90,
            "label": "Ajouter une unité"
          }
        ]
      },
      {
        "slug": "51-admin-report-send",
        "path": "/admin/report-send",
        "title": "Envoyer un rapport",
        "feature": "Administration",
        "section": "rapports",
        "purpose": "Transmet un rapport d'activité ou financier à l'organisation mère (fédération).",
        "steps": [
          "Choisissez la période et le type de rapport.",
          "Sélectionnez le destinataire.",
          "Envoyez : l'historique des envois est conservé."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 26,
            "label": "Période du rapport"
          },
          {
            "x": 50,
            "y": 48,
            "label": "Destinataire"
          },
          {
            "x": 50,
            "y": 82,
            "label": "Envoyer le rapport"
          }
        ]
      },
      {
        "slug": "52-admin-reports",
        "path": "/admin/reports",
        "title": "Rapports reçus",
        "feature": "Administration",
        "section": "rapports",
        "purpose": "Boîte de réception des rapports transmis par les organisations rattachées.",
        "steps": [
          "Parcourez les rapports reçus.",
          "Ouvrez un rapport pour le consulter.",
          "Exportez-le en PDF si nécessaire."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Rapports reçus"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Organisation émettrice"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Ouvrir / exporter"
          }
        ]
      },
      {
        "slug": "53-admin-roles",
        "path": "/admin/roles",
        "title": "Rôles & permissions",
        "feature": "Administration",
        "section": "roles",
        "purpose": "Présente les rôles disponibles et les permissions accordées à chacun.",
        "steps": [
          "Parcourez les rôles et leurs droits.",
          "Vérifiez qui peut approuver, créer ou supprimer.",
          "Attribuez un rôle à un membre via les invitations."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Liste des rôles"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Permissions accordées"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Portée des droits"
          }
        ]
      },
      {
        "slug": "54-admin-transfer-ownership",
        "path": "/admin/transfer-ownership",
        "title": "Transfert de propriété",
        "feature": "Administration",
        "section": "roles",
        "purpose": "Transmet la propriété de l'organisation à un autre administrateur (évite une organisation orpheline).",
        "steps": [
          "Choisissez le nouveau propriétaire.",
          "Confirmez la double validation demandée.",
          "Le transfert est tracé dans le journal d'audit."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Nouveau propriétaire"
          },
          {
            "x": 50,
            "y": 56,
            "label": "Confirmation"
          },
          {
            "x": 50,
            "y": 84,
            "label": "Transférer la propriété"
          }
        ]
      },
      {
        "slug": "55-help",
        "path": "/help",
        "title": "Centre d'aide",
        "feature": "Aide & réglages",
        "section": "faq",
        "purpose": "Recherche dans le tutoriel et la FAQ ; point d'entrée de l'aide et du signalement de problème.",
        "steps": [
          "Saisissez un mot-clé pour chercher dans l'aide.",
          "Parcourez les questions fréquentes.",
          "Utilisez « Signaler un problème » si besoin."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 22,
            "label": "Recherche dans l'aide"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Questions fréquentes"
          },
          {
            "x": 50,
            "y": 80,
            "label": "Signaler un problème"
          }
        ]
      },
      {
        "slug": "56-settings",
        "path": "/settings",
        "title": "Réglages",
        "feature": "Aide & réglages",
        "section": "parametres",
        "purpose": "Point d'entrée des réglages : profil, thème, notifications, gestion et santé de l'application.",
        "steps": [
          "Choisissez la catégorie de réglages.",
          "Chaque entrée ouvre un écran dédié.",
          "Les réglages sont propres à votre compte / organisation."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Catégories de réglages"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Ouvrir une catégorie"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Sauvegarde et santé"
          }
        ]
      },
      {
        "slug": "57-settings-profil",
        "path": "/settings/profil",
        "title": "Profil",
        "feature": "Aide & réglages",
        "section": "parametres",
        "purpose": "Modifie vos informations personnelles : nom, photo, coordonnées.",
        "steps": [
          "Modifiez vos informations.",
          "Changez votre photo de profil.",
          "Enregistrez : le profil se synchronise."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Photo de profil"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Informations personnelles"
          },
          {
            "x": 50,
            "y": 84,
            "label": "Enregistrer"
          }
        ]
      },
      {
        "slug": "58-settings-theme",
        "path": "/settings/theme",
        "title": "Thème & apparence",
        "feature": "Aide & réglages",
        "section": "parametres",
        "purpose": "Règle le mode (clair/sombre) et la couleur de marque de l'application.",
        "steps": [
          "Choisissez le mode clair ou sombre.",
          "Sélectionnez une couleur de marque.",
          "Le choix est conservé entre les sessions."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 28,
            "label": "Mode clair / sombre"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Couleur de marque"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Aperçu"
          }
        ]
      },
      {
        "slug": "59-settings-personnalisation",
        "path": "/settings/personnalisation",
        "title": "Personnalisation",
        "feature": "Aide & réglages",
        "section": "parametres",
        "purpose": "Personnalise l'identité visuelle de l'organisation (nom, logo, couleurs).",
        "steps": [
          "Renseignez le nom affiché de l'organisation.",
          "Ajoutez un logo.",
          "Enregistrez : l'identité s'applique partout."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Nom de l'organisation"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Logo"
          },
          {
            "x": 50,
            "y": 84,
            "label": "Enregistrer"
          }
        ]
      },
      {
        "slug": "60-settings-features",
        "path": "/settings/features",
        "title": "Fonctionnalités",
        "feature": "Aide & réglages",
        "section": "parametres",
        "purpose": "Active ou désactive des fonctionnalités (interrupteurs) pour adapter l'application à vos besoins.",
        "steps": [
          "Parcourez la liste des fonctionnalités.",
          "Activez ou désactivez un interrupteur.",
          "Les changements s'appliquent immédiatement."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Liste des fonctionnalités"
          },
          {
            "x": 78,
            "y": 50,
            "label": "Interrupteur on/off"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Description de la fonctionnalité"
          }
        ]
      },
      {
        "slug": "61-settings-notifications",
        "path": "/settings/notifications",
        "title": "Réglages des notifications",
        "feature": "Aide & réglages",
        "section": "parametres",
        "purpose": "Choisit les notifications à recevoir et les marque comme lues.",
        "steps": [
          "Activez ou désactivez chaque type d'alerte.",
          "Marquez tout comme lu.",
          "Vérifiez le total de notifications."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Types de notifications"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Activer / désactiver"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Tout marquer comme lu"
          }
        ]
      },
      {
        "slug": "62-settings-gestion",
        "path": "/settings/gestion",
        "title": "Gestion",
        "feature": "Aide & réglages",
        "section": "parametres",
        "purpose": "Outils de gestion avancée : sauvegarde/export, corbeille, journal, état du système.",
        "steps": [
          "Choisissez l'outil voulu (export, corbeille, santé).",
          "Exportez vos données pour les sauvegarder.",
          "Consultez l'état du système en cas de doute."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "Outils de gestion"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Sauvegarde / export"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Santé de l'application"
          }
        ]
      },
      {
        "slug": "63-settings-about",
        "path": "/settings/about",
        "title": "À propos",
        "feature": "Aide & réglages",
        "section": "parametres",
        "purpose": "Informations sur l'application : version, mentions légales, mises à jour.",
        "steps": [
          "Vérifiez la version installée.",
          "Consultez les mentions légales.",
          "Lancez une mise à jour si elle est proposée."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 30,
            "label": "Version de l'application"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Mentions légales"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Mise à jour"
          }
        ]
      },
      {
        "slug": "64-settings-health",
        "path": "/settings/health",
        "title": "Santé de l'application",
        "feature": "Aide & réglages",
        "section": "trace",
        "purpose": "Diagnostic : version, état de la base locale, synchronisation et dernières erreurs.",
        "steps": [
          "Vérifiez l'état de la synchronisation.",
          "Consultez les dernières erreurs enregistrées.",
          "Exportez le diagnostic pour le support."
        ],
        "annotations": [
          {
            "x": 50,
            "y": 24,
            "label": "État de la synchronisation"
          },
          {
            "x": 50,
            "y": 52,
            "label": "Base locale et version"
          },
          {
            "x": 50,
            "y": 78,
            "label": "Dernières erreurs"
          }
        ]
      }
    ],
};

export default SCREEN_GUIDE;
