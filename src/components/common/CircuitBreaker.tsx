/**
 * Aeronautical Push-Pull Circuit Breaker Component
 * Displays white collar when pulled/tripped, clickable to push/pull with instant electrical response.
 */

import React from 'react';
import { cockpitAudio } from '../../core/audioSynthesizer';

interface CircuitBreakerProps {
  id: string;
  name: string;
  subsystem: string;
  ratingAmps: number;
  tripped: boolean;
  onToggle: () => void;
}

export const CircuitBreaker: React.FC<CircuitBreakerProps> = ({
  id,
  name,
  subsystem,
  ratingAmps,
  tripped,
  onToggle,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    cockpitAudio.playSwitchClick();
    onToggle();
  };

  return (
    <div
      id={id}
      onClick={handleClick}
      className="flex flex-col items-center select-none cursor-pointer group p-1 rounded hover:bg-zinc-800/40 transition-colors"
      title={`${name} (${ratingAmps}A) - Status: ${tripped ? 'TRIPPED / OPEN (click to reset)' : 'CLOSED (click to pull)'}`}
    >
      <span className="text-[8px] font-mono text-zinc-400 font-bold uppercase truncate max-w-[64px] text-center">
        {name.split(' ')[0]}
      </span>

      {/* Outer Breaker Bezel */}
      <div className="relative w-8 h-8 rounded-full bg-gradient-to-b from-zinc-700 to-zinc-950 border-2 border-zinc-600 flex items-center justify-center shadow-inner my-1">
        {/* White Collar visible when tripped */}
        {tripped && (
          <div className="absolute inset-0.5 rounded-full border-2 border-white bg-white/90 animate-pulse shadow-[0_0_8px_#ffffff]" />
        )}

        {/* Center Plunger Button */}
        <div
          className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[9px] shadow-md border ${
            tripped
              ? 'bg-zinc-900 text-red-400 border-zinc-700 scale-110'
              : 'bg-gradient-to-b from-zinc-700 to-zinc-900 text-zinc-300 border-zinc-500 group-hover:from-zinc-600'
          }`}
        >
          {ratingAmps}
        </div>
      </div>

      <span className={`text-[7px] font-mono uppercase font-semibold ${tripped ? 'text-red-400' : 'text-emerald-400'}`}>
        {tripped ? 'TRIP' : 'IN'}
      </span>
    </div>
  );
};
