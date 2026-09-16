/**
 * Guarded Red Safety Switch
 * Requires flipping open red cover before switch can be toggled.
 */

import React, { useState } from 'react';
import { cockpitAudio } from '../../core/audioSynthesizer';

interface GuardedSwitchProps {
  id: string;
  label: string;
  sublabel?: string;
  checked: boolean;
  onToggle: (nextState: boolean) => void;
  disabled?: boolean;
}

export const GuardedSwitch: React.FC<GuardedSwitchProps> = ({
  id,
  label,
  sublabel,
  checked,
  onToggle,
  disabled = false,
}) => {
  const [guardOpen, setGuardOpen] = useState(false);

  const handleGuardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    cockpitAudio.playSwitchClick();
    setGuardOpen(!guardOpen);
  };

  const handleSwitchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!guardOpen || disabled) return;
    cockpitAudio.playSwitchClick();
    onToggle(!checked);
  };

  return (
    <div id={id} className="flex flex-col items-center select-none">
      <span className="text-[10px] tracking-wider uppercase font-mono text-zinc-400 font-semibold mb-1 text-center">
        {label}
      </span>
      {sublabel && <span className="text-[8px] text-zinc-500 font-mono -mt-1 mb-1">{sublabel}</span>}

      <div className="relative w-10 h-14 bg-zinc-950 border border-zinc-800 rounded p-1 flex flex-col items-center justify-between">
        {/* Switch Lever underneath */}
        <div
          onClick={handleSwitchClick}
          className={`w-full flex-1 flex flex-col items-center justify-center ${
            guardOpen ? 'cursor-pointer' : 'cursor-not-allowed'
          }`}
        >
          <div
            className={`w-3.5 h-6 rounded-full border shadow transition-transform duration-150 ${
              checked
                ? 'translate-y-[-4px] bg-gradient-to-t from-zinc-300 to-white border-zinc-200 shadow-emerald-500/20'
                : 'translate-y-[4px] bg-gradient-to-b from-zinc-600 to-zinc-800 border-zinc-700'
            }`}
          />
        </div>

        {/* Red Protective Guard Cover */}
        <div
          onClick={handleGuardClick}
          className={`absolute inset-0 rounded border-2 cursor-pointer transition-transform duration-200 origin-top flex flex-col items-center justify-center shadow-lg ${
            guardOpen
              ? '-translate-y-9 rotate-[-45deg] bg-red-800/80 border-red-500/80 backdrop-blur-sm'
              : 'translate-y-0 bg-gradient-to-b from-red-600 via-red-700 to-red-900 border-red-400'
          }`}
          title={guardOpen ? 'Click to close red guard' : 'Click to lift safety guard'}
        >
          <div className="w-5 h-2 border border-red-300 rounded-sm mb-1 bg-red-500/40" />
          <span className="text-[7px] font-bold text-white tracking-widest uppercase">GUARD</span>
        </div>

        <span className={`text-[8px] font-mono font-bold mt-1 ${checked ? 'text-red-400' : 'text-zinc-500'}`}>
          {checked ? 'ARM' : 'SAFE'}
        </span>
      </div>
    </div>
  );
};
