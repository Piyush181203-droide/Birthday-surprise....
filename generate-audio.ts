import fs from 'fs';
import path from 'path';

// Helper to create a 16-bit PCM mono WAV file
function createWavBuffer(sampleRate: number, samples: Float32Array): Buffer {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp to -1..1
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer.writeInt16LE(Math.floor(intSample), offset);
    offset += 2;
  }

  return buffer;
}

// Note frequencies (Hz)
const NOTE: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50
};

// Generate music box bell chime tone
function synthNote(
  freq: number,
  duration: number,
  sampleRate: number,
  velocity: number = 0.5
): Float32Array {
  const numSamples = Math.floor(duration * sampleRate);
  const out = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Bell/chime envelope: instant attack, exponential decay
    const env = Math.exp(-t * 3.5);
    // Harmonics for rich music-box celesta timbre
    const fund = Math.sin(2 * Math.PI * freq * t);
    const h2 = 0.45 * Math.sin(2 * Math.PI * freq * 2 * t) * Math.exp(-t * 5);
    const h3 = 0.25 * Math.sin(2 * Math.PI * freq * 3 * t) * Math.exp(-t * 7);
    const h4 = 0.15 * Math.sin(2 * Math.PI * freq * 4.2 * t) * Math.exp(-t * 9);

    out[i] = (fund + h2 + h3 + h4) * env * velocity;
  }
  return out;
}

function mixNote(
  buffer: Float32Array,
  startSec: number,
  freq: number,
  duration: number,
  sampleRate: number,
  velocity = 0.45
) {
  const noteSamples = synthNote(freq, duration, sampleRate, velocity);
  const startIdx = Math.floor(startSec * sampleRate);

  for (let i = 0; i < noteSamples.length; i++) {
    const targetIdx = startIdx + i;
    if (targetIdx < buffer.length) {
      buffer[targetIdx] += noteSamples[i];
    }
  }
}

// Generate the public domain Happy Birthday song
export function generateHappyBirthdayWav(): Buffer {
  const sampleRate = 44100;
  const totalDuration = 22.0; // 22 seconds
  const totalSamples = Math.floor(totalDuration * sampleRate);
  const audioBuffer = new Float32Array(totalSamples);

  // Melody for "Happy Birthday to You" in C Major
  // Tempo: ~100 bpm => quarter note ~ 0.6s
  const Q = 0.58;
  const E = Q / 2;
  const H = Q * 2;
  const D_H = Q * 3; // dotted half

  const melody: Array<[string, number, number]> = [
    // "Happy Birthday to you"
    ['G4', E * 0.75, 0.0],
    ['G4', E * 0.25, 0.4],
    ['A4', Q, 0.6],
    ['G4', Q, 1.2],
    ['C5', Q, 1.8],
    ['B4', H, 2.4],

    // "Happy Birthday to you"
    ['G4', E * 0.75, 3.8],
    ['G4', E * 0.25, 4.2],
    ['A4', Q, 4.4],
    ['G4', Q, 5.0],
    ['D5', Q, 5.6],
    ['C5', H, 6.2],

    // "Happy Birthday dear [Name]"
    ['G4', E * 0.75, 7.6],
    ['G4', E * 0.25, 8.0],
    ['G5', Q, 8.2],
    ['E5', Q, 8.8],
    ['C5', Q, 9.4],
    ['B4', Q, 10.0],
    ['A4', H, 10.6],

    // "Happy Birthday to you"
    ['F5', E * 0.75, 12.0],
    ['F5', E * 0.25, 12.4],
    ['E5', Q, 12.6],
    ['C5', Q, 13.2],
    ['D5', Q, 13.8],
    ['C5', D_H, 14.4],

    // Final celebratory chime chord
    ['C4', 4.0, 16.5],
    ['E4', 4.0, 16.5],
    ['G4', 4.0, 16.5],
    ['C5', 4.0, 16.5],
  ];

  // Add warm bass notes to accompany
  const bassNotes: Array<[string, number, number]> = [
    ['C3', 2.0, 0.0],
    ['G3', 2.0, 2.4],
    ['G3', 2.0, 3.8],
    ['C3', 2.0, 6.2],
    ['C3', 2.0, 7.6],
    ['F3', 2.0, 10.6],
    ['G3', 2.0, 12.0],
    ['C3', 4.0, 14.4],
  ];

  melody.forEach(([note, dur, time]) => {
    mixNote(audioBuffer, time, NOTE[note], dur * 2.2, sampleRate, 0.42);
  });

  bassNotes.forEach(([note, dur, time]) => {
    mixNote(audioBuffer, time, NOTE[note], dur * 1.5, sampleRate, 0.25);
  });

  // Normalize
  let maxAmp = 0;
  for (let i = 0; i < audioBuffer.length; i++) {
    const abs = Math.abs(audioBuffer[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  if (maxAmp > 0) {
    const gain = 0.82 / maxAmp;
    for (let i = 0; i < audioBuffer.length; i++) {
      audioBuffer[i] *= gain;
    }
  }

  return createWavBuffer(sampleRate, audioBuffer);
}

// Generate gentle romantic piano ambient loop
export function generateGentlePianoWav(): Buffer {
  const sampleRate = 44100;
  const totalDuration = 24.0;
  const totalSamples = Math.floor(totalDuration * sampleRate);
  const audioBuffer = new Float32Array(totalSamples);

  // Arpeggios across gentle romantic chords: Cmaj7 - Am7 - Fmaj7 - Gsus4
  const chords = [
    { root: 'C', notes: ['C3', 'G3', 'C4', 'E4', 'G4', 'B4'], time: 0 },
    { root: 'Am', notes: ['A2', 'E3', 'A3', 'C4', 'E4', 'G4'], time: 6 },
    { root: 'F', notes: ['F2', 'C3', 'F3', 'A3', 'C4', 'E4'], time: 12 },
    { root: 'G', notes: ['G2', 'D3', 'G3', 'B3', 'D4', 'F4'], time: 18 },
  ];

  chords.forEach(({ notes, time }) => {
    notes.forEach((noteName, nIdx) => {
      // Arpeggiate
      const noteTime = time + nIdx * 0.45;
      mixNote(audioBuffer, noteTime, NOTE[noteName] || 261.63, 4.5, sampleRate, 0.28);
      // Echo repeat
      const echoTime = time + 3.0 + nIdx * 0.4;
      mixNote(audioBuffer, echoTime, (NOTE[noteName] || 261.63) * 1.0, 3.5, sampleRate, 0.18);
    });
  });

  let maxAmp = 0;
  for (let i = 0; i < audioBuffer.length; i++) {
    const abs = Math.abs(audioBuffer[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  if (maxAmp > 0) {
    const gain = 0.8 / maxAmp;
    for (let i = 0; i < audioBuffer.length; i++) {
      audioBuffer[i] *= gain;
    }
  }

  return createWavBuffer(sampleRate, audioBuffer);
}

// Generate files
const audioDir = path.resolve(process.cwd(), 'public/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

fs.writeFileSync(path.join(audioDir, 'happy-birthday.wav'), generateHappyBirthdayWav());
fs.writeFileSync(path.join(audioDir, 'gentle-piano.wav'), generateGentlePianoWav());
console.log('Successfully generated public domain audio assets in public/audio/');
