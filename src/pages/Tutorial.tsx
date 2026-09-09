import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonHeader, IonContent, IonTitle, IonToolbar } from '@ionic/react';
import {
  ArrowLeft, BookOpen, Home, Wallet, Landmark, Users, ArrowRightLeft,
  CalendarPlus, ClipboardList, History, BarChart3, LineChart, FileText,
  ListChecks, Archive, Settings, HelpCircle, AlertCircle, ChevronRight,
  CheckCircle, Lightbulb, AlertTriangle,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import {
  PieChart, Pie, Cell, LineChart as ReLineChart, Line,
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Type ────────────────────────────────────────────────────────────────────────
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
  diagram?: 'transaction-flow' | 'versement-flow' | 'group-tree';
  chart?: 'transaction-donut' | 'history-line' | 'balance-area' | 'group-bar';
}

// ─── Recharts color palette ─────────────────────────────────────────────────────
const CATEGORY_COLORS = [
  '#1DB954', '#E51332', '#FFB800', '#3B82F6',
  '#8B5CF6', '#14B8A6', '#EC4899', '#FF6B00', '#808080',
];

const DONUT_DATA = [
  { name: 'Dîme', value: 4500000 },
  { name: 'Offrande', value: 2800000 },
  { name: 'Offrande mission', value: 900000 },
  { name: 'Don', value: 650000 },
  { name: 'Salaire pasteur', value: 3200000 },
  { name: 'Frais fonctionnement', value: 1800000 },
  { name: 'Mission', value: 750000 },
  { name: 'Entretien', value: 420000 },
  { name: 'Aumône', value: 310000 },
];

const HISTORY_LINE_DATA = [
  { name: 'Jan', revenus: 4200000, dépenses: 2800000 },
  { name: 'Fév', revenus: 3800000, dépenses: 3100000 },
  { name: 'Mar', revenus: 5100000, dépenses: 2900000 },
  { name: 'Avr', revenus: 4600000, dépenses: 3300000 },
  { name: 'Mai', revenus: 5800000, dépenses: 3000000 },
  { name: 'Jun', revenus: 4900000, dépenses: 3500000 },
  { name: 'Jul', revenus: 6200000, dépenses: 3200000 },
  { name: 'Août', revenus: 5500000, dépenses: 3800000 },
  { name: 'Sep', revenus: 4800000, dépenses: 2900000 },
  { name: 'Oct', revenus: 5300000, dépenses: 3100000 },
  { name: 'Nov', revenus: 6100000, dépenses: 3400000 },
  { name: 'Déc', revenus: 7200000, dépenses: 4100000 },
];

const BALANCE_AREA_DATA = HISTORY_LINE_DATA.map(d => ({
  name: d.name,
  solde: d.revenus - d.dépenses,
}));

const GROUP_BAR_DATA = [
  { name: 'Diacres', solde: 2850000, color: '#3B82F6' },
  { name: 'Jeunesse', solde: 1920000, color: '#8B5CF6' },
  { name: 'Dames', solde: 3100000, color: '#EC4899' },
  { name: 'Messieurs', solde: 1750000, color: '#14B8A6' },
  { name: 'Chorale', solde: 2200000, color: '#FF6B00' },
];

// ─── Sections data ──────────────────────────────────────────────────────────────
const SECTIONS: SectionData[] = [
  {
    id: 'overview',
    title: "Vue d'ensemble",
    icon: BookOpen,
    color: '#FF6B00',
    iconBg: '#FF6B0020',
    titleColor: '#FF6B00',
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
    id: 'dashboard',
    title: 'Dashboard',
    icon: Home,
    color: '#1DB954',
    iconBg: '#1DB95420',
    titleColor: '#1DB954',
    paragraphs: [
      "Le tableau de bord (Accueil) est votre point d'entrée principal. Il affiche en temps réel le solde de chaque caisse, les entrées et sorties du mois, ainsi que les événements à venir.",
      "La carte principale montre le solde global de la caisse principale (fonds de l'église). Les caisses de groupe (Diacres, Jeunesse, Dames…) sont listées juste en dessous avec leur solde respectif.",
      "Les boutons d'actions rapides permettent de créer une entrée, une sortie, effectuer un versement ou créer un événement en un seul tap.",
      "Le bouton flottant orange (＋) en bas à droite crée rapidement une nouvelle transaction.",
    ],
    tips: [
      "Cliquez sur une caisse du dashboard pour voir toutes ses transactions dans la page Finances.",
      "La section « Événements à venir » montre les prochains événements avec leur avance de budget.",
      "Le badge de notification (cloche) en haut à droite indique le nombre de notifications non lues.",
      "Les statuts « En attente » et « Brouillon » apparaissent dans la section rapide du dashboard.",
    ],
  },
  {
    id: 'transactions',
    title: 'Transactions',
    icon: Wallet,
    color: '#1DB954',
    iconBg: '#1DB95420',
    titleColor: '#1DB954',
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
    diagram: 'transaction-flow',
    chart: 'transaction-donut',
  },
  {
    id: 'finance',
    title: 'Grand livre',
    icon: Landmark,
    color: '#3B82F6',
    iconBg: '#3B82F620',
    titleColor: '#3B82F6',
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
    id: 'caisses',
    title: 'Gestion des caisses',
    icon: Wallet,
    color: '#FFB800',
    iconBg: '#FFB80020',
    titleColor: '#FFB800',
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
    id: 'groupes',
    title: 'Groupes',
    icon: Users,
    color: '#8B5CF6',
    iconBg: '#8B5CF620',
    titleColor: '#8B5CF6',
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
    diagram: 'group-tree',
    chart: 'group-bar',
  },
  {
    id: 'versement',
    title: 'Versement',
    icon: ArrowRightLeft,
    color: '#FFB800',
    iconBg: '#FFB80020',
    titleColor: '#FFB800',
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
    diagram: 'versement-flow',
  },
  {
    id: 'evenements',
    title: 'Événements',
    icon: CalendarPlus,
    color: '#EC4899',
    iconBg: '#EC489920',
    titleColor: '#EC4899',
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
    id: 'membres',
    title: 'Membres',
    icon: ClipboardList,
    color: '#14B8A6',
    iconBg: '#14B8A620',
    titleColor: '#14B8A6',
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
    id: 'historique',
    title: 'Historique',
    icon: History,
    color: '#FFB800',
    iconBg: '#FFB80020',
    titleColor: '#FFB800',
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
    chart: 'history-line',
  },
  {
    id: 'rapports',
    title: 'Rapports',
    icon: BarChart3,
    color: '#3B82F6',
    iconBg: '#3B82F620',
    titleColor: '#3B82F6',
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
    id: 'bilan',
    title: 'Bilan',
    icon: LineChart,
    color: '#06B6D4',
    iconBg: '#06B6D420',
    titleColor: '#06B6D4',
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
    chart: 'balance-area',
  },
  {
    id: 'formulaires',
    title: 'Formulaires',
    icon: FileText,
    color: '#8B5CF6',
    iconBg: '#8B5CF620',
    titleColor: '#8B5CF6',
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
    id: 'trace',
    title: "Trace d'activité",
    icon: ListChecks,
    color: '#E51332',
    iconBg: '#E5133220',
    titleColor: '#E51332',
    paragraphs: [
      "La page Trace d'activité affiche l'historique complet de toutes les actions financières : créations, modifications, approbations, rejets, archivages et restaurations.",
      "Chaque entrée de trace indique l'action, l'entité concernée, le montant (le cas échéant), et l'auteur.",
      "Les filtres par type d'entité (Transaction, Groupe, Membre, Événement, Budget, Formulaire) permettent de réduire la vue.",
      "La recherche textuelle permet de retrouver une action spécifique rapidement.",
    ],
    tips: [
      "La trace est un outil d'audit essentiel pour la transparence financière.",
      "Les actions du trésorier et du pasteur sont distinctement identifiées.",
      "Les entrées archivées et restaurées apparaissent aussi dans la trace.",
      "Filtrez par « Transaction » pour suivre toutes les opérations financières.",
    ],
  },
  {
    id: 'archives',
    title: 'Archives',
    icon: Archive,
    color: '#808080',
    iconBg: '#80808020',
    titleColor: '#808080',
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
    id: 'parametres',
    title: 'Paramètres',
    icon: Settings,
    color: '#B3B3B3',
    iconBg: '#80808020',
    titleColor: '#808080',
    paragraphs: [
      "Les Paramètres permettent de configurer l'identité de l'église : nom complet, logo, et photo de profil utilisateur.",
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
    id: 'roles',
    title: 'Rôles & Permissions',
    icon: Users,
    color: '#FF6B00',
    iconBg: '#FF6B0020',
    titleColor: '#FF6B00',
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
    id: 'faq',
    title: 'FAQ',
    icon: HelpCircle,
    color: '#3B82F6',
    iconBg: '#3B82F620',
    titleColor: '#3B82F6',
    paragraphs: [
      "Questions fréquentes sur l'utilisation de Lumina.",
    ],
    faqs: [
      { q: 'Qui peut approuver une transaction ?', a: 'Le trésorier, le trésorier adjoint et le pasteur peuvent approuver les transactions en attente.' },
      { q: 'Qui peut rejeter une transaction ?', a: 'Le pasteur et le trésorier peuvent rejeter une transaction avec un commentaire.' },
      { q: 'Mes données sont-elles en sécurité ?', a: 'Oui, elles sont stockées localement sur votre appareil. La synchronisation cloud est optionnelle.' },
      { q: 'Puis-je utiliser Lumina sans internet ?', a: 'Oui, l\'application fonctionne entièrement hors ligne. La synchronisation se fait automatiquement dès la reconnexion.' },
      { q: 'Comment créer un nouveau groupe ?', a: 'Allez dans Groupes → bouton « Créer » → remplissez le formulaire avec le nom et la couleur du groupe.' },
      { q: 'Comment faire un versement ?', a: 'Allez dans Plus → Versement, sélectionnez un groupe, entrez le montant, puis confirmez.' },
      { q: 'Comment créer un formulaire personnalisé ?', a: 'Allez dans Plus → Formulaires → Créer. Choisissez le type de chaque champ et publiez le formulaire.' },
      { q: 'Que signifie « En attente » pour une transaction ?', a: 'La transaction a été créée mais n\'a pas encore été approuvée par un trésorier.' },
      { q: 'Comment exporte-t-on un rapport ?', a: 'Depuis le Grand livre ou le Bilan, cliquez sur « Exporter le rapport » et choisissez PDF, Excel ou CSV.' },
      { q: 'Comment modifier mon profil ?', a: 'Allez dans Paramètres → Photo de profil pour changer votre photo. Le nom est modifiable dans Paramètres.' },
    ],
  },
  {
    id: 'erreurs',
    title: 'Erreurs fréquentes',
    icon: AlertCircle,
    color: '#E51332',
    iconBg: '#E5133220',
    titleColor: '#E51332',
    paragraphs: [
      "Erreurs courantes et comment les résoudre.",
    ],
    errors: [
      { title: 'Transaction impossible à approuver', solution: 'Vérifiez que vous avez le rôle de trésorier ou pasteur. Les brouillons doivent d\'abord être soumis avant approbation.' },
      { title: 'Solde négatif impossible à verser', solution: 'Le versement est bloqué si le solde est négatif ou nul. Vérifiez les transactions du groupe avant de procéder.' },
      { title: 'Export PDF vide', solution: 'Assurez-vous d\'avoir configuré le nom de l\'église et le logo dans Paramètres avant d\'exporter.' },
      { title: 'Groupe introuvable après suppression', solution: 'C\'est normal — un groupe supprimé ne peut pas être restauré. Créez-en un nouveau et mettez à jour les références.' },
      { title: 'Synchronisation bloquée', solution: 'Vérifiez votre connexion internet. Si le problème persiste, allez dans Paramètres → Actualiser les données.' },
      { title: 'Transaction rejetée, comment la modifier ?', solution: 'Une transaction rejetée doit être recréée. Vous pouvez copier les informations de l\'ancienne transaction dans la nouvelle.' },
      { title: 'Champ personnalisé introuvable', solution: 'Vérifiez que le champ personnalisé a bien été créé pour l\'entité concernée (Transaction, Événement, etc.).' },
      { title: 'Événement ne s\'affiche pas', solution: 'Vérifiez que l\'événement n\'a pas été archivé. Consultez la section Archives pour le restaurer.' },
    ],
  },
];

// ─── SVG Diagrams ────────────────────────────────────────────────────────────────
function TransactionFlowDiagram() {
  return (
    <svg viewBox="0 0 400 160" className="w-full max-w-md mx-auto" role="img" aria-label="Diagramme de flux des transactions">
      <title>Cycle de vie d'une transaction</title>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#808080" />
        </marker>
        <style>{`
          @keyframes dash { to { stroke-dashoffset: -16; } }
          .flow-line { stroke-dasharray: 6 4; animation: dash 1s linear infinite; }
        `}</style>
      </defs>
      {/* Brouillon */}
      <rect x="8" y="55" width="80" height="50" rx="8" fill="#F59E0B20" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="48" y="78" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">Brouillon</text>
      {/* En attente */}
      <rect x="140" y="55" width="80" height="50" rx="8" fill="#3B82F620" stroke="#3B82F6" strokeWidth="1.5" />
      <text x="180" y="78" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="600">En attente</text>
      {/* Approuvé */}
      <rect x="272" y="8" width="80" height="50" rx="8" fill="#1DB95420" stroke="#1DB954" strokeWidth="1.5" />
      <text x="312" y="31" textAnchor="middle" fill="#1DB954" fontSize="11" fontWeight="600">Approuvé</text>
      {/* Rejeté */}
      <rect x="272" y="102" width="80" height="50" rx="8" fill="#E5133220" stroke="#E51332" strokeWidth="1.5" />
      <text x="312" y="125" textAnchor="middle" fill="#E51332" fontSize="11" fontWeight="600">Rejeté</text>
      {/* Flèches */}
      <line x1="88" y1="80" x2="138" y2="80" stroke="#808080" strokeWidth="1.5" markerEnd="url(#arrowhead)" className="flow-line" />
      <text x="113" y="72" textAnchor="middle" fill="#808080" fontSize="9">Soumettre</text>
      <line x1="220" y1="80" x2="268" y2="33" stroke="#808080" strokeWidth="1.5" markerEnd="url(#arrowhead)" className="flow-line" />
      <text x="250" y="58" textAnchor="middle" fill="#1DB954" fontSize="9" fontWeight="600">Approuver</text>
      <line x1="220" y1="80" x2="268" y2="127" stroke="#808080" strokeWidth="1.5" markerEnd="url(#arrowhead)" className="flow-line" />
      <text x="250" y="95" textAnchor="middle" fill="#E51332" fontSize="9" fontWeight="600">Rejeter</text>
      {/* Badges */}
      <rect x="228" y="48" width="44" height="16" rx="4" fill="#1DB954" opacity="0.8" />
      <text x="250" y="59" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">Trésorier</text>
      <rect x="228" y="88" width="44" height="16" rx="4" fill="#E51332" opacity="0.8" />
      <text x="250" y="99" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">Pasteur</text>
      {/* Immutabilité */}
      <text x="356" y="28" textAnchor="middle" fill="#1DB954" fontSize="8" fontWeight="500">Immuable</text>
      {/* Modifier → Brouillon */}
      <path d="M 312 152 L 312 158 L 48 158 L 48 107" fill="none" stroke="#808080" strokeWidth="1.5" markerEnd="url(#arrowhead)" className="flow-line" />
      <text x="180" y="156" textAnchor="middle" fill="#808080" fontSize="9">Modifier</text>
    </svg>
  );
}

function VersementFlowDiagram() {
  return (
    <svg viewBox="0 0 400 140" className="w-full max-w-md mx-auto" role="img" aria-label="Flux de versement">
      <title>Flux de versement</title>
      {/* Caisse Groupe */}
      <rect x="20" y="30" width="120" height="80" rx="10" fill="#FFB80020" stroke="#FFB800" strokeWidth="1.5" />
      <rect x="50" y="38" width="24" height="24" rx="4" fill="#FFB800" opacity="0.2" />
      <path d="M62 44 L62 56 M56 48 L68 48" stroke="#FFB800" strokeWidth="2" strokeLinecap="round" />
      <text x="80" y="65" textAnchor="middle" fill="#FFB800" fontSize="11" fontWeight="600">Caisse Groupe</text>
      <text x="80" y="82" textAnchor="middle" fill="#808080" fontSize="9">sourceCaisseId</text>
      <text x="80" y="96" textAnchor="middle" fill="#E51332" fontSize="9">Sortie (-montant)</text>
      {/* Caisse Principale */}
      <rect x="260" y="30" width="120" height="80" rx="10" fill="#1DB95420" stroke="#1DB954" strokeWidth="1.5" />
      <rect x="290" y="38" width="24" height="24" rx="4" fill="#1DB954" opacity="0.2" />
      <path d="M296 50 L302 44 L308 50 M302 44 L302 56" stroke="#1DB954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="320" y="65" textAnchor="middle" fill="#1DB954" fontSize="11" fontWeight="600">Caisse Principale</text>
      <text x="320" y="82" textAnchor="middle" fill="#808080" fontSize="9">id: main</text>
      <text x="320" y="96" textAnchor="middle" fill="#1DB954" fontSize="9">Entrée (+montant)</text>
      {/* Flèche épaisse */}
      <line x1="140" y1="70" x2="256" y2="70" stroke="#FFB800" strokeWidth="3" markerEnd="url(#arrowhead)" className="flow-line" />
      <rect x="180" y="52" width="80" height="18" rx="4" fill="#FFB800" />
      <text x="220" y="64" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600">versementId</text>
      {/* Badge */}
      <rect x="140" y="100" width="120" height="20" rx="4" fill="#3B82F620" stroke="#3B82F6" strokeWidth="1" />
      <text x="200" y="113" textAnchor="middle" fill="#3B82F6" fontSize="9" fontWeight="600">Crée 2 transactions</text>
    </svg>
  );
}

function GroupTreeDiagram() {
  return (
    <svg viewBox="0 0 400 200" className="w-full max-w-md mx-auto" role="img" aria-label="Arborescence organisationnelle">
      <title>Arborescence organisationnelle</title>
      {/* Niveau 1 — Église */}
      <rect x="130" y="8" width="140" height="48" rx="10" fill="#FF6B0020" stroke="#FF6B00" strokeWidth="1.5" />
      <text x="200" y="28" textAnchor="middle" fill="#FF6B00" fontSize="12" fontWeight="700">Église MFE-JC</text>
      <text x="200" y="44" textAnchor="middle" fill="#808080" fontSize="9">Caisse principale (main)</text>
      {/* Ligne verticale */}
      <line x1="200" y1="56" x2="200" y2="90" stroke="#808080" strokeWidth="1.5" />
      {/* Ligne horizontale */}
      <line x1="50" y1="90" x2="350" y2="90" stroke="#808080" strokeWidth="1.5" />
      {/* Niveau 2 — Groupes */}
      {['Diacres', 'Jeunesse', 'Dames'].map((name, i) => {
        const x = 50 + i * 150;
        const colors = ['#3B82F6', '#8B5CF6', '#EC4899'];
        return (
          <g key={name}>
            <line x1={x + 50} y1="90" x2={x + 50} y2="110" stroke="#808080" strokeWidth="1.5" />
            <rect x={x} y="110" width="100" height="44" rx="8" fill={colors[i] + '20'} stroke={colors[i]} strokeWidth="1.5" />
            <text x={x + 50} y="130" textAnchor="middle" fill={colors[i]} fontSize="11" fontWeight="600">{name}</text>
            <text x={x + 50} y="146" textAnchor="middle" fill="#808080" fontSize="9">Caisse groupe</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Chart helpers ───────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 shadow-2xl" style={{ backgroundColor: '#1E1E1E', border: '1px solid #282828' }}>
      <p className="text-text-tertiary text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between gap-6 min-w-[120px]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-secondary text-xs">{entry.name}</span>
          </div>
          <span className="text-text-primary text-xs font-bold tabular-nums">{entry.value.toLocaleString()} F</span>
        </div>
      ))}
    </div>
  );
}

function TransactionDonutChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart aria-label="Répartition des transactions par catégorie">
        <Pie
          data={DONUT_DATA}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {DONUT_DATA.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function HistoryLineChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <ReLineChart data={HISTORY_LINE_DATA} aria-label="Revenus vs dépenses sur 12 mois">
        <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
        <XAxis dataKey="name" stroke="#808080" tick={{ fontSize: 10 }} />
        <YAxis stroke="#808080" tick={{ fontSize: 10 }} hide />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="revenus" stroke="#1DB954" strokeWidth={2} dot={{ r: 3 }} name="Revenus" />
        <Line type="monotone" dataKey="dépenses" stroke="#E51332" strokeWidth={2} dot={{ r: 3 }} name="Dépenses" />
      </ReLineChart>
    </ResponsiveContainer>
  );
}

function BalanceAreaChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={BALANCE_AREA_DATA} aria-label="Solde cumulé sur 12 mois">
        <defs>
          <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
        <XAxis dataKey="name" stroke="#808080" tick={{ fontSize: 10 }} />
        <YAxis stroke="#808080" tick={{ fontSize: 10 }} hide />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="solde" stroke="#06B6D4" strokeWidth={2} fill="url(#balanceGrad)" name="Solde" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function GroupBarChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={GROUP_BAR_DATA} layout="vertical" aria-label="Solde par groupe">
        <CartesianGrid strokeDasharray="3 3" stroke="#282828" orientation="right" />
        <XAxis type="number" stroke="#808080" tick={{ fontSize: 10 }} hide />
        <YAxis type="category" dataKey="name" stroke="#808080" tick={{ fontSize: 10 }} width={70} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="solde" radius={4} label={{ position: 'right', fontSize: 10, fill: '#B3B3B3', formatter: (v: number) => `${(v / 100).toLocaleString()} F` }}>
          {GROUP_BAR_DATA.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const ChartMap: Record<string, React.ReactNode> = {
  'transaction-donut': <TransactionDonutChart />,
  'history-line': <HistoryLineChart />,
  'balance-area': <BalanceAreaChart />,
  'group-bar': <GroupBarChart />,
};

const DiagramMap: Record<string, React.ReactNode> = {
  'transaction-flow': <TransactionFlowDiagram />,
  'versement-flow': <VersementFlowDiagram />,
  'group-tree': <GroupTreeDiagram />,
};

// ─── Main Component ──────────────────────────────────────────────────────────────
export default function Tutorial() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const tabListRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null);

  const current = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

  // Scroll active tab into view
  useEffect(() => {
    const tab = tabRefs.current.get(activeSection);
    if (tab) {
      tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      tab.focus({ preventScroll: true });
    }
  }, [activeSection]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = SECTIONS.findIndex(s => s.id === activeSection);
        if (e.key === 'ArrowRight' && idx < SECTIONS.length - 1) {
          setActiveSection(SECTIONS[idx + 1].id);
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          setActiveSection(SECTIONS[idx - 1].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection]);

  // Swipe detection
  const handleTouchStart = useCallback((e: TouchEvent) => {
    swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!swipeRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
    const dy = e.changedTouches[0].clientY - swipeRef.current.startY;
    // Only trigger swipe if horizontal movement > 50px and less than vertical
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      const idx = SECTIONS.findIndex(s => s.id === activeSection);
      if (dx < 0 && idx < SECTIONS.length - 1) {
        setActiveSection(SECTIONS[idx + 1].id);
      } else if (dx > 0 && idx > 0) {
        setActiveSection(SECTIONS[idx - 1].id);
      }
    }
    swipeRef.current = null;
  }, [activeSection]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  const setTabRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) tabRefs.current.set(id, el);
    else tabRefs.current.delete(id);
  }, []);

  const prevSection = () => {
    const idx = SECTIONS.findIndex(s => s.id === activeSection);
    if (idx > 0) setActiveSection(SECTIONS[idx - 1].id);
  };

  const nextSection = () => {
    const idx = SECTIONS.findIndex(s => s.id === activeSection);
    if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tutoriel</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-[#121212]">
          <TopHeader title="Tutoriel" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary text-sm mb-5 transition-all duration-200 hover:text-text-primary"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            {/* Tab navigation — horizontal scrollable */}
            <div
              ref={tabListRef}
              className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide -mx-5 px-5"
              role="tablist"
              aria-label="Sections du tutoriel"
            >
              {SECTIONS.map((s) => {
                const SIcon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    ref={(el) => setTabRef(s.id, el)}
                    onClick={() => setActiveSection(s.id)}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${s.id}`}
                    tabIndex={isActive ? 0 : -1}
                   
flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 focus: focus-visible:ring-2 focus-visible:ring-dashed"
                    style={isActive
                      ? { backgroundColor: s.color + '20', color: s.color, outline: 'none' }
                      : { backgroundColor: '#181818', color: '#B3B3B3', border: '1px solid #282828' }}
                  >
                    <SIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {s.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current section panel */}
            <div
              id={`panel-${current.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${current.id}`}
              className="mb-6 animate-in fade-in"
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105"
                  style={{ backgroundColor: current.iconBg }}
                >
                  <current.icon className="w-5 h-5" style={{ color: current.color }} />
                </div>
                <h2
                  tabIndex={-1}
                  className="text-text-primary font-bold text-xl overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px]"
                >
                  {current.title}
                </h2>
              </div>

              {/* Paragraphs */}
              <div className="space-y-3 mb-5">
                {current.paragraphs.map((p, i) => (
                  <p key={i} className="text-text-secondary text-sm leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>

              {/* SVG Diagram */}
              {current.diagram && (
                <div className="mb-5 rounded-xl overflow-hidden" style={{ backgroundColor: '#181818', border: '1px solid #282828' }}>
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                      Diagramme
                    </p>
                  </div>
                  <div className="px-4 pb-4">
                    {DiagramMap[current.diagram]}
                  </div>
                </div>
              )}

              {/* Recharts Chart */}
              {current.chart && (
                <div className="mb-5 rounded-xl overflow-hidden" style={{ backgroundColor: '#181818', border: '1px solid #282828' }}>
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                      Visualisation
                    </p>
                  </div>
                  <div className="px-4 pb-4">
                    {ChartMap[current.chart] || <p className="text-text-tertiary text-sm text-center py-6">Aucune donnée disponible</p>}
                  </div>
                </div>
              )}

              {/* Tips */}
              {current.tips && current.tips.length > 0 && (
                <div
                  className="rounded-xl p-4 mb-5 transition-all duration-200"
                  style={{ backgroundColor: current.iconBg }}
                >
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: current.color }}>
                    <Lightbulb className="w-4 h-4 flex-shrink-0" /> Conseils
                  </p>
                  <div className="space-y-2">
                    {current.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#1DB954] flex-shrink-0 mt-0.5" />
                        <p className="text-text-secondary text-sm">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {current.warnings && current.warnings.length > 0 && (
                <div className="rounded-xl p-4 mb-5 transition-all duration-200" style={{ backgroundColor: '#E5133220' }}>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#E51332]">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Précautions
                  </p>
                  <div className="space-y-2">
                    {current.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-[#E51332] flex-shrink-0 mt-0.5" />
                        <p className="text-text-secondary text-sm">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {current.errors && current.errors.length > 0 && (
                <div className="space-y-3 mb-5">
                  {current.errors.map((err, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4 transition-all duration-200"
                      style={{ backgroundColor: '#181818' }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-[#E51332] flex-shrink-0 mt-0.5" />
                        <p className="text-text-primary text-sm font-medium">{err.title}</p>
                      </div>
                      <p className="text-text-tertiary text-sm ml-6">{err.solution}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* FAQ */}
              {current.faqs && current.faqs.length > 0 && (
                <div className="space-y-3 mb-5">
                  {current.faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4 transition-all duration-200"
                      style={{ backgroundColor: '#181818' }}
                    >
                      <div className="flex items-start gap-2 mb-1.5">
                        <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: current.color }} />
                        <p className="text-text-primary text-sm font-medium">{faq.q}</p>
                      </div>
                      <p className="text-text-tertiary text-sm ml-6">{faq.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevSection}
                disabled={activeSection === SECTIONS[0].id}
               
px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus: focus-visible:ring-2 focus-visible:ring-dashed"
                style={{
                  backgroundColor: '#181818',
                  color: activeSection === SECTIONS[0].id ? '#535353' : '#B3B3B3',
                  border: activeSection === SECTIONS[0].id ? 'none' : '1px solid #282828',
                  cursor: activeSection === SECTIONS[0].id ? 'default' : 'pointer',
                }}
                aria-label="Section précédente"
              >
                ← Précédent
              </button>
              <button
                onClick={nextSection}
                disabled={activeSection === SECTIONS[SECTIONS.length - 1].id}
               
px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 focus: focus-visible:ring-2 focus-visible:ring-dashed"
                style={{
                  backgroundColor: activeSection === SECTIONS[SECTIONS.length - 1].id ? '#181818' : current.color + '20',
                  color: activeSection === SECTIONS[SECTIONS.length - 1].id ? '#535353' : current.color,
                  border: activeSection === SECTIONS[SECTIONS.length - 1].id ? '1px solid #282828' : 'none',
                  cursor: activeSection === SECTIONS[SECTIONS.length - 1].id ? 'default' : 'pointer',
                }}
                aria-label="Section suivante"
              >
                {activeSection === SECTIONS[SECTIONS.length - 1].id
                  ? 'Terminé'
                  : 'Suivant'}
              </button>
            </div>

            <p className="text-text-tertiary text-xs text-center mt-6">Lumina v2.0 · Guide d'utilisation complet</p>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
