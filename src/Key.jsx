const whiteKeys = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B

export default function Key({ noteNumber, isPressed }) {
    const isWhite = whiteKeys.includes(noteNumber % 12);
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const noteName = noteNames[noteNumber % 12];
    const octave = Math.floor(noteNumber / 12) - 2;
    const fullNoteName = `${noteName}${octave}`;

    if (isWhite) {
        return (
            <div
                className={`w-10 h-full border-x border-b border-gray-300 rounded-b-md transition-all duration-150 flex flex-col justify-end items-center pb-2
                    ${isPressed ? 'bg-blue-500 text-white border-blue-600 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] scale-[0.98]' : 'bg-white text-gray-400'}`}
                title={fullNoteName}
            >
                <span className="text-[10px] font-medium">{fullNoteName}</span>
            </div>
        );
    }

    // Black keys
    return (
        <div
            className={`w-6 h-28 bg-gray-900 border border-black rounded-b-sm z-10 -mx-3 transition-all duration-150 flex flex-col justify-end items-center pb-2 shadow-lg
                ${isPressed ? 'bg-red-400 border-red-500 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] scale-[0.96]' : 'hover:bg-gray-800'}`}
            title={noteName}
        >
            <span className={`text-[8px] font-bold ${isPressed ? 'text-white' : 'text-gray-400'}`}>{noteName}</span>
        </div>
    );
}