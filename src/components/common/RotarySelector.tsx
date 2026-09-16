/**
 * Stepped Rotary Selector Knob
 */

import React from 'react';
import { cockpitAudio } from '../../core/audioSynthesizer';

export interface RotaryOption<T extends string = string> {
  value: T;
  label: string;
}

interface RotarySelectorProps<T extends string = string> {
  id: string;
  label: string;
  sublabel?: string;
  options: RotaryOption<T>[];
  value: T;
  onChange: (val: T) => void;
}

export const RotarySelector = <T extends string = string>({
  id,
  label,
  sublabel,
  options,
  value,
  onChange,
}: RotarySelectorProps<T>) => {
  const currentIndex = options.findIndex((o) => o.value === value);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Calculate knob rotation angle based on step count
  const totalOptions = options.length;
  const spreadAngle = 120; // total arc from min to max
  const startAngle = -spreadAngle / 2;
  const stepAngle = totalOptions > 1 ? spreadAngle / (totalOptions - 1) : 0;
  const currentAngle = startAngle + safeIndex * stepAngle;

  const handleStep = (direction: 1 | -1) => {
    const nextIndex = Math.max(0, Math.min(totalOptions - 1, safeIndex + direction));
    if (nextIndex !== safeIndex) {
      cockpitAudio.playSwitchClick();
      onChange(options[nextIndex].value);
    }
  };

  return (
    <div id={id} className="flex flex-col items-center select-none">
      <span className="text-[10px] tracking-wider uppercase font-mono text-zinc-400 font-semibold mb-1 text-center">
        {label}
      </span>
      {sublabel && <span className="text-[8px] text-zinc-500 font-mono -mt-1 mb-1">{sublabel}</span>}

      <div className="relative flex flex-col items-center">
        {/* Knob Dial */}
        <div
          onClick={() => handleStep(1)}
          onContextMenu={(e) => {
            e.preventDefault();
            handleStep(-1);
          }}
          className="relative w-12 h-12 rounded-full bg-gradient-to-b from-zinc-800 via-zinc-900 to-black border-2 border-zinc-600 shadow-lg cursor-pointer flex items-center justify-center group active:scale-95 transition-transform"
          title={`Left-click next, right-click previous (${options[safeIndex].label})`}
        >
          {/* Outer Pointer/Knurling Marks */}
          <div
            className="absolute w-full h-full rounded-full transition-transform duration-150"
            style={{ transform: `rotate(${currentAngle}deg)` }}
          >
            {/* White pointer line on top */}
            <div className="w-1 h-3.5 bg-white mx-auto rounded-t-sm shadow-[0_0_4px_#fff]" />
          </div>

          {/* Center cap */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-t from-zinc-950 to-zinc-800 border border-zinc-700 shadow-inner flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          </div>
        </div>

        {/* Options Row */}
        <div className="flex gap-1.5 mt-1.5">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                cockpitAudio.playSwitchClick();
                onChange(opt.value);
              }}
              className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded ${
                idx === safeIndex
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/50 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
