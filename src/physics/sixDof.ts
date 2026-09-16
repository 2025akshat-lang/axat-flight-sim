/**
 * 6-DOF Rigid-Body Equations of Motion Engine
 * Quaternion attitude integration, inertial transforms, linear/angular accelerations,
 * and energy metrics.
 */

import { AircraftState, MassState, Quaternion, SurfaceDeflections } from '../types/simulation';
import { AircraftProfile } from '../types/aircraft';
import { CONSTANTS } from '../core/constants';
import { AtmosphereModel } from './atmosphere';
import { AerodynamicsModel } from './aerodynamics';
import { GroundInteractionModel } from './groundInteraction';

export class SixDofEngine {
  /**
   * Performs one deterministic numerical integration step (dt).
   */
  public static integrate(
    state: AircraftState,
    mass: MassState,
    profile: AircraftProfile,
    engineThrustKn: number,
    surfaces: SurfaceDeflections,
    leftBrake: number,
    rightBrake: number,
    rudderPedal: number,
    gearDown: boolean,
    dt: number
  ): {
    nextState: AircraftState;
    aeroMetrics: ReturnType<typeof AerodynamicsModel.calculate>;
  } {
    // 1. Atmosphere sample at current altitude
    const atmo = AtmosphereModel.sample(state.altitude);

    // 2. Aerodynamics evaluation
    const aero = AerodynamicsModel.calculate(
      profile,
      state.u,
      state.v,
      state.w,
      state.p,
      state.q,
      state.r,
      atmo.densityKgM3,
      atmo.speedOfSoundMps,
      surfaces,
      gearDown
    );

    // 3. Propulsion force along body X axis
    const thrustN = engineThrustKn * 1000.0;

    // 4. Gravity in Body Axes
    // g_body_x = -g * sin(pitch)
    // g_body_y =  g * cos(pitch) * sin(roll)
    // g_body_z =  g * cos(pitch) * cos(roll)
    const sinPitch = Math.sin(state.pitch);
    const cosPitch = Math.cos(state.pitch);
    const sinRoll = Math.sin(state.roll);
    const cosRoll = Math.cos(state.roll);
    const g = CONSTANTS.GRAVITY_SEA_LEVEL;

    const g_body_x = -g * sinPitch;
    const g_body_y = g * cosPitch * sinRoll;
    const g_body_z = g * cosPitch * cosRoll;

    // 5. Ground Interaction evaluation
    const ground = GroundInteractionModel.evaluate(
      state.altitude,
      state.vz,
      state.pitch,
      state.roll,
      state.u,
      state.v,
      state.r,
      {
        handleDown: gearDown,
        transitState: gearDown ? 'DOWN_LOCKED' : 'UP_LOCKED',
        noseGearPercent: gearDown ? 1 : 0,
        leftMainGearPercent: gearDown ? 1 : 0,
        rightMainGearPercent: gearDown ? 1 : 0,
        gearDoorsOpen: false,
        emergencyGearExtended: false,
        gearWarningHorn: false,
        wheelSpeedKnots: { nose: state.groundSpeedKnots, left: state.groundSpeedKnots, right: state.groundSpeedKnots },
        brakePressurePsi: { left: leftBrake * 3000, right: rightBrake * 3000 },
        antiSkidActive: true,
        tiresBlown: { nose: false, left: false, right: false },
      },
      leftBrake,
      rightBrake,
      rudderPedal,
      mass.totalMassKg
    );

    // 6. Total Body Forces (N)
    // Drag acts opposite velocity vector; lift acts perpendicular to velocity in symmetry plane
    const cosAlpha = Math.cos(aero.alphaDeg * CONSTANTS.DEG_TO_RAD);
    const sinAlpha = Math.sin(aero.alphaDeg * CONSTANTS.DEG_TO_RAD);

    // Transform lift & drag into body axes (X_b, Z_b)
    const aero_Fx = aero.liftN * sinAlpha - aero.dragN * cosAlpha;
    const aero_Fz = -aero.liftN * cosAlpha - aero.dragN * sinAlpha;
    const aero_Fy = aero.sideForceN;

    const total_Fx = aero_Fx + thrustN + mass.totalMassKg * g_body_x + (ground.onGround ? ground.frictionForceXN : 0);
    const total_Fy = aero_Fy + mass.totalMassKg * g_body_y + (ground.onGround ? ground.frictionForceYN : 0);
    const total_Fz = aero_Fz + mass.totalMassKg * g_body_z - (ground.onGround ? ground.normalForceN : 0);

    // Accelerations in body axes:
    // du/dt = Fx/m - q*w + r*v
    // dv/dt = Fy/m - r*u + p*w
    // dw/dt = Fz/m - p*v + q*u
    const ax = total_Fx / mass.totalMassKg;
    const ay = total_Fy / mass.totalMassKg;
    const az = total_Fz / mass.totalMassKg;

    const u_dot = ax - state.q * state.w + state.r * state.v;
    const v_dot = ay - state.r * state.u + state.p * state.w;
    const w_dot = az - state.p * state.v + state.q * state.u;

    // 7. Total Moments (Nm)
    const total_Mx = aero.rollingMomentNm;
    const total_My = aero.pitchingMomentNm + (ground.onGround ? ground.pitchMomentNm : 0);
    const total_Mz = aero.yawingMomentNm + (ground.onGround ? ground.yawMomentNm : 0);

    // Rotational accelerations using inertia tensor:
    // Assuming symmetric aircraft (Ixy = Iyz = 0, Ixz non-zero)
    const Ixx = mass.ixx;
    const Iyy = mass.iyy;
    const Izz = mass.izz;
    const Ixz = mass.ixz;

    const gamma_denom = Ixx * Izz - Ixz * Ixz;
    const c1 = ((Iyy - Izz) * Izz - Ixz * Ixz) / gamma_denom;
    const c2 = ((Ixx - Iyy + Izz) * Ixz) / gamma_denom;
    const c3 = Izz / gamma_denom;
    const c4 = Ixz / gamma_denom;
    const c5 = (Izz - Ixx) / Iyy;
    const c6 = Ixz / Iyy;
    const c7 = 1.0 / Iyy;
    const c8 = (Ixx * (Ixx - Iyy) + Ixz * Ixz) / gamma_denom;
    const c9 = Ixx / gamma_denom;

    const p_dot = (c1 * state.r + c2 * state.p) * state.q + c3 * total_Mx + c4 * total_Mz;
    const q_dot = c5 * state.p * state.r - c6 * (state.p * state.p - state.r * state.r) + c7 * total_My;
    const r_dot = (c8 * state.p - c2 * state.r) * state.q + c4 * total_Mx + c9 * total_Mz;

    // Numerical integration of rates
    let nextP = state.p + p_dot * dt;
    let nextQ = state.q + q_dot * dt;
    let nextR = state.r + r_dot * dt;

    // If firmly on ground, constrain roll and pitch rates
    if (ground.onGround) {
      nextP *= 0.75;
      if (ground.wowNose && nextQ < 0) {
        nextQ = Math.max(0, nextQ);
      }
    }

    // Euler rate transformations
    const tanPitch = Math.tan(state.pitch);
    const secPitch = 1.0 / Math.max(0.01, Math.cos(state.pitch));

    const roll_dot = nextP + (nextQ * sinRoll + nextR * cosRoll) * tanPitch;
    const pitch_dot = nextQ * cosRoll - nextR * sinRoll;
    const yaw_dot = (nextQ * sinRoll + nextR * cosRoll) * secPitch;

    let nextRoll = state.roll + roll_dot * dt;
    let nextPitch = state.pitch + pitch_dot * dt;
    let nextYaw = state.yaw + yaw_dot * dt;

    // Pitch constraints
    nextPitch = Math.max(-1.55, Math.min(1.55, nextPitch));

    // Ground orientation constraints
    if (ground.onGround) {
      nextRoll *= 0.85; // Wings level on runway
      if (ground.wowNose) {
        nextPitch = Math.max(0.015, Math.min(0.25, nextPitch)); // resting gear pitch ~1.5 to 14 deg
      }
    }

    // Keep heading in [0, 2*PI)
    if (nextYaw < 0) nextYaw += 2 * Math.PI;
    if (nextYaw >= 2 * Math.PI) nextYaw -= 2 * Math.PI;

    // Numerical integration of body velocities
    let nextU = state.u + u_dot * dt;
    let nextV = state.v + v_dot * dt;
    let nextW = state.w + w_dot * dt;

    // Ground constraints
    if (ground.onGround) {
      nextV *= 0.8; // High lateral tire friction
      if (ground.wowNose && nextU < 0) {
        nextU = 0; // Don't roll backwards on brakes
      }
      if (nextW > 0) {
        // Prevent falling through ground
        nextW = Math.min(0, nextW);
      }
    }

    // Transform body velocities to Inertial NED velocities (vx, vy, vz)
    // DCM (Direction Cosine Matrix)
    const cosYaw = Math.cos(nextYaw);
    const sinYaw = Math.sin(nextYaw);
    const cP = Math.cos(nextPitch);
    const sP = Math.sin(nextPitch);
    const cR = Math.cos(nextRoll);
    const sR = Math.sin(nextRoll);

    const vx = (cP * cosYaw) * nextU + (sR * sP * cosYaw - cR * sinYaw) * nextV + (cR * sP * cosYaw + sR * sinYaw) * nextW;
    const vy = (cP * sinYaw) * nextU + (sR * sP * sinYaw + cR * cosYaw) * nextV + (cR * sP * sinYaw - sR * cosYaw) * nextW;
    const vz = -sP * nextU + (sR * cP) * nextV + (cR * cP) * nextW;

    // Integrate position
    const nextX = state.x + vx * dt;
    const nextY = state.y + vy * dt;
    let nextZ = state.z + vz * dt;

    // Altitude = -Z in NED frame
    let nextAlt = -nextZ;
    if (ground.onGround && nextAlt < CONSTANTS.RUNWAY_ELEVATION_M) {
      nextAlt = CONSTANTS.RUNWAY_ELEVATION_M;
      nextZ = -nextAlt;
    }

    // Speed metrics
    const totalV = Math.sqrt(nextU * nextU + nextV * nextV + nextW * nextW);
    const tasKnots = totalV * CONSTANTS.MPS_TO_KNOTS;
    const q_dyn = 0.5 * atmo.densityKgM3 * totalV * totalV;
    const iasKnots = AtmosphereModel.indicatedAirspeedMps(q_dyn) * CONSTANTS.MPS_TO_KNOTS;
    const groundSpeedKnots = Math.sqrt(vx * vx + vy * vy) * CONSTANTS.MPS_TO_KNOTS;
    const verticalSpeedFpm = -vz * CONSTANTS.MPS_TO_FEET * 60.0;
    const mach = atmo.speedOfSoundMps > 0 ? totalV / atmo.speedOfSoundMps : 0;

    // Load Factor (Nz in G)
    // Nz = (Lift + GroundNormal) / (m * g)
    let nzG = (aero.liftN + (ground.onGround ? ground.normalForceN : 0)) / (mass.totalMassKg * CONSTANTS.GRAVITY_SEA_LEVEL);
    if (ground.onGround && ground.wowMain) {
      nzG = 1.0;
    }

    const peakPosG = Math.max(state.peakPositiveG, nzG);
    const peakNegG = Math.min(state.peakNegativeG, nzG);

    // Energy metrics
    const kineticEnergy = 0.5 * mass.totalMassKg * totalV * totalV;
    const potentialEnergy = mass.totalMassKg * CONSTANTS.GRAVITY_SEA_LEVEL * nextAlt;
    // Specific energy Es = h + V^2 / (2 * g) (meters)
    const specificEnergy = nextAlt + (totalV * totalV) / (2.0 * CONSTANTS.GRAVITY_SEA_LEVEL);
    // Specific excess power Ps = dEs / dt = V * (Thrust - Drag) / (m * g)
    const specificExcessPower = totalV > 0.1 ? (totalV * (thrustN - aero.dragN)) / (mass.totalMassKg * CONSTANTS.GRAVITY_SEA_LEVEL) : 0;

    // Flight path angle gamma = atan2(-vz, sqrt(vx^2 + vy^2))
    const flightPathAngleDeg = Math.atan2(-vz, Math.max(0.1, Math.sqrt(vx * vx + vy * vy))) * CONSTANTS.RAD_TO_DEG;

    // Runway distance along X axis
    const runwayDist = nextX;

    const nextState: AircraftState = {
      ...state,
      x: nextX,
      y: nextY,
      z: nextZ,
      altitude: nextAlt,
      altitudeFt: nextAlt * CONSTANTS.METERS_TO_FEET,
      u: nextU,
      v: nextV,
      w: nextW,
      ax,
      ay,
      az,
      vx,
      vy,
      vz,
      verticalSpeedFpm,
      groundSpeedKnots,
      trueAirspeedKnots: tasKnots,
      indicatedAirspeedKnots: iasKnots,
      calibratedAirspeedKnots: iasKnots * 0.995, // CAS calibration curve
      mach,
      roll: nextRoll,
      pitch: nextPitch,
      yaw: nextYaw,
      rollDeg: nextRoll * CONSTANTS.RAD_TO_DEG,
      pitchDeg: nextPitch * CONSTANTS.RAD_TO_DEG,
      headingDeg: (nextYaw * CONSTANTS.RAD_TO_DEG + 360) % 360,
      magneticHeadingDeg: ((nextYaw * CONSTANTS.RAD_TO_DEG - 4.5) + 360) % 360, // 4.5° W variation
      p: nextP,
      q: nextQ,
      r: nextR,
      pDeg: nextP * CONSTANTS.RAD_TO_DEG,
      qDeg: nextQ * CONSTANTS.RAD_TO_DEG,
      rDeg: nextR * CONSTANTS.RAD_TO_DEG,
      alphaDeg: aero.alphaDeg,
      betaDeg: aero.betaDeg,
      flightPathAngleDeg,
      loadFactorG: nzG,
      peakPositiveG: peakPosG,
      peakNegativeG: peakNegG,
      dynamicPressurePa: q_dyn,
      kineticEnergyJoules: kineticEnergy,
      potentialEnergyJoules: potentialEnergy,
      specificEnergyMeters: specificEnergy,
      specificExcessPowerMps: specificExcessPower,
      onGround: ground.onGround,
      wowNose: ground.wowNose,
      wowLeft: ground.wowLeft,
      wowRight: ground.wowRight,
      gearCompression: ground.gearCompression,
      runwayDistMeters: runwayDist,
    };

    return { nextState, aeroMetrics: aero };
  }
}
