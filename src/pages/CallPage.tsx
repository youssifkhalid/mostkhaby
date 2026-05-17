import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const CallPage = () => {
  const { chatId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const type = (params.get("type") || "audio") as "audio" | "video";
  const isCaller = params.get("caller") === "1";
  const otherId = params.get("other") || "";
  const callId = params.get("callId") || undefined;
  const [otherProfile, setOtherProfile] = useState<any>(null);

  useEffect(() => {
    if (!otherId) return;
    supabase.from("profiles").select("username,full_name,avatar_url").eq("id", otherId).single()
      .then(({ data }) => setOtherProfile(data));
  }, [otherId]);

  const { status, muted, cameraOn, duration, toggleMute, toggleCamera, hangup, localVideoRef, remoteVideoRef } =
    useWebRTCCall({
      chatId: chatId!,
      selfId: user?.id || "",
      otherId,
      type,
      isCaller,
      callId,
      onEnded: () => setTimeout(() => navigate(`/chat/${chatId}`), 800),
    });

  if (!user || !chatId || !otherId) return null;

  const name = otherProfile?.full_name || otherProfile?.username || "...";
  const avatar = otherProfile?.avatar_url;
  const initial = (otherProfile?.username || "?")[0].toUpperCase();

  const statusText =
    status === "ringing" ? (isCaller ? "جاري الاتصال..." : "مكالمة واردة...") :
    status === "connecting" ? "جاري الاتصال..." :
    status === "connected" ? fmt(duration) :
    "انتهت المكالمة";

  return (
    <div className="fixed inset-0 z-[70] bg-gradient-to-br from-[hsl(263,40%,12%)] to-[hsl(250,40%,8%)] flex flex-col">
      {/* Remote video (full screen) */}
      {type === "video" && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Overlay info */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center">
        {(type === "audio" || status !== "connected") && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            {avatar ? (
              <img src={avatar} alt="" className="w-32 h-32 rounded-full object-cover border-4 border-primary/30 shadow-2xl" />
            ) : (
              <div className="w-32 h-32 rounded-full gradient-primary flex items-center justify-center text-5xl font-bold text-primary-foreground shadow-2xl">
                {initial}
              </div>
            )}
            <h1 className="text-2xl font-cairo font-bold text-white">{name}</h1>
            <p className="text-sm font-cairo text-white/70">{statusText}</p>
            {status === "ringing" && isCaller && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-primary/30"
              />
            )}
          </motion.div>
        )}
        {type === "video" && status === "connected" && (
          <div className="absolute top-6 right-6 text-white text-sm font-cairo bg-black/40 backdrop-blur rounded-full px-3 py-1.5">
            {fmt(duration)}
          </div>
        )}
      </div>

      {/* Local PiP video */}
      {type === "video" && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-4 left-4 w-28 h-40 rounded-xl object-cover border-2 border-white/20 shadow-2xl bg-black"
        />
      )}

      {/* Controls */}
      <div className="relative z-10 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-6 px-6 flex items-center justify-center gap-5">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur transition-colors ${
            muted ? "bg-white text-black" : "bg-white/15 text-white"
          }`}
        >
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={hangup}
          className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl"
        >
          <PhoneOff size={26} />
        </motion.button>

        {type === "video" && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur transition-colors ${
              !cameraOn ? "bg-white text-black" : "bg-white/15 text-white"
            }`}
          >
            {cameraOn ? <Video size={22} /> : <VideoOff size={22} />}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default CallPage;
