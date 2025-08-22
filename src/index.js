const randomizeBtn = document.getElementById('randomize');
if (randomizeBtn) {
	randomizeBtn.onclick = () => {
		// For each column, randomly select up to 3 rows to turn on, avoiding adjacent notes
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
						colors.push(colorPool[colorIdx]);
						colorPool.splice(colorIdx, 1);
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
const halveLengthBtn = document.getElementById('halve-length');
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
const clearLocalStorageBtn = document.getElementById('clear-local-storage');
if (clearLocalStorageBtn) {
	clearLocalStorageBtn.onclick = () => {
		localStorage.removeItem('sequencerState');
		location.reload();
	};
}

// Melodic grid
// Color style mode: 'gradient' or 'divided'
let styleMode = 'gradient';
const styleDropdown = document.createElement('select');
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
});

const ROWS = 8;
let COLS = 8;
let pitches = [];

// Scale definitions (intervals in semitones from root)
const SCALES = {
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

let currentScale = 'chromatic';
let rootNote = 60; // MIDI note for Middle C (C4)

function midiToFreq(midi) {
	return 440 * Math.pow(2, (midi - 69) / 12);
}

function updatePitches() {
	const intervals = SCALES[currentScale] || SCALES.chromatic;
	// Fill from top row (high) to bottom (low)
	pitches = [];
	for (let i = 0; i < ROWS; i++) {
		// Map so row 0 (top) is highest, row ROWS-1 (bottom) is lowest
		const scaleIdx = ROWS - 1 - i;
		const interval = intervals[scaleIdx % intervals.length];
		const midi = rootNote + interval + (intervals.length > ROWS ? 0 : 12 * Math.floor(scaleIdx / intervals.length));
		pitches.push(midiToFreq(midi));
	}
}

// Wire up scale dropdown
const scaleSelect = document.getElementById('scale-select');
if (scaleSelect) {
	scaleSelect.onchange = () => {
		currentScale = scaleSelect.value;
		updatePitches();
		renderGrid();
	};
}

updatePitches();

// Color/timbre support
const NOTE_COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_TIMBRES = {
	red:   { type: 'sine' },
	blue:  { type: 'square' },
	green: { type: 'triangle' },
	yellow:{ type: 'sawtooth' }
};
let currentColor = 'red';

// Try to load state from localStorage
let grid, drumGrid;
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
const DRUM_ROWS = 4;
let DRUM_COLS = 8;
const drumNames = ['CLOSED HI HAT', 'OPEN HI HAT', 'SNARE', 'KICK'];

let currentCol = 0;
let intervalId = null;
let audioCtx = null;
let sequencerBus = null;
let masterGain = null;
let sequencerCompressor = null;

const sequencer = document.getElementById('sequencer');
const drumGridDiv = document.getElementById('drum-grid');
const bpmInput = document.getElementById('bpm');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const clearBtn = document.getElementById('clear');

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
		const osc = audioCtx.createOscillator();
		const gain = audioCtx.createGain();
		osc.type = COLOR_TIMBRES[color]?.type || 'sine';
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
		// Add a short fade-out envelope to avoid clicks
		gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
		gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration - 0.02);
		osc.connect(gain).connect(sequencerBus);
		osc.start();
		osc.stop(audioCtx.currentTime + duration);
		osc.onended = () => gain.disconnect();
	});
}

// Simple drum synths
function playDrum(row) {
	if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	const now = audioCtx.currentTime;
	if (row === 0) { // Closed hi-hat
		const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 100);
		const src = audioCtx.createBufferSource();
		src.buffer = buffer;
		// Add lowpass filter to roll off highs
		const lp = audioCtx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 8000;
		// Lower gain
		const gain = audioCtx.createGain();
		gain.gain.value = 0.18;
		src.connect(lp).connect(gain).connect(audioCtx.destination);
		src.start();
		src.stop(now + 0.05);
	} else if (row === 1) { // Open hi-hat
		const ohhDecay = 0.6;
		const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * ohhDecay, audioCtx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 1800);
		const src = audioCtx.createBufferSource();
		src.buffer = buffer;
		const gain = audioCtx.createGain();
		gain.gain.value = 0.25;
		src.connect(gain).connect(audioCtx.destination);
		src.start();
		src.stop(now + ohhDecay);
	} else if (row === 2) { // Snare
		// Initial noise transient (snap)
		const snapLen = 0.018;
		const snapBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * snapLen, audioCtx.sampleRate);
		const snapData = snapBuffer.getChannelData(0);
		for (let i = 0; i < snapData.length; i++) {
			snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 60);
		}
	const snapSrc = audioCtx.createBufferSource();
	snapSrc.buffer = snapBuffer;
	const snapLP = audioCtx.createBiquadFilter();
	snapLP.type = 'lowpass';
	snapLP.frequency.value = 2500;
	const snapGain = audioCtx.createGain();
	snapGain.gain.value = 0.45;
	snapSrc.connect(snapLP).connect(snapGain).connect(audioCtx.destination);
	snapSrc.start(now);
	snapSrc.stop(now + snapLen);

		// Even longer, filtered noise burst for snare
		const snareDecay = 0.32;
		const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * snareDecay, audioCtx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) {
			// Slower decay for longer tail
			data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 700);
		}
		const src = audioCtx.createBufferSource();
		src.buffer = buffer;
		// Bandpass filter to emphasize 300-500 Hz
		const bp = audioCtx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.value = 400;
		bp.Q.value = 1.2;
		const gain = audioCtx.createGain();
		gain.gain.value = 0.32;
		src.connect(bp).connect(gain).connect(audioCtx.destination);
		src.start(now);
		src.stop(now + snareDecay);
		// Add a triangle burst for snare body, more in 300-500 Hz
		const osc = audioCtx.createOscillator();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(400, now);
		osc.frequency.linearRampToValueAtTime(320, now + 0.18);
		const oscGain = audioCtx.createGain();
		oscGain.gain.setValueAtTime(0.08, now);
		oscGain.gain.linearRampToValueAtTime(0, now + snareDecay);
		osc.connect(oscGain).connect(audioCtx.destination);
		osc.start(now);
		osc.stop(now + snareDecay);
	} else if (row === 3) { // Kick
		const osc = audioCtx.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(140, now);
		osc.frequency.linearRampToValueAtTime(40, now + 0.13);
		const gain = audioCtx.createGain();
		gain.gain.setValueAtTime(0.32, now);
		gain.gain.linearRampToValueAtTime(0, now + 0.13);
		osc.connect(gain).connect(audioCtx.destination);
		osc.start(now);
		osc.stop(now + 0.13);
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
// Start sequencer by default
window.addEventListener('DOMContentLoaded', () => {
	startSequencer();
});

// Clear button logic
if (clearBtn) {
	clearBtn.onclick = () => {
			grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => []));
		drumGrid = Array.from({ length: DRUM_ROWS }, () => Array(DRUM_COLS).fill(false));
		saveState();
		renderGrid();
	};
}

const doubleLengthBtn = document.getElementById('double-length');
if (doubleLengthBtn) {
	doubleLengthBtn.onclick = () => {
		// Double the number of columns by duplicating each row's columns
		grid = grid.map(row => [...row, ...row]);
		drumGrid = drumGrid.map(row => [...row, ...row]);
		COLS = COLS * 2;
		DRUM_COLS = DRUM_COLS * 2;
		saveState();
		renderGrid();
	};
}
