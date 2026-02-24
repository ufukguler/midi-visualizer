import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const useMidiPlayer = () => {
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

  return {
    // State
    fileName,
    notes,
    ppq,
    durationSecondsAtSourceTempo,
    isPlaying,
    pressedNotes,
    bpm,
    sourceBpm,
    volume,
    isAudioReady,
    isLoadingSamples,
    isLoadingMidi,
    parseError,
    canPlay,
    
    // Actions
    setVolume,
    setBpm,
    handleFileChange,
    startPlayback,
    stopPlayback,
    loadAndPlayBuiltIn,
  };
};
