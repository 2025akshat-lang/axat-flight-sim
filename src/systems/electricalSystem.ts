/**
 * Electrical Network & Circuit Breaker Model
 * 115V AC, 28V DC Essential, and Avionics Bus routing with true breaker dependency chains.
 */

import { ElectricalSystemState, CircuitBreakerState } from '../types/simulation';
import { simulationEventBus } from '../core/eventBus';

export const INITIAL_CIRCUIT_BREAKERS: Record<string, CircuitBreakerState> = {
  CB_HUD: { id: 'CB_HUD', name: 'HUD Display Power', subsystem: 'AVIONICS', tripped: false, ratingAmps: 10 },
  CB_PFD: { id: 'CB_PFD', name: 'PFD Display Power', subsystem: 'AVIONICS', tripped: false, ratingAmps: 15 },
  CB_MFD_L: { id: 'CB_MFD_L', name: 'Left MFD Bezel & Screen', subsystem: 'AVIONICS', tripped: false, ratingAmps: 15 },
  CB_MFD_R: { id: 'CB_MFD_R', name: 'Right MFD Screen', subsystem: 'AVIONICS', tripped: false, ratingAmps: 15 },
  CB_FLCS: { id: 'CB_FLCS', name: 'FBW Flight Control Logic', subsystem: 'FLCS', tripped: false, ratingAmps: 20 },
  CB_RADAR: { id: 'CB_RADAR', name: 'Tactical Sensor / Radar', subsystem: 'AVIONICS', tripped: false, ratingAmps: 30 },
  CB_FUEL_PUMP: { id: 'CB_FUEL_PUMP', name: 'Fuel Boost Pumps', subsystem: 'FUEL', tripped: false, ratingAmps: 25 },
  CB_HYD_PUMP: { id: 'CB_HYD_PUMP', name: 'Electric Aux Hyd Pump', subsystem: 'HYDRAULIC', tripped: false, ratingAmps: 35 },
  CB_COMM_1: { id: 'CB_COMM_1', name: 'VHF/UHF Comm 1 Transceiver', subsystem: 'RADIO', tripped: false, ratingAmps: 10 },
  CB_NAV_1: { id: 'CB_NAV_1', name: 'INS / GNSS Inertial Unit', subsystem: 'NAVIGATION', tripped: false, ratingAmps: 15 },
  CB_ECS: { id: 'CB_ECS', name: 'Environmental Control Pack', subsystem: 'ECS', tripped: false, ratingAmps: 20 },
  CB_PITOT_HEAT: { id: 'CB_PITOT_HEAT', name: 'Pitot Static Probe Heater', subsystem: 'ECS', tripped: false, ratingAmps: 15 },
  CB_GEAR_CONT: { id: 'CB_GEAR_CONT', name: 'Landing Gear Solenoid Control', subsystem: 'GEAR', tripped: false, ratingAmps: 15 },
};

export class ElectricalSystem {
  public static init(): ElectricalSystemState {
    return {
      batterySwitch: false,
      batteryVoltageVolts: 24.8,
      batteryChargePercent: 95,
      mainGeneratorSwitch: true,
      mainGenActive: false,
      mainGenLoadPercent: 0,
      mainGenVoltageVolts: 0,
      externalPowerConnected: true,
      externalPowerSwitch: false,
      busTieClosed: true,
      acBusPowered: false,
      dcEssentialBusPowered: false,
      avionicsBusPowered: false,
      totalAmpsDrawn: 0,
      circuitBreakers: { ...INITIAL_CIRCUIT_BREAKERS },
      generatorFailWarning: true,
      batteryDischargingWarning: false,
    };
  }

