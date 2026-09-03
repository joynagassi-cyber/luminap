import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ALL_ROLES } from '@/lib/db';
import type { Role } from '@/types';
import { Bell } from 'lucide-react';
import * as db from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import LuminaLogo from '@/components/LuminaLogo';
import LogoSpinner from '@/components/LogoSpinner';

// Professional SVG icons for each role
const ROLE_ICONS: Record<Role, JSX.Element> = {
  PASTEUR: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M12 2v8m0 0v12m0-12H8m4 0h4" />
      <path d="M4 6h16" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
    </svg>
  ),
  TREASURIER: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12m-3-6h6" />
      <path d="M9 10c0-1 1.5-2 3-2s3 1 3 2-1.5 2-3 2-3 1-3 2 1.5 2 3 2 3-1 3-2" />
    </svg>
  ),
  COMPTABLE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <rect x="2" y="3" width="20" height="4" rx="1" />
      <path d="M4 7v10" />
      <path d="M20 7v10" />
      <rect x="2" y="17" width="20" height="4" rx="1" />
      <path d="M7 11h4m-4 3h4m-4 3h4" />
    </svg>
  ),
  SECRETAIRE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8m-8 3h5" />
    </svg>
  ),
  TREASURIER_ADJOINT: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12" />
      <path d="M9 10h5m-5 4h5" />
      <path d="M18 8l2-2m-4 4l2 2" />
    </svg>
  ),
  SECRETAIRE_ADJOINT: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M16 4H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
      <path d="M16 4v6h6" />
      <path d="M8 13h8m-4 4h4" />
      <path d="M18 18l2 2m-4-2l2 2" />
    </svg>
  ),
};

const ROLE_COLORS: Record<Role, string> = {
  PASTEUR: '#FF6B00',
  TREASURIER: '#1DB954',
  COMPTABLE: '#2196F3',
  SECRETAIRE: '#FFB800',
  TREASURIER_ADJOINT: '#E91E63',
  SECRETAIRE_ADJOINT: '#808080',
};

export default function RoleSelection() {
  const navigate = useNavigate();
  const { selectRole } = useLocalStore();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [takenRoles, setTakenRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAlreadySelected();
    loadTakenRoles();
  }, []);

  async function checkAlreadySelected() {
    const role = await db.getRole();
    if (role) {
      navigate('/');
    }
  }

  async function loadTakenRoles() {
    try {
      const { data, error } = await supabase
        .from('role_assignments')
        .select('role');
      if (!error && data) {
        setTakenRoles(data.map(r => r.role as Role));
      }
    } catch {
      // Ignore errors
    }
    setLoading(false);
  }

  const availableRoles = ALL_ROLES.filter(r => !takenRoles.includes(r.key));

  const handleSelect = async (role: Role) => {
    setSelectedRole(role);
    setError('');
    try {
      await selectRole(role);
      navigate('/');
    } catch (err) {
      setError('Impossible de sélectionner ce rôle. Veuillez réessayer.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121212' }}>
        <LogoSpinner size={80} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#121212' }}>
      {/* Header */}
      <div className="px-6 pt-10 pb-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#181818', border: '2px solid #FF6B00' }}>
          <LuminaLogo size={56} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Bienvenue sur Lumina</h1>
        <p className="text-[#808080] text-sm max-w-xs mx-auto">
          Choisissez votre rôle dans l'équipe pour commencer
        </p>
      </div>

      {/* Role Grid */}
      <div className="flex-1 px-5 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {ALL_ROLES.map(({ key, label }) => {
            const isTaken = takenRoles.includes(key);
            const isSelected = selectedRole === key;
            const color = ROLE_COLORS[key];
            return (
              <button
                key={key}
                onClick={() => !isTaken && handleSelect(key)}
                disabled={isTaken}
                className={`relative p-5 rounded-2xl text-left transition-all active:scale-95 ${isTaken ? 'opacity-35 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
                style={{
                  backgroundColor: isSelected
                    ? `${color}18`
                    : isTaken
                    ? '#1A1A1A'
                    : '#212121',
                  border: isSelected
                    ? `2px solid ${color}`
                    : isTaken
                    ? '1px solid #282828'
                    : `1px solid ${color}30`,
                  boxShadow: isSelected ? `0 0 20px ${color}15` : 'none',
                }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${color}18`, color }}
                >
                  {ROLE_ICONS[key]}
                </div>
                {/* Label */}
                <p className="text-white text-sm font-semibold leading-tight">{label}</p>

                {/* Taken badge */}
                {isTaken && (
                  <span className="absolute top-2.5 right-2.5 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#E5133225', color: '#E51332' }}>
                    Pris
                  </span>
                )}
                {/* Selected badge */}
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${color}25`, color }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 text-sm text-center" style={{ color: '#E51332' }}>{error}</p>
        )}

        <p className="mt-6 text-center text-[#535353] text-xs">
          Votre rôle reste fixe une fois choisi. Chaque rôle ne peut être pris qu'une fois.
        </p>
      </div>
    </div>
  );
}
