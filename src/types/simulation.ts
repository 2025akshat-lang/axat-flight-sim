/**
 * Core simulation types for Fighter Aircraft Flight & Systems Simulator
 */

export interface Vector3 {
  x: number; // North / Forward (m)
  y: number; // East / Right (m)
  z: number; // Down / Altitude inverse (m)
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface AircraftState {
  // World position
  x: number; // m from reference origin
  y: number; // m
  z: number; // m (negative altitude in NED, altitude = -z)
  altitude: number; // m (true altitude above sea level)
  altitudeFt: number; // ft
  latitude: number; // degrees
  longitude: number; // degrees

  // Velocities & accelerations in body axis
  u: number; // forward velocity (m/s)
  v: number; // right velocity (m/s)
  w: number; // down velocity (m/s)
  ax: number; // body longitudinal accel (m/s^2)
  ay: number; // body lateral accel (m/s^2)
  az: number; // body normal accel (m/s^2)

  // Ground and inertial velocities
  vx: number; // North velocity (m/s)
  vy: number; // East velocity (m/s)
  vz: number; // Vertical velocity (m/s, down is positive in NED, climbing is negative)
  verticalSpeedFpm: number; // ft/min
  groundSpeedKnots: number; // knots
  trueAirspeedKnots: number; // KTAS
  indicatedAirspeedKnots: number; // KIAS
  calibratedAirspeedKnots: number; // KCAS
  mach: number;

  // Attitudes (Euler in radians and degrees)
  roll: number; // rad
  pitch: number; // rad
  yaw: number; // rad (true heading)
  rollDeg: number;
  pitchDeg: number;
  headingDeg: number; // 0..360
  magneticHeadingDeg: number;

  // Angular rates
  p: number; // roll rate (rad/s)
  q: number; // pitch rate (rad/s)
  r: number; // yaw rate (rad/s)
  pDeg: number; // deg/s
  qDeg: number;
  rDeg: number;

  // Aerodynamics angles
  alphaDeg: number; // Angle of attack (deg)
  betaDeg: number; // Sideslip angle (deg)
  flightPathAngleDeg: number; // Gamma (deg)

  // Energy and G-forces
  loadFactorG: number; // Nz in Gs (1.0 = level flight)
  peakPositiveG: number;
  peakNegativeG: number;
  dynamicPressurePa: number; // q_bar = 0.5 * rho * V^2 (Pa)
  kineticEnergyJoules: number;
  potentialEnergyJoules: number;
  specificEnergyMeters: number; // Es = h + V^2/(2*g)
  specificExcessPowerMps: number; // Ps = dEs/dt

  // Ground status
  onGround: boolean;
  wowNose: boolean;
  wowLeft: boolean;
  wowRight: boolean;
  gearCompression: number; // 0 (unloaded) to 1 (full compression)
  runwayDistMeters: number;
}

export interface MassState {
  emptyMassKg: number;
  internalFuelKg: number;
  payloadKg: number;
  totalMassKg: number;
  cgPercentMac: number; // % Mean Aerodynamic Chord
  ixx: number; // kg*m^2
  iyy: number;
  izz: number;
  ixz: number;
}

export interface ControlInputs {
  pitchInput: number; // -1 (push) to +1 (pull)
  rollInput: number; // -1 (left) to +1 (right)
  yawInput: number; // -1 (left) to +1 (right)
  throttle: number; // 0.0 to 1.0 (idle to 100% mil / afterburner)
  leftBrake: number; // 0 to 1
  rightBrake: number; // 0 to 1
  pitchTrim: number; // -1 to +1
  rollTrim: number; // -1 to +1
  yawTrim: number; // -1 to +1
  speedBrakeCommand: boolean;
  flapsCommand: 'AUTO' | 'HALF' | 'FULL';
  gearCommand: boolean; // true = down
  hookCommand: boolean; // true = down
  parkingBrake: boolean;
  antiSkid: boolean;
}

export interface SurfaceDeflections {
  leftStabilatorDeg: number; // -25 to +15 deg
  rightStabilatorDeg: number;
  leftAileronDeg: number; // -20 to +20 deg
  rightAileronDeg: number;
  rudderDeg: number; // -30 to +30 deg
  flapsDeg: number; // 0 to 35 deg
  leadingEdgeFlapsDeg: number; // 0 to 25 deg
  speedBrakePercent: number; // 0 to 100%
}

export type EngineMode =
  | 'OFF'
  | 'CRANKING'
  | 'STARTING'
  | 'IGNITION'
  | 'ACCELERATING'
  | 'IDLE'
  | 'MILITARY'
  | 'AFTERBURNER'
  | 'FLAMEOUT'
  | 'FAILED';

export interface EngineSystemState {
  mode: EngineMode;
  masterSwitch: boolean;
  engineStartSwitch: 'OFF' | 'CRANK' | 'START';
  afterburnerActive: boolean;
  afterburnerStage: number; // 0 to 5
  n1RpmPercent: number; // Low pressure spool 0-105%
  n2RpmPercent: number; // High pressure spool 0-108%
  egtDegC: number; // Exhaust gas temperature
  fuelFlowPph: number; // Pounds per hour
  fuelFlowKgps: number; // kg/s
  thrustKn: number; // Current thrust in kN
  maxMilThrustKn: number;
  maxAbThrustKn: number;
  oilPressurePsi: number;
  oilTempDegC: number;
  nozzlePositionPercent: number;
  vibrationMmPerSec: number;
  starterTimerSeconds: number;
  health: number; // 0 to 1
  fireWarning: boolean;
  temperatureCaution: boolean;
}

export interface FuelTank {
  name: string;
  capacityKg: number;
  currentKg: number;
  pumpOn: boolean;
  pumpHealth: number; // 0 to 1
  temperatureDegC: number;
}

export interface FuelSystemState {
  tanks: {
    forward: FuelTank;
    collector: FuelTank;
    aft: FuelTank;
    leftWing: FuelTank;
    rightWing: FuelTank;
    external: FuelTank;
  };
  totalFuelKg: number;
  totalCapacityKg: number;
  fuelPressurePsi: number;
  crossFeedOpen: boolean;
  dumpValveOpen: boolean;
  externalTransferActive: boolean;
  bingoFuelKg: number;
  jokerFuelKg: number;
  remainingEnduranceMinutes: number;
  estimatedRangeNm: number;
  fuelLowCaution: boolean;
  imbalanceWarning: boolean;
  fuelLeak: boolean;
}

export interface HydraulicSystemState {
  systemAPressurePsi: number; // Nominal 3000 PSI
  systemBPressurePsi: number; // Nominal 3000 PSI
  pumpAEngDriven: boolean;
  pumpBEngDriven: boolean;
  electricAuxPumpOn: boolean;
  ptuActive: boolean; // Power Transfer Unit
  reservoirAQuantityPercent: number;
  reservoirBQuantityPercent: number;
  hydraulicTempDegC: number;
  lowPressureCautionA: boolean;
  lowPressureCautionB: boolean;
  totalActuatorAuthority: number; // 0 to 1
}

export interface CircuitBreakerState {
  id: string;
  name: string;
  subsystem: string;
  tripped: boolean; // true = popped/tripped (open circuit)
  ratingAmps: number;
}

export interface ElectricalSystemState {
  batterySwitch: boolean;
  batteryVoltageVolts: number; // Nominal 24-28V
  batteryChargePercent: number;
  mainGeneratorSwitch: boolean;
  mainGenActive: boolean;
  mainGenLoadPercent: number;
  mainGenVoltageVolts: number; // Nominal 115V AC
  externalPowerConnected: boolean;
  externalPowerSwitch: boolean;
  busTieClosed: boolean;
  acBusPowered: boolean;
  dcEssentialBusPowered: boolean;
  avionicsBusPowered: boolean;
  totalAmpsDrawn: number;
  circuitBreakers: Record<string, CircuitBreakerState>;
  generatorFailWarning: boolean;
  batteryDischargingWarning: boolean;
}

export interface FlcsState {
  flightControlMode: 'NORMAL' | 'DEGRADED' | 'DIRECT_MANUAL';
  channel1Healthy: boolean;
  channel2Healthy: boolean;
  channel3Healthy: boolean;
  channel4Healthy: boolean;
  gLimiterActive: boolean;
  aoaLimiterActive: boolean;
  rollRateLimiterActive: boolean;
  stallWarningActive: boolean;
  surfaces: SurfaceDeflections;
  pitchTrimPos: number;
  rollTrimPos: number;
  yawTrimPos: number;
}

export type GearTransitState = 'UP_LOCKED' | 'TRANSIT_DOWN' | 'DOWN_LOCKED' | 'TRANSIT_UP' | 'UNSAFE';

export interface LandingGearState {
  handleDown: boolean;
  transitState: GearTransitState;
  noseGearPercent: number; // 0 = up, 1 = locked down
  leftMainGearPercent: number;
  rightMainGearPercent: number;
  gearDoorsOpen: boolean;
  emergencyGearExtended: boolean;
  gearWarningHorn: boolean;
  wheelSpeedKnots: {
    nose: number;
    left: number;
    right: number;
  };
  brakePressurePsi: {
    left: number;
    right: number;
  };
  antiSkidActive: boolean;
  tiresBlown: {
    nose: boolean;
    left: boolean;
    right: boolean;
  };
}

export interface EcsOxygenState {
  bleedAirSwitch: 'OFF' | 'NORM' | 'HIGH';
  cockpitTempDegC: number;
  cabinPressurePsi: number;
  cabinDiffPressurePsi: number;
  cabinAltitudeFt: number;
  cockpitAirflowCfm: number;
  canopyDefog: boolean;
  pitotHeatSwitch: boolean;
  pitotIced: boolean;
  obogsOxygenSwitch: boolean;
  oxygenPressurePsi: number;
  oxygenPurityPercent: number;
  oxygenFlowLpm: number;
  cabinAltitudeWarning: boolean;
  hypoxiaRiskWarning: boolean;
}

export interface CanopyState {
  positionPercent: number; // 0 = closed & sealed, 1 = fully open
  switchState: 'CLOSE' | 'HOLD' | 'OPEN';
  canopyLocked: boolean;
  canopySealPressurePsi: number;
  canopyUnsafeWarning: boolean;
}

export interface LightingState {
  masterExterior: boolean;
  antiCollisionStrobe: boolean;
  navLights: boolean;
  formationLightsPercent: number; // 0-100
  taxiLandingLight: 'OFF' | 'TAXI' | 'LAND';
  cockpitFloodPercent: number;
  panelBacklightPercent: number;
  instrumentsBrightnessPercent: number;
  hudBrightnessPercent: number;
  mfdBrightnessPercent: number;
}

export interface NavWaypoint {
  id: string;
  name: string;
  type: 'AIRPORT' | 'WAYPOINT' | 'TACAN' | 'FIX';
  latitude: number;
  longitude: number;
  altitudeFt: number;
  xMeters: number;
  yMeters: number;
  frequency?: string;
  channel?: string;
}

export interface NavigationState {
  insState: 'OFF' | 'ALIGNING' | 'ALIGN_COMPLETE' | 'NAVIGATING' | 'DEGRADED';
  insAlignmentProgress: number; // 0 to 100%
  insPosition: { lat: number; lon: number; altFt: number };
  insDriftErrorNm: number;
  gnssState: 'ACQUIRING' | 'LOCKED' | 'JAMMED' | 'OFF';
  satellitesLocked: number;
  hdop: number;
  waypoints: NavWaypoint[];
  activeWaypointIndex: number;
  distanceToActiveNm: number;
  bearingToActiveDeg: number;
  trackErrorDeg: number;
  etaSeconds: number;
  ilsCourseDeg: number;
  ilsGlideslopeDevDeg: number; // -2.5 to +2.5 deg
  ilsLocalizerDevDeg: number; // -2.5 to +2.5 deg
  ilsSignalValid: boolean;
}

export interface RadioState {
  comm1Power: boolean;
  comm1FreqMhz: number;
  comm1ActiveFreqMhz: number;
  comm1StandbyFreqMhz: number;
  comm2Power: boolean;
  comm2FreqMhz: number;
  comm2ActiveFreqMhz: number;
  comm2StandbyFreqMhz: number;
  squelchOn: boolean;
  volumePercent: number;
  activeRadio: 'COMM1' | 'COMM2';
  lastTransmission: {
    sender: string;
    message: string;
    timestamp: number;
  } | null;
}

export interface GenericSensorState {
  sensorPower: boolean;
  mode: 'OFF' | 'STANDBY' | 'SEARCH_AZ' | 'TRACK_TWS' | 'AIR_TO_SURFACE';
  rangeScaleNm: number; // 10, 20, 40, 80, 160
  azimuthScanDeg: number; // -60 to +60
  elevationScanDeg: number; // -30 to +30
  syntheticContacts: Array<{
    id: string;
    type: 'CIVIL_TRAFFIC' | 'AIRPORT_BEACON' | 'NAV_AID' | 'SYNTHETIC_TRAINER';
    bearingDeg: number;
    rangeNm: number;
    altitudeFt: number;
    speedKnots: number;
    headingDeg: number;
    xMeters: number;
    yMeters: number;
  }>;
}

export type WarningSeverity = 'INFO' | 'CAUTION' | 'WARNING' | 'CRITICAL';

export interface AnnunciationMessage {
  id: string;
  text: string;
  severity: WarningSeverity;
  subsystem: string;
  timestamp: number;
  acknowledged: boolean;
  audioTone: 'NONE' | 'BEEP' | 'CAUTION_VOICE' | 'WARNING_KLAXON' | 'STALL_HORN';
}

export interface BitSubsystemResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'DEGRADED' | 'TESTING' | 'NOT_TESTED';
  detail: string;
  faultCode?: string;
}

