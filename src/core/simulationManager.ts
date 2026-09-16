/**
 * Master Aircraft Simulation Manager
 * Orchestrates 6-DOF physics, propulsion, fuel, hydraulics, electrical networks,
 * avionics, warnings, and instructor controls with deterministic execution.
 */

import {
  SimulationState,
  AircraftState,
  MassState,
  ControlInputs,
  ScenarioDefinition,
  CausalEvent,
} from '../types/simulation';
import { AircraftProfile, SF27_VANGUARD, AIRCRAFT_PROFILES } from '../types/aircraft';
import { CONSTANTS } from './constants';
import { simulationEventBus } from './eventBus';
import { AtmosphereModel } from '../physics/atmosphere';
import { SixDofEngine } from '../physics/sixDof';
import { EngineSystem } from '../systems/engineSystem';
import { FuelSystem } from '../systems/fuelSystem';
import { HydraulicSystem } from '../systems/hydraulicSystem';
import { ElectricalSystem } from '../systems/electricalSystem';
import { FlightControlSystem } from '../systems/flightControlSystem';
import { LandingGearSystem } from '../systems/landingGearSystem';
import { EcsOxygenSystem } from '../systems/ecsOxygenSystem';
import { NavigationSystem } from '../avionics/navigation';
import { RadioSystem } from '../avionics/radio';
import { WarningSystem } from '../avionics/warningSystem';
import { BitSystem } from '../avionics/bitSystem';
import { SIMULATION_SCENARIOS } from '../mission/scenarios';
import { FlightEvaluator } from '../mission/evaluator';
import { flightDataRecorder } from '../recording/telemetryRecorder';

export class SimulationManager {
  private state: SimulationState;
  private profile: AircraftProfile;
  private causalLog: CausalEvent[] = [];

  constructor(profileId: string = 'sf-27', initialScenarioId: string = 'takeoff-roll') {
    this.profile = AIRCRAFT_PROFILES[profileId] || SF27_VANGUARD;
    const scenario = SIMULATION_SCENARIOS.find((s) => s.id === initialScenarioId) || SIMULATION_SCENARIOS[2];
    this.state = this.buildInitialState(this.profile, scenario);
  }

  public getProfile(): AircraftProfile {
    return this.profile;
  }

  public setProfile(profileId: string): void {
    if (AIRCRAFT_PROFILES[profileId]) {
      this.profile = AIRCRAFT_PROFILES[profileId];
      this.resetScenario(this.state.currentScenario?.id || 'takeoff-roll');
    }
  }

  public getState(): SimulationState {
    return this.state;
  }

  public getCausalLog(): CausalEvent[] {
    return this.causalLog;
  }

  public addCausalEvent(subsystem: string, cause: string, command: string, effect: string, indication: string): void {
    const event: CausalEvent = {
      timestamp: this.state.simulationTimeSec,
      subsystem,
      cause,
      command,
      effect,
      indication,
    };
    this.causalLog.unshift(event);
    if (this.causalLog.length > 50) {
      this.causalLog.pop();
    }
  }

  public resetScenario(scenarioId: string): void {
    const scenario = SIMULATION_SCENARIOS.find((s) => s.id === scenarioId) || SIMULATION_SCENARIOS[0];
    this.state = this.buildInitialState(this.profile, scenario);
    this.causalLog = [];
    flightDataRecorder.clear();
    this.addCausalEvent('SIMULATION', `Loaded scenario: ${scenario.title}`, 'RESET', 'Aircraft repositioned', 'Systems initialized');
  }

