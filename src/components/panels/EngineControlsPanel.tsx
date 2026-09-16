/**
 * Engine & Propulsion Controls Panel
 */

import React from 'react';
import { EngineSystemState } from '../../types/simulation';
import { GuardedSwitch } from '../common/GuardedSwitch';
import { RotarySelector } from '../common/RotarySelector';
import { PhysicalSwitch } from '../common/PhysicalSwitch';

interface EngineControlsPanelProps {
  engine: EngineSystemState;
  throttle: number;
  onThrottleChange: (val: number) => void;
  onToggleMaster: () => void;
  onSetStartSwitch: (val: 'OFF' | 'CRANK' | 'START') => void;
}

export const EngineControlsPanel: React.FC<EngineControlsPanelProps> = ({
  engine,
  throttle,
  onThrottleChange,
  onToggleMaster,
  onSetStartSwitch,
}) => {
  const isAb = throttle > 0.85;

  return (
    <div className="p-3 bg-[#111622] border border-zinc-800 rounded-lg select-none font-mono flex flex-col justify-between">
      {/* Panel Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5 mb-3">
        <span className="text-xs font-bold text-zinc-300 tracking-wider">PROPULSION & POWER</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          engine.mode === 'AFTERBURNER' ? 'bg-orange-500/20 text-orange-400 border border-orange-500' :
          engine.mode === 'MILITARY' ? 'bg-cyan-500/20 text-cyan-400' :
          engine.mode === 'IDLE' ? 'bg-emerald-500/20 text-emerald-400' :
          engine.mode === 'FLAMEOUT' ? 'bg-red-500/20 text-red-400 animate-pulse' :
          'bg-zinc-800 text-zinc-400'
        }`}>
          {engine.mode}
        </span>
      </div>

      {/* Switches Grid */}
      <div className="flex items-center justify-around gap-2 mb-3">
        {/* Guarded Engine Master Switch */}
        <GuardedSwitch
          id="sw-eng-master"
          label="ENG MASTER"
          sublabel="HP FUEL VALVE"
          checked={engine.masterSwitch}
          onToggle={onToggleMaster}
        />

        {/* Engine Starter Switch */}
        <RotarySelector<'OFF' | 'CRANK' | 'START'>
          id="sw-eng-start"
          label="ENGINE START"
          sublabel="ATS TURBINE"
          options={[
            { value: 'OFF', label: 'OFF' },
            { value: 'CRANK', label: 'CRK' },
            { value: 'START', label: 'STRT' },
          ]}
          value={engine.engineStartSwitch}
          onChange={onSetStartSwitch}
        />
      </div>

      {/* Throttle Lever Quadrant */}
      <div className="p-2.5 bg-zinc-950/80 border border-zinc-800 rounded flex flex-col">
        <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1">
          <span>THROTTLE LEVER</span>
          <span className={isAb ? 'text-orange-400 font-bold' : 'text-emerald-400'}>
            {((throttle ?? 0) * 100).toFixed(0)}% {isAb ? '(REHEAT)' : '(DRY)'}
          </span>
        </div>

        {/* Slider with MIL and AB Detent marks */}
        <div className="relative flex items-center">
          <input
            id="slider-throttle"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={throttle}
            onChange={(e) => onThrottleChange(parseFloat(e.target.value))}
            className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Detent Legend */}
        <div className="flex justify-between text-[8px] text-zinc-500 font-mono mt-1">
          <span>IDLE (0%)</span>
          <span className="text-zinc-400">CRUISE (60%)</span>
          <span className="text-yellow-400 font-bold">MIL DETENT (85%)</span>
          <span className="text-orange-400 font-bold">MAX AB (100%)</span>
        </div>
      </div>
    </div>
  );
};
