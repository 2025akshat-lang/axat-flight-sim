/**
 * Environmental Control System (ECS) & Oxygen (OBOGS) Model
 */

import { EcsOxygenState } from '../types/simulation';

export class EcsOxygenSystem {
  public static init(): EcsOxygenState {
    return {
      bleedAirSwitch: 'NORM',
      cockpitTempDegC: 21.0,
      cabinPressurePsi: 14.7,
      cabinDiffPressurePsi: 0.0,
      cabinAltitudeFt: 0,
      cockpitAirflowCfm: 120,
      canopyDefog: false,
      pitotHeatSwitch: true,
      pitotIced: false,
      obogsOxygenSwitch: true,
      oxygenPressurePsi: 65.0,
      oxygenPurityPercent: 94.0,
      oxygenFlowLpm: 12.0,
      cabinAltitudeWarning: false,
      hypoxiaRiskWarning: false,
    };
  }

  public static update(
    current: EcsOxygenState,
    ambientAltFt: number,
    ambientTempC: number,
    engineRunning: boolean,
    ecsBreakerLive: boolean,
    pitotBreakerLive: boolean,
    canopyClosed: boolean,
    dt: number
  ): EcsOxygenState {
    const next = { ...current };

    const ecsActive = engineRunning && next.bleedAirSwitch !== 'OFF' && ecsBreakerLive && canopyClosed;

    // Cabin Pressurization Schedule
    // Fighter schedule:
    // 0 to 8,000 ft: unpressurized (cabin alt = ambient alt)
    // 8,000 to 23,000 ft: isobaric 8,000 ft cabin alt
    // > 23,000 ft: maintains 5.0 PSI differential pressure
    if (ecsActive) {
      if (ambientAltFt <= 8000) {
        next.cabinAltitudeFt = ambientAltFt;
      } else if (ambientAltFt <= 23000) {
        next.cabinAltitudeFt = 8000;
      } else {
        // Delta P = 5.0 PSI
        next.cabinAltitudeFt = 8000 + (ambientAltFt - 23000) * 0.45;
      }
      next.cockpitAirflowCfm = next.bleedAirSwitch === 'HIGH' ? 220 : 135;
    } else {
      // Unpressurized or canopy open: cabin altitude matches ambient altitude
      next.cabinAltitudeFt = ambientAltFt;
      next.cockpitAirflowCfm = canopyClosed ? 15 : 280;
    }

    // Cabin differential pressure calculation (in PSI, fighter schedule tops out ~5.0 - 5.4 PSI)
    next.cabinDiffPressurePsi = Math.max(0, Math.min(5.4, (ambientAltFt - next.cabinAltitudeFt) * 0.00035));

    // Cockpit temperature regulation
    const targetTemp = ecsActive ? 21.0 : ambientTempC + 4.0;
    next.cockpitTempDegC += (targetTemp - next.cockpitTempDegC) * Math.min(1.0, 0.08 * dt);

    // Pitot Heat & Icing
    const pitotHeated = next.pitotHeatSwitch && pitotBreakerLive;
    if (!pitotHeated && ambientTempC < 0 && ambientAltFt > 3000) {
      next.pitotIced = true;
    } else if (pitotHeated) {
      next.pitotIced = false;
    }

    // OBOGS Oxygen system
    if (next.obogsOxygenSwitch && engineRunning && ecsBreakerLive) {
      next.oxygenPressurePsi = 65.0;
      next.oxygenFlowLpm = 14.0;
      next.oxygenPurityPercent = 95.0;
    } else {
      next.oxygenPressurePsi = Math.max(0, next.oxygenPressurePsi - 2.5 * dt);
      next.oxygenFlowLpm = next.oxygenPressurePsi > 5 ? 8.0 : 0;
      next.oxygenPurityPercent = next.oxygenPressurePsi > 20 ? 91.0 : 21.0;
    }

    // Warnings
    next.cabinAltitudeWarning = next.cabinAltitudeFt > 10000;
    next.hypoxiaRiskWarning = next.cabinAltitudeFt > 14000 && next.oxygenPressurePsi < 20;

    return next;
  }
}
