import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface IncomingCall {
  id: string;
  chat_id: string;
  caller_id: string;
  type: "audio" | "video";
  caller?: { username: string; full_name: string | null; avatar_url: string | null };
}

const IncomingCallListener = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [call, setCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`incoming-calls-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${user.id}` },
        async (payload) => {
          const c = payload.new as any;
          if (c.status !== "ringing") return;
          // fetch caller profile
          const { data: caller } = await supabase
            .from("profiles")
            .select("username,full_name,avatar_url")
            .eq("id", c.caller_id)
            .single();
          setCall({ ...c, caller } as any);
          // Vibrate + try ringtone
          if (navigator.vibrate) {
            const interval = setInterval(() => navigator.vibrate?.([400, 200, 400]), 1500);
            setTimeout(() => clearInterval(interval), 30000);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        (payload) => {
          if (call && (payload.new as any).id === call.id && (payload.new as any).status !== "ringing") {
            setCall(null);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, call]);

  const accept = async () => {
    if (!call) return;
    const c = call; setCall(null);
    navigate(`/call/${c.chat_id}?type=${c.type}&caller=0&other=${c.caller_id}&callId=${c.id}`);
  };

  const decline = async () => {
    if (!call) return;
    await supabase.from("calls").update({ status: "declined", ended_at: new Date().toISOString() }).eq("id", call.id);
    setCall(null);
  };

  return (
    <AnimatePresence>
      {call && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-gradient-to-b from-primary/20 via-background/95 to-background backdrop-blur-2xl flex flex-col"
        >
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              {call.caller?.avatar_url ? (
                <img src={call.caller.avatar_url} className="w-32 h-32 rounded-full object-cover border-4 border-primary shadow-2xl" alt="" />
              ) : (
                <div className="w-32 h-32 rounded-full gradient-primary flex items-center justify-center text-5xl font-bold text-primary-foreground shadow-2xl">
                  {(call.caller?.username || "?")[0].toUpperCase()}
                </div>
              )}
            </motion.div>
            <div className="text-center">
              <p className="text-xs font-cairo text-muted-foreground mb-1">
                {call.type === "video" ? "📹 مكالمة فيديو واردة" : "📞 مكالمة صوتية واردة"}
              </p>
              <h1 className="text-2xl font-cairo font-bold text-foreground">
                {call.caller?.full_name || call.caller?.username || "مستخدم"}
              </h1>
            </div>
          </div>

          <div className="pb-[calc(3rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around px-12">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={decline}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl"
            >
              <PhoneOff size={26} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              onClick={accept}
              className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-xl"
            >
              {call.type === "video" ? <Video size={26} /> : <Phone size={26} />}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IncomingCallListener;
