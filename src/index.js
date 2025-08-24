import { TIMBRES, SCALES, NOTE_COLORS, MIDI_PROGRAMS, DRUM_ROWS } from './constants.js';

// Top-level state and config declarations
// Track last played Electric Bass note for sustain
let lastElectricBassNote = null;
let lastElectricBassChannel = 0;
let sequencerStarted = false;
let renderQueued = false;
let styleMode = 'gradient';
const ROWS = 8;
let COLS = 8;
let pitches = [];
let currentScale = 'chromatic';
let rootNote = 60; // MIDI note for Middle C (C4)
let notesPerOctave = 12; // Default 12-TET
let COLOR_TIMBRES = {
	red:   { type: 'sine' },
	blue:  { type: 'square' },
	green: { type: 'triangle' },
	yellow:{ type: 'sawtooth' }
};
let midiOut = null;
let midiReady = false;
let currentColor = 'red';
let grid, drumGrid;
let DRUM_COLS = 8;
let currentCol = 0;
let intervalId = null;
let audioCtx = null;
let sequencerBus = null;
let masterGain = null;
let sequencerCompressor = null;
let drumGain = null;
let drumStyle = localStorage.getItem('drumStyle') || '909';
let openHatSources = [];

// DOM element references
const randomizeBtn = document.getElementById('randomize');
const halveLengthBtn = document.getElementById('halve-length');
const clearLocalStorageBtn = document.getElementById('clear-local-storage');
const styleDropdown = document.createElement('select');
const tuningSelect = document.getElementById('tuning-system');
const drumVolSlider = document.getElementById('drum-volume');
const sequencer = document.getElementById('sequencer');
const drumGridDiv = document.getElementById('drum-grid');
const bpmInput = document.getElementById('bpm');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const clearBtn = document.getElementById('clear');
const doubleLengthBtn = document.getElementById('double-length');
// End top-level declarations

// Wait for user interaction before starting sequencer
function startSequencerOnFirstClick() {
	if (!sequencerStarted) {
		sequencerStarted = true;
		startSequencer();
		window.removeEventListener('pointerdown', startSequencerOnFirstClick);
	}
}
window.addEventListener('pointerdown', startSequencerOnFirstClick);

if (randomizeBtn) {
	randomizeBtn.onclick = () => {
	for (let col = 0; col < COLS; col++) {
			const noteCount = Math.floor(Math.random() * 4); // 0-3
			let notesLeft = noteCount;
			let availableRows = Array.from({ length: ROWS }, (_, i) => i);
			let chosenRows = [];
			while (notesLeft > 0 && availableRows.length > 0) {
				let idx = Math.floor(Math.random() * availableRows.length);
				let row = availableRows[idx];
				// Avoid adjacent notes
				if (
					chosenRows.includes(row - 1) ||
					chosenRows.includes(row + 1)
				) {
					availableRows.splice(idx, 1);
					continue;
				}
				chosenRows.push(row);
				availableRows.splice(idx, 1);
				notesLeft--;
			}
			for (let row = 0; row < grid.length; row++) {
				if (chosenRows.includes(row)) {
					// Pick 1-2 random colors for this note
					let colorCount = 1 + Math.floor(Math.random() * 2);
					let colors = [];
					let colorPool = [...NOTE_COLORS];
					for (let i = 0; i < colorCount; i++) {
						if (colorPool.length === 0) break;
						let colorIdx = Math.floor(Math.random() * colorPool.length);
						const color = colorPool[colorIdx];
						colors.push(color);
						colorPool.splice(colorIdx, 1);
						// Randomize the timbre for this color
						const t = TIMBRES[Math.floor(Math.random() * TIMBRES.length)];
						COLOR_TIMBRES[color] = t;
						// Also update the dropdown if present
						const sel = document.querySelector(`.timbre-dropdown[data-color='${color}']`);
						if (sel) {
							if (t.type) sel.value = t.type;
							else if (t.name) sel.value = t.name;
						}
					}
					grid[row][col] = colors;
				} else {
					grid[row][col] = [];
				}
			}
		}
		saveState();
		renderGrid();
	};
}
if (halveLengthBtn) {
	halveLengthBtn.onclick = () => {
		if (COLS > 1 && DRUM_COLS > 1) {
			COLS = Math.floor(COLS / 2);
			DRUM_COLS = Math.floor(DRUM_COLS / 2);
			grid = grid.map(row => row.slice(0, COLS));
			drumGrid = drumGrid.map(row => row.slice(0, DRUM_COLS));
			saveState();
			renderGrid();
		}
	};
}
if (clearLocalStorageBtn) {
	clearLocalStorageBtn.onclick = () => {
		localStorage.removeItem('sequencerState');
		location.reload();
	};
}

