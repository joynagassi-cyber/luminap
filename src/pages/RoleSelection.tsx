import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ALL_ROLES } from '@/lib/db';
import type { Role } from '@/types';
import { Bell } from 'lucide-react';
import * as db from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';

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
        <div className="w-8 h-8 rounded-full border-4 border-[#FF6B00] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#121212' }}>
      {/* Header */}
      <div className="px-6 pt-10 pb-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#181818', border: '2px solid #FF6B00' }}>
          <span className="text-3xl font-black" style={{ color: '#FF6B00' }}>L</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Bienvenue sur Lumina</h1>
        <p className="text-[#808080] text-sm max-w-xs mx-auto">
          Choisissez votre rôle dans l'équipe pour commencer
        </p>
      </div>

      {/* Role Grid */}
      <div className="flex-1 px-5 pb-8">
        <p className="text-[#B3B3B3] text-sm font-medium mb-3">Votre rôle</p>
        <div className="grid grid-cols-2 gap-3">
          {ALL_ROLES.map(({ key, label, icon }) => {
            const isTaken = takenRoles.includes(key);
            const isSelected = selectedRole === key;
            return (
              <button
                key={key}
                onClick={() => !isTaken && handleSelect(key)}
                disabled={isTaken}
                className={`relative p-4 rounded-xl text-left transition-all active:scale-95 ${isTaken ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
                style={{ backgroundColor: '#212121', border: isSelected ? '2px solid #FF6B00' : '1px solid #282828' }}
              >
                <span className="text-2xl block mb-2">{icon}</span>
                <p className="text-white text-sm font-semibold">{label}</p>
                {isTaken && (
                  <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
                    Pris
                  </span>
                )}
                {isSelected && (
                  <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>
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
