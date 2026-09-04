import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Transaction } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'd MMM yyyy', { locale: fr });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'd MMM yyyy à HH:mm', { locale: fr });
}

export function getStatusLabel(status: Transaction['status']): string {
  const labels: Record<Transaction['status'], string> = {
    DRAFT: 'Brouillon',
    PENDING: 'En attente',
    APPROVED: 'Approuvé',
    REJECTED: 'Rejeté',
  };
  return labels[status];
}

export function getStatusColor(status: Transaction['status']): string {
  const colors: Record<Transaction['status'], string> = {
    DRAFT: '#808080',
    PENDING: '#FFB800',
    APPROVED: '#1DB954',
    REJECTED: '#E51332',
  };
  return colors[status];
}

export function getPeriodRange(period: 'jour' | 'semaine' | 'mois' | 'annee'): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  switch (period) {
    case 'jour':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'semaine':
      start = new Date(now);
      start.setDate(start.getDate() - start.getDay() + 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'mois':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'annee':
      start = new Date(now.getFullYear(), 0, 1);
      break;
  }
  return { start: start.toISOString(), end: now.toISOString() };
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    PASTEUR: 'Pasteur',
    SECRETAIRE: 'Secrétaire',
    TREASURIER: 'Trésorier',
    COMPTABLE: 'Comptable',
    TREASURIER_ADJOINT: 'Trésorier Adjoint',
    SECRETAIRE_ADJOINT: 'Secrétaire Adjoint',
  };
  return labels[role] ?? role;
}