// Melodic grid
// Color style mode: 'gradient' or 'divided'
styleDropdown.id = 'color-style-mode';
styleDropdown.style.margin = '10px 0 20px 10px';
const opt1 = document.createElement('option');
opt1.value = 'gradient';
opt1.textContent = 'Gradient';
const opt2 = document.createElement('option');
opt2.value = 'divided';
opt2.textContent = 'Divided';
styleDropdown.appendChild(opt1);
styleDropdown.appendChild(opt2);
styleDropdown.value = styleMode;
styleDropdown.onchange = () => {
	styleMode = styleDropdown.value;
	renderGrid();
};
window.addEventListener('DOMContentLoaded', () => {
	const controlsDiv = document.getElementById('controls');
	if (controlsDiv) controlsDiv.appendChild(styleDropdown);
	if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', renderTimbreDropdowns);
	} else {
    renderTimbreDropdowns();
	}
});
// Color/timbre support
// Dynamically generate timbre dropdowns for each color
function renderTimbreDropdowns() {
	const container = document.getElementById('timbre-selectors');
	if (!container) return;
	container.innerHTML = '';
	const colorNames = [
		{ color: 'red', label: 'Red', style: 'color:red;' },
		{ color: 'blue', label: 'Blue', style: 'color:blue;' },
		{ color: 'green', label: 'Green', style: 'color:green;' },
		{ color: 'yellow', label: 'Yellow', style: 'color:gold;' }
	];
	colorNames.forEach(({ color, label, style }) => {
		const div = document.createElement('div');
		div.innerHTML = `<label style="${style}">${label}: <select class="timbre-dropdown" data-color="${color}"></select></label>`;
		container.appendChild(div);
		const sel = div.querySelector('select');
		TIMBRES.forEach(t => {
			const opt = document.createElement('option');
			opt.value = t.value;
			opt.textContent = t.label;
			sel.appendChild(opt);
		});
		// Set current value if available
		if (COLOR_TIMBRES[color]) {
			if (COLOR_TIMBRES[color].type) sel.value = COLOR_TIMBRES[color].type;
			else if (COLOR_TIMBRES[color].name) sel.value = COLOR_TIMBRES[color].name;
		}
		// Add event listener to update COLOR_TIMBRES on change
		sel.addEventListener('change', e => {
			const val = sel.value;
			if (['sine','square','triangle','sawtooth'].includes(val)) {
				COLOR_TIMBRES[color] = { type: val };
			} else {
				const midiObj = TIMBRES.find(t => t.value === val);
				if (midiObj && midiObj.midi !== undefined) {
					COLOR_TIMBRES[color] = { midi: midiObj.midi, name: val };
				}
			}
		});
	});
}

window.addEventListener('DOMContentLoaded', () => {
	if (window.JZZ && window.JZZ.synth && !midiOut) {
		midiOut = JZZ().openMidiOut().or(() => { midiReady = false; });
		if (midiOut) {
			midiReady = true;
			// Use the built-in software synth
			JZZ.synth.Tiny.register('WebAudioTinySynth');
			midiOut = JZZ().openMidiOut('WebAudioTinySynth');
		}
	}
	if (document.readyState === 'loading') {
	    window.addEventListener('DOMContentLoaded', renderTimbreDropdowns);
	} else {
	    renderTimbreDropdowns();
	}
});

