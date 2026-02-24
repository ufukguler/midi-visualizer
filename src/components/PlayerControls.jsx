import React from "react";

export default function PlayerControls({ 
  fileName, 
  parseError, 
  canPlay, 
  isLoadingSamples, 
  onFileChange, 
  onStartPlayback, 
  onStopPlayback 
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="midi-file"
          className="text-sm font-semibold text-gray-300"
        >
          MIDI file
        </label>
        <input
          id="midi-file"
          type="file"
          accept=".mid,.midi"
          onChange={onFileChange}
          className="block text-sm text-gray-300
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-500
            cursor-pointer"
        />
        <span className="text-xs text-gray-500">
          Supported formats: .mid, .midi
        </span>
        {parseError ? (
          <span className="text-xs text-red-400 font-semibold">
            {parseError}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onStartPlayback}
          disabled={!canPlay || isLoadingSamples}
          className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md transition
            ${
              canPlay && !isLoadingSamples
                ? "bg-green-500 hover:bg-green-400 text-white"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
        >
          {isLoadingSamples ? "Loading…" : "Play"}
        </button>
        <button
          type="button"
          onClick={onStopPlayback}
          disabled={!canPlay}
          className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md transition
            ${
              canPlay
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
        >
          Stop
        </button>
      </div>
    </div>
  );
}
