import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Wallet, Cloud, Bell as BellIcon } from 'lucide-react';
import LuminaLogo from '@/components/LuminaLogo';
import * as db from '@/lib/db';

const ORANGE = '#FF6B00';
const GREEN = '#1DB954';
const RED = '#E51332';
const YELLOW = '#FFB800';
const BLUE = '#2196F3';
const SURFACE = '#212121';
const SURFACE_ALT = '#1A1A1A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#B3B3B3';

// ─── Illustrations ───────────────────────────────────────────────────────────

function IllustrationWelcome() {
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer glow ring */}
      <circle cx="100" cy="100" r="90" fill={ORANGE} fillOpacity="0.06" />
      <circle cx="100" cy="100" r="70" fill={ORANGE} fillOpacity="0.08" />
      {/* Geometric diamond shape */}
      <polygon points="100,35 145,100 100,165 55,100" fill={ORANGE} fillOpacity="0.15" stroke={ORANGE} strokeWidth="2" />
      <polygon points="100,55 130,100 100,145 70,100" fill={ORANGE} fillOpacity="0.3" />
      <polygon points="100,70 118,100 100,130 82,100" fill={ORANGE} fillOpacity="0.6" />
      <polygon points="100,85 108,100 100,115 92,100" fill={ORANGE} />
      {/* Floating dots */}
      <circle cx="40" cy="50" r="6" fill={GREEN} fillOpacity="0.7" />
      <circle cx="160" cy="60" r="4" fill={YELLOW} fillOpacity="0.8" />
      <circle cx="35" cy="130" r="5" fill={BLUE} fillOpacity="0.6" />
      <circle cx="165" cy="140" r="6" fill={RED} fillOpacity="0.6" />
      <circle cx="60" cy="25" r="3" fill={TEXT_SECONDARY} fillOpacity="0.4" />
      <circle cx="145" cy="30" r="3" fill={TEXT_SECONDARY} fillOpacity="0.4" />
    </svg>
  );
}