// Handle timbre dropdown changes
window.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('.timbre-dropdown').forEach(sel => {
		sel.addEventListener('change', e => {
			const color = sel.dataset.color;
			const val = sel.value;
			if (['sine','square','triangle','sawtooth'].includes(val)) {
				COLOR_TIMBRES[color] = { type: val };
			} else if (MIDI_PROGRAMS[val] !== undefined) {
				COLOR_TIMBRES[color] = { midi: MIDI_PROGRAMS[val], name: val };
			}
		});
	});
	if (document.readyState === 'loading') {
	    window.addEventListener('DOMContentLoaded', renderTimbreDropdowns);
	} else {
	    renderTimbreDropdowns();
	}
});


function updateScaleDropdown() {
	if (!scaleSelect) return;
	scaleSelect.innerHTML = '';
	if (notesPerOctave === 12) {
		// All scales available
		Object.entries(SCALES).forEach(([key, obj]) => {
			const opt = document.createElement('option');
			opt.value = key;
			opt.textContent = obj.name;
			scaleSelect.appendChild(opt);
		});
	} else {
		// Only Chromatic available
		const opt = document.createElement('option');
		opt.value = 'chromatic';
		opt.textContent = SCALES.chromatic.name || 'Chromatic';
		scaleSelect.appendChild(opt);
	}
	// Set value and currentScale
	if (notesPerOctave !== 12 || !SCALES[currentScale]) {
		currentScale = 'chromatic';
	}
	scaleSelect.value = currentScale;
}

if (tuningSelect) {
	tuningSelect.addEventListener('change', () => {
		notesPerOctave = parseInt(tuningSelect.value, 10);
		updateScaleDropdown();
		updatePitches();
		renderGrid();
	});
}



function midiToFreq(midi) {
	return 440 * Math.pow(2, (midi - 69) / 12);
}

function updatePitches() {
	const intervals = (SCALES[currentScale] || SCALES.chromatic).intervals;
	pitches = [];
	for (let i = 0; i < ROWS; i++) {
		// Map so row 0 (top) is highest, row ROWS-1 (bottom) is lowest
		const scaleIdx = ROWS - 1 - i;
		const scaleLen = intervals.length;
		const octave = Math.floor(scaleIdx / scaleLen);
		const interval = intervals[scaleIdx % scaleLen] + octave * notesPerOctave;
		// n-TET: each step is 1/notesPerOctave of an octave
		const midi = rootNote + (interval * (12 / notesPerOctave));
		// For synth, calculate n-TET frequency directly
		const freq = 440 * Math.pow(2, (midi - 69) / 12 * (12 / notesPerOctave));
		pitches.push(freq);
	}
}


const scaleSelect = document.getElementById('scale-select');
if (scaleSelect) {
	updateScaleDropdown();
	scaleSelect.onchange = () => {
		currentScale = scaleSelect.value;
		updatePitches();
		renderGrid();
	};
}

updatePitches();








try {
	const saved = JSON.parse(localStorage.getItem('sequencerState'));
    // Restore BPM if present
    if (typeof saved.bpm === 'number' && bpmInput) bpmInput.value = saved.bpm;
    // Restore scale if present
    if (typeof saved.scale === 'string' && scaleSelect) {
        scaleSelect.value = saved.scale;
        currentScale = saved.scale;
        updatePitches();
    }
	if (
		saved &&
		Array.isArray(saved.grid) &&
		Array.isArray(saved.drumGrid) &&
		typeof saved.COLS === 'number' &&
		typeof saved.DRUM_COLS === 'number'
	) {
		// Upgrade grid to color arrays if needed
		grid = saved.grid.map(row => row.map(cell => Array.isArray(cell) ? cell : (cell ? [NOTE_COLORS[0]] : [])));
		COLS = saved.COLS;
		DRUM_COLS = saved.DRUM_COLS;
		// Ensure drumGrid is the correct size
		drumGrid = saved.drumGrid.map(row => {
			if (row.length < DRUM_COLS) {
				return [...row, ...Array(DRUM_COLS - row.length).fill(false)];
			} else if (row.length > DRUM_COLS) {
				return row.slice(0, DRUM_COLS);
			} else {
				return row;
			}
		});
	} else {
		grid = Array.from({ length: ROWS }, () => Array(COLS).fill().map(() => []));
		drumGrid = Array.from({ length: 4 }, () => Array(DRUM_COLS).fill(false));
	}
} catch {
	grid = Array.from({ length: ROWS }, () => Array(COLS).fill().map(() => []));
	drumGrid = Array.from({ length: 4 }, () => Array(DRUM_COLS).fill(false));
}

