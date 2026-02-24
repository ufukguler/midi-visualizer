import React, { useState, useEffect, useCallback, useRef } from "react";
import Keyboard from "../components/Keyboard";

const useMIDI = () => {
  const [inputs, setInputs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeNotes, setActiveNotes] = useState([]);
  const [noteHistory, setNoteHistory] = useState([]);
  const [error, setError] = useState(null);
  const timeouts = useRef({});

  const onMIDIMessage = useCallback((message) => {
    const [status, data1, data2] = message.data;
    const type = status & 0xf0;
    const midiNumber = data1;
    const velocity = data2;

    if (type === 144 && velocity > 0) { // Note On
      const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const noteName = noteNames[midiNumber % 12];
      const octave = Math.floor(midiNumber / 12) - 2;

      const newNote = {
        midiNumber,
        note: `${noteName}${octave}`,
        velocity,
        timestamp: Date.now()
      };

      // Update history (always add new event)
      setNoteHistory(prev => [...prev.slice(-19), newNote]);

      // Handle active state for keyboard with delay
      if (timeouts.current[midiNumber]) {
        clearTimeout(timeouts.current[midiNumber]);
        delete timeouts.current[midiNumber];
      }

      setActiveNotes(prev => {
        const others = prev.filter(n => n.midiNumber !== midiNumber);
        return [...others, newNote];
      });
    } else if (type === 128 || (type === 144 && velocity === 0)) { // Note Off
      setActiveNotes(prev => prev.filter(n => n.midiNumber !== midiNumber));
    }
  }, []);

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setError("Your browser does not support MIDI.");
      return;
    }

    let midiAccess = null;

    navigator.requestMIDIAccess().then((access) => {
      midiAccess = access;
      const updateInputs = () => {
        const inputList = Array.from(access.inputs.values());
        setInputs(inputList);
      };

      updateInputs();
      access.onstatechange = updateInputs;
    }).catch((err) => {
      setError("MIDI access denied: " + err.message);
    });

    return () => {
      if (midiAccess) midiAccess.onstatechange = null;
    };
  }, []);

  useEffect(() => {
    const selectedInput = inputs.find(i => i.id === selectedId) || inputs[0];
    if (selectedInput) {
      selectedInput.onmidimessage = onMIDIMessage;
      return () => {
        selectedInput.onmidimessage = null;
      };
    }
  }, [inputs, selectedId, onMIDIMessage]);

  return { inputs, selectedId, setSelectedId, activeNotes, noteHistory, error };
};

export default function Home() {
  const { inputs, selectedId, setSelectedId, activeNotes, noteHistory, error } = useMIDI();

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-65px)] bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mt-6 mb-2">Yamaha PSR-E383 MIDI Visualizer</h1>
      <p className="text-gray-400 mb-4">Connect your MIDI keyboard to see it in action</p>

      {/* MIDI Status Bar */}
      <div className="bg-gray-800 rounded-full px-6 py-2 mb-8 flex items-center space-x-4 border border-gray-700 shadow-lg min-h-[44px]">
        {error ? (
          <div className="flex items-center space-x-2 text-red-400">
            <span className="text-sm font-medium">{error}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${inputs.length > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
              <span className="text-sm font-medium">{inputs.length} MIDI Devices Found</span>
            </div>

            {inputs.length > 0 && (
              <div className="flex items-center space-x-2 border-l border-gray-700 pl-4">
                <span className="text-sm text-gray-400">Input:</span>
                <select
                  value={selectedId || inputs[0]?.id || ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer hover:text-blue-400 appearance-none"
                >
                  {inputs.map(input => (
                    <option key={input.id} value={input.id} className="bg-gray-800">{input.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex-grow flex items-center justify-center w-full overflow-hidden">
        <div className="relative w-full h-80 flex items-center justify-center">
          {noteHistory.length > 0 ? (
            <div className="relative w-full flex items-center justify-center">
              {noteHistory.slice().reverse().map((note, index) => (
                <div
                  key={`${note.midiNumber}-${note.timestamp}`}
                  className={`absolute p-8 rounded-xl shadow-lg border-4 border-white transition-transform duration-300 ease-out ${note.note.includes('#') ? 'bg-red-500' : 'bg-blue-600'}`}
                  style={{
                    // Direct linear shift to the left, with opacity gradient
                    transform: `translateX(${index * -260}px)`,
                    zIndex: 100 - index,
                    width: '240px',
                    opacity: Math.max(0.1, 0.9 - index * 0.3),
                  }}
                >
                  <div className="text-center">
                    <p className="font-black text-white text-6xl drop-shadow-md">
                      {note.note}
                    </p>
                    <p className="text-sm text-white font-bold mt-2 opacity-90 uppercase tracking-tighter shadow-sm">
                      {index === 0 ? 'Latest' : `Prev ${index}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 border-4 border-gray-700 rounded-3xl p-12">
              <p className="text-3xl text-gray-400 italic font-bold">Waiting for input...</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto mb-12 w-full overflow-x-auto pb-4">
        <Keyboard pressedNotes={activeNotes.map(n => n.midiNumber)} />
      </div>
    </div>
  );
}
