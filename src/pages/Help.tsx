import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  items: { q: string; a: string }[];
}

const HELP_DATA: HelpSection[] = [
  {
    id: 'transactions',
    title: 'Transactions',
    icon: '💰',
    items: [
      { q: 'Comment créer une transaction ?', a: 'Appuyez sur le bouton "+" orange flottant en bas de l\'écran, ou allez dans "Finance" puis "Nouvelle transaction". Choisissez Entrée ou Sortie, entrez le montant, sélectionnez une catégorie, et ajoutez une description. Vous pouvez sauvegarder en brouillon ou soumettre directement.' },
      { q: 'Quels sont les statuts d\'une transaction ?', a: 'Brouillon (gris) : transaction non finalisée. En attente (orange) : soumise pour approbation. Approuvé (vert) : validée et comptabilisée. Rejeté (rouge) : refusée, vous pouvez la modifier ou la supprimer.' },
      { q: 'Comment approuver une transaction ?', a: 'Allez dans "Finance", filtrer par "En attente", puis appuyez sur la transaction. Depuis la page de détail, cliquez sur "Approuver" si vous avez les droits requis.' },
      { q: 'Que signifie "compenser" ?', a: 'Si une transaction a déjà été approuvée mais contient une erreur, vous pouvez créer une transaction de compensation en choisissant "Créer une correction". Cela annule l\'impact de la transaction originale.' },
    ],
  },
  {
    id: 'categories',
    title: 'Catégories',
    icon: '🏷️',
    items: [
      { q: 'Comment ajouter une catégorie ?', a: 'Lors de la création d\'une transaction, cliquez sur le bouton "+ Ajouter" à côté du sélecteur de catégorie. Remplissez la clé (identifiant technique), le libellé en français, et le type (Entrée ou Sortie). La catégorie sera syncée automatiquement.' },
      { q: 'Quelles catégories existent par défaut ?', a: 'Entrées : Dîme, Offrande, Offrande Mission, Don. Sorties : Salaire Pasteur, Frais de Fonctionnement, Mission, Entretien, Aumône.' },
      { q: 'Une catégorie custom est-elle syncée ?', a: 'Oui, toutes les catégories (y compris custom) sont synchronisées avec le cloud Supabase et visibles par tous les utilisateurs de l\'organisation.' },
    ],
  },
  {
    id: 'sync',
    title: 'Synchronisation',
    icon: '☁️',
    items: [
      { q: 'Comment fonctionne la sync ?', a: 'L\'application est local-first : vos données sont d\'abord sauvegardées dans le navigateur (IndexedDB). Quand vous êtes connecté, les données sont automatiquement synchronisées avec le cloud Supabase en arrière-plan.' },
      { q: 'Que se passe-t-il hors ligne ?', a: 'L\'application fonctionne entièrement hors ligne. Toutes vos transactions sont sauvegardées localement et seront synchronisées dès que la connexion est rétablie.' },
      { q: 'Comment vérifier le statut de sync ?', a: 'Allez dans "Paramètres" pour voir le statut de connexion, la dernière synchronisation, et le mode de stockage. Un badge apparaît brièvement en bas de l\'écran pendant la sync.' },
    ],
  },
  {
    id: 'balance',
    title: 'Bilan & Graphiques',
    icon: '📊',
    items: [
      { q: 'Comment voir le bilan financier ?', a: 'Allez dans "Bilan financier". Choisissez la période (mois/trimestre/année) ou définissez des dates personnalisées. Voyez les entrées, sorties, et résultat net, puis detaillez par catégorie et par groupe.' },
      { q: 'Comment exporter les données ?', a: 'Sur la page Bilan ou Historique, cliquez sur les boutons CSV, PDF ou Excel en haut à droite pour télécharger un rapport de la période sélectionnée.' },
      { q: 'Que montrent les graphiques ?', a: 'Le graphique en courbe montre l\'évolution du solde cumulatif. Le diagramme en barres compare les entrées et sorties par période. Les camemberts détaillent la répartition par catégorie et par groupe organisationnel.' },
    ],
  },
  {
    id: 'groups',
    title: 'Groupes',
    icon: '👥',
    items: [
      { q: 'Quels groupes existent ?', a: 'Diacres, Jeunesse, Dames, Messieurs, Chorale — ces 5 groupes organisationnels sont pré-configurés.' },
      { q: 'À quoi servent les groupes ?', a: 'Attribuer une transaction à un groupe permet de suivre les finances par département de l\'église. Les bilans et graphiques peuvent être filtrés par groupe.' },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: '❓',
    items: [
      { q: 'Mes données sont-elles sécurisées ?', a: 'Vos données sont stockées localement sur votre appareil ET sur notre cloud Supabase. Elles sont chiffrées en transit et protégées par des politiques de sécurité (RLS). Aucun mot de passe n\'est requis pour accéder à l\'application.' },
      { q: 'Puis-je supprimer une transaction ?', a: 'Seules les transactions rejetées peuvent être supprimées. Les transactions approuvées sont immuables — utilisez une transaction de compensation si nécessaire.' },
      { q: 'L\'application fonctionne-t-elle sans internet ?', a: 'Oui ! Lumina est conçue pour fonctionner hors ligne. Toutes les fonctionnalités sont disponibles sans connexion, et la sync se fait automatiquement dès que vous êtes reconnecté.' },
    ],
  },
];

function HelpAccordionItem({ item }: { item: { q: string; a: string } }) {
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

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Aide & FAQ</h1>
            <p className="text-text-tertiary text-xs mt-0.5">Guide d'utilisation de Lumina</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4 mb-6 pb-20">
          {HELP_DATA.map((section) => (
            <div
              key={section.id}
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            >
              {/* Section header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{section.icon}</span>
                <h2 className="text-text-primary font-semibold text-sm">{section.title}</h2>
              </div>
              {/* FAQ items */}
              <div className="px-4 pb-3">
                {section.items.map((item, i) => (
                  <HelpAccordionItem key={i} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
