import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Wallet, WalletMinimal, Calendar, BarChart3, Sparkles } from 'lucide-react';

const SCREENS = [
  {
    id: 'welcome',
    title: 'Bienvenue sur Lumina',
    subtitle: 'Gestion financière simplifiée pour votre église',
    description: 'Lumina vous aide à suivre les revenus, dépenses et versements de votre communauté. Simple, offline et sécurisé.',
    icon: Sparkles,
    iconColor: '#FF6B00',
    iconBg: '#FF6B0020',
  },
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    subtitle: 'Vue d\'ensemble de vos finances',
    description: 'Consultez instantanément le solde de chaque caisse, les transactions récentes et les événements à venir. Tout en un coup d\'œil.',
    icon: BarChart3,
    iconColor: '#1DB954',
    iconBg: '#1DB95420',
  },
  {
    id: 'transactions',
    title: 'Transactions',
    subtitle: 'Enregistrer revenus et dépenses',
    description: 'Créez des transactions en quelques taps. Suivez leur statut : brouillon, en attente, approuvé ou rejeté. Chaque action est tracée.',
    icon: Wallet,
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
  {
    id: 'caisses',
    title: 'Caisses & Groupes',
    subtitle: 'Organisez vos fonds par groupe',
    description: 'Chaque groupe (Diacres, Jeunesse, Dames...) a sa propre caisse. Effectuez des versements vers la caisse principale en toute simplicité.',
    icon: WalletMinimal,
    iconColor: '#FFB800',
    iconBg: '#FFB80020',
  },
  {
    id: 'events',
    title: 'Événements',
    subtitle: 'Planifiez et suivez vos budgets',
    description: 'Créez des événements avec budget détaillé. Suivez les dépenses en temps réel et gérez la liste des achats pour chaque célébration.',
    icon: Calendar,
    iconColor: '#EC4899',
    iconBg: '#EC489920',
  },
  {
    id: 'reports',
    title: 'Rapports & Exports',
    subtitle: 'Produisez des bilans professionnels',
    description: 'Générez des bilans financiers par période. Exportez en PDF, Excel ou CSV avec le logo et le nom de votre église.',
    icon: BarChart3,
    iconColor: '#3B82F6',
    iconBg: '#3B82F620',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const isLast = current === SCREENS.length - 1;
  const screen = SCREENS[current];
  const Icon = screen.icon;

  const handleNext = () => {
    if (isLast) {
      navigate('/role-selection', { replace: true });
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleBack = () => {
    if (current > 0) {
      setCurrent(c => c - 1);
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-5">
        <button
          onClick={handleBack}
          className="text-text-tertiary text-xs font-medium"
        >
          {current > 0 ? 'Précédent' : 'Passer'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">
        {/* Logo */}
        <div className="mb-6">
          <img src="/lumina-logo.png" alt="Lumina" className="w-24 h-24 mx-auto" />
        </div>

        {/* Icon */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8"
          style={{ backgroundColor: screen.iconBg }}
        >
          <Icon className="w-12 h-12" style={{ color: screen.iconColor }} />
        </div>

        {/* Title */}
        <h1 className="text-text-primary font-bold text-2xl text-center mb-3">
          {screen.title}
        </h1>

        {/* Subtitle */}
        <p
          className="text-sm font-medium mb-4 text-center"
          style={{ color: screen.iconColor }}
        >
          {screen.subtitle}
        </p>

        {/* Description */}
        <p className="text-text-secondary text-sm text-center leading-relaxed">
          {screen.description}
        </p>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-12">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {SCREENS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === current ? '24px' : '8px',
                backgroundColor: i === current ? screen.iconColor : '#282828',
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 py-3.5 rounded-full font-semibold text-sm transition-all active:scale-95"
            style={{ backgroundColor: '#212121', color: '#B3B3B3' }}
          >
            {current > 0 ? 'Précédent' : 'Ignorer'}
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-full font-semibold text-sm text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#FF6B00' }}
          >
            {isLast ? 'Commencer' : 'Suivant'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
