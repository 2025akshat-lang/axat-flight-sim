/**
 * Central Warning & Caution Management System
 * Prioritized annunciations, master caution/warning latches, and alert dispatch.
 */

import { AnnunciationMessage, SimulationState, WarningSeverity } from '../types/simulation';
import { cockpitAudio } from '../core/audioSynthesizer';
import { simulationEventBus } from '../core/eventBus';

export class WarningSystem {
  public static evaluate(sim: SimulationState): {
    warnings: AnnunciationMessage[];
    masterCaution: boolean;
    masterWarning: boolean;
  } {
    const list: AnnunciationMessage[] = [];
    const now = performance.now();

    const addAlert = (
      id: string,
      text: string,
      severity: WarningSeverity,
      subsystem: string,
      audioTone: AnnunciationMessage['audioTone'] = 'NONE'
    ) => {
      list.push({
        id,
        text,
        severity,
        subsystem,
        timestamp: now,
        acknowledged: false,
        audioTone,
      });
    };

    // 1. Critical / Master Warnings (Red)
    if (sim.engine.fireWarning) {
      addAlert('ENG_FIRE', 'ENGINE FIRE / OVERHEAT', 'CRITICAL', 'ENGINE', 'WARNING_KLAXON');
    }
    if (sim.engine.mode === 'FLAMEOUT' && sim.aircraft.altitudeFt > 500) {
      addAlert('ENG_FLAMEOUT', 'ENGINE FLAMEOUT', 'CRITICAL', 'ENGINE', 'WARNING_KLAXON');
    }
    if (sim.flcs.stallWarningActive && !sim.aircraft.onGround) {
      addAlert('STALL_WARN', 'STALL - ANGLE OF ATTACK EXCESSIVE', 'CRITICAL', 'FLCS', 'STALL_HORN');
    }
    if (sim.gear.gearWarningHorn) {
      addAlert('GEAR_WARN', 'LANDING GEAR NOT LOCKED DOWN', 'CRITICAL', 'GEAR', 'WARNING_KLAXON');
    }
    if (sim.ecs.hypoxiaRiskWarning) {
      addAlert('CABIN_ALT_CRIT', 'CABIN ALT EXCEEDS 14,000 FT', 'CRITICAL', 'ECS', 'WARNING_KLAXON');
    }
    if (sim.aircraft.indicatedAirspeedKnots > 800) {
      addAlert('OVERSPEED', 'VNE EXCEEDED - OVERSPEED', 'CRITICAL', 'FLIGHT', 'WARNING_KLAXON');
    }
    if (sim.aircraft.loadFactorG > 9.2) {
      addAlert('G_OVERLIMIT', 'STRUCTURAL +9G LIMIT EXCEEDED', 'CRITICAL', 'FLIGHT', 'WARNING_KLAXON');
    }

    // 2. Master Cautions (Amber)
    if (sim.electrical.generatorFailWarning) {
      addAlert('GEN_FAIL', 'MAIN GENERATOR OFF / OFFLINE', 'CAUTION', 'ELECTRICAL', 'CAUTION_VOICE');
    }
    if (sim.hydraulic.lowPressureCautionA && sim.engine.n2RpmPercent > 20) {
      addAlert('HYD_A_LOW', 'HYDRAULIC SYS A PRESSURE < 1800 PSI', 'CAUTION', 'HYDRAULIC', 'CAUTION_VOICE');
    }
    if (sim.hydraulic.lowPressureCautionB && sim.engine.n2RpmPercent > 20) {
      addAlert('HYD_B_LOW', 'HYDRAULIC SYS B PRESSURE < 1800 PSI', 'CAUTION', 'HYDRAULIC', 'CAUTION_VOICE');
    }
    if (sim.fuel.fuelLowCaution) {
      addAlert('FUEL_LOW', 'BINGO FUEL - LOW QUANTITY', 'CAUTION', 'FUEL', 'CAUTION_VOICE');
    }
    if (sim.fuel.imbalanceWarning) {
      addAlert('FUEL_IMBAL', 'WING TANK FUEL IMBALANCE > 250 KG', 'CAUTION', 'FUEL', 'BEEP');
    }
    if (sim.canopy.canopyUnsafeWarning) {
      addAlert('CANOPY_UNLOCKED', 'CANOPY NOT LOCKED / SEALED', 'CAUTION', 'CANOPY', 'CAUTION_VOICE');
    }
    if (sim.ecs.cabinAltitudeWarning) {
      addAlert('CABIN_ALT', 'CABIN ALTITUDE > 10,000 FT', 'CAUTION', 'ECS', 'BEEP');
    }
    if (sim.gear.transitState === 'UNSAFE') {
      addAlert('GEAR_UNSAFE', 'LANDING GEAR IN UNSAFE TRANSIT', 'CAUTION', 'GEAR', 'BEEP');
    }
    if (sim.flcs.flightControlMode === 'DEGRADED') {
      addAlert('FLCS_DEGRADED', 'FLCS DEGRADED CONTROL LAW', 'CAUTION', 'FLCS', 'CAUTION_VOICE');
    }

    // 3. Information (Cyan/Green)
    if (sim.flcs.gLimiterActive) {
      addAlert('G_LIMITER', 'FLCS G-LIMITER ACTIVE', 'INFO', 'FLCS');
    }
    if (sim.flcs.aoaLimiterActive) {
      addAlert('AOA_LIMITER', 'FLCS ALPHA LIMITER ACTIVE', 'INFO', 'FLCS');
    }
    if (sim.engine.afterburnerActive) {
      addAlert('AFTERBURNER', `REHEAT STAGE ${sim.engine.afterburnerStage} ACTIVE`, 'INFO', 'ENGINE');
    }

    // Determine Master Warning / Caution flags
    const hasCritical = list.some((m) => m.severity === 'CRITICAL');
    const hasCaution = list.some((m) => m.severity === 'CAUTION');

    // Trigger audio updates
    cockpitAudio.setMasterWarning(hasCritical);
    cockpitAudio.setStallWarning(sim.flcs.stallWarningActive && !sim.aircraft.onGround);

    return {
      warnings: list,
      masterCaution: hasCaution,
      masterWarning: hasCritical,
    };
  }
}