  public static update(
    current: ElectricalSystemState,
    engineN2Percent: number,
    dt: number
  ): ElectricalSystemState {
    const next = { ...current };

    // Generator active if engine is running (> 52% N2) and generator switch is ON
    const genAvailable = engineN2Percent > 52.0 && next.mainGeneratorSwitch;
    next.mainGenActive = genAvailable;
    next.mainGenVoltageVolts = genAvailable ? 115.0 : 0;

    // External Ground Power available if connected and switch is ON
    const extPwrOn = next.externalPowerConnected && next.externalPowerSwitch;

    // AC Bus is powered by Main Gen or External Power
    next.acBusPowered = genAvailable || extPwrOn;

    // DC Essential Bus is powered by AC Transformer Rectifier (when AC bus live) or Battery
    const batOn = next.batterySwitch && next.batteryChargePercent > 5;
    next.dcEssentialBusPowered = next.acBusPowered || batOn;

    // Avionics Bus is powered if DC Essential is live and Bus Tie is closed (or AC Bus is live)
    next.avionicsBusPowered = next.dcEssentialBusPowered && (next.busTieClosed || next.acBusPowered);

    // Battery voltage and charge dynamics
    if (next.acBusPowered && next.batterySwitch) {
      // Charging from generator / external power
      next.batteryVoltageVolts = 28.2;
      next.batteryChargePercent = Math.min(100, next.batteryChargePercent + 0.2 * dt);
      next.batteryDischargingWarning = false;
    } else if (batOn) {
      // Discharging under battery power
      next.batteryVoltageVolts = 24.2 - (1.0 - next.batteryChargePercent / 100.0) * 4.0;
      next.batteryChargePercent = Math.max(0, next.batteryChargePercent - 0.05 * dt);
      next.batteryDischargingWarning = true;
    } else {
      next.batteryVoltageVolts = 24.6;
      next.batteryDischargingWarning = false;
    }

    // Calculate total electrical load from active equipment
    let totalAmps = 0;
    if (next.dcEssentialBusPowered) totalAmps += 18; // base flight critical sensors, instruments
    if (next.acBusPowered) totalAmps += 25; // fuel pumps, cooling fans, actuators
    if (next.avionicsBusPowered) {
      if (!next.circuitBreakers['CB_HUD']?.tripped) totalAmps += 8;
      if (!next.circuitBreakers['CB_PFD']?.tripped) totalAmps += 12;
      if (!next.circuitBreakers['CB_MFD_L']?.tripped) totalAmps += 12;
      if (!next.circuitBreakers['CB_MFD_R']?.tripped) totalAmps += 12;
      if (!next.circuitBreakers['CB_RADAR']?.tripped) totalAmps += 24;
    }

    next.totalAmpsDrawn = totalAmps;
    next.mainGenLoadPercent = next.mainGenActive ? Math.min(100, Math.round((totalAmps / 120.0) * 100)) : 0;
    next.generatorFailWarning = !next.mainGenActive && !extPwrOn;

    return next;
  }

  public static isBreakerPowered(elec: ElectricalSystemState, breakerId: string): boolean {
    const cb = elec.circuitBreakers[breakerId];
    if (!cb || cb.tripped) return false;

    if (cb.subsystem === 'AVIONICS' || cb.subsystem === 'NAVIGATION' || cb.subsystem === 'RADIO') {
      return elec.avionicsBusPowered;
    }
    return elec.dcEssentialBusPowered;
  }

  public static toggleBreaker(elec: ElectricalSystemState, breakerId: string): ElectricalSystemState {
    const cb = elec.circuitBreakers[breakerId];
    if (!cb) return elec;

    const nextBreakers = {
      ...elec.circuitBreakers,
      [breakerId]: {
        ...cb,
        tripped: !cb.tripped,
      },
    };

    const tripped = !cb.tripped;
    simulationEventBus.emit(
      tripped ? 'ELECTRICAL_BREAKER_TRIP' : 'ELECTRICAL_BREAKER_RESET',
      'ELECTRICAL',
      `Circuit breaker ${cb.name} (${cb.id}) ${tripped ? 'TRIPPED/OPEN' : 'RESET/CLOSED'}`
    );

    return {
      ...elec,
      circuitBreakers: nextBreakers,
    };
  }
}
