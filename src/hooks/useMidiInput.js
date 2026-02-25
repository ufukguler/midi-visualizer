import { useState, useEffect, useCallback } from 'react';

export const useMidiInput = (onNoteReceived) => {
  const [inputs, setInputs] = useState([]);
  const [selectedInput, setSelectedInput] = useState(null);
  const [error, setError] = useState(null);

  const onMIDIMessage = useCallback((message) => {
    const [status, data1, data2] = message.data;
    const type = status & 0xf0;
    const midiNumber = data1;
    const velocity = data2;

    // Note On with velocity > 0
    if (type === 144 && velocity > 0) {
      onNoteReceived?.(midiNumber, velocity);
    }
  }, [onNoteReceived]);

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
        
        // Auto-select first input if none selected
        if (!selectedInput && inputList.length > 0) {
          setSelectedInput(inputList[0].id);
        }
      };

      updateInputs();
      access.onstatechange = updateInputs;
    }).catch((err) => {
      setError("MIDI access denied: " + err.message);
    });

    return () => {
      if (midiAccess) midiAccess.onstatechange = null;
    };
  }, [selectedInput]);

  useEffect(() => {
    const selectedInputDevice = inputs.find(i => i.id === selectedInput) || inputs[0];
    if (selectedInputDevice) {
      selectedInputDevice.onmidimessage = onMIDIMessage;
      return () => {
        selectedInputDevice.onmidimessage = null;
      };
    }
  }, [inputs, selectedInput, onMIDIMessage]);

  return {
    inputs,
    selectedInput,
    setSelectedInput,
    error,
    isConnected: inputs.length > 0
  };
};
