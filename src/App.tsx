/**
 * AeroSim Fighter Flight Dynamics & Systems Simulator
 * Engineering-grade 6-DOF physics, full avionics suite, electrical, hydraulic, fuel, and engine state machines.
 */

import React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationManager } from './core/simulationManager';
import { SimulationState, BitResult } from './types/simulation';
import { cockpitAudio } from './core/audioSynthesizer';
import { WorldViewCanvas } from './components/cockpit/WorldViewCanvas';
import { HudRenderer } from './components/cockpit/HudRenderer';
import { PfdRenderer } from './components/cockpit/PfdRenderer';
import { MfdDisplay, MfdPage } from './components/cockpit/MfdDisplay';
import { EngineControlsPanel } from './components/panels/EngineControlsPanel';
import { ElectricalPanel } from './components/panels/ElectricalPanel';
import { HydraulicsFuelPanel } from './components/panels/HydraulicsFuelPanel';
import { FlightControlsGearPanel } from './components/panels/FlightControlsGearPanel';
import { EcsCanopyPanel } from './components/panels/EcsCanopyPanel';
import { AnnunciatorCautionPanel } from './components/panels/AnnunciatorCautionPanel';
import { CausalTracePanel } from './components/panels/CausalTracePanel';
import { InstructorPanel } from './components/panels/InstructorPanel';
import { VirtualStickRudder } from './components/controls/VirtualStickRudder';
import { AIRCRAFT_CHECKLISTS } from './mission/checklists';

type ActiveViewTab = 'COCKPIT' | 'SCHEMATICS' | 'INSTRUCTOR' | 'CHECKLISTS';

