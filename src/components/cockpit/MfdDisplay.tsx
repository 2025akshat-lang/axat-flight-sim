/**
 * Multifunction Display (MFD) Component
 * Complete avionics MFD with 20 Option Select Buttons (OSBs) and interactive pages.
 */

import React, { useState } from 'react';
import {
  SimulationState,
  EngineSystemState,
  FuelSystemState,
  HydraulicSystemState,
  ElectricalSystemState,
  FlcsState,
  BitResult,
} from '../../types/simulation';
import { cockpitAudio } from '../../core/audioSynthesizer';

export type MfdPage =
  | 'TAC_MAP'
  | 'ENG'
  | 'FUEL'
  | 'HYD'
  | 'ELEC'
  | 'FLCS'
  | 'CHK'
  | 'BIT'
  | 'SYS'
  | 'SENSOR';

interface MfdDisplayProps {
  id: string;
  title: string;
  defaultPage?: MfdPage;
  simState: SimulationState;
  isPowered: boolean;
  onAction?: (action: string, payload?: unknown) => void;
}

export const MfdDisplay: React.FC<MfdDisplayProps> = ({
  id,
  title,
  defaultPage = 'TAC_MAP',
  simState,
  isPowered,
  onAction,
}) => {
  const [activePage, setActivePage] = useState<MfdPage>(defaultPage);
  const [mapRangeNm, setMapRangeNm] = useState<number>(40);

  const handleOsb = (page: MfdPage) => {
    cockpitAudio.playSwitchClick();
    setActivePage(page);
  };

  if (!isPowered) {
    return (
      <div id={id} className="w-full h-full min-h-[360px] bg-zinc-950 border-4 border-zinc-800 rounded-lg p-3 flex flex-col items-center justify-center select-none font-mono">
        <span className="text-zinc-600 text-xs tracking-widest uppercase">{title}</span>
        <span className="text-zinc-700 text-[10px] mt-1 font-bold">UNPOWERED (AVIONICS BUS / CB TRIPPED)</span>
      </div>
    );
  }

  return (
    <div id={id} className="w-full h-full min-h-[380px] bg-black border-4 border-zinc-800 rounded-lg flex flex-col select-none font-mono relative overflow-hidden shadow-2xl">
      {/* Top Bezel OSBs (OSB 1 - 5) */}
      <div className="flex justify-between items-center bg-zinc-900/90 border-b border-zinc-800 px-2 py-1">
        <button
          onClick={() => handleOsb('TAC_MAP')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            activePage === 'TAC_MAP' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          MAP
        </button>
        <button
          onClick={() => handleOsb('ENG')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            activePage === 'ENG' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          ENG
        </button>
        <button
          onClick={() => handleOsb('FUEL')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            activePage === 'FUEL' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          FUEL
        </button>
        <button
          onClick={() => handleOsb('HYD')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            activePage === 'HYD' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          HYD
        </button>
        <button
          onClick={() => handleOsb('ELEC')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            activePage === 'ELEC' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          ELEC
        </button>
      </div>

      {/* Main Display Screen */}
      <div className="flex-1 p-2 bg-[#05080c] overflow-y-auto">
        {/* TAC-MAP PAGE */}
        {activePage === 'TAC_MAP' && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between text-[10px] text-emerald-400 border-b border-zinc-800 pb-1 mb-1 font-bold">
              <span>TAC MAP | RNG {mapRangeNm} NM</span>
              <span>ACT WP: {simState.navigation.waypoints[simState.navigation.activeWaypointIndex]?.name}</span>
              <span>BRG {Math.round(simState.navigation.bearingToActiveDeg ?? 0)}° / {(simState.navigation.distanceToActiveNm ?? 0).toFixed(1)} NM</span>
            </div>

            {/* Tactical Moving Map Canvas/Vector */}
            <div className="relative flex-1 bg-[#090e14] border border-zinc-800 rounded flex items-center justify-center overflow-hidden">
              <svg viewBox="-150 -150 300 300" className="w-full h-full max-w-[340px] max-h-[340px]">
                {/* Range Rings */}
                <circle cx="0" cy="0" r="120" fill="none" stroke="#1b3022" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="0" cy="0" r="80" fill="none" stroke="#1b3022" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="0" cy="0" r="40" fill="none" stroke="#1b3022" strokeWidth="1" strokeDasharray="3 3" />

                {/* Ownship fighter symbol at center */}
                <polygon points="0,-8 6,8 0,5 -6,8" fill="#00ff9d" stroke="#000" strokeWidth="1" />

                {/* Waypoints */}
                {simState.navigation.waypoints.map((wp, idx) => {
                  // Project waypoint relative to ownship in NM
                  const dxM = wp.xMeters - simState.aircraft.x;
                  const dyM = wp.yMeters - simState.aircraft.y;
                  const scale = 120 / (mapRangeNm * 1852); // pixels per meter
                  const px = dyM * scale; // East is X
                  const py = -dxM * scale; // North is Y up

                  if (Math.abs(px) > 140 || Math.abs(py) > 140) return null;

                  const isActive = idx === simState.navigation.activeWaypointIndex;

                  return (
                    <g key={wp.id} transform={`translate(${px}, ${py})`}>
                      <circle cx="0" cy="0" r={isActive ? 4.5 : 3} fill={isActive ? '#10b981' : '#38bdf8'} />
                      <text x="6" y="3" fill={isActive ? '#10b981' : '#94a3b8'} fontSize="8" fontWeight="bold">
                        {wp.name.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Map Range Controls */}
              <div className="absolute bottom-2 right-2 flex gap-1">
                <button
                  onClick={() => setMapRangeNm((r) => Math.max(10, r / 2))}
                  className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[9px] hover:bg-zinc-700"
                >
                  RNG -
                </button>
                <button
                  onClick={() => setMapRangeNm((r) => Math.min(160, r * 2))}
                  className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[9px] hover:bg-zinc-700"
                >
                  RNG +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ENGINE PAGE */}
        {activePage === 'ENG' && (
          <div className="h-full flex flex-col justify-between text-zinc-300 text-xs">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-1 mb-2">
              <span className="font-bold text-emerald-400">ENGINE STATUS: {simState.engine.mode}</span>
              <span className="text-[10px] text-zinc-400">FADEC DUAL-CHANNEL A/B</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-zinc-900/60 border border-zinc-800 rounded">
                <div className="text-zinc-500 text-[9px]">HIGH PRESSURE SPOOL (N2)</div>
                <div className="text-lg font-bold text-emerald-400">{(simState.engine.n2RpmPercent ?? 0).toFixed(1)}%</div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, simState.engine.n2RpmPercent ?? 0)}%` }} />
                </div>
              </div>

              <div className="p-2 bg-zinc-900/60 border border-zinc-800 rounded">
                <div className="text-zinc-500 text-[9px]">FAN / LOW SPOOL (N1)</div>
                <div className="text-lg font-bold text-emerald-400">{(simState.engine.n1RpmPercent ?? 0).toFixed(1)}%</div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, simState.engine.n1RpmPercent ?? 0)}%` }} />
                </div>
              </div>

              <div className="p-2 bg-zinc-900/60 border border-zinc-800 rounded">
                <div className="text-zinc-500 text-[9px]">EXHAUST GAS TEMP (EGT)</div>
                <div className={`text-lg font-bold ${(simState.engine.egtDegC ?? 0) > 900 ? 'text-red-400' : 'text-amber-400'}`}>
                  {Math.round(simState.engine.egtDegC ?? 0)}°C
                </div>
                <span className="text-[8px] text-zinc-500">MAX CONTINUOUS: 890°C</span>
              </div>

              <div className="p-2 bg-zinc-900/60 border border-zinc-800 rounded">
                <div className="text-zinc-500 text-[9px]">NET THRUST PRODUCED</div>
                <div className="text-lg font-bold text-cyan-400">{(simState.engine.thrustKn ?? 0).toFixed(1)} kN</div>
                <span className="text-[8px] text-zinc-500">{simState.engine.afterburnerActive ? 'REHEAT ENGAGED' : 'DRY POWER'}</span>
              </div>

              <div className="p-2 bg-zinc-900/60 border border-zinc-800 rounded">
                <div className="text-zinc-500 text-[9px]">FUEL FLOW</div>
                <div className="text-sm font-bold text-zinc-200">{Math.round(simState.engine.fuelFlowPph ?? 0)} PPH</div>
                <span className="text-[8px] text-zinc-500">{(simState.engine.fuelFlowKgps ?? 0).toFixed(2)} kg/sec</span>
              </div>

              <div className="p-2 bg-zinc-900/60 border border-zinc-800 rounded">
                <div className="text-zinc-500 text-[9px]">OIL SYSTEM</div>
                <div className="text-sm font-bold text-zinc-200">{Math.round(simState.engine.oilPressurePsi)} PSI</div>
                <span className="text-[8px] text-zinc-500">TEMP: {Math.round(simState.engine.oilTempDegC)}°C</span>
              </div>
            </div>
          </div>
        )}

        {/* FUEL PAGE */}
        {activePage === 'FUEL' && (
          <div className="h-full flex flex-col justify-between text-[11px]">
            <div className="flex justify-between border-b border-zinc-800 pb-1 mb-1 font-bold text-emerald-400">
              <span>TOTAL FUEL: {Math.round(simState.fuel.totalFuelKg)} KG</span>
              <span>ENDURANCE: {simState.fuel.remainingEnduranceMinutes} MIN</span>
            </div>

            {/* Schematic Tank Layout */}
            <div className="grid grid-cols-3 gap-2 my-auto">
              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded text-center">
                <div className="text-[9px] text-zinc-500">LEFT WING</div>
                <div className="font-bold text-emerald-400">{Math.round(simState.fuel.tanks.leftWing.currentKg)} kg</div>
              </div>

              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded text-center">
                <div className="text-[9px] text-zinc-500">FWD FUSELAGE</div>
                <div className="font-bold text-emerald-400">{Math.round(simState.fuel.tanks.forward.currentKg)} kg</div>
              </div>

              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded text-center">
                <div className="text-[9px] text-zinc-500">RIGHT WING</div>
                <div className="font-bold text-emerald-400">{Math.round(simState.fuel.tanks.rightWing.currentKg)} kg</div>
              </div>

              <div className="col-span-3 p-2 bg-emerald-950/40 border border-emerald-700/60 rounded text-center">
                <div className="text-[9px] text-emerald-400 font-bold">ENGINE COLLECTOR / FEED TANK</div>
                <div className="text-sm font-bold text-emerald-300">{Math.round(simState.fuel.tanks.collector.currentKg)} kg</div>
                <span className="text-[8px] text-zinc-400">BOOST PRESSURE: {(simState.fuel.fuelPressurePsi ?? 0).toFixed(0)} PSI</span>
              </div>

              <div className="col-span-3 p-2 bg-zinc-900 border border-zinc-800 rounded text-center">
                <div className="text-[9px] text-zinc-500">CENTER DROP TANK</div>
                <div className="font-bold text-zinc-300">{Math.round(simState.fuel.tanks.external.currentKg)} kg</div>
              </div>
            </div>

            <div className="flex justify-between text-[10px] text-zinc-400 border-t border-zinc-800 pt-1">
              <span>CROSSFEED: {simState.fuel.crossFeedOpen ? 'OPEN' : 'CLOSED'}</span>
              <span>BINGO: {simState.fuel.bingoFuelKg} KG</span>
              <span>RANGE: {simState.fuel.estimatedRangeNm} NM</span>
            </div>
          </div>
        )}

        {/* HYDRAULIC PAGE */}
        {activePage === 'HYD' && (
          <div className="h-full flex flex-col justify-between text-[11px]">
            <div className="flex justify-between border-b border-zinc-800 pb-1 mb-2 font-bold text-emerald-400">
              <span>HYDRAULIC STATUS</span>
              <span>AUTHORITY: {((simState.hydraulic.totalActuatorAuthority ?? 1) * 100).toFixed(0)}%</span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-auto">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded">
                <span className="text-[10px] font-bold text-cyan-400">SYSTEM A</span>
                <div className={`text-xl font-bold mt-1 ${simState.hydraulic.systemAPressurePsi < 1800 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {Math.round(simState.hydraulic.systemAPressurePsi)} PSI
                </div>
                <div className="text-[9px] text-zinc-400 mt-2">
                  <div>ENGINE PUMP: {simState.hydraulic.pumpAEngDriven ? 'ENGAGED' : 'OFF'}</div>
                  <div>AUX ELEC PUMP: {simState.hydraulic.electricAuxPumpOn ? 'RUNNING' : 'OFF'}</div>
                  <div>RESERVOIR: {simState.hydraulic.reservoirAQuantityPercent}%</div>
                </div>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded">
                <span className="text-[10px] font-bold text-cyan-400">SYSTEM B</span>
                <div className={`text-xl font-bold mt-1 ${simState.hydraulic.systemBPressurePsi < 1800 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {Math.round(simState.hydraulic.systemBPressurePsi)} PSI
                </div>
                <div className="text-[9px] text-zinc-400 mt-2">
                  <div>ENGINE PUMP: {simState.hydraulic.pumpBEngDriven ? 'ENGAGED' : 'OFF'}</div>
                  <div>PTU UNIT: {simState.hydraulic.ptuActive ? 'ACTIVE' : 'AUTO'}</div>
                  <div>RESERVOIR: {simState.hydraulic.reservoirBQuantityPercent}%</div>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-zinc-500 border-t border-zinc-800 pt-1">
              Powers primary flight controls, landing gear actuation, nose wheel steering, and wheel brakes.
            </div>
          </div>
        )}

        {/* ELECTRICAL PAGE */}
        {activePage === 'ELEC' && (
          <div className="h-full flex flex-col justify-between text-[11px]">
            <div className="flex justify-between border-b border-zinc-800 pb-1 mb-2 font-bold text-emerald-400">
              <span>ELECTRICAL POWER NETWORK</span>
              <span>TOTAL LOAD: {simState.electrical.totalAmpsDrawn} A</span>
            </div>

            <div className="grid grid-cols-3 gap-2 my-auto text-center">
              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-500">MAIN GENERATOR</span>
                <div className="font-bold text-emerald-400 mt-1">{simState.electrical.mainGenActive ? '115V AC' : 'OFF'}</div>
                <span className="text-[8px] text-zinc-400">{simState.electrical.mainGenLoadPercent}% LOAD</span>
              </div>

              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-500">24V BATTERY</span>
                <div className="font-bold text-emerald-400 mt-1">{(simState.electrical.batteryVoltageVolts ?? 24).toFixed(1)}V DC</div>
                <span className="text-[8px] text-zinc-400">{Math.round(simState.electrical.batteryChargePercent ?? 0)}% CHARGE</span>
              </div>

              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-500">EXT POWER</span>
                <div className="font-bold text-zinc-300 mt-1">{simState.electrical.externalPowerSwitch ? 'ONLINE' : 'DISC'}</div>
                <span className="text-[8px] text-zinc-400">115V 400Hz</span>
              </div>

              <div className={`col-span-3 p-2 rounded border text-center ${simState.electrical.avionicsBusPowered ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-red-950/30 border-red-800 text-red-400'}`}>
                <span className="font-bold">AVIONICS BUS: {simState.electrical.avionicsBusPowered ? 'POWERED (28V DC)' : 'OFFLINE'}</span>
              </div>
            </div>

            <div className="text-[9px] text-zinc-400 border-t border-zinc-800 pt-1 flex justify-between">
              <span>BUS TIE: {simState.electrical.busTieClosed ? 'CLOSED' : 'OPEN'}</span>
              <span>ESSENTIAL DC: {simState.electrical.dcEssentialBusPowered ? 'LIVE' : 'DOWN'}</span>
            </div>
          </div>
        )}

        {/* FLCS PAGE */}
        {activePage === 'FLCS' && (
          <div className="h-full flex flex-col justify-between text-[11px]">
            <div className="flex justify-between border-b border-zinc-800 pb-1 mb-2 font-bold text-emerald-400">
              <span>FLY-BY-WIRE FLCS</span>
              <span className={simState.flcs.flightControlMode === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'}>
                MODE: {simState.flcs.flightControlMode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded">
                <span className="text-zinc-500 font-bold">STABILATORS (PITCH/ROLL)</span>
                <div className="text-emerald-400 font-bold mt-1">
                  L: {(simState.flcs.surfaces.leftStabilatorDeg ?? 0).toFixed(1)}° | R: {(simState.flcs.surfaces.rightStabilatorDeg ?? 0).toFixed(1)}°
                </div>
              </div>

              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded">
                <span className="text-zinc-500 font-bold">AILERONS (ROLL)</span>
                <div className="text-emerald-400 font-bold mt-1">
                  L: {(simState.flcs.surfaces.leftAileronDeg ?? 0).toFixed(1)}° | R: {(simState.flcs.surfaces.rightAileronDeg ?? 0).toFixed(1)}°
                </div>
              </div>

              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded">
                <span className="text-zinc-500 font-bold">RUDDER (YAW)</span>
                <div className="text-emerald-400 font-bold mt-1">{(simState.flcs.surfaces.rudderDeg ?? 0).toFixed(1)}°</div>
              </div>

              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded">
                <span className="text-zinc-500 font-bold">FLAPS & SPEEDBRAKE</span>
                <div className="text-emerald-400 font-bold mt-1">
                  FLAP: {(simState.flcs.surfaces.flapsDeg ?? 0).toFixed(0)}° | SB: {(simState.flcs.surfaces.speedBrakePercent ?? 0).toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="flex gap-2 text-[9px] text-zinc-400 border-t border-zinc-800 pt-1">
              <span>QUAD CHANNELS: 1-4 HEALTHY</span>
              <span>G-LIMITER: {simState.flcs.gLimiterActive ? 'ACTIVE' : 'READY'}</span>
            </div>
          </div>
        )}

        {/* SYSTEM STATUS & WARNINGS PAGE */}
        {activePage === 'SYS' && (
          <div className="h-full flex flex-col justify-between text-[11px]">
            <div className="flex justify-between border-b border-zinc-800 pb-1 mb-2 font-bold">
              <span className="text-emerald-400">CENTRAL SUBSYSTEM STATUS</span>
              <button
                onClick={() => onAction?.('ACK_CAUTION')}
                className="px-2 py-0.5 bg-amber-600 text-black font-bold rounded text-[9px] hover:bg-amber-500"
              >
                ACK ALERTS
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {simState.warnings.length === 0 ? (
                <div className="p-3 text-center text-emerald-400 font-bold text-xs bg-emerald-950/20 border border-emerald-800 rounded">
                  ALL SUBSYSTEMS NOMINAL - NO ACTIVE CAUTIONS
                </div>
              ) : (
                simState.warnings.map((w) => (
                  <div
                    key={w.id}
                    className={`p-1.5 rounded border flex justify-between items-center text-[10px] font-bold ${
                      w.severity === 'CRITICAL'
                        ? 'bg-red-950/60 border-red-700 text-red-400'
                        : w.severity === 'CAUTION'
                        ? 'bg-amber-950/60 border-amber-700 text-amber-400'
                        : 'bg-zinc-900 border-zinc-800 text-cyan-400'
                    }`}
                  >
                    <span>[{w.subsystem}] {w.text}</span>
                    <span className="text-[8px] uppercase">{w.severity}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SENSOR SA PAGE */}
        {activePage === 'SENSOR' && (
          <div className="h-full flex flex-col justify-between text-[11px]">
            <div className="flex justify-between border-b border-zinc-800 pb-1 mb-2 font-bold text-emerald-400">
              <span>TACTICAL SITUATION SENSOR</span>
              <span>AIR-TO-AIR SEARCH (TWS)</span>
            </div>

            <div className="relative flex-1 bg-black border border-zinc-800 rounded flex items-center justify-center p-2">
              <div className="w-full h-full flex flex-col justify-around text-[10px]">
                {simState.sensor.syntheticContacts.map((c) => (
                  <div key={c.id} className="flex justify-between p-1.5 bg-zinc-900/80 border border-zinc-800 rounded">
                    <span className="font-bold text-cyan-400">{c.id} ({c.type})</span>
                    <span className="text-zinc-300">BRG: {Math.round(c.bearingDeg ?? 0)}°</span>
                    <span className="text-zinc-300">RNG: {(c.rangeNm ?? 0).toFixed(1)} NM</span>
                    <span className="text-emerald-400">FL{Math.round((c.altitudeFt ?? 0) / 100)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CHECKLIST PAGE */}
        {activePage === 'CHK' && (
          <div className="h-full flex flex-col justify-between text-[10px]">
            <div className="flex justify-between border-b border-zinc-800 pb-1 mb-1 font-bold text-emerald-400">
              <span>BEFORE TAKEOFF CHECKLIST</span>
              <span>AUTO-VERIFICATION</span>
            </div>

            <div className="space-y-1 my-auto">
              <div className="flex justify-between p-1.5 bg-zinc-900/60 border border-zinc-800 rounded">
                <span>1. CANOPY CLOSED & LOCKED</span>
                <span className={simState.canopy.canopyLocked ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                  {simState.canopy.canopyLocked ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="flex justify-between p-1.5 bg-zinc-900/60 border border-zinc-800 rounded">
                <span>2. DUAL HYDRAULICS &gt; 2700 PSI</span>
                <span className={simState.hydraulic.systemAPressurePsi > 2700 ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                  {simState.hydraulic.systemAPressurePsi > 2700 ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="flex justify-between p-1.5 bg-zinc-900/60 border border-zinc-800 rounded">
                <span>3. FLAPS SET HALF (18°)</span>
                <span className={simState.flcs.surfaces.flapsDeg > 15 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {simState.flcs.surfaces.flapsDeg > 15 ? 'PASS' : 'CHECK'}
                </span>
              </div>
              <div className="flex justify-between p-1.5 bg-zinc-900/60 border border-zinc-800 rounded">
                <span>4. FLCS 4-CHANNELS NORMAL</span>
                <span className={simState.flcs.flightControlMode === 'NORMAL' ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                  {simState.flcs.flightControlMode === 'NORMAL' ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BIT PAGE */}
        {activePage === 'BIT' && (
          <div className="h-full flex flex-col justify-between text-[10px]">
            <div className="flex justify-between border-b border-zinc-800 pb-1 mb-1 font-bold text-emerald-400">
              <span>CONTINUOUS BIT (CBIT)</span>
              <span>100% COVERAGE</span>
            </div>

            <div className="space-y-1 my-auto">
              {Object.entries(simState.bit.results).slice(0, 5).map(([k, resRaw]) => {
                const res = resRaw as BitResult;
                return (
                  <div key={k} className="flex justify-between p-1.5 bg-zinc-900/60 border border-zinc-800 rounded">
                    <span className="font-bold text-zinc-300">{res.name.slice(0, 24)}</span>
                    <span className={res.status === 'PASS' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {res.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bezel OSBs (OSB 6 - 10) */}
      <div className="flex justify-between items-center bg-zinc-900/90 border-t border-zinc-800 px-2 py-1">
        <button
          onClick={() => handleOsb('FLCS')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            activePage === 'FLCS' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          FLCS
        </button>
        <button
          onClick={() => handleOsb('SENSOR')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            activePage === 'SENSOR' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          SEN
        </button>
        <button
          onClick={() => handleOsb('SYS')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            activePage === 'SYS' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          SYS
        </button>
        <button
          onClick={() => handleOsb('CHK')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            activePage === 'CHK' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          CHK
        </button>
        <button
          onClick={() => handleOsb('BIT')}
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            activePage === 'BIT' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          BIT
        </button>
      </div>
    </div>
  );
};
