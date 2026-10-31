// Short sounds made with Web Audio (no sound files needed). Based on TopoChamp's sound.ts.
import { prefs } from './prefs.svelte';

let ctx: AudioContext | null = null;

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.12): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function ready(): boolean {
  if (!prefs.sound) return false;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

/** A right answer: a rising two-note chime, higher with a longer streak. */
export function playRight(streak = 1): void {
  if (!ready()) return;
  const lift = Math.min(streak, 8) * 20;
  tone(660 + lift, 0, 0.15, 'triangle');
  tone(880 + lift, 0.1, 0.25, 'triangle');
}

/** Coins landing in the counter: little "clinks". */
export function playCoins(count: number, delay = 0.45): void {
  if (!ready()) return;
  const n = Math.min(6, Math.max(1, Math.ceil(count / 2)));
  for (let i = 0; i < n; i++) tone(1800 + Math.random() * 500, delay + i * 0.07, 0.08, 'square', 0.04);
}

/** A soft, friendly "not quite" (no harsh buzzer). */
export function playWrong(): void {
  if (!ready()) return;
  tone(392, 0, 0.18, 'triangle', 0.1);
  tone(330, 0.14, 0.25, 'triangle', 0.1);
}

export function playFanfare(): void {
  if (!ready()) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle'));
}

export function playPop(): void {
  if (!ready()) return;
  tone(520, 0, 0.1, 'sine', 0.12);
  tone(780, 0.05, 0.12, 'sine', 0.1);
}
