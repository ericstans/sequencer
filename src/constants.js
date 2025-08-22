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
    { value: 'bird_tweet', label: 'Bird Tweet (MIDI)', midi: 123, name: 'bird_tweet' },
    { value: 'kalimba', label: 'Kalimba (MIDI)', midi: 108, name: 'kalimba' },
    { value: 'steel_drums', label: 'Steel Drums (MIDI)', midi: 114, name: 'steel_drums' }
];

export const SCALES = {
    chromatic:   [0,1,2,3,4,5,6,7,8,9,10,11],
    major:       [0,2,4,5,7,9,11],
    minor:       [0,2,3,5,7,8,10],
    pentatonic:  [0,2,4,7,9],
    blues:       [0,3,5,6,7,10],
    dorian:      [0,2,3,5,7,9,10],
    phrygian:    [0,1,3,5,7,8,10],
    lydian:      [0,2,4,6,7,9,11],
    mixolydian:  [0,2,4,5,7,9,10],
    locrian:     [0,1,3,5,6,8,10],
    'whole-tone':[0,2,4,6,8,10],
    octatonic:   [0,2,3,5,6,8,9,11],
    'harmonic-minor':[0,2,3,5,7,8,11],
    'double-harmonic':[0,1,4,5,7,8,11],
    enigmatic:   [0,1,4,6,8,10,11],
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
    bird_tweet: 123,
    kalimba: 108,
    steel_drums: 114
};

export const DRUM_ROWS = 4;
