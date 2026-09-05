import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const SCREENS = [
  {
    id: 'welcome',
    title: 'Gérez vos finances simplement',
    subtitle: 'Bienvenue sur Lumina',
    description: 'Suivez les revenus, dépenses et versements de votre église — offline, sécurisé et accessible à tous.',
    illustration: (
      <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <rect x="30" y="20" width="220" height="160" rx="16" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="50" y="40" width="180" height="8" rx="4" fill="#FF6B00" />
        <rect x="50" y="60" width="120" height="6" rx="3" fill="#282828" />
        <rect x="50" y="80" width="70" height="40" rx="8" fill="#1DB95420" />
        <rect x="130" y="80" width="100" height="40" rx="8" fill="#282828" />
        <rect x="50" y="135" width="180" height="6" rx="3" fill="#282828" />
        <rect x="50" y="150" width="130" height="6" rx="3" fill="#282828" />
        <circle cx="220" cy="44" r="3" fill="#E51332" />
        <circle cx="210" cy="44" r="3" fill="#FFB800" />
        <circle cx="200" cy="44" r="3" fill="#1DB954" />
        <rect x="60" y="90" width="20" height="20" rx="4" fill="#1DB954" />
        <rect x="72" y="96" width="30" height="4" rx="2" fill="#1DB954" opacity="0.6" />
        <rect x="72" y="104" width="20" height="4" rx="2" fill="#1DB954" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    title: 'Vue d\'ensemble',
    subtitle: 'Tableau de bord',
    description: 'Consultez instantanément le solde de chaque caisse, les transactions récentes et les événements à venir. Tout en un coup d\'œil.',
    illustration: (
      <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <rect x="20" y="20" width="110" height="70" rx="12" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="35" y="35" width="50" height="8" rx="4" fill="#1DB954" />
        <rect x="35" y="50" width="80" height="4" rx="2" fill="#282828" />
        <rect x="35" y="60" width="60" height="4" rx="2" fill="#282828" />
        <rect x="35" y="80" width="40" height="4" rx="2" fill="#282828" />
        <rect x="150" y="20" width="110" height="70" rx="12" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="165" y="35" width="50" height="8" rx="4" fill="#FFB800" />
        <rect x="165" y="50" width="80" height="4" rx="2" fill="#282828" />
        <rect x="165" y="60" width="60" height="4" rx="2" fill="#282828" />
        <rect x="165" y="80" width="40" height="4" rx="2" fill="#282828" />
        <rect x="20" y="105" width="240" height="75" rx="12" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="35" y="120" width="30" height="40" rx="4" fill="#282828" />
        <rect x="75" y="135" width="30" height="25" rx="4" fill="#FF6B00" />
        <rect x="115" y="125" width="30" height="35" rx="4" fill="#282828" />
        <rect x="155" y="140" width="30" height="20" rx="4" fill="#282828" />
        <rect x="195" y="115" width="30" height="45" rx="4" fill="#282828" />
      </svg>
    ),
  },
  {
    id: 'transactions',
    title: 'Transactions',
    subtitle: 'Enregistrer chaque mouvement',
    description: 'Créez des transactions en quelques taps. Suivez leur statut : brouillon, en attente, approuvé ou rejeté. Chaque action est tracée.',
    illustration: (
      <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <rect x="60" y="15" width="160" height="170" rx="16" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="80" y="35" width="120" height="6" rx="3" fill="#282828" />
        <rect x="80" y="55" width="90" height="50" rx="8" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <circle cx="95" cy="70" r="10" fill="#1DB95420" />
        <rect x="88" y="67" width="14" height="6" rx="1" fill="#1DB954" />
        <rect x="115" y="63" width="60" height="4" rx="2" fill="#282828" />
        <rect x="115" y="73" width="40" height="4" rx="2" fill="#282828" />
        <rect x="115" y="83" width="30" height="4" rx="2" fill="#282828" />
        <rect x="80" y="115" width="90" height="50" rx="8" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <circle cx="95" cy="130" r="10" fill="#E5133220" />
        <rect x="88" y="127" width="14" height="6" rx="1" fill="#E51332" />
        <rect x="115" y="123" width="60" height="4" rx="2" fill="#282828" />
        <rect x="115" y="133" width="40" height="4" rx="2" fill="#282828" />
        <rect x="115" y="143" width="30" height="4" rx="2" fill="#282828" />
        <circle cx="230" cy="170" r="18" fill="#FF6B00" />
        <path d="M222 170h16M230 162v16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'caisses',
    title: 'Caisses & Groupes',
    subtitle: 'Organisez vos fonds',
    description: 'Chaque groupe (Diacres, Jeunesse, Dames...) a sa propre caisse. Effectuez des versements vers la caisse principale en toute simplicité.',
    illustration: (
      <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <rect x="20" y="15" width="100" height="70" rx="12" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="35" y="30" width="70" height="6" rx="3" fill="#FF6B00" />
        <rect x="35" y="45" width="50" height="4" rx="2" fill="#282828" />
        <rect x="35" y="55" width="40" height="4" rx="2" fill="#282828" />
        <rect x="35" y="75" width="70" height="4" rx="2" fill="#282828" />
        <rect x="160" y="15" width="100" height="70" rx="12" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="175" y="30" width="70" height="6" rx="3" fill="#8B5CF6" />
        <rect x="175" y="45" width="50" height="4" rx="2" fill="#282828" />
        <rect x="175" y="55" width="40" height="4" rx="2" fill="#282828" />
        <rect x="175" y="75" width="70" height="4" rx="2" fill="#282828" />
        <rect x="20" y="105" width="100" height="70" rx="12" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="35" y="120" width="70" height="6" rx="3" fill="#1DB954" />
        <rect x="35" y="135" width="50" height="4" rx="2" fill="#282828" />
        <rect x="35" y="145" width="40" height="4" rx="2" fill="#282828" />
        <rect x="35" y="165" width="70" height="4" rx="2" fill="#282828" />
        <rect x="160" y="105" width="100" height="70" rx="12" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="175" y="120" width="70" height="6" rx="3" fill="#FFB800" />
        <rect x="175" y="135" width="50" height="4" rx="2" fill="#282828" />
        <rect x="175" y="145" width="40" height="4" rx="2" fill="#282828" />
        <rect x="175" y="165" width="70" height="4" rx="2" fill="#282828" />
        <path d="M120 50h40M120 140h40" stroke="#FF6B00" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" />
        <path d="M130 45l10 5-10 5" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M150 135l10 5-10 5" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'events',
    title: 'Événements & Budgets',
    subtitle: 'Planifiez chaque célébration',
    description: 'Créez des événements avec budget détaillé. Suivez les dépenses en temps réel et gérez la liste des achats pour chaque célébration.',
    illustration: (
      <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <rect x="30" y="15" width="220" height="170" rx="16" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="50" y="30" width="60" height="8" rx="4" fill="#EC4899" />
        <rect x="120" y="30" width="40" height="8" rx="4" fill="#282828" />
        <rect x="170" y="30" width="40" height="8" rx="4" fill="#282828" />
        <rect x="50" y="55" width="180" height="1" fill="#282828" />
        <rect x="50" y="70" width="120" height="6" rx="3" fill="#282828" />
        <rect x="50" y="85" width="80" height="6" rx="3" fill="#282828" />
        <rect x="50" y="100" width="100" height="6" rx="3" fill="#282828" />
        <rect x="50" y="125" width="180" height="40" rx="8" fill="#181818" stroke="#282828" strokeWidth="1" />
        <rect x="60" y="135" width="60" height="4" rx="2" fill="#282828" />
        <rect x="60" y="145" width="40" height="4" rx="2" fill="#282828" />
        <rect x="180" y="135" width="40" height="14" rx="4" fill="#EC489920" />
        <rect x="240" y="70" width="10" height="40" rx="2" fill="#EC4899" />
        <rect x="225" y="85" width="10" height="25" rx="2" fill="#EC4899" opacity="0.6" />
        <rect x="210" y="95" width="10" height="15" rx="2" fill="#EC4899" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'reports',
    title: 'Rapports & Bilans',
    subtitle: 'Des exports professionnels',
    description: 'Générez des bilans financiers par période. Exportez en PDF, Excel ou CSV avec le logo et le nom de votre église.',
    illustration: (
      <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <rect x="20" y="15" width="130" height="170" rx="12" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="35" y="35" width="100" height="6" rx="3" fill="#3B82F6" />
        <rect x="35" y="55" width="70" height="4" rx="2" fill="#282828" />
        <rect x="35" y="65" width="50" height="4" rx="2" fill="#282828" />
        <rect x="35" y="85" width="100" height="50" rx="6" fill="#181818" />
        <rect x="45" y="110" width="20" height="20" rx="3" fill="#3B82F6" />
        <rect x="70" y="100" width="20" height="30" rx="3" fill="#3B82F6" opacity="0.7" />
        <rect x="95" y="90" width="20" height="40" rx="3" fill="#3B82F6" opacity="0.5" />
        <rect x="120" y="105" width="20" height="25" rx="3" fill="#3B82F6" opacity="0.3" />
        <rect x="35" y="150" width="100" height="6" rx="3" fill="#282828" />
        <rect x="35" y="162" width="70" height="4" rx="2" fill="#282828" />
        <rect x="170" y="30" width="80" height="140" rx="12" fill="#1E1E1E" stroke="#282828" strokeWidth="1" />
        <rect x="185" y="50" width="50" height="6" rx="3" fill="#282828" />
        <rect x="185" y="70" width="50" height="4" rx="2" fill="#282828" />
        <rect x="185" y="80" width="50" height="4" rx="2" fill="#282828" />
        <rect x="185" y="100" width="50" height="4" rx="2" fill="#282828" />
        <rect x="185" y="110" width="50" height="4" rx="2" fill="#282828" />
        <rect x="185" y="130" width="50" height="20" rx="4" fill="#3B82F6" />
        <rect x="195" y="137" width="30" height="6" rx="2" fill="white" />
      </svg>
    ),
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const isLast = current === SCREENS.length - 1;
  const screen = SCREENS[current];

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
    <div className="min-h-screen bg-[#121212] flex flex-col">
      {/* Header with logo */}
      <div className="flex items-center justify-between px-6 py-5">
        <img src="/lumina-logo.png" alt="Lumina" className="w-10 h-10 object-contain" />
        {current > 0 ? (
          <button
            onClick={handleBack}
            className="text-[#808080] text-sm font-medium"
          >
            Précédent
          </button>
        ) : (
          <button
            onClick={handleBack}
            className="text-[#808080] text-sm font-medium"
          >
            Passer
          </button>
        )}
      </div>

      {/* Illustration */}
      <div className="flex-shrink-0 px-8 pt-4 pb-2">
        <div className="rounded-2xl overflow-hidden" style={{ background: '#181818' }}>
          {screen.illustration}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pt-8 pb-4">
        <p
          className="text-sm font-semibold mb-2"
          style={{ color: screen.id === 'welcome' ? '#FF6B00' : '#808080' }}
        >
          {screen.subtitle}
        </p>
        <h1 className="text-white font-bold text-2xl leading-tight mb-3">
          {screen.title}
        </h1>
        <p className="text-[#B3B3B3] text-sm leading-relaxed">
          {screen.description}
        </p>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-10">
        {/* Dots */}
        <div className="flex justify-center gap-1.5 mb-8">
          {SCREENS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === current ? '24px' : '6px',
                height: '6px',
                backgroundColor: i === current ? '#FF6B00' : '#282828',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 py-3.5 rounded-full font-semibold text-sm transition-all active:scale-95"
            style={{ backgroundColor: '#1E1E1E', color: '#808080', border: '1px solid #282828' }}
          >
            {current > 0 ? 'Précédent' : 'Ignorer'}
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-full font-semibold text-sm text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#FF6B00' }}
          >
            {isLast ? 'Commencer' : 'Suivant'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
            {isLast && <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
