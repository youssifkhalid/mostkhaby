import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

export type CallStatus = "idle" | "ringing" | "connecting" | "connected" | "ended";

interface UseCallOpts {
  chatId: string;
  selfId: string;
  otherId: string;
  type: "audio" | "video";
  isCaller: boolean;
  callId?: string;
  onEnded?: () => void;
}

export const useWebRTCCall = ({ chatId, selfId, otherId, type, isCaller, callId, onEnded }: UseCallOpts) => {
  const [status, setStatus] = useState<CallStatus>(isCaller ? "ringing" : "connecting");
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(type === "video");
  const [duration, setDuration] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const startedAtRef = useRef<number>(0);
  const callRowIdRef = useRef<string | undefined>(callId);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const cleanup = useCallback((reason: "ended" | "declined" | "missed" = "ended") => {
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    setStatus("ended");
    if (callRowIdRef.current) {
      const dur = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0;
      supabase.from("calls").update({
        status: reason,
        ended_at: new Date().toISOString(),
        duration: dur,
      }).eq("id", callRowIdRef.current);
    }
    onEnded?.();
  }, [onEnded]);

  // Setup
  useEffect(() => {
    let mounted = true;
    (async () => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      const remote = new MediaStream();
      remoteStreamRef.current = remote;
      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((t) => remote.addTrack(t));
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      };

      // Get local media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video" ? { facingMode: "user", width: { ideal: 720 } } : false,
        });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      } catch (e) {
        console.error("getUserMedia failed", e);
        cleanup("ended");
        return;
      }

      // Signaling channel
      const ch = supabase.channel(`call-${chatId}`, { config: { broadcast: { ack: false } } });
      channelRef.current = ch;

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          ch.send({ type: "broadcast", event: "ice", payload: { from: selfId, to: otherId, candidate: ev.candidate } });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("connected");
          if (!startedAtRef.current) startedAtRef.current = Date.now();
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          cleanup("ended");
        }
      };

      ch.on("broadcast", { event: "answer" }, async (msg: any) => {
        if (msg.payload?.to !== selfId) return;
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
        setStatus("connecting");
      })
      .on("broadcast", { event: "offer" }, async (msg: any) => {
        if (msg.payload?.to !== selfId || isCaller) return;
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        ch.send({ type: "broadcast", event: "answer", payload: { from: selfId, to: otherId, sdp: ans } });
      })
      .on("broadcast", { event: "ice" }, async (msg: any) => {
        if (msg.payload?.to !== selfId) return;
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate)); } catch {}
      })
      .on("broadcast", { event: "hangup" }, (msg: any) => {
        if (msg.payload?.to === selfId) cleanup("ended");
      })
      .subscribe(async (s) => {
        if (s !== "SUBSCRIBED") return;
        if (isCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          // Wait briefly for callee to also subscribe
          setTimeout(() => {
            ch.send({ type: "broadcast", event: "offer", payload: { from: selfId, to: otherId, sdp: offer } });
          }, 800);
        } else {
          // Callee notifies presence
          ch.send({ type: "broadcast", event: "ready", payload: { from: selfId, to: otherId } });
        }
      });
    })();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, selfId, otherId, type, isCaller]);

  // Duration ticker
  useEffect(() => {
    if (status !== "connected") return;
    const i = setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, [status]);

  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() || [];
    tracks.forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() || [];
    tracks.forEach((t) => (t.enabled = !cameraOn));
    setCameraOn(!cameraOn);
  }, [cameraOn]);

  const hangup = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: "hangup", payload: { from: selfId, to: otherId } });
    cleanup("ended");
  }, [cleanup, selfId, otherId]);

  return {
    status, muted, cameraOn, duration,
    toggleMute, toggleCamera, hangup,
    localVideoRef, remoteVideoRef,
  };
};
