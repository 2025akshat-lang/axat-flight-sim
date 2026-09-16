/**
 * Digital Fly-By-Wire Flight Control System (FLCS)
 * Control laws, G-limiting, AoA protection, actuator rate limits, and surface mixing.
 */

import { FlcsState, ControlInputs, SurfaceDeflections } from '../types/simulation';
import { AircraftProfile } from '../types/aircraft';

export class FlightControlSystem {
  public static init(): FlcsState {
    return {
      flightControlMode: 'NORMAL',
      channel1Healthy: true,
      channel2Healthy: true,
      channel3Healthy: true,
      channel4Healthy: true,
      gLimiterActive: false,
      aoaLimiterActive: false,
      rollRateLimiterActive: false,
      stallWarningActive: false,
      surfaces: {
        leftStabilatorDeg: 0,
        rightStabilatorDeg: 0,
        leftAileronDeg: 0,
        rightAileronDeg: 0,
        rudderDeg: 0,
        flapsDeg: 0,
        leadingEdgeFlapsDeg: 0,
        speedBrakePercent: 0,
      },
      pitchTrimPos: 0,
      rollTrimPos: 0,
      yawTrimPos: 0,
    };
  }

  public static update(
    current: FlcsState,
    inputs: ControlInputs,
    currentG: number,
    currentAoADeg: number,
    indicatedAirspeedKts: number,
    actuatorAuthority: number, // from Hydraulic system (0 to 1)
    isFlcsPowered: boolean, // from Electrical CB_FLCS
    profile: AircraftProfile,
    dt: number
  ): FlcsState {
    const next: FlcsState = { ...current };

    // Flcs Mode evaluation
    if (!isFlcsPowered) {
      next.flightControlMode = 'DIRECT_MANUAL';
      next.channel1Healthy = false;
      next.channel2Healthy = false;
      next.channel3Healthy = false;
      next.channel4Healthy = false;
    } else if (actuatorAuthority < 0.6) {
      next.flightControlMode = 'DEGRADED';
    } else {
      next.flightControlMode = 'NORMAL';
      next.channel1Healthy = true;
      next.channel2Healthy = true;
      next.channel3Healthy = true;
      next.channel4Healthy = true;
    }

    // 1. Pitch Control Law (G-demand / Pitch rate)
    let commandedPitchInput = inputs.pitchInput + inputs.pitchTrim * 0.25;

    // G-Limiter & AoA-Limiter (active in NORMAL mode)
    if (next.flightControlMode === 'NORMAL') {
      // AoA limiting (prevent departing beyond stall AoA)
      const stallBoundary = profile.aerodynamics.alphaStallDeg - 3.0; // 3 deg buffer
      if (currentAoADeg > stallBoundary && commandedPitchInput > 0) {
        next.aoaLimiterActive = true;
        // Pitch-down recovery command
        const aoaExcess = (currentAoADeg - stallBoundary) / 5.0;
        commandedPitchInput = Math.max(-0.6, commandedPitchInput - aoaExcess);
      } else {
        next.aoaLimiterActive = false;
      }

      // G-Limiting
      if (currentG > profile.maxGPositive - 0.5 && commandedPitchInput > 0) {
        next.gLimiterActive = true;
        commandedPitchInput *= Math.max(0.1, 1.0 - (currentG - (profile.maxGPositive - 0.5)) / 1.5);
      } else {
        next.gLimiterActive = false;
      }
    } else {
      next.aoaLimiterActive = false;
      next.gLimiterActive = false;
    }

    // Stabilator deflection (-25° trailing edge down/nose up to +15° trailing edge up/nose down)
    // Full authority scaled by hydraulic capability
    const maxStabUp = 25.0 * actuatorAuthority;
    const maxStabDown = 15.0 * actuatorAuthority;
    const targetPitchDeflection = commandedPitchInput > 0 ? commandedPitchInput * maxStabUp : commandedPitchInput * maxStabDown;

    // 2. Roll Control Law (Roll rate demand)
    const commandedRollInput = inputs.rollInput + inputs.rollTrim * 0.2;
    const maxAileron = 20.0 * actuatorAuthority;
    const targetRollDeflection = commandedRollInput * maxAileron;

    // Roll/Pitch Surface Mixing (Taileron / Differential Stabilator)
    const diffStabContribution = commandedRollInput * 6.0 * actuatorAuthority;
    const targetLeftStab = targetPitchDeflection + diffStabContribution;
    const targetRightStab = targetPitchDeflection - diffStabContribution;

    // Ailerons
    const targetLeftAileron = targetRollDeflection;
    const targetRightAileron = -targetRollDeflection;

    // 3. Rudder Control Law
    const commandedYawInput = inputs.yawInput + inputs.yawTrim * 0.15;
    const maxRudder = 30.0 * actuatorAuthority;
    const targetRudder = commandedYawInput * maxRudder;

    // 4. Flaps Command
    let targetFlaps = 0;
    if (inputs.flapsCommand === 'HALF') targetFlaps = 18;
    else if (inputs.flapsCommand === 'FULL') targetFlaps = 35;
    else {
      // AUTO flaps (maneuvering flaps based on AoA and airspeed)
      if (indicatedAirspeedKts < 240 && currentAoADeg > 6.0) {
        targetFlaps = Math.min(22, (currentAoADeg - 6.0) * 2.2);
      }
    }

    // 5. Speed Brake Command
    const targetSpeedBrake = inputs.speedBrakeCommand ? 100 : 0;

    // Actuator rate-limiting integration:
    // Stabilators: 60 deg/sec
    // Ailerons: 95 deg/sec
    // Rudder: 75 deg/sec
    // Flaps: 12 deg/sec
    // Speedbrake: 45 %/sec
    const stabRate = 60.0 * dt * actuatorAuthority;
    const aileronRate = 95.0 * dt * actuatorAuthority;
    const rudderRate = 75.0 * dt * actuatorAuthority;
    const flapRate = 12.0 * dt * actuatorAuthority;
    const sbRate = 45.0 * dt * actuatorAuthority;

    const moveToward = (currentVal: number, targetVal: number, maxStep: number): number => {
      const diff = targetVal - currentVal;
      return currentVal + Math.sign(diff) * Math.min(Math.abs(diff), maxStep);
    };

    next.surfaces = {
      leftStabilatorDeg: moveToward(current.surfaces.leftStabilatorDeg, targetLeftStab, stabRate),
      rightStabilatorDeg: moveToward(current.surfaces.rightStabilatorDeg, targetRightStab, stabRate),
      leftAileronDeg: moveToward(current.surfaces.leftAileronDeg, targetLeftAileron, aileronRate),
      rightAileronDeg: moveToward(current.surfaces.rightAileronDeg, targetRightAileron, aileronRate),
      rudderDeg: moveToward(current.surfaces.rudderDeg, targetRudder, rudderRate),
      flapsDeg: moveToward(current.surfaces.flapsDeg, targetFlaps, flapRate),
      leadingEdgeFlapsDeg: moveToward(current.surfaces.leadingEdgeFlapsDeg, targetFlaps * 0.7, flapRate),
      speedBrakePercent: moveToward(current.surfaces.speedBrakePercent, targetSpeedBrake, sbRate),
    };

    // Stall warning trigger
    next.stallWarningActive = currentAoADeg >= profile.aerodynamics.alphaStallDeg - 2.0;

    return next;
  }
}
