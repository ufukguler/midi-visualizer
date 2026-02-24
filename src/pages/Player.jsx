import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";
import Keyboard from "../components/Keyboard";
import { BUILT_IN_SONGS } from "../constants/songs";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function Player() {
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState([]);
  const [ppq, setPpq] = useState(480);
  const [durationSecondsAtSourceTempo, setDurationSecondsAtSourceTempo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pressedNotes, setPressedNotes] = useState([]);
  const [bpm, setBpm] = useState(120);
  const [sourceBpm, setSourceBpm] = useState(null);
  const [volume, setVolume] = useState(0.8);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isLoadingMidi, setIsLoadingMidi] = useState(false);
  const [parseError, setParseError] = useState("");

  const samplerRef = useRef(null);
  const gainRef = useRef(null);
  const scheduledEventIdsRef = useRef([]);
  const audioInitPromiseRef = useRef(null);

  const setupAudioGraph = useCallback(async () => {
    if (audioInitPromiseRef.current) {
      await audioInitPromiseRef.current;
      return;
    }

    if (samplerRef.current && gainRef.current) {
      // Safety: if Tone keeps a pending load promise, await it.
      const maybeLoaded = samplerRef.current.loaded;
      if (maybeLoaded && typeof maybeLoaded.then === "function") {
        await maybeLoaded;
      }
      return;
    }

    audioInitPromiseRef.current = (async () => {
      setIsLoadingSamples(true);
      try {
        const gain = new Tone.Gain(volume).toDestination();
        gainRef.current = gain;

        const sampler = new Tone.Sampler({
          urls: {
            A0: "A0.mp3",
            C1: "C1.mp3",
            "D#1": "Ds1.mp3",
            "F#1": "Fs1.mp3",
            A1: "A1.mp3",
            C2: "C2.mp3",
            "D#2": "Ds2.mp3",
            "F#2": "Fs2.mp3",
            A2: "A2.mp3",
            C3: "C3.mp3",
            "D#3": "Ds3.mp3",
            "F#3": "Fs3.mp3",
            A3: "A3.mp3",
            C4: "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            A4: "A4.mp3",
            C5: "C5.mp3",
            "D#5": "Ds5.mp3",
            "F#5": "Fs5.mp3",
            A5: "A5.mp3",
            C6: "C6.mp3",
            "D#6": "Ds6.mp3",
            "F#6": "Fs6.mp3",
            A6: "A6.mp3",
            C7: "C7.mp3",
            "D#7": "Ds7.mp3",
            "F#7": "Fs7.mp3",
            A7: "A7.mp3",
            C8: "C8.mp3",
          },
          release: 1,
          baseUrl: "https://tonejs.github.io/audio/salamander/",
        }).connect(gain);

        samplerRef.current = sampler;
        await sampler.loaded;
      } catch (error) {
        samplerRef.current = null;
        gainRef.current = null;
        audioInitPromiseRef.current = null;
        throw error;
      } finally {
        setIsLoadingSamples(false);
      }
    })();

    await audioInitPromiseRef.current;
  }, [volume]);

  const clearScheduled = useCallback(() => {
    if (scheduledEventIdsRef.current.length) {
      scheduledEventIdsRef.current.forEach((id) => Tone.Transport.clear(id));
      scheduledEventIdsRef.current = [];
    }
    Tone.Transport.cancel(0);
  }, []);

  useEffect(() => {
    return () => {
      clearScheduled();
      Tone.Transport.stop();
    };
  }, [clearScheduled]);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.rampTo(volume, 0.03);
    }
  }, [volume]);

  useEffect(() => {
    // Preload piano samples as soon as the player mounts
    // so Play does not have to wait for GitHub fetches.
    void setupAudioGraph();
  }, [setupAudioGraph]);

  const parseMidiArrayBuffer = useCallback((arrayBuffer, nameForUi) => {
    const midi = new Midi(arrayBuffer);

    const collectedNotes = midi.tracks.flatMap((track) =>
      track.notes.map((note) => ({
        ticks: note.ticks,
        durationTicks: note.durationTicks,
        midi: note.midi,
        velocity: note.velocity,
      }))
    );

    collectedNotes.sort((a, b) => a.ticks - b.ticks);

    const nextPpq = midi.header.ppq || 480;
    const nextDurationSeconds = midi.duration || 0;
    const nextSourceBpm =
      midi.header?.tempos && midi.header.tempos.length > 0
        ? midi.header.tempos[0].bpm
        : 120;
    const nextBpm = clamp(Math.round(nextSourceBpm), 30, 240);

    setFileName(nameForUi);
    setNotes(collectedNotes);
    setPpq(nextPpq);
    setDurationSecondsAtSourceTempo(nextDurationSeconds);
    setSourceBpm(nextSourceBpm);
    setBpm(nextBpm);

    return { collectedNotes, nextPpq, nextDurationSeconds, nextBpm, nextSourceBpm };
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    setParseError("");
    setPressedNotes([]);
    setIsPlaying(false);
    clearScheduled();
    Tone.Transport.stop();
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

  const stopPlayback = useCallback(() => {
    clearScheduled();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setPressedNotes([]);
    setIsPlaying(false);
  }, [clearScheduled]);

  const startPlayback = async (overrides) => {
    const notesToPlay = overrides?.notes ?? notes;
    const ppqToUse = overrides?.ppq ?? ppq;
    const bpmToUse = overrides?.bpm ?? bpm;

    if (!notesToPlay.length) {
      return;
    }

    stopPlayback();

    await Tone.start();
    setIsAudioReady(true);

    await setupAudioGraph();

    if (!samplerRef.current) {
      return;
    }

    setIsPlaying(true);

    Tone.Transport.PPQ = ppqToUse;
    Tone.Transport.bpm.value = clamp(bpmToUse, 30, 240);
    Tone.Transport.position = 0;

    const sampler = samplerRef.current;

    let maxEndTick = 0;
    notesToPlay.forEach((note) => {
      const noteName = Tone.Frequency(note.midi, "midi").toNote();
      const startTick = `${note.ticks}i`;
      const durationTicks = `${Math.max(1, note.durationTicks)}i`;
      const endTick = `${note.ticks + Math.max(1, note.durationTicks)}i`;
      const vel = clamp(note.velocity ?? 0.9, 0, 1);
      maxEndTick = Math.max(maxEndTick, note.ticks + Math.max(1, note.durationTicks));

      const noteOnId = Tone.Transport.schedule((time) => {
        try {
          sampler.triggerAttackRelease(noteName, durationTicks, time, vel);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("Sampler trigger failed for note", noteName, error);
        }
        setPressedNotes((prev) => {
          if (prev.includes(note.midi)) return prev;
          return [...prev, note.midi];
        });
      }, startTick);

      const noteOffId = Tone.Transport.schedule(() => {
        setPressedNotes((prev) => prev.filter((n) => n !== note.midi));
      }, endTick);

      scheduledEventIdsRef.current.push(noteOnId, noteOffId);
    });

    const endId = Tone.Transport.scheduleOnce(() => {
      setPressedNotes([]);
      setIsPlaying(false);
      Tone.Transport.stop();
      Tone.Transport.position = 0;
    }, `${maxEndTick + 1}i`);

    scheduledEventIdsRef.current.push(endId);

    Tone.Transport.start("+0.05");
  };

  const loadAndPlayBuiltIn = async (song) => {
    setParseError("");
    setIsLoadingMidi(true);

    try {
      stopPlayback();
      setPressedNotes([]);
      setIsPlaying(false);
      clearScheduled();
      Tone.Transport.stop();

      const response = await fetch(song.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const parsed = parseMidiArrayBuffer(arrayBuffer, song.label);
      await startPlayback({
        notes: parsed.collectedNotes,
        ppq: parsed.nextPpq,
        bpm: parsed.nextBpm,
      });
    } catch (error) {
      setParseError(`Failed to load "${song.label}".`);
      setNotes([]);
      setDurationSecondsAtSourceTempo(0);
      setSourceBpm(null);
    } finally {
      setIsLoadingMidi(false);
    }
  };

  const canPlay = notes.length > 0 && !isPlaying && !isLoadingMidi;
  const bpmLabel = useMemo(() => clamp(bpm, 30, 240), [bpm]);
  const volumeLabel = useMemo(() => `${Math.round(clamp(volume, 0, 1) * 100)}%`, [volume]);

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-65px)] bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mt-6 mb-1">MIDI File Player</h1>
      <p className="text-gray-400 mb-6 text-center max-w-xl">
        Upload a MIDI file and watch it play on the virtual piano keyboard.
      </p>

      <div className="flex gap-6 items-start">
        {/* Built-in songs column */}
        <div className="w-64 bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
          <div className="text-sm font-semibold text-gray-300 mb-3">Built-in songs</div>
          <div className="flex flex-wrap gap-2">
            {BUILT_IN_SONGS.map((song) => (
              <button
                key={song.id}
                type="button"
                onClick={() => loadAndPlayBuiltIn(song)}
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

        {/* Original card */}
        <div className="w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={startPlayback}
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
                  onClick={stopPlayback}
                  disabled={!isPlaying && !pressedNotes.length}
                  className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md transition
                    ${
                      isPlaying || pressedNotes.length
                        ? "bg-red-500 hover:bg-red-400 text-white"
                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  Stop
                </button>
              </div>
            </div>

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
          </div>

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
                onChange={(e) => setVolume(Number(e.target.value))}
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
                  setBpm(next);
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
                    setBpm(next);
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
        </div>
      </div>

      <div className="mt-auto mb-12 w-full overflow-x-auto pb-4">
        <Keyboard pressedNotes={pressedNotes} />
      </div>
    </div>
  );
}
