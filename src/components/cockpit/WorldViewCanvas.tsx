/**
 * 3D Synthetic Vision & External World Canvas Renderer
 * Renders runway 09/27, centerline, approach strobes, synthetic terrain grid,
 * horizon, and aircraft 3D model in chase camera mode.
 */

import React, { useEffect, useRef } from 'react';
import { AircraftState, WeatherState } from '../../types/simulation';
import { CONSTANTS } from '../../core/constants';

interface WorldViewCanvasProps {
  aircraft: AircraftState;
  weather: WeatherState;
  cameraMode: 'COCKPIT' | 'CHASE' | 'HUD_ONLY';
}

export const WorldViewCanvas: React.FC<WorldViewCanvasProps> = ({
  aircraft,
  weather,
  cameraMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Sky & Ground Gradients based on aircraft pitch and roll
      const roll = aircraft.roll;
      const pitch = aircraft.pitch;
      const altM = Math.max(0, aircraft.altitude);

      const cx = width / 2;
      const cy = height / 2;

      // Horizon offset based on pitch: ~6 pixels per degree of pitch
      const pitchPixels = (pitch * CONSTANTS.RAD_TO_DEG) * 7.0;

      // Camera transformation
      ctx.translate(cx, cy);
      ctx.rotate(-roll);
      ctx.translate(0, pitchPixels);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, -height * 2, 0, 0);
      skyGrad.addColorStop(0, '#0c1a2d');
      skyGrad.addColorStop(0.7, '#1d3557');
      skyGrad.addColorStop(1, '#457b9d');

      ctx.fillStyle = skyGrad;
      ctx.fillRect(-width * 2, -height * 3, width * 4, height * 3);

      // Ground gradient
      const groundGrad = ctx.createLinearGradient(0, 0, 0, height * 2);
      groundGrad.addColorStop(0, '#1d2719');
      groundGrad.addColorStop(0.3, '#141c12');
      groundGrad.addColorStop(1, '#090d08');

      ctx.fillStyle = groundGrad;
      ctx.fillRect(-width * 2, 0, width * 4, height * 3);

      // Horizon Line
      ctx.strokeStyle = '#a8dadc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-width * 2, 0);
      ctx.lineTo(width * 2, 0);
      ctx.stroke();

      // Synthetic Terrain Elevation Grid (Grid lines on ground plane)
      ctx.strokeStyle = 'rgba(74, 110, 80, 0.25)';
      ctx.lineWidth = 1;
      const gridSpacing = 40;
      for (let y = 10; y < height * 2; y += gridSpacing) {
        const perspectiveY = (y * y) / (height * 0.8);
        if (perspectiveY < height * 2) {
          ctx.beginPath();
          ctx.moveTo(-width * 2, perspectiveY);
          ctx.lineTo(width * 2, perspectiveY);
          ctx.stroke();
        }
      }

      // Runway 09 Rendering (runway threshold near x=0, y=0, heading 090°)
      // Projected runway bounds relative to aircraft position
      const rwyHeadingRad = CONSTANTS.RUNWAY_HEADING_DEG * CONSTANTS.DEG_TO_RAD;
      const relX = CONSTANTS.RUNWAY_ORIGIN_X - aircraft.x;
      const relY = CONSTANTS.RUNWAY_ORIGIN_Y - aircraft.y;

      // Rotate runway into aircraft heading coordinates
      const cosH = Math.cos(-aircraft.yaw);
      const sinH = Math.sin(-aircraft.yaw);
      const camX = cosH * relY - sinH * relX; // lateral offset
      const camZ = sinH * relY + cosH * relX; // forward distance (meters)

      // Perspective projection of runway
      const fov = 420; // Focal length in pixels
      const rwyLen = CONSTANTS.RUNWAY_LENGTH_M;
      const rwyHalfWidth = CONSTANTS.RUNWAY_WIDTH_M / 2.0;

      // Four corners of runway 09 in camera space
      const corners = [
        { z: camZ, x: camX - rwyHalfWidth },
        { z: camZ, x: camX + rwyHalfWidth },
        { z: camZ + rwyLen, x: camX + rwyHalfWidth },
        { z: camZ + rwyLen, x: camX - rwyHalfWidth },
      ];

      const projCorners: Array<{ px: number; py: number } | null> = corners.map((c) => {
        if (c.z <= 5.0) return null; // Behind camera
        const scale = fov / c.z;
        const px = c.x * scale;
        const py = Math.max(0, altM * scale);
        return { px, py };
      });

      if (projCorners.every((c) => c !== null)) {
        // Runway Asphalt polygon
        ctx.fillStyle = '#1c1e22';
        ctx.strokeStyle = '#5a626a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(projCorners[0]!.px, projCorners[0]!.py);
        for (let i = 1; i < 4; i++) {
          ctx.lineTo(projCorners[i]!.px, projCorners[i]!.py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Runway Centerline Dashed Line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, 40 / Math.max(10, camZ * 0.05));
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        const centerNearX = (projCorners[0]!.px + projCorners[1]!.px) / 2;
        const centerNearY = (projCorners[0]!.py + projCorners[1]!.py) / 2;
        const centerFarX = (projCorners[2]!.px + projCorners[3]!.px) / 2;
        const centerFarY = (projCorners[2]!.py + projCorners[3]!.py) / 2;
        ctx.moveTo(centerNearX, centerNearY);
        ctx.lineTo(centerFarX, centerFarY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Runway Threshold Green Lights
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        for (let t = -rwyHalfWidth; t <= rwyHalfWidth; t += 8) {
          const pz = camZ;
          if (pz > 5) {
            const sc = fov / pz;
            const lx = (camX + t) * sc;
            const ly = altM * sc;
            ctx.fillRect(lx - 2, ly - 2, 4, 4);
          }
        }
        ctx.shadowBlur = 0;
      }

      // External Chase Camera Aircraft Wireframe/Model
      if (cameraMode === 'CHASE') {
        ctx.restore();
        ctx.save();
        ctx.translate(cx, cy + 60);
        // Draw synthetic fighter silhouette from behind
        ctx.rotate(roll * 0.6);
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 2;

        // Fuselage and delta wings
        ctx.beginPath();
        ctx.moveTo(0, -35); // Nose forward
        ctx.lineTo(10, 0);
        ctx.lineTo(75, 18); // Right wingtip
        ctx.lineTo(24, 25);
        ctx.lineTo(16, 40); // Right vertical stabilizer
        ctx.lineTo(0, 42); // Exhaust nozzle
        ctx.lineTo(-16, 40); // Left vertical stabilizer
        ctx.lineTo(-24, 25);
        ctx.lineTo(-75, 18); // Left wingtip
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Twin vertical stabilizers
        ctx.strokeStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(-16, 40);
        ctx.lineTo(-18, 15);
        ctx.moveTo(16, 40);
        ctx.lineTo(18, 15);
        ctx.stroke();

        // Afterburner exhaust glow if active
        if (aircraft.mach > 0.05) {
          ctx.fillStyle = '#fb923c';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 42, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [aircraft, weather, cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Mode overlay tag */}
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 border border-zinc-700/80 rounded text-[9px] font-mono text-zinc-400">
        WORLD SYNTHETIC VIEW: {cameraMode}
      </div>
    </div>
  );
};