  public step(dt: number): void {
    if (this.state.paused) return;

    const scaledDt = dt * this.state.timeScale;
    const profile = this.profile;
    const prev = this.state;

    // 1. Atmosphere sample
    const atmo = AtmosphereModel.sample(prev.aircraft.altitude);

    // 2. Electrical System Update
    const nextElec = ElectricalSystem.update(prev.electrical, prev.engine.n2RpmPercent, scaledDt);

    // Circuit Breaker dependencies
    const isHudPowered = ElectricalSystem.isBreakerPowered(nextElec, 'CB_HUD');
    const isPfdPowered = ElectricalSystem.isBreakerPowered(nextElec, 'CB_PFD');
    const isFlcsPowered = ElectricalSystem.isBreakerPowered(nextElec, 'CB_FLCS');
    const isFuelPumpPowered = ElectricalSystem.isBreakerPowered(nextElec, 'CB_FUEL_PUMP');
    const isHydPumpPowered = ElectricalSystem.isBreakerPowered(nextElec, 'CB_HYD_PUMP');
    const isNavPowered = ElectricalSystem.isBreakerPowered(nextElec, 'CB_NAV_1');
    const isEcsPowered = ElectricalSystem.isBreakerPowered(nextElec, 'CB_ECS');
    const isPitotPowered = ElectricalSystem.isBreakerPowered(nextElec, 'CB_PITOT_HEAT');
    const isGearBreakerLive = ElectricalSystem.isBreakerPowered(nextElec, 'CB_GEAR_CONT');

    // 3. Hydraulic System Update
    const nextHyd = HydraulicSystem.update(prev.hydraulic, prev.engine.n2RpmPercent, nextElec.acBusPowered && isHydPumpPowered, scaledDt);

    // 4. Fuel System Update
    const { nextState: nextFuel, cgShiftPercentMac } = FuelSystem.update(
      prev.fuel,
      prev.engine.fuelFlowKgps,
      isFuelPumpPowered,
      prev.aircraft.groundSpeedKnots,
      scaledDt
    );

    // 5. Engine System Update
    const nextEngine = EngineSystem.update(
      prev.engine,
      prev.controls.throttle,
      nextElec.dcEssentialBusPowered,
      nextFuel.fuelPressurePsi,
      profile,
      scaledDt
    );

    // 6. Mass State Update (Fuel mass burned)
    const nextMass: MassState = {
      ...prev.mass,
      internalFuelKg: nextFuel.totalFuelKg,
      totalMassKg: prev.mass.emptyMassKg + nextFuel.totalFuelKg + prev.mass.payloadKg,
      cgPercentMac: 26.0 + cgShiftPercentMac,
    };

    // 7. Landing Gear System Update
    const nextGear = LandingGearSystem.update(
      prev.gear,
      prev.controls.gearCommand,
      nextHyd.systemBPressurePsi,
      isGearBreakerLive,
      prev.controls.throttle,
      prev.aircraft.indicatedAirspeedKnots,
      prev.aircraft.altitudeFt,
      prev.aircraft.wowNose,
      prev.aircraft.wowLeft && prev.aircraft.wowRight,
      scaledDt
    );

    // 8. Flight Control System (FLCS) Update
    const nextFlcs = FlightControlSystem.update(
      prev.flcs,
      prev.controls,
      prev.aircraft.loadFactorG,
      prev.aircraft.alphaDeg,
      prev.aircraft.indicatedAirspeedKnots,
      nextHyd.totalActuatorAuthority,
      isFlcsPowered,
      profile,
      scaledDt
    );

    // 9. Six-DOF Physics Integration
    const leftBrake = prev.controls.leftBrake + (prev.controls.parkingBrake ? 1.0 : 0);
    const rightBrake = prev.controls.rightBrake + (prev.controls.parkingBrake ? 1.0 : 0);

    const { nextState: nextAircraft } = SixDofEngine.integrate(
      prev.aircraft,
      nextMass,
      profile,
      nextEngine.thrustKn,
      nextFlcs.surfaces,
      leftBrake,
      rightBrake,
      prev.controls.yawInput,
      nextGear.noseGearPercent > 0.6,
      scaledDt
    );

    // 10. Environmental Control System & Oxygen
    const nextEcs = EcsOxygenSystem.update(
      prev.ecs,
      nextAircraft.altitudeFt,
      atmo.temperatureDegC,
      nextEngine.mode !== 'OFF',
      isEcsPowered,
      isPitotPowered,
      prev.canopy.canopyLocked,
      scaledDt
    );

    // 11. Navigation & ILS System Update
    const nextNav = NavigationSystem.update(
      prev.navigation,
      nextAircraft.x,
      nextAircraft.y,
      nextAircraft.altitude,
      nextAircraft.headingDeg,
      nextAircraft.groundSpeedKnots,
      nextAircraft.onGround,
      isNavPowered,
      scaledDt
    );

    // 12. Synthetic Sensor Target Simulation
    const nextSensor = { ...prev.sensor };
    if (nextSensor.mode !== 'OFF') {
      nextSensor.syntheticContacts = [
        {
          id: 'CIV-301',
          type: 'CIVIL_TRAFFIC' as const,
          bearingDeg: (nextAircraft.headingDeg + 14) % 360,
          rangeNm: 24.5,
          altitudeFt: 28000,
          speedKnots: 460,
          headingDeg: 270,
          xMeters: nextAircraft.x + 35000,
          yMeters: nextAircraft.y + 18000,
        },
        {
          id: 'TRN-04',
          type: 'SYNTHETIC_TRAINER' as const,
          bearingDeg: (nextAircraft.headingDeg - 22 + 360) % 360,
          rangeNm: 12.8,
          altitudeFt: 14200,
          speedKnots: 390,
          headingDeg: 95,
          xMeters: nextAircraft.x + 19000,
          yMeters: nextAircraft.y - 12000,
        },
      ];
    }

    // 13. BIT Monitoring
    const nextBit = BitSystem.runCbit(prev.bit, prev);

    // 14. Record Telemetry (10 Hz)
    flightDataRecorder.record({
      timestampSec: prev.simulationTimeSec,
      altitudeFt: nextAircraft.altitudeFt,
      indicatedAirspeedKts: nextAircraft.indicatedAirspeedKnots,
      trueAirspeedKts: nextAircraft.trueAirspeedKnots,
      mach: nextAircraft.mach,
      pitchDeg: nextAircraft.pitchDeg,
      rollDeg: nextAircraft.rollDeg,
      headingDeg: nextAircraft.headingDeg,
      verticalSpeedFpm: nextAircraft.verticalSpeedFpm,
      alphaDeg: nextAircraft.alphaDeg,
      betaDeg: nextAircraft.betaDeg,
      loadFactorG: nextAircraft.loadFactorG,
      throttle: prev.controls.throttle,
      engineN2Rpm: nextEngine.n2RpmPercent,
      thrustKn: nextEngine.thrustKn,
      fuelTotalKg: nextFuel.totalFuelKg,
      fuelFlowPph: nextEngine.fuelFlowPph,
      hydAPressurePsi: nextHyd.systemAPressurePsi,
      hydBPressurePsi: nextHyd.systemBPressurePsi,
      gearDown: nextGear.transitState === 'DOWN_LOCKED',
      flapsDeg: nextFlcs.surfaces.flapsDeg,
      speedBrakePct: nextFlcs.surfaces.speedBrakePercent,
      onGround: nextAircraft.onGround,
      xPosM: nextAircraft.x,
      yPosM: nextAircraft.y,
    });

    // Assemble partial updated simulation state
    const intermediateState: SimulationState = {
      ...prev,
      simulationTimeSec: prev.simulationTimeSec + scaledDt,
      realTimeMs: performance.now(),
      aircraft: nextAircraft,
      mass: nextMass,
      engine: nextEngine,
      fuel: nextFuel,
      hydraulic: nextHyd,
      electrical: nextElec,
      flcs: nextFlcs,
      gear: nextGear,
      ecs: nextEcs,
      navigation: nextNav,
      sensor: nextSensor,
      bit: nextBit,
    };

    // 15. Warnings & Annunciations evaluation
    const { warnings, masterCaution, masterWarning } = WarningSystem.evaluate(intermediateState);

    this.state = {
      ...intermediateState,
      warnings,
      masterCautionActive: masterCaution,
      masterWarningActive: masterWarning,
      recentCausalEvents: this.causalLog,
    };
  }

