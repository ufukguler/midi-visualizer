import React, { useMemo } from "react";
import * as Tone from "tone";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function PlayerSettings({ volume, bpm, onVolumeChange, onBpmChange }) {
  const bpmLabel = useMemo(() => clamp(bpm, 30, 240), [bpm]);
  const volumeLabel = useMemo(() => `${Math.round(clamp(volume, 0, 1) * 100)}%`, [volume]);

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-300">Volume</span>
          <span className="text-xs text-gray-400">{volumeLabel}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-300">BPM</span>
          <span className="text-xs text-gray-400">{bpmLabel}</span>
        </div>
        <input
          type="range"
          min="30"
          max="240"
          step="1"
          value={bpmLabel}
          onChange={(e) => {
            const next = Number(e.target.value);
            onBpmChange(next);
            Tone.Transport.bpm.value = next;
          }}
          className="w-full"
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min="30"
            max="240"
            value={bpmLabel}
            onChange={(e) => {
              const next = clamp(Number(e.target.value), 30, 240);
              onBpmChange(next);
              Tone.Transport.bpm.value = next;
            }}
            className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">
            Changes apply immediately while playing.
          </span>
        </div>
      </div>
    </div>
  );
}
