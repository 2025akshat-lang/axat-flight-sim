/**
 * Flight Data Recorder (FDR) & Telemetry Recording Engine
 * Stores continuous time-series samples and supports replay, scrubbing, and data export.
 */

export interface TelemetrySample {
  timestampSec: number;
  altitudeFt: number;
  indicatedAirspeedKts: number;
  trueAirspeedKts: number;
  mach: number;
  pitchDeg: number;
  rollDeg: number;
  headingDeg: number;
  verticalSpeedFpm: number;
  alphaDeg: number;
  betaDeg: number;
  loadFactorG: number;
  throttle: number;
  engineN2Rpm: number;
  thrustKn: number;
  fuelTotalKg: number;
  fuelFlowPph: number;
  hydAPressurePsi: number;
  hydBPressurePsi: number;
  gearDown: boolean;
  flapsDeg: number;
  speedBrakePct: number;
  onGround: boolean;
  xPosM: number;
  yPosM: number;
}

export class TelemetryRecorder {
  private samples: TelemetrySample[] = [];
  private maxSamples: number = 3000; // ~5-10 minutes of flight at standard logging rate
  private lastSampleTime: number = 0;
  private sampleIntervalSec: number = 0.1; // 10 Hz telemetry logging

  public record(sample: TelemetrySample): void {
    if (sample.timestampSec - this.lastSampleTime < this.sampleIntervalSec) {
      return;
    }
    this.lastSampleTime = sample.timestampSec;
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  public getSamples(): TelemetrySample[] {
    return this.samples;
  }

  public clear(): void {
    this.samples = [];
    this.lastSampleTime = 0;
  }

  public exportCsv(): string {
    if (this.samples.length === 0) return 'No data recorded';

    const headers = [
      'Time_s',
      'Altitude_ft',
      'Airspeed_KIAS',
      'Airspeed_KTAS',
      'Mach',
      'Pitch_deg',
      'Roll_deg',
      'Heading_deg',
      'VS_fpm',
      'AoA_deg',
      'Sideslip_deg',
      'LoadFactor_G',
      'Throttle_pct',
      'Engine_N2_pct',
      'Thrust_kN',
      'Fuel_kg',
      'FuelFlow_pph',
      'Hyd_A_psi',
      'Hyd_B_psi',
      'Gear_Down',
      'Flaps_deg',
      'SpeedBrake_pct',
      'On_Ground',
    ];

    const rows = this.samples.map((s) =>
      [
        s.timestampSec.toFixed(2),
        s.altitudeFt.toFixed(1),
        s.indicatedAirspeedKts.toFixed(1),
        s.trueAirspeedKts.toFixed(1),
        s.mach.toFixed(3),
        s.pitchDeg.toFixed(2),
        s.rollDeg.toFixed(2),
        s.headingDeg.toFixed(1),
        s.verticalSpeedFpm.toFixed(0),
        s.alphaDeg.toFixed(2),
        s.betaDeg.toFixed(2),
        s.loadFactorG.toFixed(2),
        (s.throttle * 100).toFixed(1),
        s.engineN2Rpm.toFixed(1),
        s.thrustKn.toFixed(1),
        s.fuelTotalKg.toFixed(1),
        s.fuelFlowPph.toFixed(0),
        s.hydAPressurePsi.toFixed(0),
        s.hydBPressurePsi.toFixed(0),
        s.gearDown ? 1 : 0,
        s.flapsDeg.toFixed(1),
        s.speedBrakePct.toFixed(0),
        s.onGround ? 1 : 0,
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  public exportJson(): string {
    return JSON.stringify(this.samples, null, 2);
  }
}

export const flightDataRecorder = new TelemetryRecorder();
