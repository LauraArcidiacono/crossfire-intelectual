/**
 * Generate game sound effects as WAV files using pure synthesis.
 * Each sound is <50KB. No external dependencies needed.
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050; // Lower sample rate = smaller files
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'sounds');

function generateSamples(durationSec, generator) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = Math.max(-1, Math.min(1, generator(t, durationSec)));
  }
  return samples;
}

function envelope(t, attack, decay, sustain, release, duration) {
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - (1 - sustain) * ((t - attack) / decay);
  if (t < duration - release) return sustain;
  return sustain * ((duration - t) / release);
}

function writeWav(filename, samples) {
  const numSamples = samples.length;
  const bytesPerSample = 2; // 16-bit
  const dataSize = numSamples * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20);  // PCM
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write samples
  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(val * 32767), 44 + i * bytesPerSample);
  }

  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  const sizeKB = (buffer.length / 1024).toFixed(1);
  console.log(`  ${filename}: ${sizeKB} KB`);
}

// --- Sound Generators ---

function clickSound() {
  return generateSamples(0.08, (t, dur) => {
    const env = Math.exp(-t * 80);
    return env * (Math.sin(2 * Math.PI * 800 * t) * 0.5 + Math.sin(2 * Math.PI * 1200 * t) * 0.3);
  });
}

function revealSound() {
  return generateSamples(0.25, (t, dur) => {
    const env = Math.exp(-t * 8);
    const freq = 600 + t * 800; // Rising tone
    return env * Math.sin(2 * Math.PI * freq * t) * 0.5;
  });
}

function questionSound() {
  return generateSamples(0.4, (t, dur) => {
    const env = envelope(t, 0.02, 0.1, 0.6, 0.15, dur);
    // Two-note chime (C5 -> E5)
    const note1 = t < 0.2 ? Math.sin(2 * Math.PI * 523 * t) : 0;
    const note2 = t >= 0.15 ? Math.sin(2 * Math.PI * 659 * t) * Math.exp(-(t - 0.15) * 6) : 0;
    return env * (note1 * 0.4 + note2 * 0.4);
  });
}

function correctSound() {
  return generateSamples(0.5, (t, dur) => {
    const env = Math.exp(-t * 4);
    // Ascending major chord arpeggio: C5 -> E5 -> G5
    const n1 = t < 0.2 ? Math.sin(2 * Math.PI * 523 * t) * Math.exp(-t * 8) : 0;
    const n2 = t >= 0.12 && t < 0.35 ? Math.sin(2 * Math.PI * 659 * t) * Math.exp(-(t - 0.12) * 8) : 0;
    const n3 = t >= 0.25 ? Math.sin(2 * Math.PI * 784 * t) * Math.exp(-(t - 0.25) * 5) : 0;
    return (n1 + n2 + n3) * 0.4;
  });
}

function incorrectSound() {
  return generateSamples(0.4, (t, dur) => {
    const env = Math.exp(-t * 5);
    // Descending minor second: E4 -> Eb4 (dissonant)
    const n1 = t < 0.25 ? Math.sin(2 * Math.PI * 330 * t) : 0;
    const n2 = t >= 0.15 ? Math.sin(2 * Math.PI * 311 * t) * Math.exp(-(t - 0.15) * 6) : 0;
    // Add some noise for "buzz" effect
    const noise = (Math.random() * 2 - 1) * 0.05 * Math.exp(-t * 10);
    return env * (n1 * 0.3 + n2 * 0.3) + noise;
  });
}

function victorySound() {
  return generateSamples(1.0, (t, dur) => {
    // Fanfare: C5 -> E5 -> G5 -> C6 with harmonics
    const notes = [
      { start: 0, freq: 523, dur: 0.25 },
      { start: 0.2, freq: 659, dur: 0.25 },
      { start: 0.4, freq: 784, dur: 0.25 },
      { start: 0.6, freq: 1047, dur: 0.4 },
    ];
    let val = 0;
    for (const n of notes) {
      if (t >= n.start && t < n.start + n.dur) {
        const nt = t - n.start;
        const env = Math.exp(-nt * 3) * (1 - Math.exp(-nt * 50));
        val += env * (
          Math.sin(2 * Math.PI * n.freq * t) * 0.3 +
          Math.sin(2 * Math.PI * n.freq * 2 * t) * 0.1 +
          Math.sin(2 * Math.PI * n.freq * 3 * t) * 0.05
        );
      }
    }
    return val;
  });
}

function turnSound() {
  return generateSamples(0.2, (t, dur) => {
    const env = Math.exp(-t * 12);
    // Quick two-tone ping
    const n1 = t < 0.1 ? Math.sin(2 * Math.PI * 880 * t) : 0;
    const n2 = t >= 0.08 ? Math.sin(2 * Math.PI * 1100 * t) * Math.exp(-(t - 0.08) * 15) : 0;
    return env * (n1 * 0.4 + n2 * 0.3);
  });
}

function timeoutSound() {
  return generateSamples(0.6, (t, dur) => {
    // Descending tone + buzz
    const freq = 600 - t * 400;
    const env = envelope(t, 0.01, 0.1, 0.7, 0.2, dur);
    const main = Math.sin(2 * Math.PI * freq * t) * 0.3;
    const buzz = Math.sin(2 * Math.PI * 150 * t) * 0.15 * (t > 0.3 ? 1 : 0);
    return env * (main + buzz);
  });
}

function countdownTickSound() {
  // Rising tone tick: a clear "boop" that sounds good repeated 3 times
  return generateSamples(0.25, (t, dur) => {
    const env = Math.min(1, t / 0.005) * Math.exp(-t * 8);
    const freq = 600;
    return env * (
      Math.sin(2 * Math.PI * freq * t) * 0.4 +
      Math.sin(2 * Math.PI * freq * 2 * t) * 0.15 * Math.exp(-t * 15)
    );
  });
}

function countdownGoSound() {
  // Upward sweep + bright chord hit for "GO!"
  return generateSamples(0.6, (t, dur) => {
    // Sweep from 300 to 900 Hz in first 0.15s
    const sweepEnd = 0.15;
    let val = 0;
    if (t < sweepEnd) {
      const sweepFreq = 300 + (600 * t / sweepEnd);
      const sweepEnv = Math.min(1, t / 0.005) * 0.3;
      val += sweepEnv * Math.sin(2 * Math.PI * sweepFreq * t);
    }
    // Bright major chord hit after sweep
    if (t >= 0.08) {
      const ct = t - 0.08;
      const chordEnv = Math.min(1, ct / 0.01) * Math.exp(-ct * 4);
      val += chordEnv * Math.sin(2 * Math.PI * 523 * t) * 0.2;  // C5
      val += chordEnv * Math.sin(2 * Math.PI * 659 * t) * 0.15; // E5
      val += chordEnv * Math.sin(2 * Math.PI * 784 * t) * 0.15; // G5
      val += chordEnv * Math.sin(2 * Math.PI * 1047 * t) * 0.1; // C6
    }
    return val;
  });
}

// --- Music Generators ---

// Musical note frequencies (equal temperament)
const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
};

function synthNote(t, freq, amp, attackTime, decayRate) {
  const env = Math.min(1, t / attackTime) * Math.exp(-t * decayRate);
  return env * amp * (
    Math.sin(2 * Math.PI * freq * t) * 0.6 +
    Math.sin(2 * Math.PI * freq * 2 * t) * 0.25 +
    Math.sin(2 * Math.PI * freq * 3 * t) * 0.1 +
    Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.05
  );
}

function bassNote(t, freq, amp) {
  const env = Math.min(1, t / 0.01) * Math.exp(-t * 3);
  return env * amp * (
    Math.sin(2 * Math.PI * freq * t) * 0.7 +
    Math.sin(2 * Math.PI * freq * 2 * t) * 0.2 +
    Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.1
  );
}

function gameMusic() {
  const BPM = 110;
  const beatDur = 60 / BPM;
  const DURATION = 12; // exactly 12 seconds

  // Warm pad synth - sustained, smooth, no clicks
  function padTone(t, freq, amp) {
    const env = Math.min(1, t / 0.15) * Math.exp(-t * 0.4);
    return env * amp * (
      Math.sin(2 * Math.PI * freq * t) * 0.5 +
      Math.sin(2 * Math.PI * freq * 2.002 * t) * 0.2 + // slight detune for warmth
      Math.sin(2 * Math.PI * freq * 0.998 * t) * 0.2 +
      Math.sin(2 * Math.PI * freq * 3 * t) * 0.05
    );
  }

  // Soft pluck melody - gentle attack, fast decay
  function pluck(t, freq, amp) {
    const env = Math.min(1, t / 0.005) * Math.exp(-t * 5);
    return env * amp * (
      Math.sin(2 * Math.PI * freq * t) * 0.6 +
      Math.sin(2 * Math.PI * freq * 2 * t) * 0.25 * Math.exp(-t * 8) +
      Math.sin(2 * Math.PI * freq * 3 * t) * 0.1 * Math.exp(-t * 12)
    );
  }

  // Gentle melody - spaced out, lyrical (G major pentatonic feel)
  const Gb3 = 185.00;
  const melody = [
    { beat: 0,    note: NOTE.G4, dur: 1.5 },
    { beat: 2,    note: NOTE.B4, dur: 1 },
    { beat: 3.5,  note: NOTE.A4, dur: 1 },
    { beat: 5,    note: NOTE.G4, dur: 1.5 },
    { beat: 7,    note: NOTE.D5, dur: 1 },
    { beat: 8.5,  note: NOTE.B4, dur: 1.5 },
    { beat: 10.5, note: NOTE.A4, dur: 1 },
    { beat: 12,   note: NOTE.G4, dur: 1.5 },
    { beat: 14,   note: NOTE.E4, dur: 1 },
    { beat: 15.5, note: NOTE.D4, dur: 1 },
    { beat: 17,   note: NOTE.E4, dur: 1.5 },
    { beat: 19,   note: NOTE.G4, dur: 1.5 },
    { beat: 21,   note: NOTE.A4, dur: 1 },
  ];

  // Warm sustained pads - slow chord changes
  const pads = [
    { beat: 0,  notes: [NOTE.G3, NOTE.B3, NOTE.D4], dur: 5.5 },
    { beat: 6,  notes: [NOTE.C4, NOTE.E4, NOTE.G4], dur: 5.5 },
    { beat: 12, notes: [NOTE.D4, Gb3, NOTE.A3],     dur: 5.5 },
    { beat: 18, notes: [NOTE.C4, NOTE.E4, NOTE.G4], dur: 4 },
  ];

  // Soft bass - whole notes
  const bass = [
    { beat: 0,  note: NOTE.G3, dur: 5.5 },
    { beat: 6,  note: NOTE.C3, dur: 5.5 },
    { beat: 12, note: NOTE.D3, dur: 5.5 },
    { beat: 18, note: NOTE.C3, dur: 4 },
  ];

  return generateSamples(DURATION, (t) => {
    let val = 0;

    // Melody (plucked)
    for (const n of melody) {
      const noteStart = n.beat * beatDur;
      const noteDur = n.dur * beatDur;
      if (t >= noteStart && t < noteStart + noteDur) {
        val += pluck(t - noteStart, n.note, 0.22);
      }
    }

    // Pads (sustained chords)
    for (const p of pads) {
      const padStart = p.beat * beatDur;
      const padDur = p.dur * beatDur;
      if (t >= padStart && t < padStart + padDur) {
        for (const freq of p.notes) {
          val += padTone(t - padStart, freq, 0.06);
        }
      }
    }

    // Bass
    for (const b of bass) {
      const noteStart = b.beat * beatDur;
      const noteDur = b.dur * beatDur;
      if (t >= noteStart && t < noteStart + noteDur) {
        val += bassNote(t - noteStart, b.note, 0.1);
      }
    }

    // Smooth crossfade for seamless loop (0.8s each side)
    const fadeTime = 0.8;
    let fade = 1;
    if (t < fadeTime) fade = t / fadeTime;
    if (t > DURATION - fadeTime) fade = (DURATION - t) / fadeTime;
    // Use sine curve for smoother transition
    fade = (1 - Math.cos(fade * Math.PI)) / 2;

    return val * fade;
  });
}

function victoryMusic() {
  const BPM = 130;
  const beatDur = 60 / BPM;
  const DURATION = 14;

  // Bright bell-like pluck - celebratory but gentle
  function bellPluck(t, freq, amp) {
    const env = Math.min(1, t / 0.003) * Math.exp(-t * 3);
    return env * amp * (
      Math.sin(2 * Math.PI * freq * t) * 0.5 +
      Math.sin(2 * Math.PI * freq * 2 * t) * 0.3 * Math.exp(-t * 5) +
      Math.sin(2 * Math.PI * freq * 4 * t) * 0.1 * Math.exp(-t * 10) +
      Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.1
    );
  }

  // Warm shimmering pad
  function shimmerPad(t, freq, amp) {
    const env = Math.min(1, t / 0.2) * Math.exp(-t * 0.3);
    const vibrato = 1 + 0.003 * Math.sin(2 * Math.PI * 4.5 * t);
    return env * amp * (
      Math.sin(2 * Math.PI * freq * vibrato * t) * 0.4 +
      Math.sin(2 * Math.PI * freq * 2.001 * t) * 0.25 +
      Math.sin(2 * Math.PI * freq * 0.999 * t) * 0.25 +
      Math.sin(2 * Math.PI * freq * 3 * t) * 0.05
    );
  }

  // Joyful melody - D major, peaceful and happy
  const Fs4 = 369.99;
  const Fs5 = 739.99;
  const melody = [
    // Phrase 1: gentle ascending joy
    { beat: 0,    note: NOTE.D5, dur: 2 },
    { beat: 2.5,  note: Fs5,     dur: 1.5 },
    { beat: 4.5,  note: NOTE.A5, dur: 2 },
    { beat: 7,    note: NOTE.G5, dur: 1.5 },
    // Phrase 2: floating resolution
    { beat: 9,    note: Fs5,     dur: 1.5 },
    { beat: 11,   note: NOTE.E5, dur: 1.5 },
    { beat: 13,   note: NOTE.D5, dur: 2 },
    { beat: 15.5, note: NOTE.A4, dur: 1.5 },
    // Phrase 3: playful uplift
    { beat: 17.5, note: NOTE.B4, dur: 1 },
    { beat: 19,   note: NOTE.D5, dur: 1.5 },
    { beat: 21,   note: Fs5,     dur: 1.5 },
  ];

  // Lush pads - major chords, slow movement
  const pads = [
    { beat: 0,  notes: [NOTE.D4, Fs4, NOTE.A4],   dur: 7 },
    { beat: 7,  notes: [NOTE.G4, NOTE.B4, NOTE.D5], dur: 6.5 },
    { beat: 14, notes: [NOTE.A3, NOTE.E4, NOTE.A4], dur: 5 },
    { beat: 19, notes: [NOTE.D4, Fs4, NOTE.A4],     dur: 4 },
  ];

  // Soft bass
  const bass = [
    { beat: 0,  note: NOTE.D3, dur: 7 },
    { beat: 7,  note: NOTE.G3, dur: 6.5 },
    { beat: 14, note: NOTE.A3, dur: 5 },
    { beat: 19, note: NOTE.D3, dur: 4 },
  ];

  return generateSamples(DURATION, (t) => {
    let val = 0;

    // Melody (bell pluck)
    for (const n of melody) {
      const noteStart = n.beat * beatDur;
      const noteDur = n.dur * beatDur;
      if (t >= noteStart && t < noteStart + noteDur) {
        val += bellPluck(t - noteStart, n.note, 0.22);
      }
    }

    // Shimmer pads
    for (const p of pads) {
      const padStart = p.beat * beatDur;
      const padDur = p.dur * beatDur;
      if (t >= padStart && t < padStart + padDur) {
        for (const freq of p.notes) {
          val += shimmerPad(t - padStart, freq, 0.055);
        }
      }
    }

    // Bass
    for (const b of bass) {
      const noteStart = b.beat * beatDur;
      const noteDur = b.dur * beatDur;
      if (t >= noteStart && t < noteStart + noteDur) {
        val += bassNote(t - noteStart, b.note, 0.08);
      }
    }

    // Smooth crossfade for seamless loop (0.8s, cosine curve)
    const fadeTime = 0.8;
    let fade = 1;
    if (t < fadeTime) fade = t / fadeTime;
    if (t > DURATION - fadeTime) fade = (DURATION - t) / fadeTime;
    fade = (1 - Math.cos(fade * Math.PI)) / 2;

    return val * fade;
  });
}

// --- Main ---

console.log('Generating sound effects...');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

writeWav('click.wav', clickSound());
writeWav('reveal.wav', revealSound());
writeWav('question.wav', questionSound());
writeWav('correct.wav', correctSound());
writeWav('incorrect.wav', incorrectSound());
writeWav('victory.wav', victorySound());
writeWav('turn.wav', turnSound());
writeWav('timeout.wav', timeoutSound());
writeWav('countdown-tick.wav', countdownTickSound());
writeWav('countdown-go.wav', countdownGoSound());

console.log('\nGenerating music tracks...');
writeWav('music-game.wav', gameMusic());
writeWav('music-victory.wav', victoryMusic());

console.log('\nDone! All sounds in public/sounds/');
