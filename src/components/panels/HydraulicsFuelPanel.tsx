/**
 * Hydraulics & Fuel Control Subsystems Panel
 */

import React from 'react';
import { FuelSystemState, HydraulicSystemState } from '../../types/simulation';
import { PhysicalSwitch } from '../common/PhysicalSwitch';
import { GuardedSwitch } from '../common/GuardedSwitch';

interface HydraulicsFuelPanelProps {
  fuel: FuelSystemState;
  hydraulic: HydraulicSystemState;
  onToggleAuxHyd: () => void;
  onToggleCrossfeed: () => void;
  onToggleFuelDump: () => void;
}

export const HydraulicsFuelPanel: React.FC<HydraulicsFuelPanelProps> = ({
  fuel,
  hydraulic,
  onToggleAuxHyd,
  onToggleCrossfeed,
  onToggleFuelDump,
}) => {
  return (
    <div className="p-3 bg-[#111622] border border-zinc-800 rounded-lg select-none font-mono flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5 mb-2">
        <span className="text-xs font-bold text-zinc-300 tracking-wider">HYDRAULICS & FUEL</span>
        <span className="text-[10px] text-zinc-400">
          PRESS: <strong className="text-emerald-400">{(fuel.fuelPressurePsi ?? 0).toFixed(0)} PSI</strong>
        </span>
      </div>

      {/* Hydraulic System Pressures Readout */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-zinc-950/70 p-2 rounded border border-zinc-800">
        <div>
          <div className="text-[9px] text-zinc-500 font-bold">HYD SYS A</div>
          <div className={`text-base font-bold ${hydraulic.systemAPressurePsi < 1800 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
            {Math.round(hydraulic.systemAPressurePsi)} PSI
          </div>
        </div>
        <div>
          <div className="text-[9px] text-zinc-500 font-bold">HYD SYS B</div>
          <div className={`text-base font-bold ${hydraulic.systemBPressurePsi < 1800 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
            {Math.round(hydraulic.systemBPressurePsi)} PSI
          </div>
        </div>
      </div>

      {/* Control Switches */}
      <div className="grid grid-cols-3 gap-2 bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
        <PhysicalSwitch
          id="sw-aux-hyd"
          label="AUX HYD"
          sublabel="ELEC PUMP"
          checked={hydraulic.electricAuxPumpOn}
          onToggle={onToggleAuxHyd}
        />
        <PhysicalSwitch
          id="sw-fuel-xfeed"
          label="CROSSFEED"
          sublabel="MANIFOLD"
          checked={fuel.crossFeedOpen}
          onToggle={onToggleCrossfeed}
          onLabel="OPEN"
          offLabel="NORM"
        />
        <GuardedSwitch
          id="sw-fuel-dump"
          label="FUEL DUMP"
          sublabel="JETTISON"
          checked={fuel.dumpValveOpen}
          onToggle={onToggleFuelDump}
        />
      </div>
    </div>
  );
};
