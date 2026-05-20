// Web Audio API based notification sounds (no external files needed)

type SoundName = "default" | "chime" | "bell" | "pop" | "ding" | "soft" | "none";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      audioCtx = new AC();
    } catch { return null; }
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone(ctx: AudioContext, freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

export function playNotificationSound(name: SoundName = "default", volume = 80) {
  if (name === "none") return;
  const ctx = getCtx();
  if (!ctx) return;
  const v = Math.max(0, Math.min(1, volume / 100)) * 0.35;

  switch (name) {
    case "chime":
      tone(ctx, 880, 0, 0.18, v);
      tone(ctx, 1320, 0.12, 0.22, v * 0.8);
      break;
    case "bell":
      tone(ctx, 1568, 0, 0.4, v, "triangle");
      tone(ctx, 2093, 0, 0.35, v * 0.5, "triangle");
      break;
    case "pop":
      tone(ctx, 600, 0, 0.08, v, "square");
      tone(ctx, 900, 0.05, 0.08, v * 0.7, "square");
      break;
    case "ding":
      tone(ctx, 2400, 0, 0.5, v * 0.6, "sine");
      break;
    case "soft":
      tone(ctx, 523, 0, 0.25, v * 0.7);
      tone(ctx, 659, 0.08, 0.25, v * 0.6);
      tone(ctx, 784, 0.16, 0.3, v * 0.5);
      break;
    default: // default
      tone(ctx, 1200, 0, 0.12, v);
      tone(ctx, 1600, 0.08, 0.18, v * 0.8);
  }
}

export const SOUND_OPTIONS: { value: SoundName; label: string; emoji: string }[] = [
  { value: "default", label: "افتراضي", emoji: "🔔" },
  { value: "chime", label: "كايم", emoji: "🎵" },
  { value: "bell", label: "جرس", emoji: "🛎️" },
  { value: "pop", label: "بوب", emoji: "💧" },
  { value: "ding", label: "دينج", emoji: "✨" },
  { value: "soft", label: "ناعم", emoji: "🎶" },
  { value: "none", label: "صامت", emoji: "🔕" },
];

export function vibrate(pattern: number | number[] = [80, 40, 80]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.debug("Vibration failed or blocked:", e);
    }
  }
}
