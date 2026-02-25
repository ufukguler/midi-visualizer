import React, { useState, useCallback } from 'react';
import { Midi } from "@tonejs/midi";
import PracticeMode from "../components/PracticeMode";
import VexFlowSheetMusic from "../components/VexFlowSheetMusic";
import { useMidiInput } from "../hooks/useMidiInput";
import { BUILT_IN_SONGS } from "../constants/songs";

export default function Practice() {
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState([]);
  const [durationSecondsAtSourceTempo, setDurationSecondsAtSourceTempo] = useState(0);
  const [isLoadingMidi, setIsLoadingMidi] = useState(false);
  const [parseError, setParseError] = useState("");

  // Practice mode state
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);

  // MIDI input for practice mode
  const { inputs, error: midiError } = useMidiInput(
    useCallback((midiNote, velocity) => {
      if (practiceMode) {
        // Handle practice mode note input
        // This will be handled by the PracticeMode component
      }
    }, [practiceMode])
  );

  const parseMidiArrayBuffer = useCallback((arrayBuffer, nameForUi) => {
    const midi = new Midi(arrayBuffer);

    const collectedNotes = midi.tracks.flatMap((track, trackIndex) =>
      track.notes.map((note) => ({
        ticks: note.ticks,
        durationTicks: note.durationTicks,
        midi: note.midi,
        velocity: note.velocity,
        track: trackIndex, // Preserve track information
      }))
    );

    collectedNotes.sort((a, b) => a.ticks - b.ticks);

    const nextDurationSeconds = midi.duration || 0;
    const nextSourceBpm =
      midi.header?.tempos && midi.header.tempos.length > 0
        ? midi.header.tempos[0].bpm
        : 120;

    setFileName(nameForUi);
    setNotes(collectedNotes);
    setDurationSecondsAtSourceTempo(nextDurationSeconds);
    setCurrentNoteIndex(0);

    return { collectedNotes, nextDurationSeconds, nextSourceBpm };
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    setParseError("");
    setPracticeMode(false);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      parseMidiArrayBuffer(arrayBuffer, file.name);
    } catch (error) {
      setParseError("Failed to parse MIDI file. Please try a different file.");
      setNotes([]);
      setDurationSecondsAtSourceTempo(0);
    }
  };

  const loadBuiltInSong = async (song) => {
    setParseError("");
    setIsLoadingMidi(true);

    try {
      setFileName(song.name);
      setPracticeMode(false);
      setCurrentNoteIndex(0);

      const response = await fetch(song.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      parseMidiArrayBuffer(arrayBuffer, song.label);
    } catch (error) {
      setParseError(`Failed to load "${song.label}".`);
      setNotes([]);
      setDurationSecondsAtSourceTempo(0);
    } finally {
      setIsLoadingMidi(false);
    }
  };

  const handlePracticeNotePlayed = (noteIndex) => {
    // Move to next note when correct note is played
    setCurrentNoteIndex(prev => prev + 1);
  };

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-81px)] bg-gray-900 text-white p-4">
      <div className="flex gap-6 justify-center w-full">
        {/* Built-in songs sidebar */}
        <div className="w-128 bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
          <div className="text-sm font-semibold text-gray-300 mb-3">Built-in songs</div>
          <div className="flex flex-wrap gap-2">
            {BUILT_IN_SONGS.map((song) => (
              <button
                key={song.id}
                type="button"
                onClick={() => loadBuiltInSong(song)}
                disabled={isLoadingMidi}
                className={`px-3 py-2 rounded-full text-sm font-semibold shadow-md transition
                  ${!isLoadingMidi
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  }`}
              >
                {song.label}
              </button>
            ))}
          </div>

          {/* MIDI Input Status */}
          <div className="mt-6">
            <div className="text-sm font-semibold text-gray-300 mb-2">MIDI Input</div>
            {midiError ? (
              <div className="text-xs text-red-400">{midiError}</div>
            ) : inputs.length > 0 ? (
              <div className="text-xs text-green-400">
                {inputs.length} device(s) connected
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                No MIDI devices found
              </div>
            )}
          </div>

          <div className="mt-6">

            {/* File upload */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col gap-4">
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
                    onChange={handleFileChange}
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

                {/* File info */}
                {fileName && (
                  <div className="flex flex-col gap-1 text-sm text-gray-400">
                    <div>
                      <span className="font-semibold text-gray-300">Selected file: </span>
                      {fileName}
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-6">

          {/* Practice Mode Component */}
          <PracticeMode
            notes={notes}
            isPlaying={practiceMode}
            onNotePlayed={handlePracticeNotePlayed}
            currentNoteIndex={currentNoteIndex}
            setCurrentNoteIndex={setCurrentNoteIndex}
          />

          {/* Sheet Music */}
          <VexFlowSheetMusic
            notes={notes}
            currentNoteIndex={currentNoteIndex}
          />

        </div>
      </div>
    </div>
  );
}