export interface BitState {
  pbitCompleted: boolean;
  cbitActive: boolean;
  ibitInProgress: boolean;
  ibitProgressPercent: number;
  results: Record<string, BitSubsystemResult>;
}

export interface WeatherState {
  temperatureSeaLevelDegC: number;
  temperatureDeviationDegC: number;
  seaLevelPressureHpa: number; // standard 1013.25
  windSpeedKnots: number;
  windDirectionDeg: number;
  gustKnots: number;
  turbulenceIntensity: number; // 0 to 1
  visibilityMeters: number;
  cloudBaseFt: number;
  cloudTopsFt: number;
  precipitation: 'NONE' | 'LIGHT_RAIN' | 'HEAVY_RAIN' | 'SNOW';
  ambientDensityKgM3: number;
  ambientPressurePa: number;
  ambientTempDegC: number;
  speedOfSoundMps: number;
}

export interface FailureState {
  activeFailures: Set<string>;
  scheduledFailures: Array<{
    id: string;
    name: string;
    subsystem: string;
    triggerTimeSec: number;
    triggered: boolean;
  }>;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  category: 'STARTUP' | 'TAKEOFF' | 'CRUISE' | 'APPROACH' | 'EMERGENCY';
  initialState: {
    altitudeFt: number;
    speedKnots: number;
    headingDeg: number;
    onGround: boolean;
    engineRunning: boolean;
    gearDown: boolean;
    flaps: 'AUTO' | 'HALF' | 'FULL';
    fuelPercent: number;
    weatherPreset: 'CLEAR_DAY' | 'OVERCAST_TURBULENCE' | 'STORM_CROSSWIND';
  };
  objectives: string[];
}