function IllustrationTransactions() {
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background glow */}
      <circle cx="100" cy="100" r="85" fill={ORANGE} fillOpacity="0.06" />

      {/* Phone frame */}
      <rect x="50" y="20" width="100" height="160" rx="16" fill={SURFACE} stroke="#333333" strokeWidth="2" />
      {/* Phone screen area */}
      <rect x="56" y="32" width="88" height="136" rx="8" fill={SURFACE_ALT} />

      {/* Top bar inside phone */}
      <rect x="56" y="32" width="88" height="20" rx="8" fill="#282828" />
      <circle cx="70" cy="42" r="4" fill={RED} fillOpacity="0.8" />
      <circle cx="82" cy="42" r="4" fill={YELLOW} fillOpacity="0.8" />
      <circle cx="94" cy="42" r="4" fill={GREEN} fillOpacity="0.8" />

      {/* Transaction row 1 - PENDING (orange) */}
      <rect x="64" y="60" width="72" height="22" rx="6" fill="#FF6B0018" stroke={ORANGE} strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="76" cy="71" r="7" fill={ORANGE} fillOpacity="0.2" stroke={ORANGE} strokeWidth="1" />
      <path d="M73 71L76 74L81 68" stroke={ORANGE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="88" y="67" width="28" height="4" rx="2" fill={TEXT_PRIMARY} fillOpacity="0.7" />
      <rect x="88" y="74" width="18" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.5" />
      <rect x="118" y="68" width="14" height="6" rx="3" fill={YELLOW} fillOpacity="0.3" />
      <text x="125" y="73" textAnchor="middle" fontSize="5" fontWeight="bold" fill={YELLOW}>En attente</text>

      {/* Transaction row 2 - INCOME (green) */}
      <rect x="64" y="86" width="72" height="22" rx="6" fill="#1DB95410" stroke={GREEN} strokeWidth="1" strokeOpacity="0.3" />
      <circle cx="76" cy="97" r="7" fill={GREEN} fillOpacity="0.2" stroke={GREEN} strokeWidth="1" />
      <path d="M73 97L76 100L81 94" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="88" y="93" width="24" height="4" rx="2" fill={TEXT_PRIMARY} fillOpacity="0.7" />
      <rect x="88" y="100" width="16" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.5" />
      <text x="126" y="98" textAnchor="middle" fontSize="5" fontWeight="bold" fill={GREEN}>+50 000</text>

      {/* Transaction row 3 - EXPENSE (red) */}
      <rect x="64" y="112" width="72" height="22" rx="6" fill="#E5133210" stroke={RED} strokeWidth="1" strokeOpacity="0.3" />
      <circle cx="76" cy="123" r="7" fill={RED} fillOpacity="0.2" stroke={RED} strokeWidth="1" />
      <path d="M73 123L81 123M77 119L77 127" stroke={RED} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="88" y="119" width="26" height="4" rx="2" fill={TEXT_PRIMARY} fillOpacity="0.7" />
      <rect x="88" y="126" width="14" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.5" />
      <text x="126" y="124" textAnchor="middle" fontSize="5" fontWeight="bold" fill={RED}>-15 000</text>

      {/* Transaction row 4 - DRAFT */}
      <rect x="64" y="138" width="72" height="22" rx="6" fill="#282828" />
      <circle cx="76" cy="149" r="7" fill="#282828" stroke={TEXT_SECONDARY} strokeWidth="1" strokeOpacity="0.4" />
      <rect x="88" y="145" width="20" height="4" rx="2" fill={TEXT_SECONDARY} fillOpacity="0.4" />
      <rect x="88" y="152" width="14" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.25" />

      {/* Floating badge - approved stamp */}
      <g transform="translate(140, 50)">
        <circle cx="0" cy="0" r="22" fill={GREEN} fillOpacity="0.15" stroke={GREEN} strokeWidth="1.5" />
        <path d="M-8 0L-3 5L8 -6" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function IllustrationLedger() {
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background glow */}
      <circle cx="100" cy="100" r="85" fill={BLUE} fillOpacity="0.06" />

      {/* Bar chart - left side */}
      <rect x="20" y="130" width="16" height="40" rx="4" fill={GREEN} fillOpacity="0.5" />
      <rect x="40" y="110" width="16" height="60" rx="4" fill={GREEN} fillOpacity="0.65" />
      <rect x="60" y="80" width="16" height="90" rx="4" fill={GREEN} fillOpacity="0.8" />
      <rect x="80" y="60" width="16" height="110" rx="4" fill={GREEN} />
      {/* Expense bars */}
      <rect x="28" y="140" width="12" height="30" rx="3" fill={RED} fillOpacity="0.4" />
      <rect x="48" y="128" width="12" height="42" rx="3" fill={RED} fillOpacity="0.5" />
      <rect x="68" y="108" width="12" height="62" rx="3" fill={RED} fillOpacity="0.6" />
      {/* Axis line */}
      <path d="M16 174H96" stroke="#282828" strokeWidth="1.5" strokeLinecap="round" />

      {/* Summary card */}
      <rect x="105" y="25" width="75" height="55" rx="10" fill={SURFACE} stroke="#282828" strokeWidth="1.5" />
      <rect x="113" y="33" width="18" height="10" rx="5" fill={GREEN} fillOpacity="0.3" />
      <text x="122" y="41" textAnchor="middle" fontSize="6" fontWeight="bold" fill={GREEN}>+850K</text>
      <rect x="113" y="49" width="55" height="4" rx="2" fill={TEXT_SECONDARY} fillOpacity="0.4" />
      <rect x="113" y="57" width="35" height="4" rx="2" fill={TEXT_SECONDARY} fillOpacity="0.25" />
      <rect x="113" y="65" width="20" height="4" rx="2" fill={TEXT_SECONDARY} fillOpacity="0.15" />

      {/* Bottom card */}
      <rect x="105" y="88" width="75" height="55" rx="10" fill={SURFACE} stroke="#282828" strokeWidth="1.5" />
      <rect x="113" y="96" width="18" height="10" rx="5" fill={RED} fillOpacity="0.3" />
      <text x="122" y="104" textAnchor="middle" fontSize="6" fontWeight="bold" fill={RED}>-320K</text>
      <rect x="113" y="112" width="55" height="4" rx="2" fill={TEXT_SECONDARY} fillOpacity="0.4" />
      <rect x="113" y="120" width="40" height="4" rx="2" fill={TEXT_SECONDARY} fillOpacity="0.25" />

      {/* Balance card */}
      <rect x="105" y="150" width="75" height="35" rx="10" fill={ORANGE} fillOpacity="0.15" stroke={ORANGE} strokeWidth="1.5" />
      <text x="142" y="166" textAnchor="middle" fontSize="6" fill={TEXT_SECONDARY}>Solde</text>
      <text x="142" y="178" textAnchor="middle" fontSize="9" fontWeight="bold" fill={ORANGE}>530 000 F</text>

      {/* Filter pills */}
      <rect x="110" y="195" width="28" height="10" rx="5" fill={ORANGE} fillOpacity="0.4" />
      <rect x="142" y="195" width="32" height="10" rx="5" fill={SURFACE} stroke="#282828" strokeWidth="1" />
    </svg>
  );
}