// Drum grid
// (DRUM_ROWS now imported)
if (drumVolSlider) {
	drumVolSlider.addEventListener('input', () => {
		if (drumGain) drumGain.gain.value = parseFloat(drumVolSlider.value);
	});
}

// Create grid UI
function saveState() {
    const bpm = bpmInput ? parseInt(bpmInput.value, 10) : 120;
    const scale = scaleSelect ? scaleSelect.value : 'chromatic';
    localStorage.setItem('sequencerState', JSON.stringify({ grid, drumGrid, COLS, DRUM_COLS, bpm, scale }));
}

// Color selector logic
const colorBtns = document.querySelectorAll('.color-sel');
colorBtns.forEach(btn => {
	btn.onclick = () => {
		currentColor = btn.dataset.color;
		colorBtns.forEach(b => b.style.outline = 'none');
		btn.style.outline = '3px solid #fff';
	};
	if (btn.dataset.color === currentColor) btn.style.outline = '3px solid #fff';
});

function renderGrid() {
    sequencer.style.gridTemplateColumns = `repeat(${COLS}, 40px)`;
    drumGridDiv.style.gridTemplateColumns = `repeat(${DRUM_COLS}, 40px)`;

	// Melodic grid
	sequencer.style.gridTemplateColumns = `repeat(${COLS}, 40px)`;
	sequencer.innerHTML = '';
	for (let row = 0; row < ROWS; row++) {
		for (let col = 0; col < COLS; col++) {
			const colors = grid[row][col];
			const cell = document.createElement('div');
			cell.className = 'cell' + (colors.length ? ' on' : '') + (col === currentCol ? ' active' : '');
			cell.dataset.row = row;
			cell.dataset.col = col;
			// Color background
			if (colors.length === 1) {
				cell.style.background = colors[0];
			} else if (colors.length > 1) {
				if (styleMode === 'gradient') {
					cell.style.background = `linear-gradient(135deg, ${colors.join(',')})`;
				} else {
					// Divided: hard stops for each color
					const n = colors.length;
					const stops = colors.map((c, i) => {
						const start = (i / n) * 100;
						const end = ((i + 1) / n) * 100;
						return `${c} ${start}% ${end}%`;
					}).join(', ');
					cell.style.background = `linear-gradient(90deg, ${stops})`;
				}
			} else {
				cell.style.background = '';
			}
			cell.onclick = (e) => {
				// Toggle current color in this cell
				const idx = colors.indexOf(currentColor);
				if (idx === -1) {
					colors.push(currentColor);
				} else {
					colors.splice(idx, 1);
				}
				saveState();
				renderQueued = false;
				renderGrid();
			};
			sequencer.appendChild(cell);
		}
	}
	// Drum grid
	if (drumGridDiv) {
		drumGridDiv.innerHTML = '';
		for (let row = 0; row < DRUM_ROWS; row++) {
			for (let col = 0; col < DRUM_COLS; col++) {
				const cell = document.createElement('div');
				cell.className = 'cell' + (drumGrid[row][col] ? ' on' : '') + (col === currentCol ? ' active' : '');
				cell.dataset.row = row;
				cell.dataset.col = col;
                cell.style.background = drumGrid[row][col] ? '#4caf50' : '';
				cell.onclick = () => {
					drumGrid[row][col] = !drumGrid[row][col];
					saveState();
					renderQueued = false; // Prevent immediate re-render
					renderGrid(); // Call the debounced render function
				};
				drumGridDiv.appendChild(cell);
			}
		}
	}
}

