/**
 * Flight Controls, Flaps, and Landing Gear Panel
 */

import React from 'react';
import { GearSystemState, ControlInputs } from '../../types/simulation';
import { RotarySelector } from '../common/RotarySelector';
import { PhysicalSwitch } from '../common/PhysicalSwitch';
import { cockpitAudio } from '../../core/audioSynthesizer';

interface FlightControlsGearPanelProps {
  gear: GearSystemState;
  controls: ControlInputs;
  onToggleGear: () => void;
  onSetFlaps: (flaps: 'AUTO' | 'HALF' | 'FULL') => void;
  onToggleSpeedBrake: () => void;
  onToggleParkingBrake: () => void;
  onAdjustTrim: (delta: number) => void;
}

export const FlightControlsGearPanel: React.FC<FlightControlsGearPanelProps> = ({
  gear,
  controls,
  onToggleGear,
  onSetFlaps,
  onToggleSpeedBrake,
  onToggleParkingBrake,
  onAdjustTrim,
}) => {
  const isTransit = gear.transitState === 'TRANSIT_EXTENDING' || gear.transitState === 'TRANSIT_RETRACTING' || gear.transitState === 'UNSAFE';
  const isDownLocked = gear.transitState === 'DOWN_LOCKED';

  const handleGearClick = () => {
    cockpitAudio.playSwitchClick();
    onToggleGear();
  };

  return (
    <div className="p-3 bg-[#111622] border border-zinc-800 rounded-lg select-none font-mono flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5 mb-2">
        <span className="text-xs font-bold text-zinc-300 tracking-wider">GEAR & SECONDARY CONTROLS</span>
        <span className="text-[10px] text-zinc-400">
          BRAKES: <strong className={controls.parkingBrake ? 'text-amber-400' : 'text-emerald-400'}>{controls.parkingBrake ? 'PARK SET' : 'RELEASED'}</strong>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 items-center">
        {/* Mechanical Landing Gear Handle */}
        <div className="flex flex-col items-center bg-zinc-950/80 p-2 border border-zinc-800 rounded">
          <span className="text-[9px] font-bold text-zinc-400 mb-1">LANDING GEAR</span>

          {/* 3 Green Indicator Lights */}
          <div className="flex gap-1.5 mb-2">
            <div className="flex flex-col items-center">
              <span className="text-[7px] text-zinc-500">NOSE</span>
              <div className={`w-2.5 h-2.5 rounded-full border ${gear.noseGearPercent > 0.98 ? 'bg-emerald-400 shadow-[0_0_6px_#10b981] border-emerald-300' : 'bg-zinc-800 border-zinc-700'}`} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] text-zinc-500">LEFT</span>
              <div className={`w-2.5 h-2.5 rounded-full border ${gear.leftMainGearPercent > 0.98 ? 'bg-emerald-400 shadow-[0_0_6px_#10b981] border-emerald-300' : 'bg-zinc-800 border-zinc-700'}`} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] text-zinc-500">RIGHT</span>
              <div className={`w-2.5 h-2.5 rounded-full border ${gear.rightMainGearPercent > 0.98 ? 'bg-emerald-400 shadow-[0_0_6px_#10b981] border-emerald-300' : 'bg-zinc-800 border-zinc-700'}`} />
            </div>
          </div>

          {/* Handle Lever */}
          <div
            onClick={handleGearClick}
            className="relative w-8 h-16 bg-zinc-900 border-2 border-zinc-700 rounded-full flex flex-col items-center justify-between p-1 cursor-pointer hover:border-zinc-500 shadow-inner"
            title="Click to toggle landing gear handle UP / DOWN"
          >
            {/* Wheel shaped transparent grip knob */}
            <div
              className={`w-6 h-6 rounded-full border-2 transition-transform duration-200 flex items-center justify-center ${
                controls.gearCommand ? 'translate-y-8 bg-zinc-800 border-zinc-400' : 'translate-y-0 bg-zinc-800 border-zinc-400'
              }`}
            >
              {/* Red translucent in-transit warning lamp inside wheel knob */}
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  isTransit ? 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse' : 'bg-zinc-900 border border-zinc-700'
                }`}
              />
            </div>
          </div>

          <span className={`text-[8px] font-bold mt-1 ${isDownLocked ? 'text-emerald-400' : isTransit ? 'text-red-400' : 'text-zinc-500'}`}>
            {controls.gearCommand ? 'HANDLE DN' : 'HANDLE UP'}
          </span>
        </div>

        {/* Flap Selector */}
        <RotarySelector<'AUTO' | 'HALF' | 'FULL'>
          id="sw-flaps"
          label="TRAILING FLAPS"
          sublabel="TEF/LEF LAW"
          options={[
            { value: 'AUTO', label: 'AUTO' },
            { value: 'HALF', label: 'HALF' },
            { value: 'FULL', label: 'FULL' },
          ]}
          value={controls.flapsCommand}
          onChange={onSetFlaps}
        />

        {/* Speedbrake & Parking Brake */}
        <div className="flex flex-col gap-2">
          <PhysicalSwitch
            id="sw-speedbrake"
            label="SPEEDBRAKE"
            sublabel="FUSELAGE"
            checked={controls.speedBrakeCommand}
            onToggle={onToggleSpeedBrake}
            onLabel="EXT"
            offLabel="RET"
          />

          <PhysicalSwitch
            id="sw-park-brake"
            label="PARK BRAKE"
            sublabel="HYD LOCK"
            checked={controls.parkingBrake}
            onToggle={onToggleParkingBrake}
            onLabel="SET"
            offLabel="OFF"
          />
        </div>
      </div>
    </div>
  );
};