function IllustrationGroups() {
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background glow */}
      <circle cx="100" cy="100" r="85" fill={YELLOW} fillOpacity="0.06" />

      {/* Central hub */}
      <circle cx="100" cy="80" r="22" fill={ORANGE} fillOpacity="0.2" stroke={ORANGE} strokeWidth="2" />
      <text x="100" y="77" textAnchor="middle" fontSize="7" fontWeight="bold" fill={ORANGE}>MFE</text>
      <text x="100" y="86" textAnchor="middle" fontSize="5" fill={ORANGE} opacity="0.7">JC</text>

      {/* Connection lines */}
      <path d="M82 80L55 60" stroke="#282828" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M118 80L145 60" stroke="#282828" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M82 80L55 105" stroke="#282828" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M118 80L145 105" stroke="#282828" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M100 102L100 145" stroke="#282828" strokeWidth="1.5" strokeLinecap="round" />

      {/* Group cards */}
      {/* Diacones - top left */}
      <rect x="25" y="42" width="50" height="32" rx="8" fill={SURFACE} stroke="#282828" strokeWidth="1.5" />
      <circle cx="40" cy="54" r="8" fill="#1DB954" fillOpacity="0.25" stroke={GREEN} strokeWidth="1" />
      <path d="M37 54L39 57L44 51" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="52" y="50" width="18" height="4" rx="2" fill={TEXT_PRIMARY} fillOpacity="0.7" />
      <rect x="52" y="57" width="12" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.4" />

      {/* Jeunesse - top right */}
      <rect x="125" y="42" width="50" height="32" rx="8" fill={SURFACE} stroke="#282828" strokeWidth="1.5" />
      <circle cx="140" cy="54" r="8" fill={BLUE} fillOpacity="0.25" stroke={BLUE} strokeWidth="1" />
      <circle cx="138" cy="52" r="2.5" fill={BLUE} />
      <path d="M135 56C135 56 137 58 140 58C143 58 145 56 145 56" stroke={BLUE} strokeWidth="1.2" strokeLinecap="round" />
      <rect x="152" y="50" width="16" height="4" rx="2" fill={TEXT_PRIMARY} fillOpacity="0.7" />
      <rect x="152" y="57" width="10" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.4" />

      {/* Dames - mid left */}
      <rect x="25" y="90" width="50" height="32" rx="8" fill={SURFACE} stroke="#282828" strokeWidth="1.5" />
      <circle cx="40" cy="102" r="8" fill="#E91E63" fillOpacity="0.2" stroke="#E91E63" strokeWidth="1" />
      <circle cx="38" cy="100" r="2.5" fill="#E91E63" />
      <path d="M35 105C35 105 37 108 40 108C43 108 45 105 45 105" stroke="#E91E63" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="52" y="98" width="16" height="4" rx="2" fill={TEXT_PRIMARY} fillOpacity="0.7" />
      <rect x="52" y="105" width="14" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.4" />

      {/* Messieurs - mid right */}
      <rect x="125" y="90" width="50" height="32" rx="8" fill={SURFACE} stroke="#282828" strokeWidth="1.5" />
      <circle cx="140" cy="102" r="8" fill={YELLOW} fillOpacity="0.25" stroke={YELLOW} strokeWidth="1" />
      <rect x="137" y="98" width="6" height="8" rx="1" fill={YELLOW} fillOpacity="0.7" />
      <rect x="152" y="98" width="18" height="4" rx="2" fill={TEXT_PRIMARY} fillOpacity="0.7" />
      <rect x="152" y="105" width="12" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.4" />

      {/* Chorale - bottom */}
      <rect x="70" y="145" width="60" height="32" rx="8" fill={SURFACE} stroke={ORANGE} strokeWidth="1.5" />
      <circle cx="85" cy="157" r="8" fill={ORANGE} fillOpacity="0.25" stroke={ORANGE} strokeWidth="1" />
      <path d="M82 157L85 161L90 154" stroke={ORANGE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="97" y="153" width="24" height="4" rx="2" fill={TEXT_PRIMARY} fillOpacity="0.7" />
      <rect x="97" y="160" width="14" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.4" />
    </svg>
  );
}