  // --- Direct Control Actions ---

  public setThrottle(val: number): void {
    const clamped = Math.max(0, Math.min(1.0, val));
    this.state.controls.throttle = clamped;
    this.addCausalEvent('CONTROLS', `Throttle moved to ${(clamped * 100).toFixed(0)}%`, 'THROTTLE_SET', 'Commanded engine fuel flow & RPM target', 'ENG N1/N2 spools, thrust increases');
  }

  public setFlightStick(pitch: number, roll: number): void {
    this.state.controls.pitchInput = Math.max(-1.0, Math.min(1.0, pitch));
    this.state.controls.rollInput = Math.max(-1.0, Math.min(1.0, roll));
  }

  public setRudder(yaw: number): void {
    this.state.controls.yawInput = Math.max(-1.0, Math.min(1.0, yaw));
  }

  public toggleGear(): void {
    const nextVal = !this.state.controls.gearCommand;
    this.state.controls.gearCommand = nextVal;
    simulationEventBus.emit(nextVal ? 'GEAR_COMMAND_DOWN' : 'GEAR_COMMAND_UP', 'GEAR', `Landing gear handle selected ${nextVal ? 'DOWN' : 'UP'}`);
    this.addCausalEvent('GEAR', `Landing gear handle selected ${nextVal ? 'DOWN' : 'UP'}`, 'GEAR_HANDLE', 'Hydraulic transit solenoid activated', 'Transit red warning light on handle');
  }

