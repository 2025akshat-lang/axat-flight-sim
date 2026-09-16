/**
 * Interactive Aircraft Checklists with Live Parameter Verification
 */

import { SimulationState } from '../types/simulation';

export interface ChecklistItem {
  id: string;
  item: string;
  action: string;
  expectedState: string;
  check: (sim: SimulationState) => { pass: boolean; actual: string };
}

export interface AircraftChecklist {
  id: string;
  title: string;
  category: 'NORMAL' | 'EMERGENCY';
  items: ChecklistItem[];
}

export const AIRCRAFT_CHECKLISTS: AircraftChecklist[] = [
  {
    id: 'chk-cockpit-prep',
    title: 'Cockpit Preparation & Electrical Power',
    category: 'NORMAL',
    items: [
      {
        id: 'canopy-close',
        item: 'Canopy',
        action: 'Close and Lock',
        expectedState: 'CLOSED / LOCKED',
        check: (sim) => ({
          pass: sim.canopy.canopyLocked,
          actual: sim.canopy.canopyLocked ? 'CLOSED & LOCKED' : `${Math.round(sim.canopy.positionPercent * 100)}% OPEN`,
        }),
      },
      {
        id: 'batt-switch',
        item: 'Battery Switch',
        action: 'Set to ON',
        expectedState: 'ON (> 24V DC)',
        check: (sim) => ({
          pass: !!sim.electrical?.batterySwitch,
          actual: sim.electrical?.batterySwitch ? `ON (${(sim.electrical?.batteryVoltageVolts ?? 24).toFixed(1)}V)` : 'OFF',
        }),
      },
      {
        id: 'ext-pwr',
        item: 'External Power / Main Gen',
        action: 'Connect and Engage',
        expectedState: 'AC BUS LIVE',
        check: (sim) => ({
          pass: !!sim.electrical?.acBusPowered,
          actual: sim.electrical?.acBusPowered ? '115V AC POWERED' : 'UNPOWERED',
        }),
      },
      {
        id: 'gear-handle',
        item: 'Landing Gear Handle',
        action: 'Verify DOWN (3 Green)',
        expectedState: 'DOWN & LOCKED',
        check: (sim) => ({
          pass: sim.gear?.transitState === 'DOWN_LOCKED',
          actual: sim.gear?.transitState ?? 'UNKNOWN',
        }),
      },
      {
        id: 'fuel-pumps',
        item: 'Fuel Boost Pumps',
        action: 'Check collector pressure',
        expectedState: '> 35 PSI',
        check: (sim) => ({
          pass: (sim.fuel?.fuelPressurePsi ?? 0) > 35,
          actual: `${(sim.fuel?.fuelPressurePsi ?? 0).toFixed(0)} PSI`,
        }),
      },
    ],
  },
  {
    id: 'chk-engine-start',
    title: 'Engine Start Sequence',
    category: 'NORMAL',
    items: [
      {
        id: 'eng-master',
        item: 'Engine Master Switch',
        action: 'Set to ON',
        expectedState: 'ARMED',
        check: (sim) => ({
          pass: !!sim.engine?.masterSwitch,
          actual: sim.engine?.masterSwitch ? 'ON' : 'OFF',
        }),
      },
      {
        id: 'eng-crank-start',
        item: 'Engine Start Switch',
        action: 'Select START',
        expectedState: 'CRANK / START',
        check: (sim) => ({
          pass: sim.engine?.mode !== 'OFF' && (sim.engine?.n2RpmPercent ?? 0) > 18,
          actual: `N2: ${(sim.engine?.n2RpmPercent ?? 0).toFixed(1)}% (${sim.engine?.mode ?? 'OFF'})`,
        }),
      },
      {
        id: 'throttle-idle',
        item: 'Throttle Lever',
        action: 'Advance to Ground Idle',
        expectedState: 'IDLE DETENT (< 5%)',
        check: (sim) => ({
          pass: (sim.controls?.throttle ?? 0) < 0.08,
          actual: `${((sim.controls?.throttle ?? 0) * 100).toFixed(0)}%`,
        }),
      },
      {
        id: 'idle-stabilized',
        item: 'Engine Stabilization',
        action: 'Verify Ground Idle RPM & EGT',
        expectedState: 'N2 > 60%, EGT < 700°C',
        check: (sim) => ({
          pass: (sim.engine?.n2RpmPercent ?? 0) >= 60 && (sim.engine?.egtDegC ?? 0) < 750,
          actual: `N2: ${(sim.engine?.n2RpmPercent ?? 0).toFixed(0)}%, EGT: ${(sim.engine?.egtDegC ?? 0).toFixed(0)}°C`,
        }),
      },
      {
        id: 'hyd-press',
        item: 'Hydraulic System Pressures',
        action: 'Verify Sys A & B nominal',
        expectedState: '3000 PSI',
        check: (sim) => ({
          pass: (sim.hydraulic?.systemAPressurePsi ?? 0) > 2700 && (sim.hydraulic?.systemBPressurePsi ?? 0) > 2700,
          actual: `A: ${(sim.hydraulic?.systemAPressurePsi ?? 0).toFixed(0)} PSI, B: ${(sim.hydraulic?.systemBPressurePsi ?? 0).toFixed(0)} PSI`,
        }),
      },
    ],
  },
  {
    id: 'chk-takeoff',
    title: 'Before Takeoff Checklist',
    category: 'NORMAL',
    items: [
      {
        id: 'flaps-half',
        item: 'Wing Flaps',
        action: 'Select HALF (18°)',
        expectedState: 'HALF (18°)',
        check: (sim) => ({
          pass: sim.controls?.flapsCommand === 'HALF' && (sim.flcs?.surfaces?.flapsDeg ?? 0) > 15,
          actual: `${(sim.flcs?.surfaces?.flapsDeg ?? 0).toFixed(1)}°`,
        }),
      },
      {
        id: 'flcs-bit',
        item: 'Flight Control System (FLCS)',
        action: 'Verify 4 Channels Normal',
        expectedState: 'NORMAL',
        check: (sim) => ({
          pass: sim.flcs?.flightControlMode === 'NORMAL',
          actual: sim.flcs?.flightControlMode ?? 'UNKNOWN',
        }),
      },
      {
        id: 'pitot-heat',
        item: 'Pitot Heat Switch',
        action: 'Set ON',
        expectedState: 'ON',
        check: (sim) => ({
          pass: !!sim.ecs?.pitotHeatSwitch,
          actual: sim.ecs?.pitotHeatSwitch ? 'ON' : 'OFF',
        }),
      },
      {
        id: 'warn-lights',
        item: 'Master Caution & Warnings',
        action: 'Verify all master alerts clear',
        expectedState: 'CLEAR / NO CRITICAL',
        check: (sim) => ({
          pass: !sim.masterWarningActive,
          actual: sim.masterWarningActive ? 'CRITICAL WARNING ACTIVE' : 'CLEARED',
        }),
      },
    ],
  },
  {
    id: 'chk-emerg-flameout',
    title: 'Emergency: Engine Flameout Recovery',
    category: 'EMERGENCY',
    items: [
      {
        id: 'glide-speed',
        item: 'Airspeed',
        action: 'Trim for Best Glide (230-240 KIAS)',
        expectedState: '220 - 250 KIAS',
        check: (sim) => ({
          pass: (sim.aircraft?.indicatedAirspeedKnots ?? 0) >= 210 && (sim.aircraft?.indicatedAirspeedKnots ?? 0) <= 260,
          actual: `${(sim.aircraft?.indicatedAirspeedKnots ?? 0).toFixed(0)} KIAS`,
        }),
      },
      {
        id: 'aux-hyd-pump',
        item: 'Electric Aux Hydraulic Pump',
        action: 'Switch ON',
        expectedState: 'ON',
        check: (sim) => ({
          pass: sim.hydraulic.electricAuxPumpOn,
          actual: sim.hydraulic.electricAuxPumpOn ? 'ON' : 'OFF',
        }),
      },
      {
        id: 'airstart-engage',
        item: 'Engine Start Switch',
        action: 'Select START',
        expectedState: 'START',
        check: (sim) => ({
          pass: sim.engine.engineStartSwitch === 'START' || sim.engine.mode === 'IGNITION' || sim.engine.mode === 'IDLE',
          actual: `${sim.engine.engineStartSwitch} (${sim.engine.mode})`,
        }),
      },
    ],
  },
];