function playNote(freq, duration = 0.18, colors = [NOTE_COLORS[0]]) {
	if (!audioCtx) {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	}
	if (!sequencerBus) {
		sequencerBus = audioCtx.createGain();
		sequencerCompressor = audioCtx.createDynamicsCompressor();
		masterGain = audioCtx.createGain();
		sequencerCompressor.threshold.value = -12;
		sequencerCompressor.ratio.value = 12;
		sequencerCompressor.attack.value = 0.003;
		sequencerCompressor.release.value = 0.25;
		sequencerBus.connect(sequencerCompressor).connect(masterGain).connect(audioCtx.destination);
		// Set initial master volume from slider if present
		const volSlider = document.getElementById('master-volume');
		if (volSlider) masterGain.gain.value = parseFloat(volSlider.value);
	}
// Master volume slider logic
const volSlider = document.getElementById('master-volume');
if (volSlider) {
	volSlider.addEventListener('input', () => {
		if (masterGain) masterGain.gain.value = parseFloat(volSlider.value);
	});
}
	colors.forEach(color => {
		const timbre = COLOR_TIMBRES[color] || { type: 'sine' };
		if (timbre.type) {
			// WebAudio synth
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.type = timbre.type;
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
			gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
			gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration - 0.02);
			osc.connect(gain).connect(sequencerBus);
			osc.start();
			osc.stop(audioCtx.currentTime + duration);
			osc.onended = () => gain.disconnect();
		} else if (timbre.midi !== undefined && window.JZZ && midiOut && midiReady) {
			let midiFreq = freq;
			// Special case: Electric Bass and Fretless Bass (MIDI 33 and 35) should sound two octaves lower
			if (timbre.midi === 33 || timbre.midi === 35) midiFreq = freq / 4;

			// True MIDI playback using JZZ.js
			// Convert frequency to MIDI note number
			const midiNote = Math.round(69 + 12 * Math.log2(midiFreq / 440));
			// Scale velocity by pattern volume slider
			let vol = 1.0;
			const volSlider = document.getElementById('master-volume');
			if (volSlider) vol = parseFloat(volSlider.value);
			const velocity = Math.round(100 * vol); // scale 0-100
			const channel = 0; // All colors use channel 0 for now
			midiOut.program(channel, timbre.midi);
			// Sustain Electric Bass and Fretless Bass (MIDI 33 and 35) until next note
			if (timbre.midi === 33 || timbre.midi === 35) {
				// Turn off previous note if any
				if (lastElectricBassNote !== null) {
					midiOut.noteOff(lastElectricBassChannel, lastElectricBassNote, 0);
				}
				midiOut.noteOn(channel, midiNote, velocity);
				lastElectricBassNote = midiNote;
				lastElectricBassChannel = channel;
				// Do NOT schedule noteOff here; will be turned off by next note
			} else {
				midiOut.noteOn(channel, midiNote, velocity);
				setTimeout(() => {
					midiOut.noteOff(channel, midiNote, 0);
				}, duration * 1000);
			}
		} else {
			// Fallback: WebAudio sine
            alert('Fallback called for timbre: ' + JSON.stringify(timbre));
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.type = 'sine';
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
			gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
			gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration - 0.02);
			osc.connect(gain).connect(sequencerBus);
			osc.start();
			osc.stop(audioCtx.currentTime + duration);
			osc.onended = () => gain.disconnect();
		}
	});
}

// Simple drum synths
// Helper: Given a frequency, return {midi, bend} for MIDI microtonality
function getMidiNoteAndBend(freq) {
	// Find nearest MIDI note
	const midi = Math.round(69 + 12 * Math.log2(freq / 440));
	const midiFreq = 440 * Math.pow(2, (midi - 69) / 12);
	// MIDI pitch bend range is usually +/-2 semitones (can be changed, but default is 2)
	// 8192 is center (no bend), 0 is -2 semitones, 16383 is +2 semitones
	// Calculate bend in semitones
	const bendSemis = 12 * Math.log2(freq / midiFreq);
	// Clamp to +/-2 semitones
	const maxBend = 2;
	const bend = Math.round(8192 + (bendSemis / maxBend) * 8192);
	return { midi, bend: Math.max(0, Math.min(16383, bend)) };
}

