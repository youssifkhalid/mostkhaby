import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  url: string;
  duration?: number | null;
  waveform?: number[] | null;
  tint?: "primary" | "muted";
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export function VoicePlayer({ url, duration = 0, waveform, tint = "muted" }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(duration || 0);

  const bars = waveform && waveform.length
    ? waveform
    : Array.from({ length: 36 }, (_, i) => 0.35 + 0.5 * Math.abs(Math.sin(i * 0.6)));

  useEffect(() => {
    const a = new Audio(url);
    audioRef.current = a;
    a.addEventListener("loadedmetadata", () => setTotal(a.duration || duration || 0));
    a.addEventListener("timeupdate", () => setTime(a.currentTime));
    a.addEventListener("ended", () => { setPlaying(false); setTime(0); });
    return () => { a.pause(); audioRef.current = null; };
  }, [url, duration]);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const progress = total > 0 ? Math.min(1, time / total) : 0;
  const activeBars = Math.floor(progress * bars.length);

  const fg = tint === "primary" ? "bg-primary-foreground" : "bg-primary";
  const dim = tint === "primary" ? "bg-primary-foreground/30" : "bg-muted-foreground/40";

  return (
    <div className="flex items-center gap-3 py-1">
      <button
        onClick={toggle}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tint === "primary" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"}`}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>

      <div className="flex h-8 flex-1 items-center gap-[2px]">
        {bars.map((v, i) => (
          <span
            key={i}
            className={`w-[2px] rounded-full ${i < activeBars ? fg : dim}`}
            style={{ height: `${Math.max(15, v * 100)}%` }}
          />
        ))}
      </div>

      <span className={`text-[11px] tabular-nums ${tint === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {formatTime(playing || time > 0 ? time : total)}
      </span>
    </div>
  );
}
