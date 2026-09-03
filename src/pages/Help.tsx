import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronUp,
  Plus, CheckCircle, Clock, XCircle, RefreshCw,
  Tag, Building2, BarChart3, TrendingUp, Wallet,
  Shield, Cloud, Smartphone, Users, Calendar, AlertCircle,
  FileText, Download,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

// ─── Tutorial Walkthrough ────────────────────────────────────────────────────

const WALKTHROUGH_STEPS = [
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: '1. Créez une transaction',
    body: 'Appuyez sur le bouton "+" orange. Choisissez Entrée ou Sortie, saisissez le montant, sélectionnez la catégorie et la date. Vous pouvez sauvegarder en brouillon ou soumettre pour approbation.',
    color: '#FF6B00',
  },
  {
    icon: <CheckCircle className="w-6 h-6" />,
    title: '2. Gérez les statuts',
    body: 'Chaque transaction passe par trois étapes : Brouillon → En attente → Approuvé. Les membres de l\'équipe peuvent approuver ou rejeter les transactions soumises.',
    color: '#1DB954',
  },
  {
    icon: <Building2 className="w-6 h-6" />,
    title: '3. Organisez par groupe',
    body: 'Attribuez une transaction à un groupe (diacres, jeunesse, chorale…) pour suivre les finances par département. Chaque groupe a son propre solde.',
    color: '#2196F3',
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: '4. Suivez vos événements',
    body: 'Créez des événements (collecte, célébration, projet) et attachez-y des entrées et sorties. Suivez le budget et les dépenses en temps réel.',
    color: '#FFB800',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: '5. Consultez vos rapports',
    body: 'Le bilan financier, le grand livre et les graphiques vous donnent une vue complète de la santé financière de votre communauté.',
    color: '#E91E63',
  },
  {
    icon: <Cloud className="w-6 h-6" />,
    title: '6. Sauvegarde automatique',
    body: 'Vos données sont stockées localement sur votre appareil et synchronisées automatiquement avec le cloud quand vous êtes connecté. Fonctionne hors-ligne.',
    color: '#808080',
  },
];

// ─── FAQ Data ──────────────────────────────────────────────────────────────────

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  id: string;
  title: string;
  icon: typeof Wallet;
  color: string;
  items: FAQItem[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    id: 'transactions',
    title: 'Transactions',
    icon: Wallet,
    color: '#FF6B00',
    items: [
      { q: 'Comment créer une transaction ?', a: 'Appuyez sur le bouton "+" orange flottant en bas de l\'écran, ou allez dans "Finance" puis "Nouvelle transaction". Choisissez Entrée ou Sortie, entrez le montant, sélectionnez une catégorie, et ajoutez une description. Vous pouvez sauvegarder en brouillon ou soumettre directement.' },
      { q: 'Quels sont les statuts d\'une transaction ?', a: 'Brouillon (gris) : transaction non finalisée. En attente (orange) : soumise pour approbation. Approuvé (vert) : validée et comptabilisée. Rejeté (rouge) : refusée, vous pouvez la modifier ou la supprimer.' },
      { q: 'Comment approuver une transaction ?', a: 'Allez dans "Finance", filtrez par "En attente", puis appuyez sur la transaction. Depuis la page de détail, cliquez sur "Approuver" si vous avez les droits requis.' },
      { q: 'Que signifie "compenser" ?', a: 'Si une transaction a déjà été approuvée mais contient une erreur, vous pouvez créer une transaction de compensation en choisissant "Créer une correction". Cela annule l\'impact de la transaction originale.' },
    ],
  },
  {
    id: 'categories',
    title: 'Catégories',
    icon: Tag,
    color: '#2196F3',
    items: [
      { q: 'Comment ajouter une catégorie ?', a: 'Lors de la création d\'une transaction, cliquez sur le bouton "+ Ajouter" à côté du sélecteur de catégorie. Remplissez la clé (identifiant technique), le libellé en français, et le type (Entrée ou Sortie). La catégorie sera syncée automatiquement.' },
      { q: 'Quelles catégories existent par défaut ?', a: 'Entrées : Dîme, Offrande, Offrande Mission, Don. Sorties : Salaire Pasteur, Frais de Fonctionnement, Mission, Entretien, Aumône.' },
      { q: 'Une catégorie custom est-elle syncée ?', a: 'Oui, toutes les catégories (y compris custom) sont synchronisées avec le cloud Supabase et visibles par tous les utilisateurs de l\'organisation.' },
    ],
  },
  {
    id: 'groups',
    title: 'Groupes & Événements',
    icon: Users,
    color: '#FFB800',
    items: [
      { q: 'Quels groupes existent ?', a: 'Diacres, Jeunesse, Dames, Messieurs, Chorale — ces 5 groupes organisationnels sont pré-configurés. Vous pouvez en créer d\'autres.' },
      { q: 'À quoi servent les groupes ?', a: 'Attribuer une transaction à un groupe permet de suivre les finances par département de l\'église. Les bilans et graphiques peuvent être filtrés par groupe.' },
      { q: 'Comment créer un événement ?', a: 'Allez dans "Plus" → "Événements" puis appuyez sur "+". Remplissez le nom, la date, un budget optionnel et une description. Vous pourrez ensuite y attacher des entrées et sorties.' },
    ],
  },
  {
    id: 'sync',
    title: 'Synchronisation',
    icon: Cloud,
    color: '#808080',
    items: [
      { q: 'Comment fonctionne la sync ?', a: 'L\'application est local-first : vos données sont d\'abord sauvegardées dans le navigateur (IndexedDB). Quand vous êtes connecté, les données sont automatiquement synchronisées avec le cloud Supabase en arrière-plan.' },
      { q: 'Que se passe-t-il hors ligne ?', a: 'L\'application fonctionne entièrement hors ligne. Toutes vos transactions sont sauvegardées localement et seront synchronisées dès que la connexion est rétablie.' },
      { q: 'Comment vérifier le statut de sync ?', a: 'Allez dans "Paramètres" pour voir le statut de connexion, la dernière synchronisation, et le mode de stockage.' },
    ],
  },
  {
    id: 'faq',
    title: 'Questions fréquentes',
    icon: AlertCircle,
    color: '#E91E63',
    items: [
      { q: 'Mes données sont-elles sécurisées ?', a: 'Vos données sont stockées localement sur votre appareil ET sur notre cloud Supabase. Elles sont chiffrées en transit et protégées par des politiques de sécurité (RLS). Aucun mot de passe n\'est requis pour accéder à l\'application.' },
      { q: 'Puis-je supprimer une transaction ?', a: 'Seules les transactions rejetées peuvent être supprimées. Les transactions approuvées sont immuables — utilisez une transaction de compensation si nécessaire.' },
      { q: 'L\'application fonctionne-t-elle sans internet ?', a: 'Oui ! Lumina est conçue pour fonctionner hors ligne. Toutes les fonctionnalités sont disponibles sans connexion, et la sync se fait automatiquement dès que vous êtes reconnecté.' },
    ],
  },
];