// (moved to top)
const drumStyleSelect = document.getElementById('drum-style-select');
if (drumStyleSelect) {
	drumStyleSelect.value = drumStyle;
	drumStyleSelect.addEventListener('change', () => {
		drumStyle = drumStyleSelect.value;
		localStorage.setItem('drumStyle', drumStyle);
	});
}

// Track open hi-hat sources for choke
// (moved to top)

function playDrum(row) {
	if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	if (!drumGain) {
		drumGain = audioCtx.createGain();
		drumGain.gain.value = drumVolSlider ? parseFloat(drumVolSlider.value) : 0.8;
		drumGain.connect(audioCtx.destination);
	}
	const now = audioCtx.currentTime;
	if (drumStyle === '909') {
		if (row === 0) {
			// Choke open hats
			openHatSources.forEach(src => { try { src.stop(); } catch(e){} });
			openHatSources = [];
			// 909 Closed hi-hat
			const duration = 0.045;
			const gain = audioCtx.createGain();
			gain.gain.value = 0.19;
			gain.connect(drumGain);
			for (let i = 0; i < 6; i++) {
				const osc = audioCtx.createOscillator();
				osc.type = 'square';
				const freqs = [3250, 3450, 3650, 3860, 4080, 4300];
				osc.frequency.value = freqs[i];
				const oscGain = audioCtx.createGain();
				oscGain.gain.value = 0.18 / 6;
				const hp = audioCtx.createBiquadFilter();
				hp.type = 'highpass';
				hp.frequency.value = 7000;
				osc.connect(oscGain).connect(hp).connect(gain);
				osc.start(now);
				osc.stop(now + duration);
			}
			const noiseLen = duration;
			const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * noiseLen, audioCtx.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 60);
			const src = audioCtx.createBufferSource();
			src.buffer = buffer;
			const hp = audioCtx.createBiquadFilter();
			hp.type = 'highpass';
			hp.frequency.value = 7000;
			const noiseGain = audioCtx.createGain();
			noiseGain.gain.value = 0.08;
			src.connect(hp).connect(noiseGain).connect(gain);
			src.start(now);
			src.stop(now + noiseLen);
		} else if (row === 1) {
			// 909 Open hi-hat
			const duration = 0.65;
			const gain = audioCtx.createGain();
			gain.gain.value = 0.11;
			gain.connect(drumGain);
			let sources = [];
			for (let i = 0; i < 6; i++) {
				const osc = audioCtx.createOscillator();
				osc.type = 'square';
				const freqs = [3250, 3450, 3650, 3860, 4080, 4300];
				osc.frequency.value = freqs[i];
				const oscGain = audioCtx.createGain();
				oscGain.gain.value = 0.16 / 6;
				const hp = audioCtx.createBiquadFilter();
				hp.type = 'highpass';
				hp.frequency.value = 7000;
				osc.connect(oscGain).connect(hp).connect(gain);
				osc.start(now);
				osc.stop(now + duration);
				sources.push(osc);
			}
			const noiseLen = duration;
			const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * noiseLen, audioCtx.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 1200);
			const src = audioCtx.createBufferSource();
			src.buffer = buffer;
			const hp = audioCtx.createBiquadFilter();
			hp.type = 'highpass';
			hp.frequency.value = 7000;
			const noiseGain = audioCtx.createGain();
			noiseGain.gain.value = 0.06;
			src.connect(hp).connect(noiseGain).connect(gain);
			src.start(now);
			src.stop(now + noiseLen);
			sources.push(src);
			// Track for choke
			openHatSources.push(...sources);
		} else if (row === 2) {
			// 909-style Snare
			const snapLen = 0.012;
			const snapBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * snapLen, audioCtx.sampleRate);
			const snapData = snapBuffer.getChannelData(0);
			for (let i = 0; i < snapData.length; i++) {
				snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 18);
			}
			const snapSrc = audioCtx.createBufferSource();
			snapSrc.buffer = snapBuffer;
			const snapHP = audioCtx.createBiquadFilter();
			snapHP.type = 'highpass';
			snapHP.frequency.value = 1800;
			const snapGain = audioCtx.createGain();
			snapGain.gain.value = 0.55;
			snapSrc.connect(snapHP).connect(snapGain).connect(drumGain);
			snapSrc.start(now);
			snapSrc.stop(now + snapLen);

			const tailLen = 0.18;
			const tailBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * tailLen, audioCtx.sampleRate);
			const tailData = tailBuffer.getChannelData(0);
			for (let i = 0; i < tailData.length; i++) {
				tailData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 1200);
			}
			const tailSrc = audioCtx.createBufferSource();
			tailSrc.buffer = tailBuffer;
			const tailBP = audioCtx.createBiquadFilter();
			tailBP.type = 'bandpass';
			tailBP.frequency.value = 200;
			tailBP.Q.value = 0.8;
			const tailGain = audioCtx.createGain();
			tailGain.gain.value = 0.32;
			tailSrc.connect(tailBP).connect(tailGain).connect(drumGain);
			tailSrc.start(now);
			tailSrc.stop(now + tailLen);

			const osc = audioCtx.createOscillator();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(195, now);
			osc.frequency.linearRampToValueAtTime(180, now + 0.09);
			const oscGain = audioCtx.createGain();
			oscGain.gain.setValueAtTime(0.13, now);
			oscGain.gain.linearRampToValueAtTime(0, now + 0.09);
			osc.connect(oscGain).connect(drumGain);
			osc.start(now);
			osc.stop(now + 0.09);
		} else if (row === 3) {
			// 909 Kick
			const duration = 0.18;
			const clickLen = 0.008;
			const clickBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * clickLen, audioCtx.sampleRate);
			const clickData = clickBuffer.getChannelData(0);
			for (let i = 0; i < clickData.length; i++) clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 8);
			const clickSrc = audioCtx.createBufferSource();
			clickSrc.buffer = clickBuffer;
			const clickGain = audioCtx.createGain();
			clickGain.gain.value = 0.18;
			clickSrc.connect(clickGain).connect(drumGain);
			clickSrc.start(now);
			clickSrc.stop(now + clickLen);

			const osc = audioCtx.createOscillator();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(62, now);
			osc.frequency.linearRampToValueAtTime(43, now + duration * 0.6);
			osc.frequency.linearRampToValueAtTime(36, now + duration);
			const gain = audioCtx.createGain();
			gain.gain.setValueAtTime(0.70, now);
			gain.gain.linearRampToValueAtTime(0.01, now + duration);
			osc.connect(gain).connect(drumGain);
			osc.start(now);
			osc.stop(now + duration);
		}
	} else {
		// Classic style (previous version)
		if (row === 0) {
			// Choke open hats
			openHatSources.forEach(src => { try { src.stop(); } catch(e){} });
			openHatSources = [];
			// Classic Closed hi-hat
			const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 100);
			const src = audioCtx.createBufferSource();
			src.buffer = buffer;
			const lp = audioCtx.createBiquadFilter();
			lp.type = 'lowpass';
			lp.frequency.value = 8000;
			const gain = audioCtx.createGain();
			gain.gain.value = 0.18;
			src.connect(lp).connect(gain).connect(drumGain);
			src.start();
			src.stop(now + 0.05);
		} else if (row === 1) {
			// Classic Open hi-hat
			const ohhDecay = 1.2;
			const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * ohhDecay, audioCtx.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 1800);
			const src = audioCtx.createBufferSource();
			src.buffer = buffer;
			const gain = audioCtx.createGain();
			gain.gain.value = 0.13;
			src.connect(gain).connect(drumGain);
			src.start();
			src.stop(now + ohhDecay);
			// Track for choke
			openHatSources.push(src);
		} else if (row === 2) {
			// Classic Snare (use 909 for now)
			const snapLen = 0.012;
			const snapBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * snapLen, audioCtx.sampleRate);
			const snapData = snapBuffer.getChannelData(0);
			for (let i = 0; i < snapData.length; i++) {
				snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 18);
			}
			const snapSrc = audioCtx.createBufferSource();
			snapSrc.buffer = snapBuffer;
			const snapHP = audioCtx.createBiquadFilter();
			snapHP.type = 'highpass';
			snapHP.frequency.value = 1800;
			const snapGain = audioCtx.createGain();
			snapGain.gain.value = 0.55;
			snapSrc.connect(snapHP).connect(snapGain).connect(drumGain);
			snapSrc.start(now);
			snapSrc.stop(now + snapLen);

			const tailLen = 0.18;
			const tailBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * tailLen, audioCtx.sampleRate);
			const tailData = tailBuffer.getChannelData(0);
			for (let i = 0; i < tailData.length; i++) {
				tailData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 1200);
			}
			const tailSrc = audioCtx.createBufferSource();
			tailSrc.buffer = tailBuffer;
			const tailBP = audioCtx.createBiquadFilter();
			tailBP.type = 'bandpass';
			tailBP.frequency.value = 200;
			tailBP.Q.value = 0.8;
			const tailGain = audioCtx.createGain();
			tailGain.gain.value = 0.32;
			tailSrc.connect(tailBP).connect(tailGain).connect(drumGain);
			tailSrc.start(now);
			tailSrc.stop(now + tailLen);

			const osc = audioCtx.createOscillator();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(195, now);
			osc.frequency.linearRampToValueAtTime(180, now + 0.09);
			const oscGain = audioCtx.createGain();
			oscGain.gain.setValueAtTime(0.13, now);
			oscGain.gain.linearRampToValueAtTime(0, now + 0.09);
			osc.connect(oscGain).connect(drumGain);
			osc.start(now);
			osc.stop(now + 0.09);
		} else if (row === 3) {
			// Classic Kick
			const osc = audioCtx.createOscillator();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(140, now);
			osc.frequency.linearRampToValueAtTime(40, now + 0.13);
			const gain = audioCtx.createGain();
			gain.gain.setValueAtTime(0.32, now);
			gain.gain.linearRampToValueAtTime(0, now + 0.13);
			osc.connect(gain).connect(drumGain);
			osc.start(now);
			osc.stop(now + 0.13);
		}
	}
}


