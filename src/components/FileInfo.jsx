import React from "react";

export default function FileInfo({ 
  fileName, 
  sourceBpm, 
  notes, 
  durationSecondsAtSourceTempo, 
  isAudioReady 
}) {
  return (
    <div className="flex flex-col gap-1 text-sm text-gray-400">
      <div>
        <span className="font-semibold text-gray-300">Selected file: </span>
        {fileName || "None"}
      </div>
      <div>
        <span className="font-semibold text-gray-300">File BPM: </span>
        {sourceBpm ? `${Math.round(sourceBpm)}` : "—"}
      </div>
      <div>
        <span className="font-semibold text-gray-300">Notes: </span>
        {notes.length}
      </div>
      <div>
        <span className="font-semibold text-gray-300">Duration: </span>
        {durationSecondsAtSourceTempo
          ? `${durationSecondsAtSourceTempo.toFixed(1)} s`
          : "—"}
      </div>
      <div>
        <span className="font-semibold text-gray-300">Audio: </span>
        {isAudioReady ? "Ready" : "Click Play to enable"}
      </div>
    </div>
  );
}