export interface EvaluationRecord {
  scenarioId: string;
  takeoffGrade?: {
    liftoffSpeedKts: number;
    centerlineDeviationM: number;
    rotationPitchRateDegS: number;
    score: number; // 0-100
    notes: string[];
  };
  landingGrade?: {
    touchdownSpeedKts: number;
    touchdownFpm: number;
    gForceAtTouchdown: number;
    centerlineDeviationM: number;
    stoppingDistanceM: number;
    score: number; // 0-100
    notes: string[];
  };
  maxGRecorded: number;
  minGRecorded: number;
  stallEventsCount: number;
  overspeedEventsCount: number;
  fuelUsedKg: number;
  flightDurationSeconds: number;
}

export interface CausalEvent {
  timestamp: number;
  subsystem: string;
  cause: string;
  command: string;
  effect: string;
  indication: string;
}

export interface SimulationState {
  // Clock
  simulationTimeSec: number;
  realTimeMs: number;
  paused: boolean;
  timeScale: number;
  physicsTimeStepSec: number;
  frameRateFps: number;
  physicsHz: number;

  // Domain states
  aircraft: AircraftState;
  mass: MassState;
  controls: ControlInputs;
  engine: EngineSystemState;
  fuel: FuelSystemState;
  hydraulic: HydraulicSystemState;
  electrical: ElectricalSystemState;
  flcs: FlcsState;
  gear: LandingGearState;
  ecs: EcsOxygenState;
  canopy: CanopyState;
  lighting: LightingState;
  navigation: NavigationState;
  radio: RadioState;
  sensor: GenericSensorState;
  weather: WeatherState;
  bit: BitState;
  failures: FailureState;

  // Warnings & Annunciations
  warnings: AnnunciationMessage[];
  masterCautionActive: boolean;
  masterWarningActive: boolean;

  // Causal trace
  recentCausalEvents: CausalEvent[];

  // Active mission / scenario
  currentScenario: ScenarioDefinition | null;
  evaluation: EvaluationRecord;
}

export type EcsState = EcsOxygenState;
export type GearSystemState = LandingGearState;
export type BitResult = BitSubsystemResult;

