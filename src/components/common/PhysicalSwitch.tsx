/**
 * Realistic Physical Toggle Switch
 * Features metal bat, tactile bezel, audible click, and smooth lever flip.
 */

import React from 'react';
import { cockpitAudio } from '../../core/audioSynthesizer';

interface PhysicalSwitchProps {
  id: string;
  label: string;
  sublabel?: string;
  checked: boolean;
  onToggle: (nextState: boolean) => void;
  disabled?: boolean;
  orientation?: 'vertical' | 'horizontal';
  onLabel?: string;
  offLabel?: string;
}

export const PhysicalSwitch: React.FC<PhysicalSwitchProps> = ({
  id,
  label,
  sublabel,
  checked,
  onToggle,
  disabled = false,
  orientation = 'vertical',
  onLabel = 'ON',
  offLabel = 'OFF',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    cockpitAudio.playSwitchClick();
    onToggle(!checked);
  };

  return (
    <div
      id={id}
      className={`flex flex-col items-center select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'}`}
      onClick={handleClick}
      title={`${label}: currently ${checked ? onLabel : offLabel}`}
    >
      {/* Label */}
      <span className="text-[10px] tracking-wider uppercase font-mono text-zinc-400 font-semibold mb-1 text-center">
        {label}
      </span>
      {sublabel && (
        <span className="text-[8px] text-zinc-500 font-mono -mt-1 mb-1">{sublabel}</span>
      )}

      {/* Switch Body & Bezel */}
      <div className="relative w-8 h-12 rounded bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700 shadow-inner flex flex-col items-center justify-between p-1">
        {/* State indicator LED notch */}
        <div className={`w-2 h-1 rounded-sm ${checked ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-zinc-700'}`} />

        {/* Metal Toggle Lever */}
        <div className="relative w-4 h-6 flex items-center justify-center">
          <div
            className={`w-3 h-5 rounded-full transition-transform duration-150 ease-out shadow-md border ${
              checked
                ? 'translate-y-[-4px] bg-gradient-to-t from-zinc-400 via-zinc-200 to-zinc-100 border-zinc-300'
                : 'translate-y-[4px] bg-gradient-to-b from-zinc-400 via-zinc-600 to-zinc-700 border-zinc-600'
            }`}
          >
            {/* Specular highlight stripe */}
            <div className="w-0.5 h-full mx-auto bg-white/60 rounded-full opacity-80" />
          </div>
        </div>

        {/* Status text */}
        <span className={`text-[8px] font-mono font-bold ${checked ? 'text-emerald-400' : 'text-zinc-500'}`}>
          {checked ? onLabel : offLabel}
        </span>
      </div>
    </div>
  );
};
