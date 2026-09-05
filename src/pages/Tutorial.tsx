import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Wallet, Users, Calendar, BarChart3, HelpCircle, AlertCircle, ChevronRight, CheckCircle, Lightbulb, AlertTriangle, Bell, UserCircle, Database, Settings, Filter, PlusCircle, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { useState } from 'react';

const SECTIONS = [
  {
    id: 'overview',
    title: 'Vue d\'ensemble',
    icon: BookOpen,
    color: '#FF6B00',
    iconBg: '#FF6B0020',
    titleColor: '#FF6B00',
    paragraphs: [
      'Lumina est une application de gestion financière conçue pour les églises et organisations chrétiennes.',
      'Elle permet de suivre les entrées et sorties d\'argent, de gérer les caisses par groupe, de planifier des événements avec leur budget, et de produire des rapports financiers.',
      'Toutes vos données sont stockées localement sur votre appareil. Elles sont synchronisées automatiquement avec le cloud lorsque vous êtes connecté.',
      'L\'application fonctionne entièrement hors ligne — aucune connexion internet n\'est requise pour utiliser Lumina.',
    ],
    tips: [
      'Lumina fonctionne même sans connexion internet. Les données sont synchronisées automatiquement à la reconnexion.',
      'Les transactions doivent être approuvées par un trésorier pour être validées.',
      'Chaque groupe a sa propre caisse — les versements transfèrent les fonds vers la caisse principale.',
      'Accédez directement au dashboard en cliquant sur "Accueil" dans la barre de navigation.',
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: BarChart3,
    color: '#1DB954',
    iconBg: '#1DB95420',
    titleColor: '#1DB954',
    paragraphs: [
      'Le tableau de bord (Accueil) est votre point d\'entrée principal. Il affiche en temps réel le solde de chaque caisse, les entrées et sorties du mois, ainsi que les événements à venir.',
      'La carte principale montre le solde global de la caisse principale (fonds de l\'église). Les caisses de groupe (Diacres, Jeunesse, Dames…) sont listées juste en dessous avec leur solde respectif.',
      'Les boutons d\'actions rapides permettent de créer une entrée, une sortie, effectuer un versement ou créer un événement en un seul tap.',
      'Le bouton flottant orange (＋) en bas à droite crée rapidement une nouvelle transaction.',
    ],
    tips: [
      'Cliquez sur une caisse du dashboard pour voir toutes ses transactions dans la page Finances.',
      'La section "Événements à venir" montre les prochains événements avec leur avance de budget.',
      'Le badge de notification (cloche) en haut à droite indique le nombre de notifications non lues.',
      'Les statuts "En attente" et "Brouillon" apparaissent dans la section rapide du dashboard.',
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
      'Une transaction peut être une entrée (revenu) ou une sortie (dépense). Chaque transaction enregistre le montant, la date, la catégorie, la caisse source, et peut être liée à un groupe ou un événement.',
      'Chaque transaction passe par 3 états : Brouillon → En attente → Approuvé. Le trésorier peut approuver les transactions en attente. Le pasteur peut rejeter une transaction avec un commentaire.',
      'Les transactions approuvées sont immuables — elles ne peuvent pas être modifiées ou supprimées. Seules les transactions en brouillon ou rejetées peuvent être modifiées.',
      'Pour créer une transaction, utilisez le bouton flottant (＋) ou naviguez vers "Finances" → bouton "Nouvelle transaction".',
    ],
    tips: [
      'Source : CAISSE (provient d\'une caisse), COTISATION (d\'un membre), PERSONNE (d\'une personne spécifique), ou AUTRE.',
      'Vous pouvez lier une transaction à un événement ou à un groupe organisationnel pour le suivi budgétaire.',
      'Le champ "Notes" est optionnel mais recommandé pour la traçabilité.',
      'Une transaction peut être modifiée tant qu\'elle n\'est pas encore approuvée.',
    ],
    warnings: [
      'Ne créez pas de doublons — vérifiez la date et le montant avant de valider.',
      'Une transaction rejetée ne peut pas être approuvée directement — il faut la recréer.',
      'Les transactions approuvées sont définitives et ne peuvent plus être modifiées.',
    ],
  },
  {
    id: 'finance',
    title: 'Grand livre',
    icon: FileText,
    color: '#3B82F6',
    iconBg: '#3B82F620',
    titleColor: '#3B82F6',
    paragraphs: [
      'Le grand livre (Finances) liste toutes les transactions de la caisse sélectionnée. Il offre un filtre par période (mois ou année), par statut (brouillon, en attente, approuvé, rejeté), par catégorie, et par recherche textuelle.',
      'Les transactions en attente peuvent être approuvées en lot : cochez les cases à côté des transactions, puis cliquez "Approuver tout".',
      'La section "Par catégorie" affiche un barreau horizontal pour chaque catégorie montrant le rapport entre revenus (vert) et dépenses (rouge).',
      'Le bouton "Exporter le rapport" ouvre un menu avec trois formats disponibles : PDF, Excel et CSV.',
    ],
    tips: [
      'Utilisez la barre de recherche pour trouver une transaction par description, catégorie, groupe ou montant.',
      'Le sélecteur de caisse en haut permet de basculer entre la caisse principale et chaque caisse de groupe.',
      'L\'export PDF inclut automatiquement le logo et le nom de l\'église configurés dans les Paramètres.',
      'L\'export Excel crée plusieurs feuilles : résumé, transactions détaillées, et répartition par groupe.',
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
      'La caisse principale (id: "main") est la caisse centrale de l\'église. C\'est elle qui apparaît sur le tableau de bord comme solde global.',
      'Chaque groupe organisationnel a sa propre caisse créée automatiquement lors de la création du groupe.',
      'Un versement est un transfert d\'une caisse groupe vers la caisse principale. Il crée automatiquement 2 transactions liées par un "versementId" — une sortie dans la caisse groupe et une entrée dans la caisse principale.',
      'Le solde d\'une caisse est calculé en temps réel à partir des transactions approuvées.',
    ],
    tips: [
      'Le solde d\'une caisse groupe = Entrées du groupe − Sorties du groupe.',
      'Le versement ne peut se faire que si le solde est strictement positif.',
      'La page Versement permet de sélectionner un groupe et d\'indiquer un montant personnalisé ou "tout verser".',
      'Les caisses peuvent être colorées dans les Paramètres pour une identification visuelle rapide.',
    ],
    warnings: [
      'Un versement ne peut pas être annulé — il est irréversible une fois approuvé.',
      'Le solde d\'une caisse ne peut pas être négatif — vérifiez les dépenses avant de verser.',
    ],
  },
  {
    id: 'groupes',
    title: 'Groupes & Versements',
    icon: Users,
    color: '#8B5CF6',
    iconBg: '#8B5CF620',
    titleColor: '#8B5CF6',
    paragraphs: [
      'Les groupes organisationnels (Diacres, Jeunesse, Dames, Messieurs, Chorale…) permettent de segmenter les finances par unité de l\'église.',
      'Chaque groupe a une caisse liée automatiquement lors de sa création. Vous pouvez créer, modifier et supprimer des groupes.',
      'La suppression d\'un groupe n\'est possible que si sa caisse a un solde nul.',
      'La page de détail d\'un groupe affiche son solde actuel et un bouton "Verser à la caisse principale" pour effectuer un versement.',
    ],
    tips: [
      'Utilisez les couleurs pour distinguer visuellement les caisses des groupes sur le dashboard.',
      'Les versements apparaissent comme une sortie dans la caisse groupe et une entrée dans la caisse principale.',
      'Le solde de chaque groupe est visible directement sur le Dashboard.',
      'Un groupe peut être archivé sans être supprimé — il apparaîtra dans la section Archives.',
    ],
  },
  {
    id: 'evenements',
    title: 'Événements & Budgets',
    icon: Calendar,
    color: '#EC4899',
    iconBg: '#EC489920',
    titleColor: '#EC4899',
    paragraphs: [
      'Un événement représente une célébration, une conférence, une semaine de prière, ou toute action spéciale de l\'église.',
      'Chaque événement a un budget avec des postes (dîme, offrande, frais de fonctionnement, mission…) et une liste d\'achats avec quantité, prix et fournisseur.',
      'Le statut suit un cycle : Planifié → En cours → Terminé (ou Annulé). Le solde engagé est calculé en temps réel à partir des transactions liées.',
      'Chaque événement peut avoir une liste de courses avec des articles à acheter, permettant de suivre les dépenses avant et après l\'événement.',
    ],
    tips: [
      'Configurez le budget par poste pour suivre précisément les dépenses de chaque événement.',
      'La liste d\'achats aide à planifier les achats nécessaires (quantité, prix unitaire, fournisseur).',
      'Les transactions liées à un événement permettent de suivre automatiquement le budget engagé.',
      'Un événement peut être marqué comme "Terminé" lorsqu\'il est terminé, ce qui fige le suivi budgétaire.',
    ],
    warnings: [
      'Ne dépassez pas le budget alloué — le système indique quand un poste est en dépassement.',
      'Un événement annulé ne doit pas générer de nouvelles transactions.',
      'La suppression d\'un événement ne supprime pas les transactions qui lui sont liées.',
    ],
  },
  {
    id: 'historique',
    title: 'Historique & Graphiques',
    icon: BarChart3,
    color: '#FFB800',
    iconBg: '#FFB80020',
    titleColor: '#FFB800',
    paragraphs: [
      'La page Historique offre une vue approfondie des données financières avec des graphiques interactifs à courbes de Bézier.',
      'L\'onglet "Vue d\'ensemble" affiche les revenus vs dépenses en courbe lissée, le solde cumulé mois par mois, et la répartition par catégorie en graphique donut.',
      'L\'onglet "Mensuel" propose un histogramme des revenus et dépenses par mois avec des barres de proportion détaillées.',
      'Les onglets "Par caisse", "Par groupe", "Par événement" et "Par catégorie" permettent de filtrer les données par dimension.',
      'Le sélecteur de période (Tout / Ce mois / Cette année) s\'applique à tous les graphiques.',
    ],
    tips: [
      'Les courbes de Bézier offrent une visualisation fluide des tendances financières au fil du temps.',
      'Le solde cumulé montre l\'évolution nette de vos finances mois après mois.',
      'Le donut par catégorie permet d\'identifier rapidement les postes les plus représentés.',
      'L\'activité récente dans l\'historique permet de suivre les dernières actions du trésorier.',
    ],
  },
  {
    id: 'membres',
    title: 'Membres',
    icon: Users,
    color: '#14B8A6',
    iconBg: '#14B8A620',
    titleColor: '#14B8A6',
    paragraphs: [
      'Le module Membres permet de gérer les personnes de l\'église : ajouter, rechercher, archiver et restaurer des membres.',
      'Chaque membre a un prénom, un nom, un téléphone et un email. Les membres archivés ne sont plus visibles dans la liste active mais peuvent être restaurés.',
      'Les membres peuvent être liés à des transactions (source COTISATION ou PERSONNE) pour un suivi individuel des cotisations et dons.',
      'La recherche en temps réel permet de trouver rapidement un membre par nom ou email.',
    ],
    tips: [
      'Archivez les membres qui quittent l\'église plutôt que de les supprimer — cela préserve l\'historique.',
      'Un membre restauré redevient actif et peut à nouveau être sélectionné dans les transactions.',
      'La section Archivés montre les membres archivés avec la raison de l\'archivage.',
      'Les initiales du membre servent d\'avatar visuel par défaut.',
    ],
  },
  {
    id: 'formulaires',
    title: 'Formulaires & Champs perso.',
    icon: FileText,
    color: '#8B5CF6',
    iconBg: '#8B5CF620',
    titleColor: '#8B5CF6',
    paragraphs: [
      'Le module Formulaires permet de créer des formulaires personnalisés pour la collecte de données : cotisations, demandes, témoignages, etc.',
      'Chaque formulaire a des champs configurables : texte, nombre, date, sélection, vrai/faux, montant (FCFA), texte long.',
      'Les formulaires peuvent être publiés ou gardés en brouillon. Un formulaire publié peut être rempli par les membres de l\'église.',
      'Les champs personnalisés s\'appliquent aux entités existantes (transactions, événements, groupes, membres, caisses, catégories) pour ajouter des attributs spécifiques.',
    ],
    tips: [
      'Une clé de formulaire doit être unique et sans espace — le système la transforme automatiquement.',
      'Les champs "Sélection" acceptent une liste d\'options, une par ligne.',
      'Un champ personnalisé sur une transaction apparaît dans le formulaire de création/modification.',
      'Les formulaires peuvent être exportés et utilisés pour la collecte de données régulières.',
    ],
    warnings: [
      'Un formulaire publié ne peut pas être modifié — il faut le repasser en brouillon.',
      'Supprimer un champ personnalisé ne supprime pas les données déjà saisies.',
    ],
  },
  {
    id: 'rapports',
    title: 'Rapports personnalisés',
    icon: BarChart3,
    color: '#3B82F6',
    iconBg: '#3B82F620',
    titleColor: '#3B82F6',
    paragraphs: [
      'Le constructeur de rapports permet de générer des analyses sur mesure à partir des données financières.',
      'Sélectionnez les dimensions de groupement (mois, année, caisse, catégorie) et les métriques (somme, comptage, moyenne) pour créer votre rapport.',
      'L\'aperçu en temps réel affiche un tableau avec les colonnes configurées et les résultats calculés.',
      'Les rapports peuvent être sauvegardés et réutilisés pour des comparaisons périodiques.',
    ],
    tips: [
      'Combine plusieurs dimensions pour des analyses croisées (ex: revenus par groupe et par mois).',
      'Les métriques par défaut incluent la somme des montants, le comptage des transactions et la moyenne.',
      'Un rapport peut être exporté pour partage avec l\'équipe de direction.',
      'Les filtres peuvent restreindre les données à une période, une caisse ou une catégorie spécifique.',
    ],
  },
  {
    id: 'bilan',
    title: 'Bilan & Exports',
    icon: BarChart3,
    color: '#3B82F6',
    iconBg: '#3B82F620',
    titleColor: '#3B82F6',
    paragraphs: [
      'Le bilan financier résume les entrées et sorties sur une période donnée (mois ou année) pour la caisse sélectionnée.',
      'Il présente les totaux par catégorie avec des barres de proportion visuelles.',
      'Les exports PDF, Excel et CSV incluent le nom de l\'église et son logo (configurables dans Paramètres).',
      'Le bilan est un outil essentiel pour les réunions du conseil d\'église et les rapports annuels.',
    ],
    tips: [
      'Configurez le nom complet de l\'église et son logo dans Paramètres pour des exports professionnels.',
      'L\'export Excel contient plusieurs feuilles : revenus, dépenses, et résumé par catégorie.',
      'Le format PDF est idéal pour l\'impression et l\'envoi aux instances de l\'église.',
      'Le format CSV est compatible avec tous les tableurs et outils de traitement de données.',
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications & Trace',
    icon: Bell,
    color: '#FFB800',
    iconBg: '#FFB80020',
    titleColor: '#FFB800',
    paragraphs: [
      'Le système de notifications alerte en temps réel des événements clés : nouvelle transaction en attente, transaction approuvée, ou rejetée.',
      'Chaque notification est cliquable et redirige vers la transaction concernée pour traitement rapide.',
      'La page Trace d\'activité affiche l\'historique complet de toutes les actions financières : créations, modifications, approbations, rejets et versements.',
      'Chaque entrée de trace indique l\'action, l\'entité concernée, le montant, et l\'auteur.',
    ],
    tips: [
      'Les notifications non lues apparaissent en surbrillance avec un point orange.',
      'Le badge de notification sur le dashboard montre le nombre d\'alertes en attente.',
      'La trace d\'activité est un outil d\'audit essentiel pour la transparence financière.',
      'Les actions du trésorier et du pasteur sont distinctement identifiées dans la trace.',
    ],
  },
  {
    id: 'archives',
    title: 'Archivage',
    icon: AlertCircle,
    color: '#3B82F6',
    iconBg: '#3B82F620',
    titleColor: '#3B82F6',
    paragraphs: [
      'L\'archivage permet de masquer les éléments inactifs sans les supprimer définitivement : groupes, comptes, membres et événements.',
      'Un groupe est archivé quand il n\'a plus d\'activité. Un événement devient "Archivé" quand il est annulé.',
      'La page Archives centralise tous les éléments archivés avec la possibilité de les restaurer en un clic.',
      'Les éléments archivés ne sont plus visibles dans les listes principales mais peuvent être restaurés à tout moment.',
    ],
    tips: [
      'L\'archivage préserve l\'historique complet — les données restent consultables dans les archives.',
      'Un membre archivé peut être restauré pour retrouver son accès aux transactions passées.',
      'Un groupe restauré retrouve son compte caisse et son historique de transactions.',
      'La recherche dans les archives permet de retrouver rapidement un élément spécifique.',
    ],
  },
  {
    id: 'parametres',
    title: 'Paramètres & Configuration',
    icon: Settings,
    color: '#808080',
    iconBg: '#80808020',
    titleColor: '#808080',
    paragraphs: [
      'Les Paramètres permettent de configurer l\'identité de l\'église : nom complet, logo, et photo de profil utilisateur.',
      'Le statut de synchronisation indique si l\'appareil est connecté au cloud et si les données sont à jour.',
      'Le stockage local affiche le volume de données et le nombre d\'actions enregistrées dans la trace.',
      'Les raccourcis rapides donnent accès aux différentes sections de l\'application depuis les paramètres.',
    ],
    tips: [
      'Configurez le logo de l\'église pour qu\'il apparaisse sur tous les exports (PDF, Excel).',
      'La photo de profil personnelle s\'affiche dans les traces d\'activité pour identifier l\'auteur.',
      'Le bouton "Actualiser les données" force un rechargement des données depuis la base locale.',
      'Vérifiez régulièrement le statut de synchronisation pour vous assurer que vos données sont sauvegardées.',
    ],
  },
  {
    id: 'roles',
    title: 'Rôles & Permissions',
    icon: UserCircle,
    color: '#FF6B00',
    iconBg: '#FF6B0020',
    titleColor: '#FF6B00',
    paragraphs: [
      'Chaque utilisateur choisit son rôle au premier démarrage : Trésorier, Pasteur, Secrétaire, Comptable, Trésorier Adjoint ou Secrétaire Adjoint.',
      'Le trésorier a les permissions complètes : créer, approuver, modifier les transactions. Le pasteur peut approuver et rejeter les transactions.',
      'Le secrétaire gère les événements et les groupes. Le comptable a accès au grand livre et aux bilans.',
      'Les rôles adjoints assistent leur homonyme principal avec des permissions étendues mais restreintes.',
    ],
    tips: [
      'Un utilisateur peut changer de rôle à tout moment depuis la page de connexion.',
      'Chaque rôle a des permissions spécifiques qui déterminent les actions possibles.',
      'Le système de trace enregistre l\'identité de chaque utilisateur pour chaque action.',
      'Les rôles peuvent être adaptés aux besoins de l\'église — parlez-en à votre administrateur.',
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: HelpCircle,
    color: '#808080',
    iconBg: '#80808020',
    titleColor: '#808080',
    paragraphs: [
      'Questions fréquentes sur l\'utilisation de Lumina.',
    ],
    faqs: [
      { q: 'Qui peut approuver une transaction ?', a: 'Le trésorier et le trésorier adjoint peuvent approuver. Le pasteur peut aussi approuver ou rejeter.' },
      { q: 'Mes données sont-elles en sécurité ?', a: 'Oui, elles sont stockées localement sur votre appareil. La synchronisation cloud est optionnelle et chiffrée.' },
      { q: 'Puis-je utiliser Lumina sans internet ?', a: 'Oui, l\'application fonctionne entièrement hors ligne. La synchronisation se fait automatiquement dès la reconnexion.' },
      { q: 'Comment créer un nouveau groupe ?', a: 'Allez dans Groupes → bouton "Créer" → remplissez le formulaire avec le nom et la couleur du groupe.' },
      { q: 'Que se passe-t-il si je supprime un groupe ?', a: 'Le groupe et sa caisse sont supprimés, mais uniquement s\'ils ont un solde nul. Sinon, archivez-le.' },
      { q: 'Comment faire un versement ?', a: 'Allez dans Plus → Versement, sélectionnez un groupe, entrez le montant, puis confirmez.' },
      { q: 'Comment créer un formulaire personnalisé ?', a: 'Allez dans Plus → Formulaires → Créer. Choisissez le type de chaque champ et publiez le formulaire.' },
      { q: 'Comment modifier mon profil ?', a: 'Allez dans Paramètres → Photo de profil pour changer votre photo. Le nom est modifiable dans Paramètres.' },
      { q: 'Que signifie "En attente" pour une transaction ?', a: 'La transaction a été créée mais n\'a pas encore été approuvée par un trésorier.' },
      { q: 'Comment exporte-t-on un rapport ?', a: 'Depuis le Grand livre ou le Bilan, cliquez sur "Exporter le rapport" et choisissez PDF, Excel ou CSV.' },
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
      'Erreurs courantes et comment les résoudre.',
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

export default function Tutorial() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  const current = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];
  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-[#121212]">
      <TopHeader title="Tutoriel" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Section selector */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide">
          {SECTIONS.map((s) => {
            const SIcon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={activeSection === s.id ? { backgroundColor: s.color + '20', color: s.color } : { backgroundColor: '#181818', color: '#808080', border: '1px solid #282828' }}
              >
                <SIcon className="w-3.5 h-3.5" />
                {s.title}
              </button>
            );
          })}
        </div>

        {/* Current section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: current.iconBg }}>
              <Icon className="w-5 h-5" style={{ color: current.color }} />
            </div>
            <h1 className="text-text-primary font-bold text-xl">{current.title}</h1>
          </div>

          {/* Paragraphs */}
          <div className="space-y-3 mb-5">
            {(current.paragraphs || []).map((p, i) => (
              <p key={i} className="text-text-secondary text-sm leading-relaxed">{p}</p>
            ))}
          </div>

          {/* Tips */}
          {current.tips && current.tips.length > 0 && (
            <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: current.iconBg }}>
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
            <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#E5133220' }}>
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
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
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
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
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

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { const idx = SECTIONS.findIndex(s => s.id === activeSection); if (idx > 0) setActiveSection(SECTIONS[idx - 1].id); }}
            disabled={activeSection === SECTIONS[0].id}
            className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
            style={{ backgroundColor: '#181818', color: activeSection === SECTIONS[0].id ? '#535353' : '#B3B3B3', border: '1px solid #282828' }}
          >
            ← Précédent
          </button>
          <button
            onClick={() => { const idx = SECTIONS.findIndex(s => s.id === activeSection); if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id); }}
            disabled={activeSection === SECTIONS[SECTIONS.length - 1].id}
            className="px-4 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-1"
            style={{ backgroundColor: activeSection === SECTIONS[SECTIONS.length - 1].id ? '#181818' : current.color + '20', color: activeSection === SECTIONS[SECTIONS.length - 1].id ? '#535353' : current.color, border: activeSection === SECTIONS[SECTIONS.length - 1].id ? '1px solid #282828' : 'none' }}
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-text-tertiary text-xs text-center mt-6">Lumina v2.0 · Guide d'utilisation complet</p>
      </div>
      <BottomNav />
    </div>
  );
}