function IllustrationSync() {
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill={BLUE} fillOpacity="0.06" />

      {/* Phone (local) */}
      <rect x="30" y="60" width="55" height="90" rx="12" fill={SURFACE} stroke="#333333" strokeWidth="2" />
      <rect x="35" y="72" width="45" height="68" rx="6" fill={SURFACE_ALT} />
      <circle cx="57" cy="148" r="5" fill="#282828" stroke="#333333" strokeWidth="1" />
      {/* Sync dots inside phone */}
      <circle cx="47" cy="85" r="3" fill={GREEN} fillOpacity="0.6" />
      <circle cx="60" cy="85" r="3" fill={GREEN} fillOpacity="0.8" />
      <circle cx="72" cy="85" r="3" fill={GREEN} />
      <rect x="42" y="95" width="30" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.3" />
      <rect x="42" y="102" width="24" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.2" />
      <rect x="42" y="109" width="28" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.2" />
      <rect x="42" y="116" width="20" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.2" />

      {/* Cloud (remote) */}
      <path d="M120 70C115 70 111 74 111 79C105 79 101 84 101 90C101 96 105 100 111 100H135C141 100 145 96 145 90C145 84 141 79 135 79C135 74 131 70 126 70H120Z" fill={BLUE} fillOpacity="0.2" stroke={BLUE} strokeWidth="2" />
      <path d="M118 88L126 96L136 82" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Sync arrows */}
      <path d="M88 95C95 90 102 88 110 88" stroke={YELLOW} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" opacity="0.6" />
      <path d="M88 105C95 110 102 112 110 112" stroke={YELLOW} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" opacity="0.6" />
      {/* Arrowheads */}
      <path d="M110 86L113 88L110 90" stroke={YELLOW} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <path d="M110 114L107 112L110 110" stroke={YELLOW} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />

      {/* Status badge */}
      <rect x="125" y="118" width="45" height="22" rx="11" fill={GREEN} fillOpacity="0.15" stroke={GREEN} strokeWidth="1" />
      <circle cx="138" cy="129" r="3" fill={GREEN} />
      <text x="148" y="132" fontSize="6" fontWeight="bold" fill={GREEN}>Sync OK</text>
    </svg>
  );
}

