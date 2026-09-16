/**
 * Ground Interaction and Landing Gear Suspension Model
 */

import { CONSTANTS } from '../core/constants';
import { LandingGearState } from '../types/simulation';

export interface GroundContactResult {
  onGround: boolean;
  normalForceN: number;
  frictionForceXN: number;
  frictionForceYN: number;
  pitchMomentNm: number;
  yawMomentNm: number;
  gearCompression: number; // 0 to 1
  wowNose: boolean;
  wowLeft: boolean;
  wowRight: boolean;
  wowMain: boolean;
  isHardTouchdown: boolean;
  touchdownSinkRateFpm: number;
}

export class GroundInteractionModel {
  private static wasOnGround: boolean = true;
  private static lastSinkRateFpm: number = 0;

  /**
   * Evaluates ground reaction forces, spring compression, tire friction, and steering.
   */
  public static evaluate(
    altitudeMeters: number, // Height above sea level
    vzMps: number, // Vertical speed down (positive down)
    pitchRad: number,
    rollRad: number,
    uMps: number, // forward speed
    vMps: number, // lateral speed
    yawRateRps: number,
    gearState: LandingGearState,
    leftBrakeCmd: number,
    rightBrakeCmd: number,
    rudderCmd: number, // nose wheel steering input
    aircraftMassKg: number
  ): GroundContactResult {
    const runwayElevation = CONSTANTS.RUNWAY_ELEVATION_M;
    const gearHeightOffset = 2.4; // Height of CG above ground when gear fully extended (meters)
    const gearAltitude = altitudeMeters - runwayElevation;

    // Gear must be down and locked or partially down to contact ground
    const gearDeployed = gearState.noseGearPercent > 0.6 && gearState.leftMainGearPercent > 0.6;
    const contactAltitude = gearDeployed ? gearHeightOffset : 0.6; // belly scrape if gear up

    const sinkRateFpm = vzMps * CONSTANTS.MPS_TO_FEET * 60.0;
    this.lastSinkRateFpm = sinkRateFpm;

    if (gearAltitude > contactAltitude) {
      this.wasOnGround = false;
      return {
        onGround: false,
        normalForceN: 0,
        frictionForceXN: 0,
        frictionForceYN: 0,
        pitchMomentNm: 0,
        yawMomentNm: 0,
        gearCompression: 0,
        wowNose: false,
        wowLeft: false,
        wowRight: false,
        wowMain: false,
        isHardTouchdown: false,
        touchdownSinkRateFpm: 0,
      };
    }

    // Aircraft is in contact with ground
    const penetration = Math.max(0, contactAltitude - gearAltitude);
    const maxStroke = 0.55; // 55cm oleo strut stroke
    const compression = Math.min(1.0, penetration / maxStroke);

    // Suspension spring-damper model
    // F_spring = k * x + c * v_sink
    const k_spring = (aircraftMassKg * CONSTANTS.GRAVITY_SEA_LEVEL * 2.2) / maxStroke;
    const c_damper = aircraftMassKg * 8.0;

    let normalForce = k_spring * penetration + c_damper * Math.max(0, vzMps);
    // Limit normal force to prevent explosive rebound
    normalForce = Math.max(0, Math.min(aircraftMassKg * CONSTANTS.GRAVITY_SEA_LEVEL * 3.5, normalForce));

    const wowMain = compression > 0.05;
    const wowNose = compression > 0.12 && pitchRad < 0.10; // Nose WOW unloads on flare

    // Detect touchdown transition
    let isHardTouchdown = false;
    let touchdownSink = 0;
    if (!this.wasOnGround && wowMain) {
      this.wasOnGround = true;
      touchdownSink = sinkRateFpm;
      if (touchdownSink > 600) {
        // Hard landing > 600 fpm (10 ft/s)
        isHardTouchdown = true;
      }
    }

    // Tire friction and braking force
    const rollingResistanceCoeff = 0.025; // Good paved runway
    const maxBrakeFrictionCoeff = 0.65; // Dry concrete

    // Differential braking
    const antiSkidFactor = gearState.antiSkidActive ? 0.95 : 0.7;
    const leftBraking = Math.min(1.0, leftBrakeCmd) * maxBrakeFrictionCoeff * antiSkidFactor;
    const rightBraking = Math.min(1.0, rightBrakeCmd) * maxBrakeFrictionCoeff * antiSkidFactor;
    const avgBraking = (leftBraking + rightBraking) / 2.0;

    const totalFrictionCoeff = rollingResistanceCoeff + avgBraking;
    const frictionForceX = -Math.sign(uMps) * Math.min(Math.abs(uMps) * 2000, normalForce * totalFrictionCoeff);

    // Lateral friction and nosewheel steering
    let steeringYawMoment = 0;
    let frictionForceY = -Math.sign(vMps) * Math.min(Math.abs(vMps) * 3000, normalForce * 0.5);

    if (wowNose && Math.abs(uMps) > 0.5) {
      // Nosewheel steer angle up to 45 deg low speed, narrowing at high speed
      const steerSpeedReduction = Math.max(0.15, 1.0 - Math.abs(uMps) / 60.0);
      const steerAngleRad = rudderCmd * 0.45 * steerSpeedReduction;
      steeringYawMoment = uMps * steerAngleRad * 12000.0;
    }

    // Differential brake yaw moment
    const trackWidthM = 3.2; // Main gear track width
    const diffBrakeMoment = (leftBraking - rightBraking) * normalForce * (trackWidthM / 2.0);
    const yawMoment = steeringYawMoment + diffBrakeMoment;

    // Ground pitch restoring moment (main gear behind CG)
    const pitchMoment = -pitchRad * normalForce * 2.8;

    return {
      onGround: true,
      normalForceN: normalForce,
      frictionForceXN: frictionForceX,
      frictionForceYN: frictionForceY,
      pitchMomentNm: pitchMoment,
      yawMomentNm: yawMoment,
      gearCompression: compression,
      wowNose,
      wowLeft: wowMain,
      wowRight: wowMain,
      wowMain,
      isHardTouchdown,
      touchdownSinkRateFpm: touchdownSink,
    };
  }
}
