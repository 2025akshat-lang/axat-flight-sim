/**
 * Turbofan Engine State Machine and Dynamic Propulsion Engine
 * Implements spool inertia, multi-stage afterburner, fuel flow, and thermal dynamics.
 */

import { EngineSystemState, EngineMode } from '../types/simulation';
import { AircraftProfile } from '../types/aircraft';
import { simulationEventBus } from '../core/eventBus';

export class EngineSystem {
  public static update(
    current: EngineSystemState,
    throttleCommand: number, // 0.0 to 1.0 (0.0 to 0.75 = Idle to Mil, 0.75 to 1.0 = Afterburner)
    electricalPowerAvailable: boolean,
    fuelPressurePsi: number,
    profile: AircraftProfile,
    dt: number
  ): EngineSystemState {
    const next = { ...current };
    const engineConfig = profile.engine;

    // Handle starter and state machine transitions
    switch (next.mode) {
      case 'OFF':
        next.n1RpmPercent = Math.max(0, next.n1RpmPercent - 10.0 * dt);
        next.n2RpmPercent = Math.max(0, next.n2RpmPercent - 12.0 * dt);
        next.thrustKn = 0;
        next.fuelFlowPph = 0;
        next.fuelFlowKgps = 0;
        next.egtDegC = Math.max(20, next.egtDegC - 15.0 * dt);
        next.oilPressurePsi = Math.max(0, next.oilPressurePsi - 20.0 * dt);
        next.afterburnerActive = false;
        next.afterburnerStage = 0;

        // Check for crank/start initiation
        if (next.masterSwitch && electricalPowerAvailable && next.engineStartSwitch !== 'OFF') {
          next.mode = next.engineStartSwitch === 'CRANK' ? 'CRANKING' : 'STARTING';
          next.starterTimerSeconds = 0;
          simulationEventBus.emit('ENGINE_CRANK', 'ENGINE', 'Engine starter engaged');
        }
        break;

      case 'CRANKING':
        // Starter motors high pressure spool up to ~22% N2
        next.starterTimerSeconds += dt;
        next.n2RpmPercent = Math.min(24.0, next.n2RpmPercent + 4.0 * dt);
        next.n1RpmPercent = Math.min(10.0, next.n1RpmPercent + 1.8 * dt);
        next.oilPressurePsi = Math.min(25, next.oilPressurePsi + 5.0 * dt);
        next.fuelFlowPph = 0;

        if (next.engineStartSwitch === 'OFF') {
          next.mode = 'OFF';
        } else if (next.engineStartSwitch === 'START' && next.n2RpmPercent >= 18.0 && fuelPressurePsi > 15.0) {
          next.mode = 'IGNITION';
          simulationEventBus.emit('ENGINE_IGNITION', 'ENGINE', 'Igniters active, light-off in progress');
        }
        break;

      case 'STARTING':
      case 'IGNITION':
        next.starterTimerSeconds += dt;
        // Spool accelerates, fuel flow injected, light-off temperature spike
        next.n2RpmPercent = Math.min(50.0, next.n2RpmPercent + 5.5 * dt);
        next.n1RpmPercent = Math.min(22.0, next.n1RpmPercent + 2.5 * dt);
        next.fuelFlowPph = Math.min(450, next.fuelFlowPph + 60.0 * dt);
        next.egtDegC = Math.min(680, next.egtDegC + 75.0 * dt); // start temperature spike
        next.oilPressurePsi = Math.min(45, next.oilPressurePsi + 8.0 * dt);

        if (next.starterTimerSeconds > engineConfig.starterDurationSec && next.n2RpmPercent >= 45.0) {
          next.mode = 'ACCELERATING';
        }
        break;

      case 'ACCELERATING':
        // Self-sustaining acceleration to Idle
        next.n2RpmPercent = Math.min(engineConfig.normalIdleN2, next.n2RpmPercent + 7.0 * dt);
        next.n1RpmPercent = Math.min(28.0, next.n1RpmPercent + 3.5 * dt);
        next.egtDegC = Math.max(450, next.egtDegC - 35.0 * dt); // settles from start spike
        next.oilPressurePsi = Math.min(55, next.oilPressurePsi + 5.0 * dt);

        if (next.n2RpmPercent >= engineConfig.normalIdleN2 - 1.0) {
          next.mode = 'IDLE';
          next.engineStartSwitch = 'OFF'; // starter cut-out switch disengages
          simulationEventBus.emit('ENGINE_IDLE_REACHED', 'ENGINE', 'Engine stabilized at Ground Idle');
        }
        break;

      case 'IDLE':
      case 'MILITARY':
      case 'AFTERBURNER':
        // Operational power range
        // Master switch cutoff check
        if (!next.masterSwitch || fuelPressurePsi < 5.0) {
          next.mode = 'FLAMEOUT';
          simulationEventBus.emit('ENGINE_FLAMEOUT', 'ENGINE', 'Engine flameout: fuel starvation or master cutoff');
          break;
        }

        // Throttle Mapping:
        // 0.0 .. 0.75: Ground Idle -> Military Power
        // 0.75 .. 1.0: Afterburner reheat stages 1 through 5
        let targetN2 = engineConfig.normalIdleN2;
        let isAB = false;
        let abStage = 0;

        if (throttleCommand <= 0.75) {
          // Dry thrust range
          const throttleMilRatio = throttleCommand / 0.75;
          targetN2 = engineConfig.normalIdleN2 + throttleMilRatio * (engineConfig.normalMilN2 - engineConfig.normalIdleN2);
          next.mode = throttleCommand < 0.05 ? 'IDLE' : 'MILITARY';
        } else {
          // Afterburner reheat range
          targetN2 = engineConfig.normalMilN2;
          isAB = true;
          next.mode = 'AFTERBURNER';
          const abRatio = (throttleCommand - 0.75) / 0.25;
          abStage = Math.min(5, Math.max(1, Math.ceil(abRatio * 5)));
        }

        // Spool response inertia (1st order lag model)
        const spoolRate = engineConfig.spoolRatePerSecond * 100.0;
        const n2Error = targetN2 - next.n2RpmPercent;
        const n2Delta = Math.sign(n2Error) * Math.min(Math.abs(n2Error), spoolRate * dt);
        next.n2RpmPercent += n2Delta;

        // N1 tracks N2 with slight aerodynamic lag
        const targetN1 = (next.n2RpmPercent / engineConfig.normalMilN2) * 100.0;
        next.n1RpmPercent += (targetN1 - next.n1RpmPercent) * Math.min(1.0, 3.5 * dt);

        // Calculate dry thrust based on N2
        const n2Fraction = Math.max(0, (next.n2RpmPercent - engineConfig.normalIdleN2) / (engineConfig.normalMilN2 - engineConfig.normalIdleN2));
        // Thrust is roughly proportional to N2 squared
        const dryThrust = profile.engine.dryThrustKn * Math.pow(Math.max(0.04, n2Fraction), 1.8);

        // Afterburner thrust
        let abThrust = 0;
        if (isAB && next.n2RpmPercent > 94.0) {
          const abFraction = (throttleCommand - 0.75) / 0.25;
          const maxAbDelta = profile.engine.afterburnerThrustKn - profile.engine.dryThrustKn;
          abThrust = maxAbDelta * Math.max(0.1, abFraction);
        }

        next.thrustKn = dryThrust + abThrust;
        next.afterburnerActive = isAB && next.n2RpmPercent > 94.0;
        next.afterburnerStage = next.afterburnerActive ? abStage : 0;

        // Fuel flow calculation (pph)
        const dryFuelFlow = engineConfig.idleFuelFlowPph + n2Fraction * (engineConfig.milFuelFlowPph - engineConfig.idleFuelFlowPph);
        const abFuelFlow = next.afterburnerActive ? (abStage / 5.0) * engineConfig.abFuelFlowPph : 0;
        next.fuelFlowPph = dryFuelFlow + abFuelFlow;
        next.fuelFlowKgps = (next.fuelFlowPph * 0.453592) / 3600.0;

        // Exhaust Gas Temperature (EGT)
        const baseEgt = 450 + n2Fraction * 370; // 450°C to 820°C
        const abEgtDelta = next.afterburnerActive ? abStage * 28 : 0;
        next.egtDegC += (baseEgt + abEgtDelta - next.egtDegC) * Math.min(1.0, 2.5 * dt);

        // Oil pressure & temp
        next.oilPressurePsi = 55 + (next.n2RpmPercent / 100.0) * 20;
        next.oilTempDegC = 65 + (next.n2RpmPercent / 100.0) * 30;

        // Nozzle position: opens wide during afterburner to prevent turbine backpressure
        const targetNozzle = next.afterburnerActive ? 40 + abStage * 12 : Math.max(15, 80 - n2Fraction * 60);
        next.nozzlePositionPercent += (targetNozzle - next.nozzlePositionPercent) * Math.min(1.0, 4.0 * dt);
        break;

      case 'FLAMEOUT':
      case 'FAILED':
        // Rapid spool down
        next.n1RpmPercent = Math.max(0, next.n1RpmPercent - 15.0 * dt);
        next.n2RpmPercent = Math.max(0, next.n2RpmPercent - 18.0 * dt);
        next.thrustKn = Math.max(0, next.thrustKn - 40.0 * dt);
        next.fuelFlowPph = 0;
        next.fuelFlowKgps = 0;
        next.egtDegC = Math.max(30, next.egtDegC - 45.0 * dt);
        next.oilPressurePsi = Math.max(0, next.oilPressurePsi - 25.0 * dt);
        next.afterburnerActive = false;
        next.afterburnerStage = 0;

        if (next.masterSwitch && next.engineStartSwitch === 'START' && fuelPressurePsi > 20.0) {
          next.mode = 'IGNITION';
          next.starterTimerSeconds = 0;
          simulationEventBus.emit('ENGINE_IGNITION', 'ENGINE', 'In-flight restart attempted');
        }
        break;
    }

    // Warnings
    next.fireWarning = next.egtDegC > 1050;
    next.temperatureCaution = next.egtDegC > 920;

    return next;
  }
}
