/**
 * Electrical Network & Circuit Breaker Console Panel
 */

import React from 'react';
import { ElectricalSystemState, CircuitBreakerState } from '../../types/simulation';
import { PhysicalSwitch } from '../common/PhysicalSwitch';
import { CircuitBreaker } from '../common/CircuitBreaker';

interface ElectricalPanelProps {
  electrical: ElectricalSystemState;
  onToggleBattery: () => void;
  onToggleGenerator: () => void;
  onToggleExternalPower: () => void;
  onToggleBusTie: () => void;
  onToggleBreaker: (breakerId: string) => void;
}

export const ElectricalPanel: React.FC<ElectricalPanelProps> = ({
  electrical,
  onToggleBattery,
  onToggleGenerator,
  onToggleExternalPower,
  onToggleBusTie,
  onToggleBreaker,
}) => {
  return (
    <div className="p-3 bg-[#111622] border border-zinc-800 rounded-lg select-none font-mono flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5 mb-2">
        <span className="text-xs font-bold text-zinc-300 tracking-wider">ELECTRICAL POWER</span>
        <div className="flex gap-2 text-[10px]">
          <span className="text-zinc-400">
            BAT: <strong className="text-emerald-400">{(electrical.batteryVoltageVolts ?? 24).toFixed(1)}V</strong>
          </span>
          <span className="text-zinc-400">
            LOAD: <strong className="text-cyan-400">{electrical.totalAmpsDrawn}A</strong>
          </span>
        </div>
      </div>

      {/* Main Power Source Switches */}
      <div className="grid grid-cols-4 gap-2 mb-3 bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
        <PhysicalSwitch
          id="sw-batt"
          label="BATTERY"
          sublabel="24V DC"
          checked={electrical.batterySwitch}
          onToggle={onToggleBattery}
        />
        <PhysicalSwitch
          id="sw-gen"
          label="MAIN GEN"
          sublabel="115V AC"
          checked={electrical.mainGeneratorSwitch}
          onToggle={onToggleGenerator}
        />
        <PhysicalSwitch
          id="sw-ext-pwr"
          label="EXT PWR"
          sublabel="CART"
          checked={electrical.externalPowerSwitch}
          onToggle={onToggleExternalPower}
        />
        <PhysicalSwitch
          id="sw-bus-tie"
          label="BUS TIE"
          sublabel="DC TIE"
          checked={electrical.busTieClosed}
          onToggle={onToggleBusTie}
          onLabel="NORM"
          offLabel="ISOL"
        />
      </div>

      {/* Circuit Breakers Section */}
      <div className="bg-zinc-950/90 border border-zinc-800 rounded p-2">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-1 mb-1.5">
          <span className="text-[10px] font-bold text-zinc-400">CIRCUIT BREAKERS (PUSH-PULL)</span>
          <span className="text-[8px] text-zinc-500">WHITE COLLAR = TRIPPED</span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {Object.entries(electrical.circuitBreakers).map(([id, cbRaw]) => {
            const cb = cbRaw as CircuitBreakerState;
            return (
              <CircuitBreaker
                key={id}
                id={`cb-${id}`}
                name={cb.name}
                subsystem={cb.subsystem}
                ratingAmps={cb.ratingAmps}
                tripped={cb.tripped}
                onToggle={() => onToggleBreaker(id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
