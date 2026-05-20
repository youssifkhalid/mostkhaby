import { motion } from "framer-motion";
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
    : Array.from({ length: 32 }, (_, i) => 0.35 + 0.45 * Math.abs(Math.sin(i * 0.5)));

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

  const fg = tint === "primary" ? "bg-primary-foreground" : "bg-primary shadow-[0_0_10px_rgba(139,92,246,0.3)]";
  const dim = tint === "primary" ? "bg-primary-foreground/30" : "bg-muted-foreground/35";

  return (
    <div className="flex items-center gap-3.5 py-1 px-1">
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={toggle}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-md transition-all duration-300 ${
          tint === "primary"
            ? "bg-white/20 hover:bg-white/30 text-primary-foreground border border-white/10"
            : "bg-gradient-to-tr from-primary to-primary/85 text-primary-foreground border border-primary/20 hover:shadow-primary/20"
        }`}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="h-4.5 w-4.5 animate-pulse" />
        ) : (
          <Play className="h-4.5 w-4.5 translate-x-[1.5px]" />
        )}
      </motion.button>

      <div className="flex h-8 flex-1 items-center gap-[2.5px] cursor-pointer">
        {bars.map((v, i) => (
          <motion.span
            key={i}
            className={`w-[2.5px] rounded-full transition-all duration-200 ${
              i < activeBars ? fg : dim
            }`}
            style={{ height: `${Math.max(15, v * 100)}%` }}
            animate={playing ? {
              height: [
                `${Math.max(15, v * 100)}%`,
                `${Math.max(15, v * 135)}%`,
                `${Math.max(15, v * 65)}%`,
                `${Math.max(15, v * 100)}%`
              ]
            } : {}}
            transition={{
              duration: 0.75 + (i % 3) * 0.15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i % 5) * 0.05
            }}
          />
        ))}
      </div>

      <span className={`text-[10px] font-sans font-bold tabular-nums shrink-0 ${
        tint === "primary" ? "text-primary-foreground/90" : "text-muted-foreground"
      }`}>
        {formatTime(playing || time > 0 ? time : total)}
      </span>
    </div>
  );
}
