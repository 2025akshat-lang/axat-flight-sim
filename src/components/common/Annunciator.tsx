/**
 * Cockpit Annunciator Warning Tile Component
 */

import React from 'react';
import { WarningSeverity } from '../../types/simulation';

interface AnnunciatorProps {
  label: string;
  active: boolean;
  severity?: WarningSeverity;
  flashing?: boolean;
  onClick?: () => void;
}

export const Annunciator: React.FC<AnnunciatorProps> = ({
  label,
  active,
  severity = 'CAUTION',
  flashing = false,
  onClick,
}) => {
  let activeBg = 'bg-amber-500/20 text-amber-400 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
  if (severity === 'CRITICAL' || severity === 'WARNING') {
    activeBg = 'bg-red-500/25 text-red-400 border-red-500/70 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
  } else if (severity === 'INFO') {
    activeBg = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60 shadow-[0_0_6px_rgba(16,185,129,0.3)]';
  }

  const inactiveBg = 'bg-zinc-950/80 text-zinc-700 border-zinc-800/80';

  return (
    <div
      onClick={onClick}
      className={`px-2 py-1 border rounded text-[9px] font-mono font-bold tracking-wider uppercase text-center transition-all ${
        active ? activeBg : inactiveBg
      } ${flashing && active ? 'animate-pulse' : ''} ${onClick ? 'cursor-pointer hover:brightness-125' : ''}`}
    >
      {label}
    </div>
  );
};
