/**
 * Contenu partagé du tutoriel / centre d'aide (PR16, Phase 13).
 *
 * Les sections pédagogiques vivaient uniquement dans `src/pages/Tutorial.tsx`.
 * Le centre d'aide (`src/pages/Help.tsx`) a besoin de la MÊME donnée pour
 * offrir une recherche : on l'extrait ici, en SOURCE UNIQUE, et les deux pages
 * l'importent. Aucune duplication de contenu.
 *
 * Ce module ajoute aussi les primitives pures de recherche (normalisation
 * accents/casse, filtrage) et la FAQ « Questions fréquentes », testées
 * séparément (`tutorial-search.test.ts`).
 */
import {
  BookOpen,
  Home,
  Wallet,
  Landmark,
  Users,
  ArrowRightLeft,
  CalendarPlus,
  ClipboardList,
  History,
  BarChart3,
  LineChart,
  FileText,
  ListChecks,
  Archive,
  Settings,
  HelpCircle,
  AlertCircle,
  ShieldCheck,
  Database,
  Upload,
  Crown,
} from "lucide-react";

import { CHART_COLORS } from "./utils";

interface SectionData {
  id: string;
  title: string;
  icon: typeof BookOpen;
  color: string;
  iconBg: string;
  titleColor: string;
  paragraphs: string[];
  tips?: string[];
  warnings?: string[];
  faqs?: { q: string; a: string }[];
  errors?: { title: string; solution: string }[];
  diagram?: "transaction-flow" | "versement-flow" | "group-tree";
  chart?: "transaction-donut" | "history-line" | "balance-area" | "group-bar";
}

