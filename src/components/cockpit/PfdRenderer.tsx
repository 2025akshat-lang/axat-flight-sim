/**
 * Primary Flight Display (PFD) Component
 * Solid artificial horizon, airspeed & altitude tapes, vertical speed,
 * HSI compass rose, and flight director.
 */

import React from 'react';
import { AircraftState, FlcsState, NavigationState } from '../../types/simulation';

interface PfdRendererProps {
  aircraft: AircraftState;
  flcs: FlcsState;
  navigation: NavigationState;
  isPowered: boolean;
}

export const PfdRenderer: React.FC<PfdRendererProps> = ({
  aircraft,
  flcs,
  navigation,
  isPowered,
}) => {
  if (!isPowered) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded-md">
        <span className="text-[11px] font-mono text-zinc-600 tracking-wider">PFD OFF (POWER REMOVED / CB OPEN)</span>
      </div>
    );
  }

  const pitchDeg = aircraft.pitchDeg;
  const rollDeg = aircraft.rollDeg;
  const pixelsPerDeg = 4.5;
  const pitchY = pitchDeg * pixelsPerDeg;

  return (
    <div className="relative w-full h-full min-h-[340px] bg-black border-2 border-zinc-800 rounded-md overflow-hidden select-none font-mono">
      {/* 1. Artificial Horizon Sphere */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="relative w-[600px] h-[600px] rounded-full overflow-hidden transition-transform duration-75"
          style={{
            transform: `rotate(${-rollDeg}deg) translateY(${pitchY}px)`,
          }}
        >
          {/* Sky Half */}
          <div className="w-full h-1/2 bg-sky-800 border-b border-white" />
          {/* Ground Half */}
          <div className="w-full h-1/2 bg-[#5c4028]" />

          {/* Pitch Rungs */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {[-40, -30, -20, -10, 10, 20, 30, 40].map((deg) => (
              <div
                key={deg}
                className="absolute flex items-center justify-center"
                style={{ transform: `translateY(${-deg * pixelsPerDeg}px)` }}
              >
                <div className="w-16 h-[1.5px] bg-white/80" />
                <span className="text-[9px] text-white/90 font-bold ml-1">{Math.abs(deg)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Fixed Aircraft Reference Symbol (Yellow Center Wings) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          {/* Center pip */}
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-black shadow" />
          {/* Left wing */}
          <div className="absolute -left-12 w-9 h-1.5 bg-yellow-400 border border-black" />
          <div className="absolute -left-12 top-1.5 w-1.5 h-3 bg-yellow-400 border border-black" />
          {/* Right wing */}
          <div className="absolute -right-12 w-9 h-1.5 bg-yellow-400 border border-black" />
          <div className="absolute -right-12 top-1.5 w-1.5 h-3 bg-yellow-400 border border-black" />
        </div>
      </div>

      {/* 3. Left Airspeed Tape */}
      <div className="absolute left-2 top-8 bottom-16 w-14 bg-zinc-950/85 border border-zinc-700 rounded flex flex-col items-center justify-center py-2">
        <span className="text-[9px] text-zinc-400 font-bold">IAS</span>
        <div className="my-auto px-1 py-0.5 bg-emerald-950 border border-emerald-500 rounded text-center w-full">
          <span className="text-sm font-bold text-emerald-400">{Math.round(aircraft.indicatedAirspeedKnots)}</span>
        </div>
        <span className="text-[8px] text-zinc-400">KTAS {Math.round(aircraft.trueAirspeedKnots)}</span>
        <span className="text-[9px] text-cyan-400 font-bold">M {(aircraft.mach ?? 0).toFixed(2)}</span>
      </div>

      {/* 4. Right Altitude Tape */}
      <div className="absolute right-2 top-8 bottom-16 w-16 bg-zinc-950/85 border border-zinc-700 rounded flex flex-col items-center justify-center py-2">
        <span className="text-[9px] text-zinc-400 font-bold">ALT FT</span>
        <div className="my-auto px-1 py-0.5 bg-emerald-950 border border-emerald-500 rounded text-center w-full">
          <span className="text-sm font-bold text-emerald-400">{Math.round(aircraft.altitudeFt ?? 0)}</span>
        </div>
        <span className="text-[8px] text-zinc-400">VS {Math.round(aircraft.verticalSpeedFpm ?? 0)}</span>
        <span className="text-[8px] text-zinc-400">QNH 29.92</span>
      </div>

      {/* 5. Top FLCS Status Banner */}
      <div className="absolute top-1 left-16 right-16 flex justify-between px-3 py-0.5 bg-zinc-950/90 border border-zinc-800 rounded text-[9px] font-bold">
        <span className={flcs.flightControlMode === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'}>
          FLCS: {flcs.flightControlMode}
        </span>
        <span className="text-zinc-300">G: {(aircraft.loadFactorG ?? 1).toFixed(1)}</span>
        <span className="text-cyan-400">AoA: {(aircraft.alphaDeg ?? 0).toFixed(1)}°</span>
      </div>

      {/* 6. Bottom Compass Heading Rose */}
      <div className="absolute bottom-1 left-16 right-16 h-12 bg-zinc-950/90 border border-zinc-800 rounded flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-emerald-400">HDG {Math.round(aircraft.headingDeg ?? 0)}° MAG</span>
        <div className="flex gap-4 text-[9px] text-zinc-400 mt-0.5">
          <span>BRG: {Math.round(navigation.bearingToActiveDeg ?? 0)}°</span>
          <span>DIST: {(navigation.distanceToActiveNm ?? 0).toFixed(1)} NM</span>
          <span>TRK: {Math.round(aircraft.headingDeg ?? 0)}°</span>
        </div>
      </div>
    </div>
  );
};
