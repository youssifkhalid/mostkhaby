import { useCallback, useRef, useState, useEffect } from "react";

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    try {
      cancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.start(250);

      // Waveform analyser
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const samples: number[] = [];
      startedAtRef.current = Date.now();

      const tick = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArr);
        const avg = dataArr.reduce((s, v) => s + v, 0) / dataArr.length;
        const norm = Math.min(1, avg / 128);
        samples.push(norm);
        if (samples.length > 60) samples.shift();
        setWaveform([...samples]);
        setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      setIsRecording(true);
      return true;
    } catch (e) {
      console.error("recorder start failed", e);
      cleanup();
      return false;
    }
  }, [cleanup]);

  const stop = useCallback(async (): Promise<{ blob: Blob; duration: number; waveform: number[] } | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) { cleanup(); setIsRecording(false); return resolve(null); }
      const dur = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
      const wf = [...waveform];
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        cleanup();
        setIsRecording(false);
        setDuration(0);
        setWaveform([]);
        if (cancelledRef.current) resolve(null);
        else resolve({ blob, duration: dur, waveform: wf });
      };
      mr.stop();
    });
  }, [cleanup, waveform]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    return stop();
  }, [stop]);

  return { isRecording, duration, waveform, start, stop, cancel };
};
