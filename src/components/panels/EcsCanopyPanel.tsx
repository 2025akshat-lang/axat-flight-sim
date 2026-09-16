/**
 * ECS, Cabin Pressurization, Canopy, and Pitot Heat Panel
 */

import React from 'react';
import { EcsState, CanopyState } from '../../types/simulation';
import { PhysicalSwitch } from '../common/PhysicalSwitch';

interface EcsCanopyPanelProps {
  ecs: EcsState;
  canopy: CanopyState;
  onToggleCanopy: () => void;
  onTogglePitotHeat: () => void;
}

export const EcsCanopyPanel: React.FC<EcsCanopyPanelProps> = ({
  ecs,
  canopy,
  onToggleCanopy,
  onTogglePitotHeat,
}) => {
  return (
    <div className="p-3 bg-[#111622] border border-zinc-800 rounded-lg select-none font-mono flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5 mb-2">
        <span className="text-xs font-bold text-zinc-300 tracking-wider">ECS & CANOPY</span>
        <span className="text-[10px] text-zinc-400">
          CABIN ALT: <strong className="text-cyan-400">{Math.round(ecs.cabinAltitudeFt ?? 0)} FT</strong>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2 bg-zinc-950/70 p-2 rounded border border-zinc-800 text-[10px]">
        <div>
          <span className="text-zinc-500">OBOGS O2 PURITY</span>
          <div className="text-emerald-400 font-bold">{(ecs.oxygenPurityPercent ?? 94).toFixed(0)}% O2</div>
        </div>
        <div>
          <span className="text-zinc-500">CABIN DIFF PRESS</span>
          <div className="text-cyan-400 font-bold">{(ecs.cabinDiffPressurePsi ?? 0).toFixed(1)} PSI</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
        <PhysicalSwitch
          id="sw-canopy"
          label="CANOPY"
          sublabel="PNEUMATIC"
          checked={canopy.canopyLocked}
          onToggle={onToggleCanopy}
          onLabel="LOCK"
          offLabel="OPEN"
        />

        <PhysicalSwitch
          id="sw-pitot-heat"
          label="PITOT HEAT"
          sublabel="PROBE ANTI-ICE"
          checked={ecs.pitotHeatSwitch}
          onToggle={onTogglePitotHeat}
        />
      </div>
    </div>
  );
};
