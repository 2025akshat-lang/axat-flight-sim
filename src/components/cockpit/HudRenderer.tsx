/**
 * Vector Head-Up Display (HUD) Component
 * Strict collimated symbology: pitch ladder, flight path marker, heading tape,
 * airspeed, altitude, G-meter, AoA, steer cues, and warning annunciations.
 */

import React from 'react';
import { AircraftState, NavigationState, WarningSeverity } from '../../types/simulation';
import { CONSTANTS } from '../../core/constants';

interface HudRendererProps {
  aircraft: AircraftState;
  navigation: NavigationState;
  isPowered: boolean;
  declutterLevel?: number; // 0 = Full, 1 = Reduced, 2 = Minimal
  brightness?: number; // 0 to 100
  masterWarning?: boolean;
}

export const HudRenderer: React.FC<HudRendererProps> = ({
  aircraft,
  navigation,
  isPowered,
  declutterLevel = 0,
  brightness = 90,
  masterWarning = false,
}) => {
  if (!isPowered) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-black/40 border border-zinc-900 rounded-lg">
        <span className="text-[11px] font-mono text-zinc-600 tracking-widest uppercase">HUD OFF (NO POWER / CB TRIPPED)</span>
      </div>
    );
  }

  const hudColor = '#00ff9d';
  const hudColorDim = 'rgba(0, 255, 157, 0.4)';
  const alphaOpacity = brightness / 100.0;

  // Pitch ladder calculations: 1 degree of pitch = 8.5 SVG pixels
  const pitchDeg = aircraft.pitchDeg;
  const rollDeg = aircraft.rollDeg;
  const pixelsPerDegree = 8.5;
  const ladderYOffset = pitchDeg * pixelsPerDegree;

  // Flight path marker (Velocity Vector) offset:
  // FPM horizontal offset proportional to sideslip (beta)
  // FPM vertical offset: pitch minus AoA (gamma)
  const fpmXOffset = -aircraft.betaDeg * 12.0;
  const fpmYOffset = (pitchDeg - aircraft.flightPathAngleDeg) * pixelsPerDegree;

  // Heading tape calculation
  const currentHeading = aircraft.headingDeg;
  const headingTapeWidth = 320;
  const degPerPixelHeading = 3.2; // 1 degree = 3.2 pixels

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none flex items-center justify-center font-mono"
      style={{ opacity: alphaOpacity }}
    >
      <svg
        viewBox="-250 -250 500 500"
        className="w-full h-full max-w-[620px] max-h-[620px] drop-shadow-[0_0_6px_rgba(0,255,157,0.5)]"
      >
        {/* Optical HUD Glass Reticle Frame */}
        <circle cx="0" cy="0" r="230" fill="none" stroke={hudColorDim} strokeWidth="1" strokeDasharray="4 6" />

        {/* 1. Aircraft Waterline Reference (Boresight Cross W) */}
        <g id="hud-waterline" stroke={hudColor} strokeWidth="2" fill="none">
          <line x1="-16" y1="0" x2="-6" y2="0" />
          <line x1="-6" y1="0" x2="0" y2="6" />
          <line x1="0" y1="6" x2="6" y2="0" />
          <line x1="6" y1="0" x2="16" y2="0" />
          <circle cx="0" cy="0" r="2" fill={hudColor} />
        </g>

        {/* 2. Pitch Ladder (Rotates with roll, translates with pitch) */}
        <g
          id="hud-pitch-ladder"
          transform={`rotate(${-rollDeg}) translate(0, ${ladderYOffset})`}
          stroke={hudColor}
          strokeWidth="1.8"
        >
          {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((deg) => {
            const y = -deg * pixelsPerDegree;
            if (Math.abs(deg - pitchDeg) > 28) return null; // clip far rungs

            if (deg === 0) {
              // Horizon Line with open center gap
              return (
                <g key={deg}>
                  <line x1="-120" y1="0" x2="-25" y2="0" strokeWidth="2.5" />
                  <line x1="25" y1="0" x2="120" y2="0" strokeWidth="2.5" />
                </g>
              );
            }

            const isPositive = deg > 0;
            const barWidth = 45;
            const textY = y + 4;

            if (isPositive) {
              // Positive pitch rungs: solid bars with 90° downward tabs
              return (
                <g key={deg}>
                  {/* Left rung */}
                  <line x1={-barWidth - 25} y1={y} x2={-25} y2={y} />
                  <line x1={-barWidth - 25} y1={y} x2={-barWidth - 25} y2={y + 8} />
                  <text x={-barWidth - 45} y={textY} fill={hudColor} fontSize="11" textAnchor="end" stroke="none">
                    {deg}
                  </text>

                  {/* Right rung */}
                  <line x1="25" y1={y} x2={barWidth + 25} y2={y} />
                  <line x1={barWidth + 25} y1={y} x2={barWidth + 25} y2={y + 8} />
                  <text x={barWidth + 32} y={textY} fill={hudColor} fontSize="11" textAnchor="start" stroke="none">
                    {deg}
                  </text>
                </g>
              );
            } else {
              // Negative pitch rungs: dashed lines angled downward
              const absDeg = Math.abs(deg);
              return (
                <g key={deg}>
                  {/* Left rung */}
                  <line x1={-barWidth - 25} y1={y} x2={-25} y2={y} strokeDasharray="5 4" />
                  <line x1={-barWidth - 25} y1={y} x2={-barWidth - 25} y2={y - 8} />
                  <text x={-barWidth - 45} y={textY} fill={hudColor} fontSize="11" textAnchor="end" stroke="none">
                    -{absDeg}
                  </text>

                  {/* Right rung */}
                  <line x1="25" y1={y} x2={barWidth + 25} y2={y} strokeDasharray="5 4" />
                  <line x1={barWidth + 25} y1={y} x2={barWidth + 25} y2={y - 8} />
                  <text x={barWidth + 32} y={textY} fill={hudColor} fontSize="11" textAnchor="start" stroke="none">
                    -{absDeg}
                  </text>
                </g>
              );
            }
          })}
        </g>

        {/* 3. Flight Path Marker (Velocity Vector) */}
        <g
          id="hud-fpm"
          transform={`translate(${fpmXOffset}, ${fpmYOffset})`}
          stroke={hudColor}
          strokeWidth="2"
          fill="none"
        >
          <circle cx="0" cy="0" r="6" />
          <line x1="-14" y1="0" x2="-6" y2="0" />
          <line x1="6" y1="0" x2="14" y2="0" />
          <line x1="0" y1="-6" x2="0" y2="-12" />
        </g>

        {/* 4. Top Heading Tape */}
        <g id="hud-heading-tape">
          <rect x="-110" y="-220" width="220" height="24" fill="rgba(0,0,0,0.5)" stroke={hudColorDim} strokeWidth="1" />
          {/* Lubber Line center triangle */}
          <polygon points="0,-196 -5,-204 5,-204" fill={hudColor} />

          {/* Heading ticks */}
          {[-30, -20, -10, 0, 10, 20, 30].map((offset) => {
            const hVal = (Math.round(currentHeading / 5) * 5 + offset + 360) % 360;
            const xPos = ((hVal - currentHeading) % 360) * degPerPixelHeading;
            if (Math.abs(xPos) > 100) return null;

            return (
              <g key={offset} transform={`translate(${xPos}, -220)`}>
                <line x1="0" y1="0" x2="0" y2="7" stroke={hudColor} strokeWidth="1.5" />
                {hVal % 10 === 0 && (
                  <text x="0" y="18" fill={hudColor} fontSize="10" textAnchor="middle" stroke="none">
                    {Math.round(hVal / 10)}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* 5. Left Airspeed Tape */}
        <g id="hud-airspeed" transform="translate(-180, 0)">
          <rect x="-42" y="-120" width="46" height="240" fill="rgba(0,0,0,0.4)" stroke={hudColorDim} strokeWidth="1" />
          {/* Airspeed Pointer Box */}
          <rect x="-50" y="-14" width="56" height="28" fill="rgba(0, 40, 20, 0.9)" stroke={hudColor} strokeWidth="2" />
          <text x="-22" y="5" fill={hudColor} fontSize="16" fontWeight="bold" textAnchor="middle" stroke="none">
            {Math.round(aircraft.indicatedAirspeedKnots)}
          </text>

          {/* Mach Readout */}
          <text x="-22" y="140" fill={hudColor} fontSize="13" textAnchor="middle" stroke="none">
            M {(aircraft.mach ?? 0).toFixed(2)}
          </text>
        </g>

        {/* 6. Right Altitude Tape */}
        <g id="hud-altitude" transform="translate(180, 0)">
          <rect x="-4" y="-120" width="56" height="240" fill="rgba(0,0,0,0.4)" stroke={hudColorDim} strokeWidth="1" />
          {/* Altitude Pointer Box */}
          <rect x="-8" y="-14" width="68" height="28" fill="rgba(0, 40, 20, 0.9)" stroke={hudColor} strokeWidth="2" />
          <text x="26" y="5" fill={hudColor} fontSize="15" fontWeight="bold" textAnchor="middle" stroke="none">
            {Math.round(aircraft.altitudeFt ?? 0)}
          </text>

          {/* Barometric Setting */}
          <text x="26" y="140" fill={hudColor} fontSize="12" textAnchor="middle" stroke="none">
            29.92
          </text>
        </g>

        {/* 7. Bottom Tactical & G Metrics */}
        {declutterLevel === 0 && (
          <g id="hud-g-meter" transform="translate(-160, 175)">
            <text x="0" y="0" fill={hudColor} fontSize="13" stroke="none">
              G {(aircraft.loadFactorG ?? 1).toFixed(1)} / {(aircraft.peakPositiveG ?? 1).toFixed(1)}
            </text>
            <text x="0" y="18" fill={hudColor} fontSize="13" stroke="none">
              α {(aircraft.alphaDeg ?? 0).toFixed(1)}°
            </text>
          </g>
        )}

        {/* 8. Steerpoint Cue / Nav Info */}
        {declutterLevel < 2 && (
          <g id="hud-steer-cue" transform="translate(110, 175)">
            <text x="0" y="0" fill={hudColor} fontSize="12" stroke="none">
              {navigation.waypoints[navigation.activeWaypointIndex]?.name.slice(0, 8) || 'WP-01'}
            </text>
            <text x="0" y="18" fill={hudColor} fontSize="12" stroke="none">
              {(navigation.distanceToActiveNm ?? 0).toFixed(1)} NM | {Math.round((navigation.etaSeconds ?? 0) / 60)}M
            </text>
          </g>
        )}

        {/* 9. Master Caution / Stall / Warning alerts on HUD */}
        {masterWarning && (
          <g transform="translate(0, -90)">
            <rect x="-90" y="-15" width="180" height="30" fill="rgba(220, 38, 38, 0.85)" stroke="#fff" strokeWidth="2" />
            <text x="0" y="5" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle" stroke="none">
              WARNING / PULL UP
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