  public setFlaps(cmd: 'AUTO' | 'HALF' | 'FULL'): void {
    this.state.controls.flapsCommand = cmd;
    this.addCausalEvent('FLCS', `Flaps commanded to ${cmd}`, 'FLAP_SWITCH', 'Flap actuators commanded to deflection angle', 'Flap position indicator on PFD/MFD');
  }

  public toggleSpeedBrake(): void {
    this.state.controls.speedBrakeCommand = !this.state.controls.speedBrakeCommand;
    this.addCausalEvent('FLCS', `Speed brake ${this.state.controls.speedBrakeCommand ? 'EXTENDED' : 'RETRACTED'}`, 'SPEEDBRAKE_SWITCH', 'Hydraulic actuators open upper/lower fuselage brakes', 'SPEED BRAKE advisory on HUD');
  }

  public toggleParkingBrake(): void {
    this.state.controls.parkingBrake = !this.state.controls.parkingBrake;
    this.addCausalEvent('BRAKES', `Parking brake ${this.state.controls.parkingBrake ? 'ENGAGED' : 'RELEASED'}`, 'PARK_BRAKE', 'Hydraulic brake pressure held at 3000 PSI', 'PARK BRAKE annunciator illuminates');
  }

  public setToeBrakes(left: number, right: number): void {
    this.state.controls.leftBrake = left;
    this.state.controls.rightBrake = right;
  }

  public adjustPitchTrim(delta: number): void {
    this.state.controls.pitchTrim = Math.max(-1.0, Math.min(1.0, this.state.controls.pitchTrim + delta));
  }

  public toggleBattery(): void {
    this.state.electrical.batterySwitch = !this.state.electrical.batterySwitch;
    this.addCausalEvent('ELECTRICAL', `Battery switch toggled ${this.state.electrical.batterySwitch ? 'ON' : 'OFF'}`, 'BATT_SW', '24V DC Essential bus energized if on', 'DC Bus voltage readout 24.8V');
  }

  public toggleGenerator(): void {
    this.state.electrical.mainGeneratorSwitch = !this.state.electrical.mainGeneratorSwitch;
    this.addCausalEvent('ELECTRICAL', `Main generator switch toggled ${this.state.electrical.mainGeneratorSwitch ? 'ON' : 'OFF'}`, 'GEN_SW', '115V AC alternator excitation contactor', 'GEN caution clears when online');
  }

  public toggleExternalPower(): void {
    this.state.electrical.externalPowerSwitch = !this.state.electrical.externalPowerSwitch;
    this.addCausalEvent('ELECTRICAL', `External ground power ${this.state.electrical.externalPowerSwitch ? 'CONNECTED' : 'DISCONNECTED'}`, 'EXT_PWR', 'Ground power cart 115V AC bus supply', 'EXT PWR ON light illuminates');
  }