export default function App() {
  const simManagerRef = useRef<SimulationManager | null>(null);
  if (!simManagerRef.current) {
    simManagerRef.current = new SimulationManager('sf-27', 'takeoff-roll');
  }
  const sim = simManagerRef.current;

  // React state reflecting current simulation snapshot for UI rendering
  const [simState, setSimState] = useState<SimulationState>(sim.getState());
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('COCKPIT');
  const [cameraMode, setCameraMode] = useState<'COCKPIT' | 'CHASE' | 'HUD_ONLY'>('COCKPIT');
  const [showCausalDrawer, setShowCausalDrawer] = useState(false);
  const [leftMfdPage, setLeftMfdPage] = useState<MfdPage>('TAC_MAP');
  const [rightMfdPage, setRightMfdPage] = useState<MfdPage>('ENG');
  const [hudDeclutter, setHudDeclutter] = useState<number>(0);

  // Main fixed-step physics & animation loop (50 Hz physics, 60 fps rendering)
  useEffect(() => {
    let lastTime = performance.now();
    let animFrameId: number;

    const loop = (currentTime: number) => {
      const dtMs = currentTime - lastTime;
      lastTime = currentTime;

      // Fixed 0.02s (50 Hz) step with delta clamping
      const dt = Math.min(0.05, Math.max(0.005, dtMs / 1000.0));
      sim.step(dt);

      // Sound update (engine turbine whine pitch and volume proportional to N2)
      const current = sim.getState();
      cockpitAudio.updateEngineSound(current.engine.n2RpmPercent, current.engine.afterburnerActive);

      setSimState({ ...current });
      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [sim]);

  // Handlers for physical controls
  const handleThrottleChange = useCallback((val: number) => {
    sim.setThrottle(val);
  }, [sim]);

  const handleStickChange = useCallback((pitch: number, roll: number) => {
    sim.setFlightStick(pitch, roll);
  }, [sim]);

  const handleRudderChange = useCallback((yaw: number) => {
    sim.setRudder(yaw);
  }, [sim]);

  const handleToeBrakes = useCallback((left: number, right: number) => {
    sim.setToeBrakes(left, right);
  }, [sim]);

  const handleToggleGear = useCallback(() => {
    sim.toggleGear();
  }, [sim]);

  const handleToggleSpeedBrake = useCallback(() => {
    sim.toggleSpeedBrake();
  }, [sim]);

  const handleFlapsCycle = useCallback(() => {
    const current = sim.getState().controls.flapsCommand;
    const next = current === 'AUTO' ? 'HALF' : current === 'HALF' ? 'FULL' : 'AUTO';
    sim.setFlaps(next);
  }, [sim]);

  const handleToggleParkingBrake = useCallback(() => {
    sim.toggleParkingBrake();
  }, [sim]);

  const handleAdjustTrim = useCallback((delta: number) => {
    sim.adjustPitchTrim(delta);
  }, [sim]);

  const handleToggleBattery = useCallback(() => {
    sim.toggleBattery();
  }, [sim]);

  const handleToggleGenerator = useCallback(() => {
    sim.toggleGenerator();
  }, [sim]);

  const handleToggleExternalPower = useCallback(() => {
    sim.toggleExternalPower();
  }, [sim]);

  const handleToggleBusTie = useCallback(() => {
    sim.toggleBusTie();
  }, [sim]);

  const handleToggleBreaker = useCallback((breakerId: string) => {
    sim.toggleCircuitBreaker(breakerId);
  }, [sim]);

  const handleToggleEngineMaster = useCallback(() => {
    sim.toggleEngineMaster();
  }, [sim]);

  const handleSetEngineStart = useCallback((val: 'OFF' | 'CRANK' | 'START') => {
    sim.setEngineStartSwitch(val);
  }, [sim]);

  const handleToggleAuxHyd = useCallback(() => {
    sim.toggleAuxHydPump();
  }, [sim]);

  const handleToggleCrossfeed = useCallback(() => {
    sim.toggleCrossfeed();
  }, [sim]);

  const handleToggleFuelDump = useCallback(() => {
    sim.toggleFuelDump();
  }, [sim]);

  const handleToggleCanopy = useCallback(() => {
    sim.toggleCanopy();
  }, [sim]);

  const handleTogglePitotHeat = useCallback(() => {
    sim.togglePitotHeat();
  }, [sim]);

  const handleAcknowledgeCaution = useCallback(() => {
    sim.acknowledgeMasterCaution();
  }, [sim]);

  const isHudPowered = simState.electrical.acBusPowered && !simState.electrical.circuitBreakers?.CB_HUD?.tripped;
  const isPfdPowered = simState.electrical.avionicsBusPowered && !simState.electrical.circuitBreakers?.CB_PFD?.tripped;
  const isLeftMfdPowered = simState.electrical.avionicsBusPowered && !simState.electrical.circuitBreakers?.CB_MFD_L?.tripped;
  const isRightMfdPowered = simState.electrical.avionicsBusPowered && !simState.electrical.circuitBreakers?.CB_MFD_R?.tripped;

  return (
    <div className="w-full h-screen flex flex-col bg-[#080b11] text-zinc-200 font-mono overflow-hidden select-none">
      {/* 1. TOP GLARESHIELD & STATUS BAR */}
      <header className="h-12 bg-[#0d121c] border-b border-zinc-800 px-3 flex items-center justify-between z-30 shrink-0">
        {/* Left: Aircraft Platform & Scenario */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-widest uppercase">
              {sim.getProfile().name}
            </span>
            <span className="text-[9px] text-emerald-400 font-semibold">
              SCENARIO: {simState.currentScenario?.title || 'ACTIVE FLIGHT'}
            </span>
          </div>

          {/* Master Alerts Quick Status in Header */}
          {simState.masterWarningActive && (
            <button
              onClick={handleAcknowledgeCaution}
              className="px-2 py-0.5 bg-red-600 border border-white text-white rounded font-bold text-[10px] animate-pulse tracking-wider"
            >
              MASTER WARN
            </button>
          )}
          {simState.masterCautionActive && (
            <button
              onClick={handleAcknowledgeCaution}
              className="px-2 py-0.5 bg-amber-500 border border-black text-black rounded font-bold text-[10px] animate-pulse tracking-wider"
            >
              MASTER CAUT
            </button>
          )}
        </div>

        {/* Center: View Navigation Tabs */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-800 rounded-lg">
          <button
            onClick={() => setActiveTab('COCKPIT')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeTab === 'COCKPIT' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            TACTICAL COCKPIT
          </button>
          <button
            onClick={() => setActiveTab('SCHEMATICS')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeTab === 'SCHEMATICS' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            SYSTEM SCHEMATICS
          </button>
          <button
            onClick={() => setActiveTab('INSTRUCTOR')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeTab === 'INSTRUCTOR' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            INSTRUCTOR & FDR
          </button>
          <button
            onClick={() => setActiveTab('CHECKLISTS')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeTab === 'CHECKLISTS' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            CHECKLISTS & BIT
          </button>
        </div>

        {/* Right: Simulation Telemetry & Drawer Toggle */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex gap-2 text-[10px] text-zinc-400">
            <span>T+{simState.simulationTimeSec.toFixed(1)}s</span>
            <span>50 HZ</span>
            <span className={simState.aircraft.onGround ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {simState.aircraft.onGround ? 'WEIGHT ON WHEELS' : 'AIRBORNE'}
            </span>
          </div>

          <button
            onClick={() => setShowCausalDrawer(!showCausalDrawer)}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
              showCausalDrawer ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
            }`}
          >
            CAUSAL TRACE
          </button>
        </div>
      </header>

      {/* 2. MAIN APPLICATION WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* TACTICAL COCKPIT VIEW */}
        {activeTab === 'COCKPIT' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-2 gap-2 bg-[#0a0d13]">
            {/* Top Stage: 3D Out-The-Window Synthetic Vision + Collimated HUD */}
            <div className="relative w-full h-[360px] lg:h-[400px] shrink-0 bg-black border-2 border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
              {/* 3D Canvas rendering Runway 09, Horizon, Strobes, Terrain, and Aircraft silhouette */}
              <WorldViewCanvas
                aircraft={simState.aircraft}
                weather={simState.weather}
                cameraMode={cameraMode}
              />

              {/* High-Contrast Collimated Vector HUD overlaid on forward windshield */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <HudRenderer
                  aircraft={simState.aircraft}
                  navigation={simState.navigation}
                  isPowered={isHudPowered}
                  declutterLevel={hudDeclutter}
                  brightness={simState.lighting.hudBrightnessPercent}
                  masterWarning={simState.masterWarningActive}
                />
              </div>

              {/* View Camera & HUD Controls overlay */}
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                <button
                  onClick={() => setCameraMode(cameraMode === 'COCKPIT' ? 'CHASE' : cameraMode === 'CHASE' ? 'HUD_ONLY' : 'COCKPIT')}
                  className="px-2 py-1 bg-black/70 hover:bg-black border border-zinc-700 rounded text-[9px] font-bold text-zinc-300"
                >
                  CAM: {cameraMode}
                </button>
                <button
                  onClick={() => setHudDeclutter((d) => (d + 1) % 3)}
                  className="px-2 py-1 bg-black/70 hover:bg-black border border-zinc-700 rounded text-[9px] font-bold text-emerald-400"
                >
                  HUD DCLT: {hudDeclutter}
                </button>
              </div>

              {/* Flight Dynamics Mini Bar at Bottom of Windshield */}
              <div className="absolute bottom-2 left-3 right-3 flex justify-between px-3 py-1 bg-black/60 backdrop-blur-sm border border-zinc-800/80 rounded text-[10px] text-zinc-300">
                <span>IAS: <strong className="text-emerald-400">{Math.round(simState.aircraft?.indicatedAirspeedKnots ?? 0)} kts</strong></span>
                <span>ALT: <strong className="text-emerald-400">{Math.round(simState.aircraft?.altitudeFt ?? 0)} ft</strong></span>
                <span>MACH: <strong className="text-cyan-400">{(simState.aircraft?.mach ?? 0).toFixed(2)}</strong></span>
                <span>PITCH: <strong>{(simState.aircraft?.pitchDeg ?? 0).toFixed(1)}°</strong></span>
                <span>ROLL: <strong>{(simState.aircraft?.rollDeg ?? 0).toFixed(1)}°</strong></span>
                <span>G: <strong className="text-yellow-400">{(simState.aircraft?.loadFactorG ?? 1).toFixed(1)}</strong></span>
                <span>AoA: <strong className="text-cyan-400">{(simState.aircraft?.alphaDeg ?? 0).toFixed(1)}°</strong></span>
                <span>N2: <strong className="text-emerald-400">{(simState.engine?.n2RpmPercent ?? 0).toFixed(0)}%</strong></span>
              </div>
            </div>

            {/* Middle Stage: Triple Glass Cockpit (Left MFD + Center PFD + Right MFD) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0">
              {/* Left Multifunction Display */}
              <MfdDisplay
                id="mfd-left"
                title="LEFT MFD"
                defaultPage={leftMfdPage}
                simState={simState}
                isPowered={isLeftMfdPowered}
                onAction={(act) => act === 'ACK_CAUTION' && handleAcknowledgeCaution()}
              />

              {/* Center Primary Flight Display (PFD) */}
              <PfdRenderer
                aircraft={simState.aircraft}
                flcs={simState.flcs}
                navigation={simState.navigation}
                isPowered={isPfdPowered}
              />

              {/* Right Multifunction Display */}
              <MfdDisplay
                id="mfd-right"
                title="RIGHT MFD"
                defaultPage={rightMfdPage}
                simState={simState}
                isPowered={isRightMfdPowered}
                onAction={(act) => act === 'ACK_CAUTION' && handleAcknowledgeCaution()}
              />
            </div>

            {/* Lower Stage: Tactile Pedestals & Flight Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <EngineControlsPanel
                engine={simState.engine}
                throttle={simState.controls.throttle}
                onThrottleChange={handleThrottleChange}
                onToggleMaster={handleToggleEngineMaster}
                onSetStartSwitch={handleSetEngineStart}
              />

              <FlightControlsGearPanel
                gear={simState.gear}
                controls={simState.controls}
                onToggleGear={handleToggleGear}
                onSetFlaps={(f) => sim.setFlaps(f)}
                onToggleSpeedBrake={handleToggleSpeedBrake}
                onToggleParkingBrake={handleToggleParkingBrake}
                onAdjustTrim={handleAdjustTrim}
              />

              <ElectricalPanel
                electrical={simState.electrical}
                onToggleBattery={handleToggleBattery}
                onToggleGenerator={handleToggleGenerator}
                onToggleExternalPower={handleToggleExternalPower}
                onToggleBusTie={handleToggleBusTie}
                onToggleBreaker={handleToggleBreaker}
              />

              <HydraulicsFuelPanel
                fuel={simState.fuel}
                hydraulic={simState.hydraulic}
                onToggleAuxHyd={handleToggleAuxHyd}
                onToggleCrossfeed={handleToggleCrossfeed}
                onToggleFuelDump={handleToggleFuelDump}
              />

              <EcsCanopyPanel
                ecs={simState.ecs}
                canopy={simState.canopy}
                onToggleCanopy={handleToggleCanopy}
                onTogglePitotHeat={handleTogglePitotHeat}
              />

              <AnnunciatorCautionPanel
                simState={simState}
                onAcknowledge={handleAcknowledgeCaution}
              />
            </div>

            {/* Virtual Control Stick & Rudder Pedals */}
            <VirtualStickRudder
              pitch={simState.controls.pitchInput}
              roll={simState.controls.rollInput}
              yaw={simState.controls.yawInput}
              onStickChange={handleStickChange}
              onRudderChange={handleRudderChange}
              onToeBrakes={handleToeBrakes}
              onToggleGear={handleToggleGear}
              onToggleSpeedBrake={handleToggleSpeedBrake}
              onFlapsChange={handleFlapsCycle}
              throttle={simState.controls.throttle}
              onThrottleChange={handleThrottleChange}
            />
          </div>
        )}

        {/* SCHEMATICS & SYSTEMS DEEP-DIVE VIEW */}
        {activeTab === 'SCHEMATICS' && (
          <div className="flex-1 overflow-y-auto p-4 bg-[#0a0d13] grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Electrical Bus Single-Line Diagram */}
            <div className="p-4 bg-[#111622] border border-zinc-800 rounded-lg flex flex-col gap-3">
              <span className="text-sm font-bold text-cyan-400">ELECTRICAL DISTRIBUTION SINGLE-LINE NETWORK</span>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-xs space-y-2">
                <div className="flex justify-between items-center p-2 bg-zinc-900 rounded">
                  <span>115V AC 400Hz MAIN BUS</span>
                  <span className={simState.electrical.acBusPowered ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {simState.electrical.acBusPowered ? 'POWERED (ONLINE)' : 'DEAD'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-zinc-900 rounded">
                  <span>28V DC ESSENTIAL BUS</span>
                  <span className={simState.electrical.dcEssentialBusPowered ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {simState.electrical.dcEssentialBusPowered ? 'POWERED (24.8V DC)' : 'DEAD'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-zinc-900 rounded">
                  <span>AVIONICS MISSION BUS</span>
                  <span className={simState.electrical.avionicsBusPowered ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {simState.electrical.avionicsBusPowered ? 'POWERED' : 'OFFLINE'}
                  </span>
                </div>
              </div>
              <ElectricalPanel
                electrical={simState.electrical}
                onToggleBattery={handleToggleBattery}
                onToggleGenerator={handleToggleGenerator}
                onToggleExternalPower={handleToggleExternalPower}
                onToggleBusTie={handleToggleBusTie}
                onToggleBreaker={handleToggleBreaker}
              />
            </div>

            {/* Fuel & Hydraulic Flow Schematics */}
            <div className="p-4 bg-[#111622] border border-zinc-800 rounded-lg flex flex-col gap-3">
              <span className="text-sm font-bold text-cyan-400">HYDRAULIC & FUEL SYSTEM ARCHITECTURE</span>
              <HydraulicsFuelPanel
                fuel={simState.fuel}
                hydraulic={simState.hydraulic}
                onToggleAuxHyd={handleToggleAuxHyd}
                onToggleCrossfeed={handleToggleCrossfeed}
                onToggleFuelDump={handleToggleFuelDump}
              />
              <EngineControlsPanel
                engine={simState.engine}
                throttle={simState.controls.throttle}
                onThrottleChange={handleThrottleChange}
                onToggleMaster={handleToggleEngineMaster}
                onSetStartSwitch={handleSetEngineStart}
              />
            </div>
          </div>
        )}

        {/* INSTRUCTOR & FDR TELEMETRY VIEW */}
        {activeTab === 'INSTRUCTOR' && (
          <div className="flex-1 overflow-y-auto p-4 bg-[#0a0d13] flex flex-col gap-4">
            <InstructorPanel
              simState={simState}
              onResetScenario={(id) => sim.resetScenario(id)}
              onChangeAircraft={(id) => sim.setProfile(id)}
              onReposition={(alt, spd, hdg) => sim.repositionAircraft(alt, spd, hdg)}
              onInjectFailure={(id) => sim.injectFailure(id)}
              onClearFailure={(id) => sim.clearFailure(id)}
              onSetTimeScale={(s) => sim.setTimeScale(s)}
              onTogglePause={() => sim.togglePause()}
            />

            {/* Live Flight Telemetry Inspector */}
            <div className="p-4 bg-[#111622] border border-zinc-800 rounded-lg">
              <span className="text-xs font-bold text-zinc-300 block mb-2">FLIGHT DATA RECORDER (FDR) TIME-SERIES TELEMETRY</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-zinc-950 p-3 rounded border border-zinc-800">
                <div>ALTITUDE: <strong className="text-emerald-400">{Math.round(simState.aircraft.altitudeFt)} FT</strong></div>
                <div>AIRSPEED: <strong className="text-emerald-400">{Math.round(simState.aircraft.indicatedAirspeedKnots)} KIAS</strong></div>
                <div>MACH: <strong className="text-cyan-400">{simState.aircraft.mach.toFixed(3)}</strong></div>
                <div>VERTICAL SPEED: <strong>{Math.round(simState.aircraft.verticalSpeedFpm)} FPM</strong></div>
                <div>G-LOAD: <strong className="text-yellow-400">{simState.aircraft.loadFactorG.toFixed(2)} G</strong></div>
                <div>PITCH / ROLL: <strong>{simState.aircraft.pitchDeg.toFixed(1)}° / {simState.aircraft.rollDeg.toFixed(1)}°</strong></div>
                <div>ENGINE N2: <strong className="text-emerald-400">{simState.engine.n2RpmPercent.toFixed(1)}%</strong></div>
                <div>THRUST: <strong className="text-cyan-400">{simState.engine.thrustKn.toFixed(1)} kN</strong></div>
                <div>HYD A / B: <strong>{Math.round(simState.hydraulic.systemAPressurePsi)} / {Math.round(simState.hydraulic.systemBPressurePsi)} PSI</strong></div>
                <div>TOTAL FUEL: <strong className="text-emerald-400">{Math.round(simState.fuel.totalFuelKg)} KG</strong></div>
                <div>CG LOCATION: <strong>{simState.mass.cgPercentMac.toFixed(1)}% MAC</strong></div>
                <div>FLCS LAW: <strong className="text-cyan-400">{simState.flcs.flightControlMode}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* CHECKLISTS & BIT VIEW */}
        {activeTab === 'CHECKLISTS' && (
          <div className="flex-1 overflow-y-auto p-4 bg-[#0a0d13] grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Interactive Checklists */}
            <div className="p-4 bg-[#111622] border border-zinc-800 rounded-lg flex flex-col gap-3">
              <span className="text-sm font-bold text-cyan-400">FLIGHT CREW INTERACTIVE CHECKLISTS</span>
              <div className="space-y-3">
                {AIRCRAFT_CHECKLISTS.map((chk) => (
                  <div key={chk.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded">
                    <span className="text-xs font-bold text-white mb-2 block">{chk.title}</span>
                    <div className="space-y-1.5 text-xs">
                      {chk.items.map((item) => {
                        const result = item.check(simState);
                        return (
                          <div key={item.id} className="flex justify-between items-center p-1.5 bg-zinc-900/70 rounded">
                            <div>
                              <span className="font-bold text-zinc-300">{item.item}:</span>{' '}
                              <span className="text-zinc-400">{item.action}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500">{result.actual}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                result.pass ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-red-950 text-red-400 border border-red-700'
                              }`}>
                                {result.pass ? 'PASS' : 'CHECK'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Built-In-Test (BIT) Diagnostics Suite */}
            <div className="p-4 bg-[#111622] border border-zinc-800 rounded-lg flex flex-col gap-3">
              <span className="text-sm font-bold text-cyan-400">BUILT-IN-TEST (PBIT / CBIT / IBIT)</span>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-xs space-y-2">
                <div className="flex justify-between border-b border-zinc-800 pb-1 font-bold text-zinc-400">
                  <span>SUBSYSTEM NAME</span>
                  <span>STATUS & DIAGNOSTIC</span>
                </div>
                {Object.entries(simState.bit.results).map(([k, resRaw]) => {
                  const res = resRaw as BitResult;
                  return (
                    <div key={k} className="p-2 bg-zinc-900 rounded flex flex-col gap-0.5">
                      <div className="flex justify-between font-bold">
                        <span className="text-zinc-200">{res.name}</span>
                        <span className={res.status === 'PASS' ? 'text-emerald-400' : res.status === 'DEGRADED' ? 'text-amber-400' : 'text-red-400'}>
                          {res.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400">{res.detail}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Causal Event Trace Slide-Out Drawer */}
        {showCausalDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-80 lg:w-96 bg-[#0c1018] border-l border-zinc-800 z-20 shadow-2xl p-2 flex flex-col">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-zinc-800">
              <span className="text-xs font-bold text-cyan-400">SYSTEM CAUSALITY TRACE</span>
              <button
                onClick={() => setShowCausalDrawer(false)}
                className="text-zinc-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CausalTracePanel events={sim.getCausalLog()} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
