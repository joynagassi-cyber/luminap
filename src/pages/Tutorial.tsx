import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Wallet, Users, Calendar, BarChart3, HelpCircle, AlertCircle, ChevronRight, CheckCircle, Lightbulb, AlertTriangle } from 'lucide-react';
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
    ],
    tips: [
      'Lumina fonctionne même sans connexion internet.',
      'Les transactions doivent être approuvées par un trésorier pour être validées.',
      'Chaque groupe a sa propre caisse — les versements transfèrent les fonds vers la caisse principale.',
    ],
  },
  {
    id: 'transactions',
    title: 'Gestion des transactions',
    icon: Wallet,
    color: '#1DB954',
    iconBg: '#1DB95420',
    titleColor: '#1DB954',
    paragraphs: [
      'Une transaction peut être une entrée (revenu) ou une sortie (dépense).',
      'Chaque transaction passe par 3 états : Brouillon → En attente → Approuvé.',
      'Le trésorier peut approuver les transactions en attente. Le pasteur peut rejeter une transaction avec un commentaire.',
    ],
    tips: [
      'Source : CAISSE (provient d\'une caisse), COTISATION (d\'un membre), PERSONNE (d\'une personne spécifique), ou AUTRE.',
      'Vous pouvez lier une transaction à un événement ou à un groupe organisationnel.',
      'Les transactions approuvées sont immuables — elles ne peuvent pas être modifiées ou supprimées.',
    ],
    warnings: [
      'Ne créez pas de doublons — vérifiez la date et le montant avant de valider.',
      'Une transaction rejetée ne peut pas être approuvée directement — il faut la recréer.',
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
      'La caisse principale (id: "main") est la caisse centrale de l\'église. C\'est elle qui apparaît sur le tableau de bord.',
      'Chaque groupe organisationnel a sa propre caisse (ex: Jeunesse, Dames, Chorale...).',
      'Un versement est un transfert d\'une caisse groupe vers la caisse principale. Il crée automatiquement 2 transactions liées.',
    ],
    tips: [
      'Le solde d\'une caisse groupe = Entrées du groupe − Sorties du groupe.',
      'Le versement ne peut se faire que si le solde est positif.',
      'La page Versement permet de sélectionner un groupe et un montant personnalisé.',
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
      'Les groupes organisationnels (Diacres, Jeunesse, Dames, Messieurs, Chorale...) permettent de segmenter les finances.',
      'Chaque groupe a une caisse liée automatiquement lors de sa création.',
      'Vous pouvez créer, modifier et supprimer des groupes. La suppression n\'est possible que si la caisse est vide.',
    ],
    tips: [
      'Utilisez les couleurs pour distinguer visuellement les caisses des groupes.',
      'Les versements apparaissent comme une sortie dans la caisse groupe et une entrée dans la caisse principale.',
      'Le solde de chaque groupe est visible sur le Dashboard.',
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
      'Un événement représente une célébration, une conférence, ou une action spéciale de l\'église.',
      'Chaque événement a un budget détaillé avec des postes (dîme, offrande, frais de fonctionnement...).',
      'La liste d\'achats permet de tracker les articles à acheter pour l\'événement (quantité, prix, fournisseur).',
    ],
    tips: [
      'Les états : Planifié → En cours → Terminé (ou Annulé).',
      'Le suivi budgétaire montre en temps réel le montant engagé vs le montant alloué.',
      'Vous pouvez lier des transactions à un événement pour suivre les dépenses associées.',
    ],
    warnings: [
      'Ne dépassez pas le budget alloué — le système indique quand un poste est en dépassement.',
      'Un événement annulé ne doit pas générer de nouvelles transactions.',
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
      'Le bilan financier permet de visualiser les entrées et sorties sur une période donnée (mois ou année).',
      'Vous pouvez filtrer par caisse (principale ou groupe) et par catégorie.',
      'Les exports PDF, Excel et CSV incluent le nom de l\'église et son logo (configurables dans Paramètres).',
    ],
    tips: [
      'Configurez le nom complet de l\'église et son logo dans Paramètres pour des exports professionnels.',
      'L\'export Excel contient plusieurs feuilles : revenus, dépenses, et résumé.',
      'L\'historique d\'actions permet de retracer toutes les opérations financières.',
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
      { q: 'Qui peut approuver une transaction ?', a: 'Le trésorier et le trésorier adjoint peuvent approuver. Le pasteur peut rejeter.' },
      { q: 'Mes données sont-elles en sécurité ?', a: 'Oui, elles sont stockées localement. La synchronisation cloud est optionnelle.' },
      { q: 'Puis-je utiliser Lumina sans internet ?', a: 'Oui, l\'application fonctionne entièrement hors ligne. La sync se fait dès la reconnexion.' },
      { q: 'Comment créer un nouveau groupe ?', a: 'Allez dans Groupes → bouton "Créer" → remplissez le formulaire.' },
      { q: 'Que se passe-t-il si je supprime un groupe ?', a: 'Le groupe et sa caisse sont supprimés, mais uniquement s\'ils ont un solde nul.' },
      { q: 'Comment faire un versement ?', a: 'Allez dans Plus → Versement, sélectionnez un groupe et indiquez le montant.' },
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
      { title: 'Transaction impossible à approuver', solution: 'Vérifiez que vous avez le rôle de trésorier ou pasteur. Les brouillons doivent d\'abord être soumis.' },
      { title: 'Solde négatif impossible à verser', solution: 'Le versement est bloqué si le solde est négatif ou nul. Vérifiez les transactions du groupe.' },
      { title: 'Export PDF vide', solution: 'Assurez-vous d\'avoir configuré le nom de l\'église et le logo dans Paramètres.' },
      { title: 'Groupe introuvable après suppression', solution: 'C\'est normal — un groupe supprimé ne peut pas être restauré. Créez-en un nouveau.' },
      { title: 'Synchronisation bloquée', solution: 'Vérifiez votre connexion internet. Si le problème persiste, allez dans Paramètres → Actualiser les données.' },
    ],
  },
];

export default function Tutorial() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  const current = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];
  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-canvas">
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
                style={activeSection === s.id ? { backgroundColor: s.color + '20', color: s.color } : { backgroundColor: '#212121', color: '#808080' }}
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
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
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
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
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
            style={{ backgroundColor: '#212121', color: activeSection === SECTIONS[0].id ? '#535353' : '#B3B3B3' }}
          >
            ← Précédent
          </button>
          <button
            onClick={() => { const idx = SECTIONS.findIndex(s => s.id === activeSection); if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id); }}
            disabled={activeSection === SECTIONS[SECTIONS.length - 1].id}
            className="px-4 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-1"
            style={{ backgroundColor: activeSection === SECTIONS[SECTIONS.length - 1].id ? '#212121' : current.color + '20', color: activeSection === SECTIONS[SECTIONS.length - 1].id ? '#535353' : current.color }}
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-text-tertiary text-xs text-center mt-6">Lumina v2.0 · Guide d'utilisation</p>
      </div>
      <BottomNav />
    </div>
  );
}
