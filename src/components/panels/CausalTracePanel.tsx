/**
 * Causal Trace & Deterministic Event Monitor Panel
 * Explains system cause-and-effect interactions in real time.
 */

import React from 'react';
import { CausalEvent } from '../../types/simulation';

interface CausalTracePanelProps {
  events: CausalEvent[];
}

export const CausalTracePanel: React.FC<CausalTracePanelProps> = ({ events }) => {
  return (
    <div className="p-3 bg-[#111622] border border-zinc-800 rounded-lg select-none font-mono flex flex-col h-[280px]">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5 mb-2">
        <span className="text-xs font-bold text-zinc-300 tracking-wider">REAL-TIME CAUSAL CHAIN MONITOR</span>
        <span className="text-[10px] text-zinc-500">LIVE SYSTEM DETERMINISM TRACE</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[10px]">
        {events.length === 0 ? (
          <div className="text-zinc-600 text-center py-8">
            Perform cockpit actions (toggle switches, breakers, throttle, gear) to observe causal propagation traces.
          </div>
        ) : (
          events.map((evt, idx) => (
            <div
              key={idx}
              className="p-2 bg-zinc-950/80 border border-zinc-800/80 rounded flex flex-col gap-1 transition-all"
            >
              <div className="flex justify-between items-center text-[9px]">
                <span className="px-1.5 py-0.2 bg-zinc-800 text-cyan-400 font-bold rounded">
                  {evt.subsystem}
                </span>
                <span className="text-zinc-500">T+{(evt.timestamp ?? 0).toFixed(2)}s</span>
              </div>

              <div className="text-zinc-300 font-bold">
                <span className="text-emerald-400">ACTION:</span> {evt.cause}
              </div>

              <div className="text-zinc-400">
                <span className="text-amber-400">PHYSICAL EFFECT:</span> {evt.effect}
              </div>

              <div className="text-zinc-400">
                <span className="text-cyan-400">INDICATION:</span> {evt.indication}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