function FAQAccordionItem({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0" style={{ borderBottomColor: '#282828' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <span className="text-text-primary text-sm font-medium pr-4">{item.q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        )}
      </button>
      {open && (
        <p className="text-text-secondary text-sm pb-3 leading-relaxed">
          {item.a}
        </p>
      )}
    </div>
  );
}

export default function Help() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Aide & Guide" showBack />
      <div className="max-w-lg mx-auto px-5 pb-24">

        {/* ─── Tutorial Walkthrough ─────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-primary font-bold text-base">Guide rapide</h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>
              {activeStep + 1} / {WALKTHROUGH_STEPS.length}
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {WALKTHROUGH_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: i === activeStep ? '24px' : '6px',
                  backgroundColor: i === activeStep ? '#FF6B00' : '#282828',
                }}
              />
            ))}
          </div>

          {/* Current step card */}
          <div
            className="rounded-2xl p-5 mb-4 transition-all"
            style={{
              backgroundColor: '#212121',
              border: `1px solid ${WALKTHROUGH_STEPS[activeStep].color}30`,
              boxShadow: `0 0 24px ${WALKTHROUGH_STEPS[activeStep].color}10`,
            }}
          >
            {/* Icon circle */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: WALKTHROUGH_STEPS[activeStep].color + '20', color: WALKTHROUGH_STEPS[activeStep].color }}
            >
              {WALKTHROUGH_STEPS[activeStep].icon}
            </div>

            {/* Title */}
            <h3 className="text-text-primary font-bold text-base mb-2">
              {WALKTHROUGH_STEPS[activeStep].title}
            </h3>

            {/* Body */}
            <p className="text-text-secondary text-sm leading-relaxed">
              {WALKTHROUGH_STEPS[activeStep].body}
            </p>
          </div>

          {/* Navigation arrows */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveStep(s => Math.max(0, s - 1))}
              disabled={activeStep === 0}
              className="flex-1 py-3 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-30"
              style={{ backgroundColor: '#282828', color: activeStep === 0 ? '#535353' : '#B3B3B3' }}
            >
              ← Précédent
            </button>
            {activeStep < WALKTHROUGH_STEPS.length - 1 ? (
              <button
                onClick={() => setActiveStep(s => Math.min(WALKTHROUGH_STEPS.length - 1, s + 1))}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-all active:scale-95"
                style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}
              >
                Suivant →
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-all active:scale-95"
                style={{ backgroundColor: '#1DB954', color: '#FFFFFF' }}
              >
                Commencer ✓
              </button>
            )}
          </div>
        </div>

        {/* ─── FAQ Sections ────────────────────────────────────────── */}
        <div className="space-y-4 pb-8">
          <h2 className="text-text-primary font-bold text-base mb-3">Centre d'aide</h2>
          {FAQ_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              >
                {/* Section header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: section.color + '20', color: section.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-text-primary font-semibold text-sm">{section.title}</h2>
                </div>
                {/* FAQ items */}
                <div className="px-4 pb-3">
                  {section.items.map((item, i) => (
                    <FAQAccordionItem key={i} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