function IllustrationRoles() {
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill={YELLOW} fillOpacity="0.06" />

      {/* Top row - 3 people with different role colors */}
      {/* Person 1 - Admin (orange) */}
      <circle cx="50" cy="45" r="16" fill={ORANGE} fillOpacity="0.15" stroke={ORANGE} strokeWidth="2" />
      <circle cx="50" cy="40" r="6" fill={ORANGE} fillOpacity="0.6" />
      <path d="M38 55C38 49 43 47 50 47C57 47 62 49 62 55V62H38V55Z" fill={ORANGE} fillOpacity="0.4" />
      <rect x="38" y="68" width="24" height="8" rx="4" fill={ORANGE} fillOpacity="0.2" stroke={ORANGE} strokeWidth="1" />
      <text x="50" y="74" textAnchor="middle" fontSize="5" fontWeight="bold" fill={ORANGE}>Admin</text>

      {/* Person 2 - Trésorier (green) */}
      <circle cx="100" cy="45" r="16" fill={GREEN} fillOpacity="0.15" stroke={GREEN} strokeWidth="2" />
      <circle cx="100" cy="40" r="6" fill={GREEN} fillOpacity="0.6" />
      <path d="M88 55C88 49 93 47 100 47C107 47 112 49 112 55V62H88V55Z" fill={GREEN} fillOpacity="0.4" />
      <rect x="88" y="68" width="24" height="8" rx="4" fill={GREEN} fillOpacity="0.2" stroke={GREEN} strokeWidth="1" />
      <text x="100" y="74" textAnchor="middle" fontSize="5" fontWeight="bold" fill={GREEN}>Trésorier</text>

      {/* Person 3 - Diacre (blue) */}
      <circle cx="150" cy="45" r="16" fill={BLUE} fillOpacity="0.15" stroke={BLUE} strokeWidth="2" />
      <circle cx="150" cy="40" r="6" fill={BLUE} fillOpacity="0.6" />
      <path d="M138 55C138 49 143 47 150 47C157 47 162 49 162 55V62H138V55Z" fill={BLUE} fillOpacity="0.4" />
      <rect x="138" y="68" width="24" height="8" rx="4" fill={BLUE} fillOpacity="0.2" stroke={BLUE} strokeWidth="1" />
      <text x="150" y="74" textAnchor="middle" fontSize="5" fontWeight="bold" fill={BLUE}>Diacre</text>

      {/* Divider */}
      <line x1="30" y1="88" x2="170" y2="88" stroke="#282828" strokeWidth="1" strokeDasharray="3 3" />

      {/* Permission matrix */}
      <rect x="30" y="95" width="140" height="90" rx="10" fill={SURFACE} stroke="#282828" strokeWidth="1.5" />
      <rect x="38" y="102" width="30" height="4" rx="2" fill={TEXT_SECONDARY} fillOpacity="0.4" />
      <rect x="38" y="112" width="24" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.25" />
      <rect x="38" y="120" width="26" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.25" />
      <rect x="38" y="128" width="22" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.25" />
      <rect x="38" y="136" width="24" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.25" />

      {/* Check marks */}
      <circle cx="145" cy="110" r="6" fill={GREEN} fillOpacity="0.3" />
      <path d="M142 110L144 113L149 107" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="158" cy="110" r="6" fill={GREEN} fillOpacity="0.3" />
      <path d="M155 110L157 113L162 107" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="145" cy="124" r="6" fill={GREEN} fillOpacity="0.3" />
      <path d="M142 124L144 127L149 121" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="158" cy="124" r="6" fill={RED} fillOpacity="0.3" />
      <path d="M155 121L161 127M161 121L155 127" stroke={RED} strokeWidth="1.5" strokeLinecap="round" />

      <circle cx="145" cy="138" r="6" fill={YELLOW} fillOpacity="0.3" />
      <path d="M142 138L144 141L149 135" stroke={YELLOW} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="158" cy="138" r="6" fill={RED} fillOpacity="0.3" />
      <path d="M155 135L161 141M161 135L155 141" stroke={RED} strokeWidth="1.5" strokeLinecap="round" />

      {/* Legend */}
      <circle cx="38" cy="170" r="4" fill={GREEN} fillOpacity="0.5" />
      <rect x="46" y="167" width="20" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.4" />
      <circle cx="75" cy="170" r="4" fill={YELLOW} fillOpacity="0.5" />
      <rect x="83" y="167" width="16" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.4" />
      <circle cx="106" cy="170" r="4" fill={RED} fillOpacity="0.5" />
      <rect x="114" y="167" width="16" height="3" rx="1.5" fill={TEXT_SECONDARY} fillOpacity="0.4" />
    </svg>
  );
}

