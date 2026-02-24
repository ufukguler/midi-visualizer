import React from "react";
import { BUILT_IN_SONGS } from "../constants/songs";

export default function BuiltInSongs({ isLoadingMidi, isLoadingSamples, onLoadSong }) {
  return (
    <div className="w-64 bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
      <div className="text-sm font-semibold text-gray-300 mb-3">Built-in songs</div>
      <div className="flex flex-wrap gap-2">
        {BUILT_IN_SONGS.map((song) => (
          <button
            key={song.id}
            type="button"
            onClick={() => onLoadSong(song)}
            disabled={isLoadingMidi || isLoadingSamples}
            className={`px-3 py-2 rounded-full text-sm font-semibold shadow-md transition
              ${
                !isLoadingMidi && !isLoadingSamples
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
          >
            {song.label}
          </button>
        ))}
      </div>
    </div>
  );
}
