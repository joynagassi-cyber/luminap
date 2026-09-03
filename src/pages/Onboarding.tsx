import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Wallet, Cloud, Bell as BellIcon } from 'lucide-react';
import LuminaLogo from '@/components/LuminaLogo';
import * as db from '@/lib/db';

const PAGES = [
  {
    id: 'welcome',
    title: 'Bienvenue sur Lumina',
    subtitle: 'La gestion financière simplifiée pour votre communauté',
    cta: "C'est parti",
    illustration: <LuminaLogo size={192} />,
    icon: Wallet,
    iconColor: '#FF6B00',
  },
  {
    id: 'sync',
    title: 'Vos données, toujours avec vous',
    subtitle: 'Sauvegarde locale + synchronisation cloud automatique',
    cta: 'Suivant',
    illustration: (
      <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="60" rx="45" ry="25" fill="#2196F3" fillOpacity="0.2" stroke="#2196F3" strokeWidth="2" />
        <ellipse cx="80" cy="55" rx="20" ry="15" fill="#2196F3" fillOpacity="0.3" />
        <ellipse cx="110" cy="50" rx="25" ry="18" fill="#2196F3" fillOpacity="0.3" />
        <path d="M60 100L40 110L60 120" stroke="#1DB954" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        <path d="M140 100L160 110L140 120" stroke="#E51332" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        <rect x="70" y="130" width="60" height="40" rx="8" fill="#212121" stroke="#282828" strokeWidth="2" />
        <ellipse cx="100" cy="135" rx="25" ry="8" fill="#282828" />
        <ellipse cx="100" cy="148" rx="25" ry="8" fill="#282828" />
        <ellipse cx="100" cy="161" rx="25" ry="8" fill="#282828" />
        <path d="M90 148L97 155L112 140" stroke="#1DB954" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    icon: Cloud,
    iconColor: '#2196F3',
  },
  {
    id: 'roles',
    title: 'Un rôle, des responsabilités',
    subtitle: 'Choisissez votre rôle et suivez les notifications en temps réel',
    cta: 'Commencer',
    illustration: (
      <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="55" r="25" fill="#FF6B00" fillOpacity="0.2" stroke="#FF6B00" strokeWidth="2" />
        <circle cx="100" cy="50" r="12" fill="#FF6B00" />
        <path d="M75 85C75 75 85 70 100 70C115 70 125 75 125 85V100H75V85Z" fill="#FF6B00" opacity="0.7" />
        <path d="M140 40C140 35 145 30 150 30C155 30 160 35 160 40V55L165 60V65H135V60L140 55V40Z" fill="#FFB800" stroke="#FFB800" strokeWidth="1.5" />
        <circle cx="150" cy="70" r="4" fill="#FFB800" />
        <circle cx="160" cy="35" r="8" fill="#E51332" />
        <text x="160" y="38" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">3</text>
        <rect x="30" y="115" width="50" height="35" rx="6" fill="#212121" stroke="#282828" strokeWidth="1.5" />
        <rect x="38" y="123" width="16" height="16" rx="4" fill="#1DB954" opacity="0.3" />
        <rect x="60" y="127" width="14" height="4" rx="2" fill="#B3B3B3" opacity="0.5" />
        <rect x="110" y="115" width="50" height="35" rx="6" fill="#212121" stroke="#FF6B00" strokeWidth="1.5" />
        <rect x="118" y="123" width="16" height="16" rx="4" fill="#FF6B00" opacity="0.3" />
        <rect x="140" y="127" width="14" height="4" rx="2" fill="#FF6B00" />
        <circle cx="100" cy="170" r="14" fill="#FF6B00" opacity="0.15" stroke="#FF6B00" strokeWidth="1.5" />
        <path d="M93 170H107M100 163V177" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    icon: BellIcon,
    iconColor: '#FFB800',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStart = useRef(0);
  const touchEnd = useRef(0);

  const goToPage = (index: number) => {
    if (isTransitioning) return;
    if (index < 0 || index >= PAGES.length) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(index);
      setIsTransitioning(false);
    }, 200);
  };

  const handleSwipe = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    touchEnd.current = e.touches[0].clientX;
    const diff = touchStart.current - touchEnd.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToPage(currentPage + 1);
      else goToPage(currentPage - 1);
    }
  };

  const handleStart = async () => {
    if (currentPage === PAGES.length - 1) {
      await db.setConfig('hasCompletedOnboarding', true);
      navigate('/login');
    } else {
      goToPage(currentPage + 1);
    }
  };

  const page = PAGES[currentPage];
  const Icon = page.icon;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#121212' }}>
      <div className="flex justify-center gap-2 py-6">
        {PAGES.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === currentPage ? '24px' : '8px', backgroundColor: i === currentPage ? '#FF6B00' : '#282828' }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <div
          className={`w-full max-w-sm transition-all duration-200 ${isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
          onTouchStart={handleSwipe}
          onTouchEnd={handleSwipeEnd}
        >
          <div className="mb-8 flex items-center justify-center">{page.illustration}</div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: page.iconColor + '20' }}
          >
            <Icon className="w-7 h-7" style={{ color: page.iconColor }} />
          </div>
          <h1 className="text-2xl font-black text-text-primary text-center mb-3">{page.title}</h1>
          <p className="text-text-secondary text-center text-sm leading-relaxed max-w-xs mx-auto">{page.subtitle}</p>
        </div>
      </div>

      <div className="px-8 pb-10">
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-full font-bold text-base text-white transition-all active:scale-95"
          style={{ backgroundColor: '#FF6B00' }}
        >
          {page.cta}
          {currentPage < PAGES.length - 1 && <ChevronRight className="inline w-5 h-5 ml-1" />}
        </button>
        {currentPage > 0 && (
          <button
            onClick={() => goToPage(currentPage - 1)}
            className="w-full py-3 mt-2 rounded-full font-medium text-sm text-text-tertiary transition-all active:scale-95"
          >
            ← Retour
          </button>
        )}
      </div>
    </div>
  );
}