  public toggleBusTie(): void {
    this.state.electrical.busTieClosed = !this.state.electrical.busTieClosed;
    this.addCausalEvent('ELECTRICAL', `Bus Tie contactor ${this.state.electrical.busTieClosed ? 'CLOSED' : 'OPEN'}`, 'BUS_TIE', 'Essential DC connected to Avionics Bus', 'Avionics bus status change');
  }

  public toggleCircuitBreaker(breakerId: string): void {
    this.state.electrical = ElectricalSystem.toggleBreaker(this.state.electrical, breakerId);
    const cb = this.state.electrical.circuitBreakers[breakerId];
    if (cb) {
      this.addCausalEvent('ELECTRICAL', `Circuit breaker ${cb.name} (${breakerId}) ${cb.tripped ? 'POPPED/OPEN' : 'PUSHED/CLOSED'}`, 'CB_TOGGLE', `${cb.subsystem} power circuit interrupted`, 'Dependent display/subsystem cuts out');
    }
  }

  public toggleEngineMaster(): void {
    this.state.engine.masterSwitch = !this.state.engine.masterSwitch;
    this.addCausalEvent('ENGINE', `Engine Master Switch ${this.state.engine.masterSwitch ? 'ARMED' : 'CUTOFF'}`, 'ENG_MASTER', 'High-pressure fuel shutoff valve & ignition power', 'Fuel shutoff valve opens');
  }

  public setEngineStartSwitch(val: 'OFF' | 'CRANK' | 'START'): void {
    this.state.engine.engineStartSwitch = val;
    this.addCausalEvent('ENGINE', `Engine Start Switch selected ${val}`, 'ENG_START_SW', 'Air turbine starter spool solenoid active', 'N2 spool rises, starter hum audible');
  }

  public toggleAuxHydPump(): void {
    this.state.hydraulic.electricAuxPumpOn = !this.state.hydraulic.electricAuxPumpOn;
    this.addCausalEvent('HYDRAULIC', `Electric Aux Hydraulic Pump ${this.state.hydraulic.electricAuxPumpOn ? 'ON' : 'OFF'}`, 'AUX_HYD_SW', 'Electric motor drives System A backup pump', 'System A pressure rises to 2900 PSI');
  }

  public toggleCrossfeed(): void {
    this.state.fuel.crossFeedOpen = !this.state.fuel.crossFeedOpen;
    this.addCausalEvent('FUEL', `Fuel Crossfeed Valve ${this.state.fuel.crossFeedOpen ? 'OPEN' : 'CLOSED'}`, 'XFEED_SW', 'Manifold connects Left and Right Wing fuel systems', 'X-FEED OPEN advisory');
  }

  public toggleFuelDump(): void {
    this.state.fuel.dumpValveOpen = !this.state.fuel.dumpValveOpen;
    this.addCausalEvent('FUEL', `Fuel Dump Valve ${this.state.fuel.dumpValveOpen ? 'OPEN' : 'CLOSED'}`, 'DUMP_SW', 'High-speed fuel jettison mast active', 'FUEL DUMP warning on caution panel');
  }

  public toggleCanopy(): void {
    const isLocked = this.state.canopy.canopyLocked;
    this.state.canopy.canopyLocked = !isLocked;
    this.state.canopy.positionPercent = isLocked ? 1.0 : 0.0;
    this.state.canopy.canopyUnsafeWarning = isLocked;
    this.addCausalEvent('CANOPY', `Canopy ${isLocked ? 'OPENED' : 'CLOSED AND LOCKED'}`, 'CANOPY_SW', 'Pneumatic canopy seal locks pressure shell', 'CANOPY caution clears when locked');
  }

  public togglePitotHeat(): void {
    this.state.ecs.pitotHeatSwitch = !this.state.ecs.pitotHeatSwitch;
    this.addCausalEvent('ECS', `Pitot Static Heat ${this.state.ecs.pitotHeatSwitch ? 'ON' : 'OFF'}`, 'PITOT_HEAT', '115V AC heating elements in pitot-static mast', 'Anti-ice protection active');
  }

  public acknowledgeMasterCaution(): void {
    this.state.masterCautionActive = false;
    this.state.masterWarningActive = false;
    this.state.warnings.forEach((w) => (w.acknowledged = true));
  }

