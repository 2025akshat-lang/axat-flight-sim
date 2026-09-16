/**
 * Flight Control Inputs: Virtual Control Stick, Rudder, and Keyboard Mapping
 */

import React, { useState, useEffect, useRef } from 'react';
import { cockpitAudio } from '../../core/audioSynthesizer';

interface VirtualStickRudderProps {
  pitch: number;
  roll: number;
  yaw: number;
  onStickChange: (pitch: number, roll: number) => void;
  onRudderChange: (yaw: number) => void;
  onToeBrakes: (left: number, right: number) => void;
  onToggleGear: () => void;
  onToggleSpeedBrake: () => void;
  onFlapsChange: () => void;
  throttle: number;
  onThrottleChange: (val: number) => void;
}

export const VirtualStickRudder: React.FC<VirtualStickRudderProps> = ({
  pitch,
  roll,
  yaw,
  onStickChange,
  onRudderChange,
  onToeBrakes,
  onToggleGear,
  onToggleSpeedBrake,
  onFlapsChange,
  throttle,
  onThrottleChange,
}) => {
  const [isDraggingStick, setIsDraggingStick] = useState(false);
  const stickAreaRef = useRef<HTMLDivElement | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          onStickChange(Math.max(-1.0, pitch - 0.2), roll); // Pitch down
          break;
        case 's':
        case 'arrowdown':
          onStickChange(Math.min(1.0, pitch + 0.2), roll); // Pitch up
          break;
        case 'a':
        case 'arrowleft':
          onStickChange(pitch, Math.max(-1.0, roll - 0.2)); // Roll left
          break;
        case 'd':
        case 'arrowright':
          onStickChange(pitch, Math.min(1.0, roll + 0.2)); // Roll right
          break;
        case 'q':
          onRudderChange(Math.max(-1.0, yaw - 0.25));
          break;
        case 'e':
          onRudderChange(Math.min(1.0, yaw + 0.25));
          break;
        case 'g':
          onToggleGear();
          break;
        case 'f':
          onFlapsChange();
          break;
        case 'b':
          onToggleSpeedBrake();
          break;
        case ' ':
          onToeBrakes(1.0, 1.0);
          break;
        case '+':
        case '=':
          onThrottleChange(Math.min(1.0, throttle + 0.05));
          break;
        case '-':
        case '_':
          onThrottleChange(Math.max(0.0, throttle - 0.05));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 's':
        case 'arrowup':
        case 'arrowdown':
          onStickChange(0, roll);
          break;
        case 'a':
        case 'd':
        case 'arrowleft':
        case 'arrowright':
          onStickChange(pitch, 0);
          break;
        case 'q':
        case 'e':
          onRudderChange(0);
          break;
        case ' ':
          onToeBrakes(0, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [pitch, roll, yaw, throttle, onStickChange, onRudderChange, onToeBrakes, onToggleGear, onFlapsChange, onToggleSpeedBrake, onThrottleChange]);

  // Pointer drag for 2D stick
  const handleStickPointerDown = (e: React.PointerEvent) => {
    setIsDraggingStick(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateStickPos(e.clientX, e.clientY);
  };

  const handleStickPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingStick) return;
    updateStickPos(e.clientX, e.clientY);
  };

  const handleStickPointerUp = (e: React.PointerEvent) => {
    setIsDraggingStick(false);
    onStickChange(0, 0); // Spring return to center
  };

  const updateStickPos = (clientX: number, clientY: number) => {
    if (!stickAreaRef.current) return;
    const rect = stickAreaRef.current.getBoundingClientRect();
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;

    const relX = (clientX - (rect.left + halfW)) / halfW;
    const relY = (clientY - (rect.top + halfH)) / halfH;

    const clampedRoll = Math.max(-1.0, Math.min(1.0, relX));
    // Up is negative pitch in aerospace (push nose down)
    const clampedPitch = Math.max(-1.0, Math.min(1.0, relY));

    onStickChange(clampedPitch, clampedRoll);
  };

  const toggleSound = () => {
    cockpitAudio.init();
    const muted = cockpitAudio.toggleMute();
    setSoundMuted(muted);
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-[#0d121c] border border-zinc-800 rounded-lg p-2.5 font-mono select-none">
      {/* 2D Virtual Control Stick */}
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-bold text-zinc-400 mb-1">FLIGHT CONTROL STICK</span>
        <div
          ref={stickAreaRef}
          onPointerDown={handleStickPointerDown}
          onPointerMove={handleStickPointerMove}
          onPointerUp={handleStickPointerUp}
          className="relative w-28 h-28 bg-zinc-950 border-2 border-zinc-700 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-inner"
          title="Drag to pitch/roll. Springs to center when released. (Keys: W/S/A/D)"
        >
          {/* Neutral Crosshairs */}
          <div className="absolute w-full h-[1px] bg-zinc-800 pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-zinc-800 pointer-events-none" />

          {/* Stick Grip Pip */}
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-b from-zinc-600 via-zinc-800 to-black border-2 border-emerald-400 shadow-md flex items-center justify-center transition-transform"
            style={{
              transform: `translate(${roll * 36}px, ${pitch * 36}px)`,
            }}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
        </div>
      </div>

      {/* Rudder Slider & Pedals */}
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-bold text-zinc-400 mb-1">RUDDER / YAW</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRudderChange(Math.max(-1.0, yaw - 0.2))}
            className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300 active:bg-emerald-800"
            title="Rudder Left (Q)"
          >
            ◀ L
          </button>
          <div className="relative w-24 h-5 bg-zinc-950 border border-zinc-800 rounded flex items-center justify-center">
            <div className="absolute w-[1px] h-full bg-zinc-700" />
            <div
              className="w-3 h-4 bg-emerald-500 rounded-sm shadow"
              style={{ transform: `translateX(${yaw * 36}px)` }}
            />
          </div>
          <button
            onClick={() => onRudderChange(Math.min(1.0, yaw + 0.2))}
            className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300 active:bg-emerald-800"
            title="Rudder Right (E)"
          >
            R ▶
          </button>
        </div>
        <span className="text-[8px] text-zinc-500 mt-1">CENTER SPRING ACTIVE</span>
      </div>

      {/* Keyboard Quick Reference & Audio */}
      <div className="flex flex-col justify-between h-full text-[9px] text-zinc-400 bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-zinc-300">KEYS:</span>
          <button
            onClick={toggleSound}
            className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
              soundMuted ? 'bg-red-900 text-red-200' : 'bg-emerald-900 text-emerald-200'
            }`}
          >
            {soundMuted ? 'AUDIO: OFF' : 'AUDIO: ON'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px]">
          <span>W/S: Pitch Up/Dn</span>
          <span>A/D: Roll Left/Rt</span>
          <span>Q/E: Rudder Yaw</span>
          <span>+/-: Throttle</span>
          <span>G: Gear Up/Dn</span>
          <span>B: Speedbrake</span>
          <span>F: Flaps cycle</span>
          <span>Space: Toe Brakes</span>
        </div>
      </div>
    </div>
  );
};
