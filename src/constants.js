// Centralized constants for the sequencer app

export const TIMBRES = [
    { value: 'sine', label: 'Sine', type: 'sine' },
    { value: 'square', label: 'Square', type: 'square' },
    { value: 'triangle', label: 'Triangle', type: 'triangle' },
    { value: 'sawtooth', label: 'Sawtooth', type: 'sawtooth' },
    { value: 'acoustic_grand_piano', label: 'Piano (MIDI)', midi: 0, name: 'acoustic_grand_piano' },
    { value: 'electric_piano', label: 'Electric Piano (MIDI)', midi: 4, name: 'electric_piano' },
    { value: 'organ', label: 'Organ (MIDI)', midi: 16, name: 'organ' },
    { value: 'guitar', label: 'Guitar (MIDI)', midi: 24, name: 'guitar' },
    { value: 'electric_bass', label: 'Electric Bass (MIDI)', midi: 33, name: 'electric_bass' },
    { value: 'violin', label: 'Violin (MIDI)', midi: 40, name: 'violin' },
    { value: 'clarinet', label: 'Clarinet (MIDI)', midi: 71, name: 'clarinet' },
    { value: 'flute', label: 'Flute (MIDI)', midi: 73, name: 'flute' },
    { value: 'ocarina', label: 'Ocarina (MIDI)', midi: 80, name: 'ocarina' },
    { value: 'kalimba', label: 'Kalimba (MIDI)', midi: 108, name: 'kalimba' },
    { value: 'steel_drums', label: 'Steel Drums (MIDI)', midi: 114, name: 'steel_drums' }
];

export const SCALES = {
    chromatic:   { name: 'Chromatic', intervals: [0,1,2,3,4,5,6,7,8,9,10,11] },
    major:       { name: 'Major', intervals: [0,2,4,5,7,9,11] },
    minor:       { name: 'Minor', intervals: [0,2,3,5,7,8,10] },
    pentatonic:  { name: 'Pentatonic', intervals: [0,2,4,7,9] },
    blues:       { name: 'Blues', intervals: [0,3,5,6,7,10] },
    dorian:      { name: 'Dorian', intervals: [0,2,3,5,7,9,10] },
    phrygian:    { name: 'Phrygian', intervals: [0,1,3,5,7,8,10] },
    lydian:      { name: 'Lydian', intervals: [0,2,4,6,7,9,11] },
    mixolydian:  { name: 'Mixolydian', intervals: [0,2,4,5,7,9,10] },
    locrian:     { name: 'Locrian', intervals: [0,1,3,5,6,8,10] },
    'whole-tone':{ name: 'Whole Tone', intervals: [0,2,4,6,8,10] },
    octatonic:   { name: 'Octatonic (Diminished)', intervals: [0,2,3,5,6,8,9,11] },
    'harmonic-minor':{ name: 'Harmonic Minor', intervals: [0,2,3,5,7,8,11] },
    'double-harmonic':{ name: 'Double Harmonic', intervals: [0,1,4,5,7,8,11] },
    enigmatic:   { name: 'Enigmatic', intervals: [0,1,4,6,8,10,11] },
};

export const NOTE_COLORS = ['red', 'blue', 'green', 'yellow'];

export const MIDI_PROGRAMS = {
    acoustic_grand_piano: 0,
    electric_piano: 4,
    organ: 16,
    guitar: 24,
    electric_bass: 33,
    violin: 40,
    clarinet: 71,
    flute: 73,
    ocarina: 80,
    kalimba: 108,
    steel_drums: 114
};

export const DRUM_ROWS = 4;