function step() {
	// Play notes in current column
	for (let row = 0; row < ROWS; row++) {
		const colors = grid[row][currentCol];
		if (colors && colors.length) {
			playNote(pitches[row], 0.18, colors);
		}
	}
	// Play drum sounds in current column
	for (let drow = 0; drow < DRUM_ROWS; drow++) {
		if (drumGrid[drow][currentCol]) {
			playDrum(drow);
		}
	}
	renderGrid();
	currentCol = (currentCol + 1) % COLS;
}

function startSequencer() {
	if (intervalId) return;
	let bpm = parseInt(bpmInput.value, 10) || 120;
	let interval = (60 / bpm) / 2 * 1000; // 8th notes
	currentCol = 0;
	renderGrid();
	intervalId = setInterval(step, interval);
}

function stopSequencer() {
	clearInterval(intervalId);
	intervalId = null;
	currentCol = -1;
	renderGrid();
}

startBtn.onclick = startSequencer;
stopBtn.onclick = stopSequencer;
bpmInput.onchange = () => {
	if (intervalId) {
		stopSequencer();
		startSequencer();
	}
};

// Initial render
renderGrid();
// Do not start sequencer until user interacts with the page

// Clear button logic
if (clearBtn) {
	clearBtn.onclick = () => {
			grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => []));
		drumGrid = Array.from({ length: DRUM_ROWS }, () => Array(DRUM_COLS).fill(false));
		saveState();
		renderGrid();
	};
}

// (moved to top)
if (doubleLengthBtn) {
	doubleLengthBtn.onclick = () => {
		// Double the number of columns by duplicating each row's columns, deep copying each cell
		grid = grid.map(row => [
			...row.map(cell => [...cell]),
			...row.map(cell => [...cell])
		]);
		drumGrid = drumGrid.map(row => [
			...row.map(cell => cell),
			...row.map(cell => cell)
		]);
		COLS = COLS * 2;
		DRUM_COLS = DRUM_COLS * 2;
		saveState();
		renderGrid();
	};
}
