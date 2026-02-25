import React, { useEffect, useRef, useMemo } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, BarNote, GhostNote } from 'vexflow';

// Custom MIDI to pitch conversion function
const midiToPitch = (midiNumber) => {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const noteName = noteNames[midiNumber % 12];
  const octave = Math.floor(midiNumber / 12) - 1;
  return `${noteName}/${octave}`;
};

export default function VexFlowSheetMusic({ notes, currentNoteIndex, visibleNotes = 16 }) {
  const containerRef = useRef(null);

  // Helper to group notes by ticks
  const groupedNotes = useMemo(() => {
    if (!notes || notes.length === 0) return [];

    const groups = [];
    let currentGroup = null;

    notes.forEach((note, originalIndex) => {
      if (!currentGroup || currentGroup.ticks !== note.ticks) {
        currentGroup = {
          ticks: note.ticks,
          durationTicks: note.durationTicks,
          notes: [],
          originalIndices: []
        };
        groups.push(currentGroup);
      }
      currentGroup.notes.push(note);
      currentGroup.originalIndices.push(originalIndex);
      // Ensure we use the longest note duration for the group representation
      if (note.durationTicks > currentGroup.durationTicks) {
        currentGroup.durationTicks = note.durationTicks;
      }
    });

    return groups;
  }, [notes]);

  // Detect if the MIDI file has multiple tracks (useful for hand splitting)
  const hasMultipleTracks = useMemo(() => {
    const tracks = new Set(notes.filter(n => n.track !== undefined).map(n => n.track));
    return tracks.size > 1;
  }, [notes]);

  // Find which group contains the currentNoteIndex
  const activeGroupIndex = useMemo(() => {
    return groupedNotes.findIndex(group => group.originalIndices.includes(currentNoteIndex));
  }, [groupedNotes, currentNoteIndex]);

  // Helper to convert MIDI ticks to VexFlow duration strings
  // Assuming 480 ticks per quarter note (standard)
  const getVexDuration = (ticks) => {
    if (ticks >= 1920) return 'w';
    if (ticks >= 960) return 'h';
    if (ticks >= 480) return 'q';
    if (ticks >= 240) return '8';
    return '16';
  };

  useEffect(() => {
    if (!containerRef.current || groupedNotes.length === 0) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    try {
      // 1. Initialize Renderer
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);

      // Calculate paging logic based on BEATS/GROUPS
      const safeActiveIndex = activeGroupIndex === -1 ? 0 : activeGroupIndex;
      const pageIndex = Math.floor(safeActiveIndex / visibleNotes);
      const startIndex = pageIndex * visibleNotes;
      const visibleGroups = groupedNotes.slice(startIndex, startIndex + visibleNotes);
      const relativeActiveIndex = safeActiveIndex % visibleNotes;

      if (visibleGroups.length === 0) return;
      const context = renderer.getContext();

      // 2. Process Groups into Treble and Bass Chords
      const trebleVexNotes = [];
      const bassVexNotes = [];

      // Keep track of the actual index in the VexFlow array for the active note
      let vexFlowActiveIndex = -1;
      let currentVexFlowIndex = 0;

      visibleGroups.forEach((group, index) => {
        const isActive = index === relativeActiveIndex;
        const duration = getVexDuration(group.durationTicks);

        let trebleNotes, bassNotes;

        if (hasMultipleTracks) {
          // If we have multiple tracks, assume lower track index is Treble (Right Hand)
          // and higher track index is Bass (Left Hand).
          const allTrackIds = Array.from(new Set(notes.map(n => n.track))).sort((a, b) => a - b);

          trebleNotes = group.notes.filter(n => n.track === allTrackIds[0]);
          bassNotes = group.notes.filter(n => n.track !== allTrackIds[0]);
        } else {
          // Fallback to pitch-based splitting if no track info or single track
          trebleNotes = group.notes.filter(n => n.midi >= 60);
          bassNotes = group.notes.filter(n => n.midi < 60);
        }

        const trebleKeys = trebleNotes.map(n => midiToPitch(n.midi).toLowerCase());
        const bassKeys = bassNotes.map(n => midiToPitch(n.midi).toLowerCase());

        // Treble Stave Note
        if (trebleKeys.length > 0) {
          const vNote = new StaveNote({
            clef: 'treble',
            keys: trebleKeys,
            duration: duration,
            auto_stem: true,
          });
          if (isActive) vNote.setStyle({ fill: '#3B82F6', strokeColor: '#3B82F6' });
          trebleVexNotes.push(vNote);
        } else {
          trebleVexNotes.push(new GhostNote({ duration: duration }));
        }

        // Bass Stave Note
        if (bassKeys.length > 0) {
          const vNote = new StaveNote({
            clef: 'bass',
            keys: bassKeys,
            duration: duration,
            auto_stem: true,
          });
          if (isActive) vNote.setStyle({ fill: '#3B82F6', strokeColor: '#3B82F6' });
          bassVexNotes.push(vNote);
        } else {
          bassVexNotes.push(new GhostNote({ duration: duration }));
        }

        if (isActive) {
          vexFlowActiveIndex = currentVexFlowIndex;
        }
        currentVexFlowIndex++;

        // Add Bar Lines every 4 beats
        if ((index + 1) % 4 === 0 && index !== visibleGroups.length - 1) {
          trebleVexNotes.push(new BarNote());
          bassVexNotes.push(new BarNote());
          // BarNote occupies a slot in the note array, so increment the tracker
          currentVexFlowIndex++;
        }
      });

      // Pad remaining beats with ghost notes
      while (trebleVexNotes.length < (visibleNotes + Math.floor((visibleNotes - 1) / 4))) {
        trebleVexNotes.push(new GhostNote({ duration: "q" }));
        bassVexNotes.push(new GhostNote({ duration: "q" }));
        if (trebleVexNotes.length > 100) break;
      }

      // 3. Initialize Staves (Grand Staff)
      const width = Math.max(800, visibleNotes * 75 + (visibleNotes / 4) * 20);
      renderer.resize(width + 40, 350);

      const topStave = new Stave(30, 40, width);
      topStave.addClef('treble').addTimeSignature('4/4');

      const bottomStave = new Stave(30, 180, width);
      bottomStave.addClef('bass').addTimeSignature('4/4');

      // Align note start positions to fix the horizontal offset (RH notes shifted right)
      // This happens because Treble and Bass clefs have different widths.
      // We force both staves to start notes at the same X position.
      const maxStartX = Math.max(topStave.getNoteStartX(), bottomStave.getNoteStartX());
      topStave.setNoteStartX(maxStartX);
      bottomStave.setNoteStartX(maxStartX);

      topStave.setContext(context).draw();
      bottomStave.setContext(context).draw();

      // Connect staves
      const connector = new StaveConnector(topStave, bottomStave);
      connector.setType(StaveConnector.type.BRACE);
      connector.setContext(context).draw();

      const lineLeft = new StaveConnector(topStave, bottomStave);
      lineLeft.setType(StaveConnector.type.SINGLE_LEFT);
      lineLeft.setContext(context).draw();

      const lineRight = new StaveConnector(topStave, bottomStave);
      lineRight.setType(StaveConnector.type.SINGLE_RIGHT);
      lineRight.setContext(context).draw();

      // 4. Create Voices
      // visibleNotes is the number of beats, not necessarily the voice duration, 
      // but we set it to visibleNotes/4 (quarters) for 4/4 time.
      const trebleVoice = new Voice({ num_beats: visibleNotes, beat_value: 4 }).setStrict(false);
      trebleVoice.addTickables(trebleVexNotes);

      const bassVoice = new Voice({ num_beats: visibleNotes, beat_value: 4 }).setStrict(false);
      bassVoice.addTickables(bassVexNotes);

      // 5. Format and Draw
      const formatter = new Formatter().joinVoices([trebleVoice, bassVoice]);
      formatter.format([trebleVoice, bassVoice], width - maxStartX - 50);

      trebleVoice.draw(context, topStave);
      bassVoice.draw(context, bottomStave);

      // 6. Draw Playhead Cursor
      if (vexFlowActiveIndex !== -1 && trebleVexNotes[vexFlowActiveIndex]) {
        const activeNote = trebleVexNotes[vexFlowActiveIndex];

        // Ensure we don't draw on a BarNote
        if (!(activeNote instanceof BarNote)) {
          const x = activeNote.getAbsoluteX();
          context.save();
          context.setStrokeStyle('#3B82F6');
          context.setLineWidth(3);
          context.beginPath();
          // Draw a line spanning the grand staff
          context.moveTo(x, 40);
          context.lineTo(x, 280);
          context.stroke();
          context.restore();
        }
      }

    } catch (error) {
      console.error('VexFlow rendering error:', error);
      containerRef.current.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;"><div>VexFlow Error: ${error.message}</div><div style="font-size: 12px; margin-top: 10px;">Check console for details</div></div>`;
    }

  }, [groupedNotes, activeGroupIndex, visibleNotes, hasMultipleTracks, notes]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl w-full" style={{ minHeight: '492px' }}>
      <h3 className="text-lg font-semibold text-white mb-4">Sheet Music <small><i>(beta)</i></small> </h3>

      {groupedNotes.length === 0 ? (
        <div className="text-center text-gray-400">Load a MIDI file to see sheet music</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-2 overflow-x-auto ">
            <div id="vex-flow-sheet" ref={containerRef} className="min-w-[800px]" />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <div>
              Beat: {activeGroupIndex + 1} / {groupedNotes.length}
              <span className="ml-4">
                Current MIDI: {notes.length} notes
              </span>
            </div>
            <div>Showing {visibleNotes} beats</div>
          </div>
        </div>
      )}
    </div>
  );
}