  public setTimeScale(scale: number): void {
    this.state.timeScale = Math.max(0.1, Math.min(8.0, scale));
  }

  public togglePause(): void {
    this.state.paused = !this.state.paused;
  }

  // --- Instructor Controls ---
  public repositionAircraft(altFt: number, speedKts: number, headingDeg: number): void {
    const altM = altFt * CONSTANTS.FEET_TO_METERS;
    const speedMps = speedKts * CONSTANTS.KNOTS_TO_MPS;
    const headingRad = headingDeg * CONSTANTS.DEG_TO_RAD;

    this.state.aircraft.x = 0;
    this.state.aircraft.y = 0;
    this.state.aircraft.z = -altM;
    this.state.aircraft.altitude = altM;
    this.state.aircraft.altitudeFt = altFt;
    this.state.aircraft.u = speedMps;
    this.state.aircraft.v = 0;
    this.state.aircraft.w = 0;
    this.state.aircraft.yaw = headingRad;
    this.state.aircraft.headingDeg = headingDeg;
    this.state.aircraft.pitch = 0;
    this.state.aircraft.roll = 0;
    this.state.aircraft.onGround = altFt <= 45;
    this.addCausalEvent('INSTRUCTOR', `Aircraft repositioned to ${altFt} ft, ${speedKts} KIAS, Heading ${headingDeg}°`, 'REPOSITION', 'Inertial and atmospheric vectors updated', 'Instruments adapt to new coordinates');
  }

  public injectFailure(failureId: string): void {
    this.state.failures.activeFailures.add(failureId);

    switch (failureId) {
      case 'FAIL_ENG_FLAMEOUT':
        this.state.engine.mode = 'FLAMEOUT';
        this.addCausalEvent('INSTRUCTOR_FAIL', 'Injected Engine Flameout', 'INJECT', 'High pressure fuel cut to combustion chamber', 'Engine spools down, Gen offline');
        break;
      case 'FAIL_HYD_A':
        this.state.hydraulic.systemAPressurePsi = 0;
        this.state.hydraulic.pumpAEngDriven = false;
        this.addCausalEvent('INSTRUCTOR_FAIL', 'Injected Hydraulic Sys A Failure', 'INJECT', 'Hydraulic line rupture and pressure loss', 'HYD A LOW caution, degraded authority');
        break;
      case 'FAIL_GEN':
        this.state.electrical.mainGeneratorSwitch = false;
        this.state.electrical.mainGenActive = false;
        this.addCausalEvent('INSTRUCTOR_FAIL', 'Injected Main Generator Failure', 'INJECT', 'Field winding disconnect', 'GEN FAIL caution, battery discharge');
        break;
      case 'FAIL_PITOT_ICE':
        this.state.ecs.pitotIced = true;
        this.state.ecs.pitotHeatSwitch = false;
        this.addCausalEvent('INSTRUCTOR_FAIL', 'Injected Pitot Static Freeze', 'INJECT', 'Dynamic pressure port blocked with ice', 'Airspeed indicator unreliable');
        break;
    }
  }

  public clearFailure(failureId: string): void {
    this.state.failures.activeFailures.delete(failureId);
    this.addCausalEvent('INSTRUCTOR', `Cleared failure: ${failureId}`, 'CLEAR_FAIL', 'Systems restored to operational state', 'Cautions clear upon recovery');
  }

