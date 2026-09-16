/**
 * Annunciator Caution & Warning Matrix Panel with Master Warning/Caution Buttons
 */

import React, { useState } from 'react';
import { SimulationState } from '../../types/simulation';
import { Annunciator } from '../common/Annunciator';
import { cockpitAudio } from '../../core/audioSynthesizer';

interface AnnunciatorCautionPanelProps {
  simState: SimulationState;
  onAcknowledge: () => void;
}

export const AnnunciatorCautionPanel: React.FC<AnnunciatorCautionPanelProps> = ({
  simState,
  onAcknowledge,
}) => {
  const [lampTest, setLampTest] = useState(false);

  const handleMasterClick = () => {
    cockpitAudio.playSwitchClick();
    onAcknowledge();
  };

  const isWarn = simState.masterWarningActive || lampTest;
  const isCaut = simState.masterCautionActive || lampTest;

  return (
    <div className="p-3 bg-[#111622] border border-zinc-800 rounded-lg select-none font-mono flex flex-col justify-between">
      {/* Header with Master Warning and Master Caution Buttons */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Master Warning Push Button */}
          <button
            id="btn-master-warning"
            onClick={handleMasterClick}
            className={`px-3 py-1.5 rounded border-2 font-bold text-xs tracking-wider uppercase transition-all shadow-md ${
              isWarn
                ? 'bg-red-600 text-white border-white animate-pulse shadow-[0_0_12px_#ef4444]'
                : 'bg-zinc-900 text-red-700 border-red-900/60'
            }`}
            title="MASTER WARNING (Click to acknowledge and silence alerts)"
          >
            MASTER WARN
          </button>

          {/* Master Caution Push Button */}
          <button
            id="btn-master-caution"
            onClick={handleMasterClick}
            className={`px-3 py-1.5 rounded border-2 font-bold text-xs tracking-wider uppercase transition-all shadow-md ${
              isCaut
                ? 'bg-amber-500 text-black border-amber-300 animate-pulse shadow-[0_0_10px_#f59e0b]'
                : 'bg-zinc-900 text-amber-700 border-amber-900/60'
            }`}
            title="MASTER CAUTION (Click to acknowledge)"
          >
            MASTER CAUT
          </button>
        </div>

        {/* Lamp Test Toggle */}
        <button
          onClick={() => setLampTest(!lampTest)}
          className={`px-2 py-1 rounded text-[9px] border font-bold ${
            lampTest ? 'bg-zinc-200 text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-700'
          }`}
        >
          LAMP TEST
        </button>
      </div>

      {/* 12-Tile Matrix */}
      <div className="grid grid-cols-4 gap-1.5 bg-zinc-950/90 p-2 rounded border border-zinc-800">
        <Annunciator
          label="ENG FIRE"
          active={lampTest || simState.engine.fireWarning}
          severity="CRITICAL"
          flashing={true}
        />
        <Annunciator
          label="GEN FAIL"
          active={lampTest || simState.electrical.generatorFailWarning}
          severity="CAUTION"
        />
        <Annunciator
          label="HYD A LOW"
          active={lampTest || (simState.hydraulic.lowPressureCautionA && simState.engine.n2RpmPercent > 20)}
          severity="CAUTION"
        />
        <Annunciator
          label="HYD B LOW"
          active={lampTest || (simState.hydraulic.lowPressureCautionB && simState.engine.n2RpmPercent > 20)}
          severity="CAUTION"
        />
        <Annunciator
          label="FUEL LOW"
          active={lampTest || simState.fuel.fuelLowCaution}
          severity="CAUTION"
        />
        <Annunciator
          label="FUEL IMBAL"
          active={lampTest || simState.fuel.imbalanceWarning}
          severity="CAUTION"
        />
        <Annunciator
          label="CANOPY"
          active={lampTest || simState.canopy.canopyUnsafeWarning}
          severity="CAUTION"
        />
        <Annunciator
          label="CABIN ALT"
          active={lampTest || simState.ecs.cabinAltitudeWarning}
          severity="CAUTION"
        />
        <Annunciator
          label="GEAR UNSAFE"
          active={lampTest || simState.gear.transitState === 'UNSAFE'}
          severity="CAUTION"
        />
        <Annunciator
          label="STALL"
          active={lampTest || (simState.flcs.stallWarningActive && !simState.aircraft.onGround)}
          severity="CRITICAL"
          flashing={true}
        />
        <Annunciator
          label="OVERSPEED"
          active={lampTest || simState.aircraft.indicatedAirspeedKnots > 800}
          severity="CRITICAL"
          flashing={true}
        />
        <Annunciator
          label="FLCS DEG"
          active={lampTest || simState.flcs.flightControlMode === 'DEGRADED'}
          severity="CAUTION"
        />
      </div>
    </div>
  );
};