// ─── Sections data ──────────────────────────────────────────────────────────────
const SECTIONS: SectionData[] = [
  {
    id: "overview",
    title: "Vue d'ensemble",
    icon: BookOpen,
    color: "var(--accent-primary)",
    iconBg: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
    titleColor: "var(--accent-primary)",
    paragraphs: [
      "Lumina est une application de gestion financière conçue pour les églises et organisations chrétiennes.",
      "Elle permet de suivre les entrées et sorties d'argent, de gérer les caisses par groupe, de planifier des événements avec leur budget, et de produire des rapports financiers.",
      "Toutes vos données sont stockées localement sur votre appareil. Elles sont synchronisées automatiquement avec le cloud lorsque vous êtes connecté.",
      "L'application fonctionne entièrement hors ligne — aucune connexion internet n'est requise pour utiliser Lumina.",
    ],
    tips: [
      "Lumina fonctionne même sans connexion internet. Les données sont synchronisées automatiquement à la reconnexion.",
      "Les transactions doivent être approuvées par un trésorier pour être validées.",
      "Chaque groupe a sa propre caisse — les versements transfèrent les fonds vers la caisse principale.",
      "Accédez directement au dashboard en cliquant sur « Accueil » dans la barre de navigation.",
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: Home,
    color: CHART_COLORS.income,
    iconBg: "color-mix(in srgb, var(--data-income) 12%, transparent)",
    titleColor: CHART_COLORS.income,
    paragraphs: [
      "Le tableau de bord (Accueil) est votre point d'entrée principal. Il affiche en temps réel le solde de chaque caisse, les entrées et sorties du mois, ainsi que les événements à venir.",
      "La carte principale montre le solde global de la caisse principale (fonds de l'église). Les caisses de groupe (Diacres, Jeunesse, Dames…) sont listées juste en dessous avec leur solde respectif.",
      "Les boutons d'actions rapides permettent de créer une entrée, une sortie, effectuer un versement ou créer un événement en un seul tap.",
      "Le bouton flottant orange (＋) en bas à droite crée rapidement une nouvelle transaction.",
      "La carte « Premiers pas » vous guide, au début, vers ce qu'il reste à faire (premier mouvement, premier membre, premier événement, première invitation). Elle suit votre avancement réel et disparaît une fois tout franchi — ou quand vous la masquez.",
    ],
    tips: [
      "Cliquez sur une caisse du dashboard pour voir toutes ses transactions dans la page Finances.",
      "La carte « Premiers pas » propose toujours l'étape suivante ; touchez-la pour y aller directement.",
      "La section « Événements à venir » montre les prochains événements avec leur avance de budget.",
      "Le badge de notification (cloche) en haut à droite indique le nombre de notifications non lues.",
      "Les statuts « En attente » et « Brouillon » apparaissent dans la section rapide du dashboard.",
    ],
  },
  {
    id: "transactions",
    title: "Transactions",
    icon: Wallet,
    color: CHART_COLORS.income,
    iconBg: "color-mix(in srgb, var(--data-income) 12%, transparent)",
    titleColor: CHART_COLORS.income,
    paragraphs: [
      "Une transaction peut être une entrée (revenu) ou une sortie (dépense). Chaque transaction enregistre le montant, la date, la catégorie, la caisse source, et peut être liée à un groupe ou un événement.",
      "Chaque transaction passe par 4 états : Brouillon → En attente → Approuvé ou Rejeté. Le trésorier et le trésorier adjoint peuvent approuver les transactions en attente. Le pasteur et le trésorier peuvent rejeter une transaction avec un commentaire.",
      "Les transactions approuvées sont immuables — elles ne peuvent pas être modifiées ou supprimées. Seules les transactions en brouillon ou rejetées peuvent être modifiées.",
      "Pour créer une transaction, utilisez le bouton flottant (＋) ou naviguez vers « Finances » → bouton « Nouvelle transaction ».",
    ],
    tips: [
      "Source : CAISSE (provient d'une caisse), COTISATION (d'un membre), PERSONNE (d'une personne spécifique), ou AUTRE.",
      "Vous pouvez lier une transaction à un événement ou à un groupe organisationnel pour le suivi budgétaire.",
      "Le champ « Notes » est optionnel mais recommandé pour la traçabilité.",
      "Une transaction peut être modifiée tant qu'elle n'est pas encore approuvée.",
    ],
    warnings: [
      "Ne créez pas de doublons — vérifiez la date et le montant avant de valider.",
      "Une transaction rejetée ne peut pas être approuvée directement — il faut la recréer.",
      "Les transactions approuvées sont définitives et ne peuvent plus être modifiées.",
    ],
    diagram: "transaction-flow",
    chart: "transaction-donut",
  },
  {
    id: "finance",
    title: "Grand livre",
    icon: Landmark,
    color: CHART_COLORS.planified,
    iconBg: "color-mix(in srgb, var(--data-planified) 12%, transparent)",
    titleColor: CHART_COLORS.planified,
    paragraphs: [
      "Le grand livre (Finances) liste toutes les transactions de la caisse sélectionnée. Il offre un filtre par période (mois ou année), par statut (brouillon, en attente, approuvé, rejeté), par catégorie, et par recherche textuelle.",
      "Les transactions en attente peuvent être approuvées en lot : cochez les cases à côté des transactions, puis cliquez « Approuver tout ».",
      "La section « Par catégorie » affiche un barreau horizontal pour chaque catégorie montrant le rapport entre revenus (vert) et dépenses (rouge).",
      "Le bouton « Exporter le rapport » ouvre un menu avec trois formats disponibles : PDF, Excel et CSV.",
    ],
    tips: [
      "Utilisez la barre de recherche pour trouver une transaction par description, catégorie, groupe ou montant.",
      "Le sélecteur de caisse en haut permet de basculer entre la caisse principale et chaque caisse de groupe.",
      "L'export PDF inclut automatiquement le logo et le nom de l'église configurés dans les Paramètres.",
      "L'export Excel crée plusieurs feuilles : résumé, transactions détaillées, et répartition par groupe.",
    ],
  },
  {
    id: "caisses",
    title: "Gestion des caisses",
    icon: Wallet,
    color: CHART_COLORS.pending,
    iconBg: "color-mix(in srgb, var(--data-pending) 12%, transparent)",
    titleColor: CHART_COLORS.pending,
    paragraphs: [
      "La caisse principale (id: 'main') est la caisse centrale de l'église. C'est elle qui apparaît sur le tableau de bord comme solde global.",
      "Chaque groupe organisationnel a sa propre caisse créée automatiquement lors de la création du groupe.",
      "Un versement est un transfert d'une caisse groupe vers la caisse principale. Il crée automatiquement 2 transactions liées par un 'versementId' — une sortie dans la caisse groupe et une entrée dans la caisse principale.",
      "Le solde d'une caisse est calculé en temps réel à partir des transactions approuvées.",
    ],
    tips: [
      "Le solde d'une caisse groupe = Entrées du groupe − Sorties du groupe.",
      "Le versement ne peut se faire que si le solde est strictement positif.",
      "La page Versement permet de sélectionner un groupe et d'indiquer un montant personnalisé ou 'tout verser'.",
      "Les caisses peuvent être colorées dans les Paramètres pour une identification visuelle rapide.",
    ],
    warnings: [
      "Un versement ne peut pas être annulé — il est irréversible une fois approuvé.",
      "Le solde d'une caisse ne peut pas être négatif — vérifiez les dépenses avant de verser.",
    ],
  },
  {
    id: "groupes",
    title: "Groupes",
    icon: Users,
    color: CHART_COLORS.advance,
    iconBg: "color-mix(in srgb, var(--data-advance) 12%, transparent)",
    titleColor: CHART_COLORS.advance,
    paragraphs: [
      "Les groupes organisationnels (Diacres, Jeunesse, Dames, Messieurs, Chorale…) permettent de segmenter les finances par unité de l'église.",
      "Chaque groupe a une caisse liée automatiquement lors de sa création. Vous pouvez créer, modifier et supprimer des groupes.",
      "La suppression d'un groupe n'est possible que si sa caisse a un solde nul.",
      "La page de détail d'un groupe affiche son solde actuel et un bouton 'Verser à la caisse principale' pour effectuer un versement.",
    ],
    tips: [
      "Utilisez les couleurs pour distinguer visuellement les caisses des groupes sur le dashboard.",
      "Les versements apparaissent comme une sortie dans la caisse groupe et une entrée dans la caisse principale.",
      "Le solde de chaque groupe est visible directement sur le Dashboard.",
      "Un groupe peut être archivé sans être supprimé — il apparaîtra dans la section Archives.",
    ],
    diagram: "group-tree",
    chart: "group-bar",
  },
  {
    id: "versement",
    title: "Versement",
    icon: ArrowRightLeft,
    color: CHART_COLORS.pending,
    iconBg: "color-mix(in srgb, var(--data-pending) 12%, transparent)",
    titleColor: CHART_COLORS.pending,
    paragraphs: [
      "Le versement transfère des fonds d'une caisse groupe vers la caisse principale de l'église.",
      "Il crée automatiquement deux transactions liées par un 'versementId' : une sortie (dépense) dans la caisse groupe et une entrée (revenu) dans la caisse principale.",
      "Depuis la page Versement, sélectionnez un groupe, entrez un montant personnalisé ou choisissez 'Tout verser', puis confirmez.",
      "Vous pouvez aussi lancer un versement directement depuis la page de détail d'un groupe.",
    ],
    tips: [
      "Le solde de la caisse groupe doit être strictement positif avant de pouvoir verser.",
      "Le montant personnalisé doit être inférieur ou égal au solde disponible.",
      "Les boutons rapides (25%, 50%, 75%, 100%) accélèrent la saisie du montant.",
      "Un commentaire optionnel peut être ajouté pour traçabilité.",
    ],
    warnings: [
      "Un versement est irréversible une fois confirmé.",
      "Vérifiez le solde disponible avant de confirmer le versement.",
    ],
    diagram: "versement-flow",
  },
  {
    id: "evenements",
    title: "Événements",
    icon: CalendarPlus,
    color: CHART_COLORS.pink,
    iconBg: "color-mix(in srgb, var(--data-pink) 12%, transparent)",
    titleColor: CHART_COLORS.pink,
    paragraphs: [
      "Un événement représente une célébration, une conférence, une semaine de prière, ou toute action spéciale de l'église.",
      "Chaque événement a un budget avec des postes (dîme, offrande, frais de fonctionnement, mission…) et une liste d'achats avec quantité, prix et fournisseur.",
      "Le statut suit un cycle : Planifié → En cours → Terminé (ou Annulé). Le solde engagé est calculé en temps réel à partir des transactions liées.",
      "Chaque événement peut avoir une liste de courses avec des articles à acheter, permettant de suivre les dépenses avant et après l'événement.",
    ],
    tips: [
      "Configurez le budget par poste pour suivre précisément les dépenses de chaque événement.",
      "La liste d'achats aide à planifier les achats nécessaires (quantité, prix unitaire, fournisseur).",
      "Les transactions liées à un événement permettent de suivre automatiquement le budget engagé.",
      "Un événement peut être marqué comme « Terminé » lorsqu'il est terminé, ce qui fige le suivi budgétaire.",
    ],
    warnings: [
      "Ne dépassez pas le budget alloué — le système indique quand un poste est en dépassement.",
      "Un événement annulé ne doit pas générer de nouvelles transactions.",
      "La suppression d'un événement ne supprime pas les transactions qui lui sont liées.",
    ],
  },
  {
    id: "membres",
    title: "Membres",
    icon: ClipboardList,
    color: CHART_COLORS.success,
    iconBg: "color-mix(in srgb, var(--data-success) 12%, transparent)",
    titleColor: CHART_COLORS.success,
    paragraphs: [
      "Le module Membres permet de gérer les personnes de l'église : ajouter, rechercher, archiver et restaurer des membres.",
      "Chaque membre a un prénom, un nom, un téléphone et un email. Les membres archivés ne sont plus visibles dans la liste active mais peuvent être restaurés.",
      "Les membres peuvent être liés à des transactions (source COTISATION ou PERSONNE) pour un suivi individuel des cotisations et dons.",
      "La recherche en temps réel permet de trouver rapidement un membre par nom ou email.",
    ],
    tips: [
      "Archivez les membres qui quittent l'église plutôt que de les supprimer — cela préserve l'historique.",
      "Un membre restauré redevient actif et peut à nouveau être sélectionné dans les transactions.",
      "La section Archivés montre les membres archivés avec la raison de l'archivage.",
      "Les initiales du membre servent d'avatar visuel par défaut.",
    ],
  },
  {
    id: "historique",
    title: "Historique",
    icon: History,
    color: CHART_COLORS.pending,
    iconBg: "color-mix(in srgb, var(--data-pending) 12%, transparent)",
    titleColor: CHART_COLORS.pending,
    paragraphs: [
      "La page Historique offre une vue approfondie des données financières avec des graphiques interactifs à courbes de Bézier.",
      "L'onglet « Vue d'ensemble » affiche les revenus vs dépenses en courbe lissée, le solde cumulé mois par mois, et la répartition par catégorie en graphique donut.",
      "L'onglet « Mensuel » propose un histogramme des revenus et dépenses par mois avec des barres de proportion détaillées.",
      "Les onglets « Par caisse », « Par groupe », « Par événement » et « Par catégorie » permettent de filtrer les données par dimension.",
      "Le sélecteur de période (Tout / Ce mois / Cette année) s'applique à tous les graphiques.",
    ],
    tips: [
      "Les courbes de Bézier offrent une visualisation fluide des tendances financières au fil du temps.",
      "Le solde cumulé montre l'évolution nette de vos finances mois après mois.",
      "Le donut par catégorie permet d'identifier rapidement les postes les plus représentés.",
      "L'activité récente dans l'historique permet de suivre les dernières actions du trésorier.",
    ],
    chart: "history-line",
  },
  {
    id: "rapports",
    title: "Rapports",
    icon: BarChart3,
    color: CHART_COLORS.planified,
    iconBg: "color-mix(in srgb, var(--data-planified) 12%, transparent)",
    titleColor: CHART_COLORS.planified,
    paragraphs: [
      "Le module Rapports offre une vue consolidée des finances avec des indicateurs clés : entrées, sorties et résultat net.",
      "Sélectionnez une période (ce mois ou cette année) et visualisez les tendances financières.",
      "Les transactions approuvées de la caisse principale sont listées avec leur montant, date et description.",
      "Les rapports peuvent être exportés en PDF, Excel ou CSV pour partage avec l'équipe de direction.",
    ],
    tips: [
      "Le sélecteur de période s'applique à tous les indicateurs et à la liste des transactions.",
      "L'export PDF inclut automatiquement le logo et le nom de l'église.",
      "L'export Excel crée plusieurs feuilles : résumé, transactions détaillées, répartition par groupe.",
      "Le format CSV est compatible avec tous les tableurs pour analyses personnalisées.",
    ],
  },
  {
    id: "bilan",
    title: "Bilan",
    icon: LineChart,
    color: CHART_COLORS.planified, // cyan 06B6D4 hors palette (DESIGN.md §2) → .planified
    iconBg: "color-mix(in srgb, var(--data-planified) 12%, transparent)",
    titleColor: CHART_COLORS.planified,
    paragraphs: [
      "Le bilan financier résume les entrées et sorties sur une période donnée (mois ou année) pour la caisse sélectionnée.",
      "Il présente les totaux par catégorie avec des barres de proportion visuelles, permettant une analyse rapide de la répartition des flux.",
      "Les exports PDF, Excel et CSV incluent le nom de l'église et son logo (configurables dans Paramètres).",
      "Le bilan est un outil essentiel pour les réunions du conseil d'église et les rapports annuels.",
    ],
    tips: [
      "Configurez le nom complet de l'église et son logo dans Paramètres pour des exports professionnels.",
      "L'export Excel contient plusieurs feuilles : revenus, dépenses, et résumé par catégorie.",
      "Le format PDF est idéal pour l'impression et l'envoi aux instances de l'église.",
      "Le format CSV est compatible avec tous les tableurs et outils de traitement de données.",
    ],
    chart: "balance-area",
  },
  {
    id: "formulaires",
    title: "Formulaires",
    icon: FileText,
    color: CHART_COLORS.advance,
    iconBg: "color-mix(in srgb, var(--data-advance) 12%, transparent)",
    titleColor: CHART_COLORS.advance,
    paragraphs: [
      "Le module Formulaires permet de créer des formulaires personnalisés pour la collecte de données : cotisations, demandes, témoignages, etc.",
      "Chaque formulaire a des champs configurables : texte, nombre, date, sélection, vrai/faux, montant (FCFA), texte long.",
      "Les formulaires peuvent être publiés ou gardés en brouillon. Un formulaire publié peut être rempli par les membres de l'église.",
      "Les champs personnalisés s'appliquent aux entités existantes (transactions, événements, groupes, membres, caisses, catégories) pour ajouter des attributs spécifiques.",
    ],
    tips: [
      "Une clé de formulaire doit être unique et sans espace — le système la transforme automatiquement.",
      "Les champs « Sélection » acceptent une liste d'options, une par ligne.",
      "Un champ personnalisé sur une transaction apparaît dans le formulaire de création/modification.",
      "Les formulaires peuvent être exportés et utilisés pour la collecte de données régulières.",
    ],
    warnings: [
      "Un formulaire publié ne peut pas être modifié — il faut le repasser en brouillon.",
      "Supprimer un champ personnalisé ne supprime pas les données déjà saisies.",
    ],
  },
  {
    id: "trace",
    title: "Trace d'activité",
    icon: ListChecks,
    color: CHART_COLORS.expense,
    iconBg: "color-mix(in srgb, var(--data-expense) 12%, transparent)",
    titleColor: CHART_COLORS.expense,
    paragraphs: [
      "La page Trace d'activité affiche l'historique complet de toutes les actions financières : créations, modifications, approbations, rejets, archivages et restaurations.",
      "Chaque entrée de trace indique l'action, l'entité concernée, le montant (le cas échéant), et l'auteur.",
      "Touchez une entrée pour déplier son DÉTAIL : le rôle de l'auteur au moment de l'action, le commentaire, et la différence entre l'état AVANT et APRÈS (uniquement les champs réellement modifiés).",
      "Une entrée sans état précédent est marquée « Créé », une entrée sans état suivant est marquée « Supprimé » — vous savez ainsi ce qui a changé, pas seulement qu'une action a eu lieu.",
      "Les filtres par type d'entité (Transaction, Groupe, Membre, Événement, Budget, Formulaire) permettent de réduire la vue.",
      "La recherche textuelle permet de retrouver une action spécifique rapidement.",
    ],
    tips: [
      "La trace est un outil d'audit essentiel pour la transparence financière.",
      "Le détail d'une entrée montre le rôle exact (au moment de l'action), même si l'utilisateur a changé de rôle depuis.",
      "Les actions du trésorier et du pasteur sont distinctement identifiées.",
      "Les entrées archivées et restaurées apparaissent aussi dans la trace.",
      "Filtrez par « Transaction » pour suivre toutes les opérations financières.",
    ],
  },
  {
    id: "archives",
    title: "Archives",
    icon: Archive,
    color: "var(--text-tertiary)",
    iconBg: "color-mix(in srgb, var(--text-tertiary) 12%, transparent)",
    titleColor: "var(--text-tertiary)",
    paragraphs: [
      "L'archivage permet de masquer les éléments inactifs sans les supprimer définitivement : groupes, comptes, membres et événements.",
      "Un groupe est archivé quand il n'a plus d'activité. Un événement devient « Archivé » quand il est annulé.",
      "La page Archives centralise tous les éléments archivés avec la possibilité de les restaurer en un clic.",
      "Les éléments archivés ne sont plus visibles dans les listes principales mais peuvent être restaurés à tout moment.",
    ],
    tips: [
      "L'archivage préserve l'historique complet — les données restent consultables dans les archives.",
      "Un membre archivé peut être restauré pour retrouver son accès aux transactions passées.",
      "Un groupe restauré retrouve son compte caisse et son historique de transactions.",
      "La recherche dans les archives permet de retrouver rapidement un élément spécifique.",
    ],
  },
  {
    id: "signaler-probleme",
    title: "Signaler un problème",
    icon: AlertCircle,
    color: CHART_COLORS.expense,
    iconBg: "color-mix(in srgb, var(--data-expense) 12%, transparent)",
    titleColor: CHART_COLORS.expense,
    paragraphs: [
      "Lorsque quelque chose ne fonctionne pas, la page « État du système » (Paramètres → État du système) permet de signaler le problème au support en un geste.",
      "Le bouton « Signaler un problème » ouvre une zone où vous pouvez décrire ce qui s'est passé (facultatif), puis « Envoyer le signalement » transmet le diagnostic.",
      "Le signalement joint automatiquement la version de l'app, la plateforme, l'état du système (réseau, synchronisation, organisation) et les codes des dernières erreurs — jamais votre nom, votre e-mail ni le contenu de vos données.",
      "Un signalement reste toujours enregistré localement sur l'appareil ; la ligne « Dernier signalement » vous confirme qu'il a bien été pris en compte.",
    ],
    tips: [
      "Décrivez l'action qui a déclenché le problème (page ouverte, bouton cliqué) : cela aide le support à reproduire.",
      "Le bouton « Copier le diagnostic » reste disponible pour transmettre le texte à un technicien par un autre canal.",
      "Aucune donnée personnelle n'est transmise : seuls des éléments techniques anonymes le sont.",
    ],
    warnings: [
      "Si l'envoi automatique est indisponible (hors ligne), le signalement est conservé localement et transmis dès que possible.",
    ],
  },
  {
    id: "parametres",
    title: "Paramètres",
    icon: Settings,
    color: "var(--text-secondary)",
    iconBg: "color-mix(in srgb, var(--text-tertiary) 12%, transparent)",
    titleColor: "var(--text-tertiary)",
    paragraphs: [
      "Les Paramètres permettent de configurer l'identité de l'église : nom complet, logo, et photo de profil utilisateur.",
      "Le nom et le prénom de votre profil sont enregistrés dans la base : ils suivent votre compte sur tous vos appareils et apparaissent dans les traces et les invitations.",
      "Le nom de l'organisation est partagé : un administrateur qui le modifie dans « Personnalisation » le change pour tous les membres, les rapports et l'en-tête.",
      "Le statut de synchronisation indique si l'appareil est connecté au cloud et si les données sont à jour.",
      "Le stockage local affiche le volume de données et le nombre d'actions enregistrées dans la trace.",
      "Les raccourcis rapides donnent accès aux différentes sections de l'application depuis les paramètres.",
    ],
    tips: [
      "Configurez le logo de l'église pour qu'il apparaisse sur tous les exports (PDF, Excel).",
      "La photo de profil personnelle s'affiche dans les traces d'activité pour identifier l'auteur.",
      "Le bouton « Actualiser les données » force un rechargement des données depuis la base locale.",
      "Vérifiez régulièrement le statut de synchronisation pour vous assurer que vos données sont sauvegardées.",
    ],
  },
  {
    id: "sauvegarde",
    title: "Sauvegarde des données",
    icon: Database,
    color: "var(--accent-primary)",
    iconBg: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
    titleColor: "var(--accent-primary)",
    paragraphs: [
      "La sauvegarde se trouve dans Paramètres → onglet « Gérer » → section « Sauvegarde des données ». Elle produit une copie complète de l'organisation active, directement sur votre appareil.",
      "Le bouton « Exporter mes données (JSON) » télécharge un fichier auto-descriptif : il indique le format (lumina-backup), la version, l'organisation, la date et le nombre d'éléments de chaque entité, puis toutes les données (transactions, groupes, membres, événements, caisses, comptes, trace, notifications, documents, formulaires, champs personnalisés).",
      "Le bouton « Exporter (CSV) » produit un tableau unique (une ligne par élément, colonne « entity ») ouvrable dans un tableur. Les cellules sont échappées : une valeur commençant par « = », « + », « - » ou « @ » est neutralisée, elle ne peut donc pas s'exécuter comme formule.",
      "Tant que les données locales n'ont pas été lues, la section affiche « Chargement des données… » et non un compte à zéro : vous ne voyez jamais un chiffre faux pendant la synchronisation.",
    ],
    tips: [
      "Le JSON est la sauvegarde complète (à conserver pour la réversibilité) ; le CSV sert au contrôle dans un tableur.",
      "Exportez régulièrement pour garder une copie hors de l'application et faciliter la passation.",
      "Une fois les données chargées, le nombre total d'éléments exportés est affiché sous le titre.",
    ],
    warnings: [
      "La sauvegarde contient des données de l'organisation : conservez le fichier dans un endroit sûr et ne le partagez pas publiquement.",
    ],
  },
  {
    id: "roles",
    title: "Rôles & Permissions",
    icon: Users,
    color: "var(--accent-primary)",
    iconBg: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
    titleColor: "var(--accent-primary)",
    paragraphs: [
      "Chaque utilisateur choisit son rôle au premier démarrage : Trésorier, Pasteur, Secrétaire, Comptable, Trésorier Adjoint ou Secrétaire Adjoint.",
      "Le trésorier a les permissions complètes : créer, approuver, modifier, supprimer, annuler les transactions et créer des versements.",
      "Le trésorier adjoint dispose des mêmes permissions que le trésorier sur les transactions.",
      "Le pasteur peut approuver et rejeter les transactions, et a un accès en lecture aux données financières.",
      "Le secrétaire gère les événements et les groupes. Le secrétaire adjoint assiste le secrétaire principal.",
      "Le comptable a un accès en lecture aux transactions, rapports et bilans.",
    ],
    tips: [
      "Chaque rôle a des permissions spécifiques qui déterminent les actions possibles.",
      "Le système de trace enregistre l'identité de chaque utilisateur pour chaque action.",
      "Les rôles peuvent être adaptés aux besoins de l'église.",
      "Un utilisateur peut changer de rôle depuis la page de connexion.",
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    icon: HelpCircle,
    color: CHART_COLORS.planified,
    iconBg: "color-mix(in srgb, var(--data-planified) 12%, transparent)",
    titleColor: CHART_COLORS.planified,
    paragraphs: ["Questions fréquentes sur l'utilisation de Lumina."],
    faqs: [
      {
        q: "Qui peut approuver une transaction ?",
        a: "Le trésorier, le trésorier adjoint et le pasteur peuvent approuver les transactions en attente.",
      },
      {
        q: "Qui peut rejeter une transaction ?",
        a: "Le pasteur et le trésorier peuvent rejeter une transaction avec un commentaire.",
      },
      {
        q: "Mes données sont-elles en sécurité ?",
        a: "Oui, elles sont stockées localement sur votre appareil. La synchronisation cloud est optionnelle.",
      },
      {
        q: "Puis-je utiliser Lumina sans internet ?",
        a: "Oui, l'application fonctionne entièrement hors ligne. La synchronisation se fait automatiquement dès la reconnexion.",
      },
      {
        q: "Comment créer un nouveau groupe ?",
        a: "Allez dans Groupes → bouton « Créer » → remplissez le formulaire avec le nom et la couleur du groupe.",
      },
      {
        q: "Comment faire un versement ?",
        a: "Allez dans Plus → Versement, sélectionnez un groupe, entrez le montant, puis confirmez.",
      },
      {
        q: "Comment créer un formulaire personnalisé ?",
        a: "Allez dans Plus → Formulaires → Créer. Choisissez le type de chaque champ et publiez le formulaire.",
      },
      {
        q: "Que signifie « En attente » pour une transaction ?",
        a: "La transaction a été créée mais n'a pas encore été approuvée par un trésorier.",
      },
      {
        q: "Comment exporte-t-on un rapport ?",
        a: "Depuis le Grand livre ou le Bilan, cliquez sur « Exporter le rapport » et choisissez PDF, Excel ou CSV.",
      },
      {
        q: "Comment modifier mon profil ?",
        a: "Allez dans Paramètres → Photo de profil pour changer votre photo. Le nom est modifiable dans Paramètres.",
      },
    ],
  },
  {
    id: "erreurs",
    title: "Erreurs fréquentes",
    icon: AlertCircle,
    color: CHART_COLORS.expense,
    iconBg: "color-mix(in srgb, var(--data-expense) 12%, transparent)",
    titleColor: CHART_COLORS.expense,
    paragraphs: ["Erreurs courantes et comment les résoudre."],
    errors: [
      {
        title: "Transaction impossible à approuver",
        solution:
          "Vérifiez que vous avez le rôle de trésorier ou pasteur. Les brouillons doivent d'abord être soumis avant approbation.",
      },
      {
        title: "Solde négatif impossible à verser",
        solution:
          "Le versement est bloqué si le solde est négatif ou nul. Vérifiez les transactions du groupe avant de procéder.",
      },
      {
        title: "Export PDF vide",
        solution:
          "Assurez-vous d'avoir configuré le nom de l'église et le logo dans Paramètres avant d'exporter.",
      },
      {
        title: "Groupe introuvable après suppression",
        solution:
          "C'est normal — un groupe supprimé ne peut pas être restauré. Créez-en un nouveau et mettez à jour les références.",
      },
      {
        title: "Synchronisation bloquée",
        solution:
          "Vérifiez votre connexion internet. Si le problème persiste, allez dans Paramètres → Actualiser les données.",
      },
      {
        title: "Transaction rejetée, comment la modifier ?",
        solution:
          "Une transaction rejetée doit être recréée. Vous pouvez copier les informations de l'ancienne transaction dans la nouvelle.",
      },
      {
        title: "Champ personnalisé introuvable",
        solution:
          "Vérifiez que le champ personnalisé a bien été créé pour l'entité concernée (Transaction, Événement, etc.).",
      },
      {
        title: "Événement ne s'affiche pas",
        solution:
          "Vérifiez que l'événement n'a pas été archivé. Consultez la section Archives pour le restaurer.",
      },
    ],
  },
  {
    id: "centre-aide",
    title: "Centre d'aide & statistiques d'usage",
    icon: HelpCircle,
    color: CHART_COLORS.success,
    iconBg: "color-mix(in srgb, var(--data-success) 12%, transparent)",
    titleColor: CHART_COLORS.success,
    paragraphs: [
      "Le centre d'aide (menu Aide) regroupe le tutoriel et une FAQ. Utilisez la barre de recherche : elle filtre instantanément les sections du tutoriel ET les questions fréquentes, sans tenir compte des accents ni des majuscules (« evenement » trouve « Événements »).",
      "« Aucun résultat » n'apparaît que lorsque votre recherche ne correspond à rien. Si le champ est vide, tout le contenu reste visible.",
      "L'écran « État du système » (Paramètres) affiche des statistiques d'usage ANONYMES : uniquement des compteurs par fonctionnalité (par exemple « écran : tableau de bord »), jamais votre identité, votre organisation ou le contenu de vos données. Ces compteurs restent sur votre appareil.",
      "Le bouton « Réinitialiser » de cette section remet tous les compteurs d'usage à zéro. Cette action n'affecte aucune de vos données métier.",
    ],
    tips: [
      "Tapez quelques lettres dans la recherche de l'aide plutôt que de parcourir les sections une à une.",
      "Les statistiques d'usage servent à savoir quels écrans sont utiles ; elles ne contiennent aucune donnée personnelle.",
      "En cas de doute sur une fonctionnalité, ouvrez le tutoriel complet depuis le bouton en bas du centre d'aide.",
    ],
    warnings: [
      "Les statistiques d'usage ne sont jamais un journal d'activité nominatif : impossible de savoir QUI a utilisé un écran.",
    ],
  },
  {
    id: "approbation-deux-etapes",
    title: "Approbation en deux étapes",
    icon: ShieldCheck,
    color: "var(--data-income)",
    iconBg: "color-mix(in srgb, var(--data-income) 12%, transparent)",
    titleColor: "var(--data-income)",
    paragraphs: [
      "L'approbation en deux étapes (maker-checker) est un contrôle financier : la personne qui CRÉE une transaction ne peut pas être celle qui l'APPROUVE. Celui qui engage la dépense est donc distinct de celui qui la valide.",
      "Ce réglage est OPTIONNEL et propre à chaque organisation : il est DÉSACTIVÉ par défaut, pour que les églises gérées par un seul administrateur continuent de fonctionner comme avant.",
      "Un administrateur l'active dans Paramètres → onglet « Gérer » → section « Contrôle financier », en basculant l'interrupteur « Approbation en deux étapes ».",
      "Quand il est actif, l'auteur d'une transaction en attente voit le bouton « Approuver » désactivé, avec l'explication « L'auteur ne peut pas approuver sa propre dépense ». Un autre membre disposant de la permission d'approbation peut valider la transaction normalement.",
      "La permission d'approbation reste requise dans tous les cas : activer le réglage ajoute une contrainte, il n'en retire jamais. Sans le droit d'approuver, personne ne peut valider, auteur ou non.",
      "Le refus est appliqué au niveau de la base de données locale (et pas seulement du bouton) : même une action détournée ne peut pas enregistrer une auto-approbation. Le message d'erreur est explicite.",
    ],
    tips: [
      "Activez-le dès que plusieurs personnes saisissent et approuvent des dépenses, pour éviter qu'une même personne engage et valide.",
      "Désactivez-le temporairement si un seul responsable est disponible : le comportement historique revient immédiatement.",
      "Le réglage se synchronise entre les appareils de l'organisation, comme les autres paramètres.",
    ],
    warnings: [
      "Avec le réglage actif, prévoyez au moins deux personnes autorisées à approuver : sinon plus aucune transaction ne pourra être validée.",
    ],
  },
  {
    id: "import-csv",
    title: "Importer des transactions (CSV)",
    icon: Upload,
    color: CHART_COLORS.income,
    iconBg: "color-mix(in srgb, var(--data-income) 12%, transparent)",
    titleColor: CHART_COLORS.income,
    paragraphs: [
      "Depuis Paramètres → Gérer → Sauvegarde des données, le bouton « Importer des transactions (CSV) » permet d'ajouter un lot de transactions préparées dans un tableur (Excel, LibreOffice, Google Sheets).",
      "Vous pouvez d'abord télécharger un modèle CSV pour obtenir les bonnes colonnes. Chaque fichier est analysé puis prévisualisé : vous voyez les lignes valides et les lignes rejetées AVANT toute écriture, puis vous confirmez.",
      "Toutes les lignes importées sont créées en brouillon (DRAFT). Elles ne sont jamais approuvées automatiquement : vous gardez le contrôle financier complet.",
    ],
    tips: [
      "Colonnes attendues : type, amount, description, date, category_id, source, comment. L'ordre est libre, le séparateur peut être « ; » ou « , ».",
      "Le montant s'exprime en FCFA (ex. « 10 000 »). Les séparateurs de milliers et la virgule décimale sont tolérés.",
      "Pour un import de dîmes ou d'offrandes, utilisez le type INCOME ; pour une dépense, EXPENSE.",
    ],
    warnings: [
      "Sécurité : une cellule qui commence par « = », « + », « - » ou « @ » est traitée comme du TEXTE littéral — aucune formule n'est jamais exécutée. Ces cellules sont signalées dans l'aperçu.",
      "Un fichier trop volumineux (plus de 500 lignes ou 2 Mo) est refusé : découpez-le en plusieurs imports.",
      "Un en-tête non conforme (colonne manquante ou inattendue) fait échouer tout le fichier : corrigez la première ligne avant de réessayer.",
    ],
  },
  {
    id: "transfert-propriete",
    title: "Transférer la propriété",
    icon: Crown,
    color: CHART_COLORS.income,
    iconBg: "color-mix(in srgb, var(--data-income) 12%, transparent)",
    titleColor: CHART_COLORS.income,
    paragraphs: [
      "Le transfert de propriété permet de désigner un autre administrateur pour que l'organisation ne reste jamais sans responsable.",
      "Ouvrez Paramètres → Organisation → « Transférer la propriété » (réservé aux administrateurs).",
      "Étape 1 — choisissez la personne : elle doit être un membre ACTIF dont le rôle permet de gérer les accès (Administrateur ou Pasteur Principal).",
      "Étape 2 — relisez les conséquences : la nouvelle personne pourra administrer l'organisation et gérer les accès.",
      "Étape 3 — confirmez en saisissant le nom exact de la personne, puis validez.",
      "Étape 4 — le résultat s'affiche : succès, ou l'étape qui a échoué sans jamais laisser l'organisation sans administrateur.",
    ],
    tips: [
      "La cible reçoit d'abord le rôle Administrateur, PUIS devient propriétaire : l'organisation garde toujours au moins un administrateur.",
      "L'ancien propriétaire conserve ses données ; seul son rôle peut changer.",
      "Vérifiez que la personne choisie accepte cette responsabilité avant de continuer.",
      "Le transfert est tracé dans le journal d'audit (avant/après).",
    ],
    warnings: [
      "Cette action est sensible : ne transférez la propriété qu'à une personne de confiance.",
      "Un transfert interrompu n'enlève aucun droit : réessayez après avoir vérifié la connexion.",
    ],
  },
];

// ─── Recherche (pure) ───────────────────────────────────────────────────────────

/**
 * Normalise un texte pour la recherche : minuscules + suppression des accents
 * (décomposition NFD puis retrait des diacritiques). « Événement » et
 * « evenement » deviennent identiques, comme « Trésorerie » / « tresorerie ».
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Concatène tout le texte interrogeable d'une section (titre + corps). */
export function sectionHaystack(s: SectionData): string {
  const parts: string[] = [s.title, ...s.paragraphs];
  if (s.tips) parts.push(...s.tips);
  if (s.warnings) parts.push(...s.warnings);
  if (s.errors) parts.push(...s.errors.flatMap((e) => [e.title, e.solution]));
  if (s.faqs) parts.push(...s.faqs.flatMap((f) => [f.q, f.a]));
  return parts.join(" \n ");
}

/**
 * Filtre les sections du tutoriel par titre ET texte (paragraphes, astuces,
 * avertissements, FAQ, erreurs). Recherche insensible à la casse ET aux
 * accents. Une requête vide renvoie TOUTES les sections (l'appelant ne doit
 * PAS afficher « Aucun résultat » dans ce cas).
 */
export function searchSections(
  query: string,
  sections: SectionData[] = SECTIONS,
): SectionData[] {
  const q = normalizeForSearch(query);
  if (!q) return sections;
  return sections.filter((s) =>
    normalizeForSearch(sectionHaystack(s)).includes(q),
  );
}

// ─── FAQ « Questions fréquentes » (PR16) ────────────────────────────────────────

export interface FaqEntry {
  q: string;
  a: string;
}

/**
 * FAQ transversale du centre d'aide — les questions qui traversent plusieurs
 * écrans (les FAQ *par écran* restent dans leur section du tutoriel).
 */
export const HELP_FAQ: FaqEntry[] = [
  {
    q: "Mes données sont-elles envoyées à un serveur ?",
    a: "Vos données sont enregistrées localement sur l'appareil puis synchronisées avec le serveur de votre organisation, protégé par des règles d'accès. Les statistiques d'usage (écran « État du système ») sont anonymes et restent sur l'appareil.",
  },
  {
    q: "Pourquoi un écran affiche-t-il « Chargement… » au lieu d'un total ?",
    a: "Au premier démarrage, la réplique locale se synchronise. Tant que la lecture n'est pas terminée, Lumina affiche un squelette plutôt qu'un chiffre à 0, qui serait faux. Le total apparaît dès que la synchronisation est finie.",
  },
  {
    q: "Je n'ai plus de réseau : puis-je continuer à travailler ?",
    a: "Oui. Lumina est « local-first » : vous pouvez consulter et saisir des données hors ligne. Tout est synchronisé automatiquement au retour du réseau.",
  },
  {
    q: "Comment sauvegarder mes données ?",
    a: "Ouvrez Paramètres → Sauvegarde des données. Vous pouvez exporter en JSON (restauration complète) ou en CSV (tableur). Une erreur d'export est signalée par un message.",
  },
  {
    q: "Une transaction est en attente d'approbation, que se passe-t-il ?",
    a: "Selon la configuration, une dépense peut nécessiter une validation (maker-checker). Elle reste « en attente » jusqu'à l'accord d'un valideur, puis devient « approuvée ».",
  },
  {
    q: "Comment signaler un problème à l'équipe technique ?",
    a: "Ouvrez Paramètres → État du système, puis « Signaler un problème ». Le diagnostic transmis ne contient aucune donnée personnelle ; vous pouvez aussi le copier.",
  },
  {
    q: "Pourquoi une page reste-t-elle vide ?",
    a: "Vérifiez d'abord que la synchronisation est terminée (indicateur d'état du système). Si la page reste vide après synchronisation, il n'y a simplement aucune donnée à afficher pour ce filtre ou cette période.",
  },
  {
    q: "Puis-je utiliser Lumina sur plusieurs appareils ?",
    a: "Oui. Connectez-vous avec le même compte : chaque appareil synchronise les mêmes données de l'organisation. Évitez de saisir la même information en double sur deux appareils en même temps.",
  },
];

/** Filtre la FAQ par question OU réponse (accents/casse insensibles). */
export function searchFaq(query: string, faq: FaqEntry[] = HELP_FAQ): FaqEntry[] {
  const q = normalizeForSearch(query);
  if (!q) return faq;
  return faq.filter((f) => normalizeForSearch(`${f.q} \n ${f.a}`).includes(q));
}

// ─── Export ─────────────────────────────────────────────────────────────────────

/** Sections pédagogiques (source unique, partagée Tutorial ↔ Help). */
export const TUTORIAL_SECTIONS: SectionData[] = SECTIONS;

export type { SectionData };
