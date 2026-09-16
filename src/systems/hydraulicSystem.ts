/**
 * Dual Redundant Hydraulic Subsystem (System A & System B, 3000 PSI)
 */

import { HydraulicSystemState } from '../types/simulation';

export class HydraulicSystem {
  public static init(): HydraulicSystemState {
    return {
      systemAPressurePsi: 0,
      systemBPressurePsi: 0,
      pumpAEngDriven: true,
      pumpBEngDriven: true,
      electricAuxPumpOn: false,
      ptuActive: false,
      reservoirAQuantityPercent: 96,
      reservoirBQuantityPercent: 98,
      hydraulicTempDegC: 22,
      lowPressureCautionA: true,
      lowPressureCautionB: true,
      totalActuatorAuthority: 0,
    };
  }

  public static update(
    current: HydraulicSystemState,
    engineN2Percent: number,
    acBusPowered: boolean,
    dt: number
  ): HydraulicSystemState {
    const next = { ...current };

    // Nominal pump capacity when engine running
    const engPumpAvailable = engineN2Percent > 25.0;

    // System A Pressure Dynamics
    let targetPressA = 0;
    if (next.pumpAEngDriven && engPumpAvailable) {
      targetPressA = 3050;
    } else if (next.electricAuxPumpOn && acBusPowered) {
      targetPressA = 2900; // Aux electric pump maintains 2900 PSI
    }

    // System B Pressure Dynamics
    let targetPressB = 0;
    if (next.pumpBEngDriven && engPumpAvailable) {
      targetPressB = 3050;
    }

    // PTU (Power Transfer Unit) logic:
    // If one system drops below 2200 PSI while the other is > 2800 PSI, PTU transfers mechanical pressure
    if (next.ptuActive) {
      if (next.systemAPressurePsi > 2600 && targetPressB < 1500) {
        targetPressB = Math.max(targetPressB, 2500);
      } else if (next.systemBPressurePsi > 2600 && targetPressA < 1500) {
        targetPressA = Math.max(targetPressA, 2500);
      }
    }

    // Exponential lag towards target pressure
    const pressRate = 850.0 * dt; // PSI per step
    const errA = targetPressA - next.systemAPressurePsi;
    next.systemAPressurePsi += Math.sign(errA) * Math.min(Math.abs(errA), pressRate);

    const errB = targetPressB - next.systemBPressurePsi;
    next.systemBPressurePsi += Math.sign(errB) * Math.min(Math.abs(errB), pressRate);

    // Cautions
    next.lowPressureCautionA = next.systemAPressurePsi < 1800;
    next.lowPressureCautionB = next.systemBPressurePsi < 1800;

    // Calculate total actuator authority (0.0 to 1.0)
    // Both systems power dual tandem flight control actuators
    const bestPressure = Math.max(next.systemAPressurePsi, next.systemBPressurePsi);
    if (bestPressure > 2400) {
      next.totalActuatorAuthority = 1.0;
    } else if (bestPressure > 1200) {
      next.totalActuatorAuthority = 0.5 + 0.5 * ((bestPressure - 1200) / 1200);
    } else if (bestPressure > 300) {
      next.totalActuatorAuthority = 0.2 * (bestPressure / 1200);
    } else {
      next.totalActuatorAuthority = 0.05; // floating control surfaces, minimal aero deflection
    }

    return next;
  }
}