  private buildInitialState(profile: AircraftProfile, scenario: ScenarioDefinition): SimulationState {
    const isCold = scenario.id === 'cold-dark';
    const init = scenario.initialState;
    const altM = init.altitudeFt * CONSTANTS.FEET_TO_METERS;
    const speedMps = init.speedKnots * CONSTANTS.KNOTS_TO_MPS;
    const headingRad = init.headingDeg * CONSTANTS.DEG_TO_RAD;

    const fuelState = FuelSystem.init(profile);
    const elecState = ElectricalSystem.init();

    if (!isCold) {
      elecState.batterySwitch = true;
      elecState.mainGeneratorSwitch = true;
      elecState.mainGenActive = init.engineRunning;
      elecState.acBusPowered = init.engineRunning;
      elecState.dcEssentialBusPowered = true;
      elecState.avionicsBusPowered = true;
    }

    const hydState = HydraulicSystem.init();
    if (init.engineRunning) {
      hydState.systemAPressurePsi = 3050;
      hydState.systemBPressurePsi = 3050;
      hydState.totalActuatorAuthority = 1.0;
      hydState.lowPressureCautionA = false;
      hydState.lowPressureCautionB = false;
    }

    const engState: SimulationState['engine'] = {
      mode: init.engineRunning ? 'IDLE' : 'OFF',
      masterSwitch: !isCold,
      engineStartSwitch: 'OFF',
      afterburnerActive: false,
      afterburnerStage: 0,
      n1RpmPercent: init.engineRunning ? 28.0 : 0,
      n2RpmPercent: init.engineRunning ? 63.5 : 0,
      egtDegC: init.engineRunning ? 450 : 20,
      fuelFlowPph: init.engineRunning ? 950 : 0,
      fuelFlowKgps: init.engineRunning ? (950 * 0.453592) / 3600 : 0,
      thrustKn: init.engineRunning ? 4.2 : 0,
      maxMilThrustKn: profile.engine.dryThrustKn,
      maxAbThrustKn: profile.engine.afterburnerThrustKn,
      oilPressurePsi: init.engineRunning ? 55 : 0,
      oilTempDegC: init.engineRunning ? 65 : 20,
      nozzlePositionPercent: init.engineRunning ? 75 : 80,
      vibrationMmPerSec: 0.1,
      starterTimerSeconds: 0,
      health: 1.0,
      fireWarning: false,
      temperatureCaution: false,
    };

    const massState: MassState = {
      emptyMassKg: profile.emptyMassKg,
      internalFuelKg: fuelState.totalFuelKg,
      payloadKg: 1200,
      totalMassKg: profile.emptyMassKg + fuelState.totalFuelKg + 1200,
      cgPercentMac: 26.0,
      ixx: 12800,
      iyy: 85000,
      izz: 92000,
      ixz: 2100,
    };

    const aircraftState: AircraftState = {
      x: init.onGround ? 0 : 5000,
      y: 0,
      z: -altM,
      altitude: altM,
      altitudeFt: init.altitudeFt,
      latitude: 47.4502,
      longitude: -122.3088,
      u: speedMps,
      v: 0,
      w: 0,
      ax: 0,
      ay: 0,
      az: 0,
      vx: speedMps * Math.cos(headingRad),
      vy: speedMps * Math.sin(headingRad),
      vz: 0,
      verticalSpeedFpm: 0,
      groundSpeedKnots: init.speedKnots,
      trueAirspeedKnots: init.speedKnots,
      indicatedAirspeedKnots: init.speedKnots,
      calibratedAirspeedKnots: init.speedKnots,
      mach: init.speedKnots / 661.0,
      roll: 0,
      pitch: init.onGround ? 0.02 : 0.04, // slight pitch on gear
      yaw: headingRad,
      rollDeg: 0,
      pitchDeg: init.onGround ? 1.2 : 2.3,
      headingDeg: init.headingDeg,
      magneticHeadingDeg: (init.headingDeg - 4.5 + 360) % 360,
      p: 0,
      q: 0,
      r: 0,
      pDeg: 0,
      qDeg: 0,
      rDeg: 0,
      alphaDeg: init.onGround ? 1.2 : 2.5,
      betaDeg: 0,
      flightPathAngleDeg: 0,
      loadFactorG: 1.0,
      peakPositiveG: 1.0,
      peakNegativeG: 1.0,
      dynamicPressurePa: 0.5 * 1.225 * speedMps * speedMps,
      kineticEnergyJoules: 0.5 * massState.totalMassKg * speedMps * speedMps,
      potentialEnergyJoules: massState.totalMassKg * 9.81 * altM,
      specificEnergyMeters: altM + (speedMps * speedMps) / (2 * 9.81),
      specificExcessPowerMps: 0,
      onGround: init.onGround,
      wowNose: init.onGround,
      wowLeft: init.onGround,
      wowRight: init.onGround,
      gearCompression: init.onGround ? 0.6 : 0,
      runwayDistMeters: 0,
    };

    const flcs = FlightControlSystem.init();
    if (init.flaps === 'HALF') flcs.surfaces.flapsDeg = 18;
    else if (init.flaps === 'FULL') flcs.surfaces.flapsDeg = 35;

    return {
      simulationTimeSec: 0,
      realTimeMs: performance.now(),
      paused: false,
      timeScale: 1.0,
      physicsTimeStepSec: 0.02,
      frameRateFps: 60,
      physicsHz: 50,
      aircraft: aircraftState,
      mass: massState,
      controls: {
        pitchInput: 0,
        rollInput: 0,
        yawInput: 0,
        throttle: isCold ? 0 : init.engineRunning && !init.onGround ? 0.65 : 0.0,
        leftBrake: 0,
        rightBrake: 0,
        pitchTrim: 0,
        rollTrim: 0,
        yawTrim: 0,
        speedBrakeCommand: false,
        flapsCommand: init.flaps,
        gearCommand: init.gearDown,
        hookCommand: false,
        parkingBrake: init.onGround && isCold,
        antiSkid: true,
      },
      engine: engState,
      fuel: fuelState,
      hydraulic: hydState,
      electrical: elecState,
      flcs,
      gear: {
        handleDown: init.gearDown,
        transitState: init.gearDown ? 'DOWN_LOCKED' : 'UP_LOCKED',
        noseGearPercent: init.gearDown ? 1.0 : 0.0,
        leftMainGearPercent: init.gearDown ? 1.0 : 0.0,
        rightMainGearPercent: init.gearDown ? 1.0 : 0.0,
        gearDoorsOpen: false,
        emergencyGearExtended: false,
        gearWarningHorn: false,
        wheelSpeedKnots: { nose: 0, left: 0, right: 0 },
        brakePressurePsi: { left: 0, right: 0 },
        antiSkidActive: true,
        tiresBlown: { nose: false, left: false, right: false },
      },
      ecs: EcsOxygenSystem.init(),
      canopy: {
        positionPercent: isCold ? 1.0 : 0.0,
        switchState: isCold ? 'OPEN' : 'CLOSE',
        canopyLocked: !isCold,
        canopySealPressurePsi: isCold ? 0 : 22.0,
        canopyUnsafeWarning: isCold,
      },
      lighting: {
        masterExterior: !isCold,
        antiCollisionStrobe: !isCold,
        navLights: !isCold,
        formationLightsPercent: 60,
        taxiLandingLight: init.onGround ? 'TAXI' : 'OFF',
        cockpitFloodPercent: 40,
        panelBacklightPercent: 80,
        instrumentsBrightnessPercent: 90,
        hudBrightnessPercent: 85,
        mfdBrightnessPercent: 90,
      },
      navigation: NavigationSystem.init(),
      radio: RadioSystem.init(),
      sensor: {
        sensorPower: !isCold,
        mode: isCold ? 'OFF' : 'SEARCH_AZ',
        rangeScaleNm: 40,
        azimuthScanDeg: 0,
        elevationScanDeg: 0,
        syntheticContacts: [],
      },
      weather: {
        temperatureSeaLevelDegC: 15.0,
        temperatureDeviationDegC: 0,
        seaLevelPressureHpa: 1013.25,
        windSpeedKnots: 10.0,
        windDirectionDeg: 90.0,
        gustKnots: 0,
        turbulenceIntensity: 0.1,
        visibilityMeters: 10000,
        cloudBaseFt: 4500,
        cloudTopsFt: 18000,
        precipitation: 'NONE',
        ambientDensityKgM3: 1.225,
        ambientPressurePa: 101325,
        ambientTempDegC: 15.0,
        speedOfSoundMps: 340.3,
      },
      bit: BitSystem.init(),
      failures: {
        activeFailures: new Set(),
        scheduledFailures: [],
      },
      warnings: [],
      masterCautionActive: false,
      masterWarningActive: false,
      recentCausalEvents: [],
      currentScenario: scenario,
      evaluation: FlightEvaluator.initEvaluation(scenario.id),
    };
  }
}
