import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  url: string;
  duration?: number;
  waveform?: number[];
  isMine?: boolean;
}

const VoicePlayer = ({ url, duration = 0, waveform = [], isMine }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const a = new Audio(url);
    audioRef.current = a;
    a.preload = "metadata";
    a.onended = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
    a.ontimeupdate = () => {
      const p = (a.currentTime / (a.duration || duration || 1)) * 100;
      setProgress(p);
      setCurrentTime(Math.floor(a.currentTime));
    };
    return () => { a.pause(); a.src = ""; };
  }, [url, duration]);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.playbackRate = speed; a.play(); setPlaying(true); }
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const bars = waveform.length > 0 ? waveform : Array.from({ length: 28 }, () => 0.4 + Math.random() * 0.5);

  return (
    <div className={`flex items-center gap-2.5 min-w-[200px] ${isMine ? "" : ""}`}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggle}
        className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground flex-shrink-0 shadow-md"
      >
        {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
      </motion.button>
      <div className="flex-1 flex items-center gap-0.5 h-7">
        {bars.map((b, i) => {
          const reached = (i / bars.length) * 100 < progress;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors ${reached ? "bg-primary" : "bg-muted-foreground/30"}`}
              style={{ height: `${Math.max(15, b * 100)}%` }}
            />
          );
        })}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {fmt(playing ? currentTime : duration)}
        </span>
        <button
          onClick={cycleSpeed}
          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary/50 text-foreground"
        >
          {speed}x
        </button>
      </div>
    </div>
  );
};

export default VoicePlayer;
