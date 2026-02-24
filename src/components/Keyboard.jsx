import Key from "./Key";

export default function Keyboard({ pressedNotes }) {
    // PSR-E383 is 61 keys, usually from C1 (36) to C6 (96)
    const startNote = 36;
    const endNote = 96;
    const notes = Array.from({ length: endNote - startNote + 1 }, (_, i) => i + startNote);

    return (
        <div className="flex justify-center bg-gray-800 p-4 rounded-xl shadow-2xl overflow-x-auto">
            <div className="relative flex h-48 select-none">
                {notes.map((note) => (
                    <Key key={note} noteNumber={note} isPressed={pressedNotes.includes(note)} />
                ))}
            </div>
        </div>
    );
}