import { motion, AnimatePresence } from "framer-motion";
import { Mic, Trash2, Send, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  onSend: (blob: Blob, durationSec: number, waveform: number[]) => void;
  onCancel?: () => void;
}

/**
 * WhatsApp-style hold-to-record. Slide left to cancel, slide up to lock.
 * Captures live waveform samples for nicer playback.
 */
export function VoiceRecorder({ onSend, onCancel }: Props) {
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTime = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sampleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (sampleTimer.current) clearInterval(sampleTimer.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
  };

  const start = async () => {
    try {
      cancelledRef.current = false;
      waveformRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const dur = (Date.now() - startTime.current) / 1000;
        const wave = waveformRef.current.slice();
        cleanup();
        setRecording(false);
        setLocked(false);
        setSeconds(0);
        setOffsetX(0);
        setOffsetY(0);
        if (cancelledRef.current) { onCancel?.(); return; }
        if (dur < 0.5) { onCancel?.(); return; }
        onSend(blob, dur, wave);
      };
      mr.start();
      startTime.current = Date.now();
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

      // waveform sampling
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      sampleTimer.current = setInterval(() => {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length / 255;
        waveformRef.current.push(Math.min(1, avg * 1.6));
        if (waveformRef.current.length > 120) waveformRef.current.shift();
      }, 80);
    } catch (e) {
      console.error("Mic permission denied", e);
      onCancel?.();
    }
  };

  const stop = (cancel = false) => {
    cancelledRef.current = cancel;
    mediaRef.current?.stop();
  };

  useEffect(() => () => cleanup(), []);

  const cancelThreshold = -90;
  const lockThreshold = -70;

  return (
    <>
      <motion.button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); start(); }}
        onPointerUp={() => { if (!locked) stop(offsetX < cancelThreshold); }}
        onPointerMove={(e) => {
          if (!recording || locked) return;
          const dx = Math.min(0, e.movementX + offsetX);
          const dy = Math.min(0, e.movementY + offsetY);
          setOffsetX(dx);
          setOffsetY(dy);
          if (dy < lockThreshold) {
            setLocked(true);
            setOffsetX(0); setOffsetY(0);
          }
        }}
        whileTap={{ scale: 1.1 }}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-label="Hold to record"
      >
        <Mic className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {recording && !locked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-full mb-2 flex items-center gap-3 rounded-2xl border bg-popover px-4 py-2 shadow-lg"
          >
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="h-2.5 w-2.5 rounded-full bg-red-500"
            />
            <span className="text-sm tabular-nums">{Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}</span>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> swipe up to lock
              <span className="mx-1">·</span>
              <Trash2 className="h-3.5 w-3.5" /> slide left to cancel
            </div>
          </motion.div>
        )}

        {recording && locked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-full mb-2 flex items-center gap-3 rounded-2xl border bg-popover px-4 py-2 shadow-lg"
          >
            <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-sm tabular-nums">{Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}</span>
            <button onClick={() => stop(true)} className="ml-auto rounded-full p-2 text-destructive hover:bg-muted" aria-label="Cancel">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={() => stop(false)} className="rounded-full bg-primary p-2 text-primary-foreground" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
