/**
 * Instructor Operation Station (IOS) Panel
 * Scenario reset, rapid repositioning, failure injection, simulation clock, and telemetry export.
 */

import React, { useState } from 'react';
import { SimulationState, ScenarioDefinition } from '../../types/simulation';
import { SIMULATION_SCENARIOS } from '../../mission/scenarios';
import { flightDataRecorder } from '../../recording/telemetryRecorder';

interface InstructorPanelProps {
  simState: SimulationState;
  onResetScenario: (scenarioId: string) => void;
  onChangeAircraft: (profileId: string) => void;
  onReposition: (altFt: number, speedKts: number, headingDeg: number) => void;
  onInjectFailure: (failId: string) => void;
  onClearFailure: (failId: string) => void;
  onSetTimeScale: (scale: number) => void;
  onTogglePause: () => void;
}

export const InstructorPanel: React.FC<InstructorPanelProps> = ({
  simState,
  onResetScenario,
  onChangeAircraft,
  onReposition,
  onInjectFailure,
  onClearFailure,
  onSetTimeScale,
  onTogglePause,
}) => {
  const [repAlt, setRepAlt] = useState(simState.aircraft.altitudeFt);
  const [repSpeed, setRepSpeed] = useState(simState.aircraft.indicatedAirspeedKnots);
  const [repHeading, setRepHeading] = useState(simState.aircraft.headingDeg);

  const downloadCsv = () => {
    const csv = flightDataRecorder.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flight_telemetry_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    const json = flightDataRecorder.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flight_telemetry_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeFailures = simState.failures.activeFailures;

  return (
    <div className="p-3 bg-[#111622] border border-zinc-800 rounded-lg select-none font-mono flex flex-col gap-3 text-xs">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
        <span className="font-bold text-zinc-300 tracking-wider">INSTRUCTOR OPERATING STATION (IOS)</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePause}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              simState.paused ? 'bg-amber-600 text-black border-amber-400' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
          >
            {simState.paused ? 'RESUME' : 'PAUSE'}
          </button>
          <div className="flex gap-1">
            {[0.5, 1.0, 2.0, 4.0].map((rate) => (
              <button
                key={rate}
                onClick={() => onSetTimeScale(rate)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  simState.timeScale === rate ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario Presets */}
      <div>
        <span className="text-[10px] font-bold text-zinc-400 block mb-1">SCENARIOS & TRAINING PROFILES</span>
        <div className="grid grid-cols-3 gap-1.5">
          {SIMULATION_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => onResetScenario(sc.id)}
              className={`p-1.5 rounded border text-left flex flex-col justify-between transition-colors ${
                simState.currentScenario?.id === sc.id
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80'
              }`}
            >
              <span className="font-bold text-[10px] truncate">{sc.title}</span>
              <span className="text-[8px] text-zinc-500">{sc.category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Aircraft Type Switcher */}
      <div>
        <span className="text-[10px] font-bold text-zinc-400 block mb-1">AIRCRAFT PLATFORM TYPE</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChangeAircraft('sf-27')}
            className="p-1.5 bg-zinc-900 border border-zinc-700 rounded text-left hover:border-zinc-500"
          >
            <div className="font-bold text-emerald-400 text-[11px]">SF-27 Vanguard</div>
            <div className="text-[8px] text-zinc-400">Single-Engine Mach 2.0 Multirole Fighter</div>
          </button>
          <button
            onClick={() => onChangeAircraft('sf-19')}
            className="p-1.5 bg-zinc-900 border border-zinc-700 rounded text-left hover:border-zinc-500"
          >
            <div className="font-bold text-cyan-400 text-[11px]">SF-19 Phantom-X</div>
            <div className="text-[8px] text-zinc-400">Twin-Engine Mach 2.25 Air Superiority Interceptor</div>
          </button>
        </div>
      </div>

      {/* Reposition Controls */}
      <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800">
        <span className="text-[10px] font-bold text-zinc-400 block mb-1">RAPID IN-FLIGHT REPOSITIONING</span>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[8px] text-zinc-500">ALTITUDE (FT)</span>
            <input
              type="number"
              value={repAlt}
              onChange={(e) => setRepAlt(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-[10px]"
            />
          </div>
          <div>
            <span className="text-[8px] text-zinc-500">AIRSPEED (KIAS)</span>
            <input
              type="number"
              value={repSpeed}
              onChange={(e) => setRepSpeed(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-[10px]"
            />
          </div>
          <div>
            <span className="text-[8px] text-zinc-500">HEADING (DEG)</span>
            <input
              type="number"
              value={repHeading}
              onChange={(e) => setRepHeading(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-[10px]"
            />
          </div>
        </div>
        <button
          onClick={() => onReposition(repAlt, repSpeed, repHeading)}
          className="w-full mt-2 py-1 bg-cyan-950/60 border border-cyan-700 rounded text-cyan-300 font-bold text-[10px] hover:bg-cyan-900/60"
        >
          REPOSITION AIRCRAFT
        </button>
      </div>

      {/* Failure Injections */}
      <div>
        <span className="text-[10px] font-bold text-zinc-400 block mb-1">ABNORMAL & EMERGENCY FAILURE INJECTION</span>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'FAIL_ENG_FLAMEOUT', label: 'Engine Flameout' },
            { id: 'FAIL_HYD_A', label: 'Hydraulic Sys A Loss' },
            { id: 'FAIL_GEN', label: 'Main Generator Fail' },
            { id: 'FAIL_PITOT_ICE', label: 'Pitot Probe Icing' },
          ].map((f) => {
            const isFailed = activeFailures.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => (isFailed ? onClearFailure(f.id) : onInjectFailure(f.id))}
                className={`p-1.5 rounded border text-[10px] font-bold flex justify-between items-center ${
                  isFailed
                    ? 'bg-red-950/60 border-red-500 text-red-300 animate-pulse'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <span>{f.label}</span>
                <span>{isFailed ? 'FAILED' : 'INJECT'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FDR Telemetry Export */}
      <div className="flex gap-2 pt-1 border-t border-zinc-800">
        <button
          onClick={downloadCsv}
          className="flex-1 py-1 bg-zinc-900 border border-zinc-700 rounded font-bold text-zinc-300 hover:bg-zinc-800 text-[10px]"
        >
          EXPORT TELEMETRY (CSV)
        </button>
        <button
          onClick={downloadJson}
          className="flex-1 py-1 bg-zinc-900 border border-zinc-700 rounded font-bold text-zinc-300 hover:bg-zinc-800 text-[10px]"
        >
          EXPORT TELEMETRY (JSON)
        </button>
      </div>
    </div>
  );
};