// ─── Page Definitions ────────────────────────────────────────────────────────

const PAGES = [
  {
    id: 'welcome',
    title: 'Bienvenue sur Lumina',
    subtitle: 'La gestion financière simplifiée pour votre communauté',
    cta: "C'est parti",
    illustration: <IllustrationWelcome />,
    icon: Wallet,
    iconColor: ORANGE,
  },
  {
    id: 'transactions',
    title: 'Transactions simples et sécurisées',
    subtitle: 'Créez, soumettez et validez chaque mouvement avec un workflow clair : brouillon → en attente → approuvé.',
    cta: 'Suivant',
    illustration: <IllustrationTransactions />,
    icon: Wallet,
    iconColor: GREEN,
  },
  {
    id: 'ledger',
    title: 'Vue financière en temps réel',
    subtitle: 'Consultez votre grand livre, filtrez par catégorie, groupe ou période, et suivez vos entrées et sorties.',
    cta: 'Suivant',
    illustration: <IllustrationLedger />,
    icon: Cloud,
    iconColor: BLUE,
  },
  {
    id: 'groups',
    title: 'Organisez votre communauté',
    subtitle: 'Gérez vos groupes (diacres, jeunesse, dames, chorale…) et attribuez des responsabilités financières claires.',
    cta: 'Suivant',
    illustration: <IllustrationGroups />,
    icon: BellIcon,
    iconColor: YELLOW,
  },
  {
    id: 'sync',
    title: 'Vos données, toujours avec vous',
    subtitle: 'Sauvegarde locale + synchronisation cloud automatique. Fonctionne hors-ligne, sync dès la reconnexion.',
    cta: 'Suivant',
    illustration: <IllustrationSync />,
    icon: Cloud,
    iconColor: BLUE,
  },
  {
    id: 'roles',
    title: 'Chacun son rôle',
    subtitle: 'Diacres, trésoriers, administrateurs — définissez qui peut créer, approuver ou modifier selon vos besoins.',
    cta: 'Commencer',
    illustration: <IllustrationRoles />,
    icon: BellIcon,
    iconColor: ORANGE,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

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
      navigate('/role-selection');
    } else {
      goToPage(currentPage + 1);
    }
  };

  const page = PAGES[currentPage];
  const Icon = page.icon;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#121212' }}>
      {/* Dots */}
      <div className="flex justify-center gap-2 py-6">
        {PAGES.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === currentPage ? '24px' : '8px', backgroundColor: i === currentPage ? ORANGE : '#282828' }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <div
          className={`w-full max-w-sm transition-all duration-200 ${isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
          onTouchStart={handleSwipe}
          onTouchEnd={handleSwipeEnd}
        >
          <div className="mb-6 flex items-center justify-center">{page.illustration}</div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: page.iconColor + '20' }}
          >
            <Icon className="w-6 h-6" style={{ color: page.iconColor }} />
          </div>
          <h1 className="text-xl font-black text-text-primary text-center mb-2">{page.title}</h1>
          <p className="text-text-secondary text-center text-sm leading-relaxed max-w-xs mx-auto">{page.subtitle}</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="px-8 pb-10">
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-full font-bold text-base text-white transition-all active:scale-95"
          style={{ backgroundColor: ORANGE }}
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
