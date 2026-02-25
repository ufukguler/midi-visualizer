import React, { useState } from 'react';

export default function PracticeMode({
  notes,
  isPlaying,
  onNotePlayed,
  currentNoteIndex,
  setCurrentNoteIndex
}) {
  const [isActive, setIsActive] = useState(false);
  const [waitingForNote, setWaitingForNote] = useState(false);
  const [expectedNote] = useState(null);
  const [playedNotes, setPlayedNotes] = useState([]);

  const togglePracticeMode = () => {
    setIsActive(!isActive);
    if (!isActive) {
      setCurrentNoteIndex(0);
      setPlayedNotes([]);
      setWaitingForNote(false);
    }
  };

  const getNoteName = (midiNumber) => {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const noteName = noteNames[midiNumber % 12];
    const octave = Math.floor(midiNumber / 12) - 1;
    return `${noteName}${octave}`;
  };

  const getUpcomingNotes = () => {
    return notes.slice(currentNoteIndex, currentNoteIndex + 8);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Practice Mode</h3>
        <button
          onClick={togglePracticeMode}
          className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md transition
            ${isActive
              ? "bg-orange-500 hover:bg-orange-400 text-white"
              : "bg-gray-600 hover:bg-gray-500 text-white"
            }`}
        >
          {isActive ? "Exit Practice" : "Start Practice"}
        </button>
      </div>

      {isActive && (
        <div className="space-y-4">
          {/* Current expected note */}
          {waitingForNote && expectedNote && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4">
              <div className="text-center">
                <div className="text-sm text-blue-300 mb-2">Play this note:</div>
                <div className="text-4xl font-bold text-white">
                  {getNoteName(expectedNote)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  MIDI Note: {expectedNote}
                </div>
              </div>
            </div>
          )}

          {/* Incorrect notes feedback */}
          {playedNotes.length > 0 && waitingForNote && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-3">
              <div className="text-sm text-red-300">
                Tried: {playedNotes.map(note => getNoteName(note)).join(', ')}
              </div>
            </div>
          )}

          {/* Upcoming notes preview */}
          <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
            <div className="text-sm text-gray-300 mb-2">Upcoming notes:</div>
            <div className="flex gap-2 flex-wrap">
              {getUpcomingNotes().map((note, index) => (
                <div
                  key={`${note.midi}-${index}`}
                  className={`px-3 py-1 rounded-lg text-sm font-mono
                    ${index === 0
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                    }`}
                >
                  {getNoteName(note.midi)}
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="text-sm text-gray-400">
            Progress: {currentNoteIndex} / {notes.length} notes
            {notes.length > 0 && (
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${(currentNoteIndex / notes.length) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
