
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import {
  ArrowRight, Send, Loader2, MoreVertical, Ban, Trash2, Flag, User, X,
  Check, Phone, Video, Mic, Image as ImageIcon, Eraser, CheckSquare,
  Edit3, Reply, Copy, Forward, Pin, CheckCheck, Clock, Smile, Paperclip,
  Search, ChevronDown, Play, Pause, Lock, ZoomIn
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useChatMessages, useTypingIndicator } from "@/hooks/useChats";
import { useChatReactions, useChatMessageActions } from "@/hooks/useChatActions";
import { useAuth } from "@/hooks/useAuth";
import { useActiveChat } from "@/contexts/ActiveChatContext";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { sanitizeTextForDatabase } from "@/lib/sanitizeText";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import UserAvatar from "@/components/UserAvatar";
import { useNicknames } from "@/hooks/useNicknames";
import NicknameDialog from "@/components/NicknameDialog";

/* ─── Types ─── */
interface Msg {
  id: string;
  content: string;
  sender_id: string;
  status: string;
  created_at: string;
  is_deleted?: boolean;
  is_edited?: boolean;
  reply_to_id?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  audio_duration?: number | null;
  waveform?: number[] | null;
  sender?: { username: string; full_name: string | null; avatar_url: string | null } | null;
}

/* ─── Helpers ─── */
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  { name: "وجوه", emojis: "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 😤 😡 😠 🤬 😈 👿 💀 💩 🤡".split(" ") },
  { name: "قلوب", emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♥️ 💌 💋 🌹 💐".split(" ") },
  { name: "إيدين", emojis: "👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤛 🤜 ✊ 👊 👏 🙌 👐 🤲 🤝 🙏 💪 🦾 ✍️".split(" ") },
  { name: "حيوانات", emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦅 🦉 🐺 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🦎 🐙 🦑 🦞 🦀 🐠 🐟 🐬 🐳 🐋 🦈".split(" ") },
  { name: "طعام", emojis: "🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🍞 🥐 🧀 🍗 🍕 🍔 🌭 🥪 🍟 🍿 🍩 🍪 🎂 🍰 🍫 🍬 🍭".split(" ") },
  { name: "رموز", emojis: "✅ ❌ ⭐ 🌟 ✨ 💥 💢 💯 ‼️ ⁉️ ❓ ❗ 〰️ 🔥 💧 💨 🎉 🎊 🎁 🏆 🥇 🎵 🎶 🔔 ⚡ ☀️ 🌙 ⭐ 🌈 ☁️ 🌧️ ❄️".split(" ") },
];

function groupMessages(msgs: Msg[]) {
  const groups: { date: string; msgs: Msg[] }[] = [];
  msgs.forEach((m) => {
    const d = format(new Date(m.created_at), "d MMMM yyyy", { locale: ar });
    const last = groups[groups.length - 1];
    if (last && last.date === d) last.msgs.push(m);
    else groups.push({ date: d, msgs: [m] });
  });
  return groups;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const t = new Date();
  return d.toDateString() === t.toDateString();
}

function isYesterday(iso: string) {
  const d = new Date(iso);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}

function dateLabel(displayDate: string, rawDate: string) {
  if (isToday(rawDate)) return "اليوم";
  if (isYesterday(rawDate)) return "أمس";

  return displayDate;
}

/* ─── Status Icon ─── */
const StatusIcon = memo(({ status, isMine }: { status: string; isMine: boolean }) => {
  if (!isMine) return null;
  if (status === "sending") return <Clock size={11} className="opacity-50 animate-pulse" />;
  if (status === "read") return <CheckCheck size={13} className="text-emerald-300 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]" />;
  if (status === "delivered") return <CheckCheck size={13} className="text-primary-foreground/75" />;
  return <Check size={13} className="text-primary-foreground/50" />;
});

/* ─── Voice Player ─── */
const VoicePlayerInline = memo(({ url, duration = 0, waveform, isMine }: {
  url: string; duration?: number | null; waveform?: number[] | null; isMine: boolean;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  const bars = (waveform?.length ? waveform : Array.from({ length: 32 }, (_, i) => 0.3 + 0.6 * Math.abs(Math.sin(i * 0.7))));
  const activeBars = Math.floor((progress / 100) * bars.length);

  useEffect(() => {
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = () => { setPlaying(false); setProgress(0); };
    a.ontimeupdate = () => setProgress((a.currentTime / (a.duration || duration || 1)) * 100);
    return () => { a.pause(); a.src = ""; };
  }, [url]);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.playbackRate = speed; a.play(); setPlaying(true); }
  };

  const fg = isMine ? "bg-primary-foreground" : "bg-primary";
  const dim = isMine ? "bg-primary-foreground/30" : "bg-muted-foreground/30";

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <motion.button whileTap={{ scale: 0.9 }} onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
        {playing ? <Pause size={14} /> : <Play size={14} className="translate-x-[1px]" />}
      </motion.button>
      <div className="flex items-center gap-[2px] h-8 flex-1">
        {bars.map((v, i) => (
          <div key={i} className={`w-[2px] rounded-full transition-colors ${i < activeBars ? fg : dim}`}
            style={{ height: `${Math.max(15, v * 100)}%` }} />
        ))}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className={`text-[10px] tabular-nums font-mono ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {fmt(playing ? 0 : (duration || 0))}
        </span>
        <button onClick={() => { const n = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; setSpeed(n); if (audioRef.current) audioRef.current.playbackRate = n; }}
          className={`text-[9px] font-bold px-1 rounded ${isMine ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-foreground"}`}>
          {speed}x
        </button>
      </div>
    </div>
  );
});

/* ─── Image Viewer ─── */
const ImageViewer = memo(({ url, onClose }: { url: string; onClose: () => void }) => (
  <AnimatePresence>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center"
      onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur z-10">
        <X size={18} />
      </button>
      <a href={url} download onClick={(e) => e.stopPropagation()}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur z-10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </a>
      <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        src={url} alt="" onClick={(e) => e.stopPropagation()}
        className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl" />
    </motion.div>
  </AnimatePresence>
));

/* ─── Swipe-to-Reply Wrapper ─── */
const SwipeReply = memo(({ children, onReply, isOwn }: {
  children: React.ReactNode; onReply: () => void; isOwn: boolean;
}) => {
  const x = useMotionValue(0);
  const triggered = useRef(false);
  const threshold = 60;
  const dir = isOwn ? -1 : 1;

  const iconOpacity = useTransform(x, [0, dir * threshold], [0, 1]);
  const iconScale = useTransform(x, [0, dir * threshold], [0.5, 1]);

  return (
    <div className="relative">
      <motion.div className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary"
        style={{ opacity: iconOpacity, scale: iconScale, [isOwn ? "right" : "left"]: 8 }}>
        <Reply size={14} />
      </motion.div>
      <motion.div style={{ x }} drag="x"
        dragConstraints={isOwn ? { left: -90, right: 0 } : { left: 0, right: 90 }}
        dragElastic={0.2} dragMomentum={false}
        onDrag={(_, info) => {
          const reached = isOwn ? info.offset.x < -threshold : info.offset.x > threshold;
          if (reached && !triggered.current) {
            triggered.current = true;
            try { navigator.vibrate(12); } catch (e) { /* ignore vibration errors */ }
          }
        }}
        onDragEnd={(_, info) => {
          const reached = isOwn ? info.offset.x < -threshold : info.offset.x > threshold;
          if (reached) onReply();
          triggered.current = false;
          animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
        }}>
        {children}
      </motion.div>
    </div>
  );
});

/* ─── Message Bubble ─── */
const Bubble = memo(({
  msg, isMine, prevSameSender, replyMsg, reactions, selected, selectionMode,
  onLongPress, onReply, onReact, onImageOpen, onClick, onJumpToReply
}: {
  msg: Msg; isMine: boolean; prevSameSender: boolean;
  replyMsg?: Msg | null; reactions?: { emoji: string; count: number; mine: boolean }[];
  selected?: boolean; selectionMode?: boolean;
  onLongPress: () => void; onReply: () => void; onReact: (e: string) => void;
  onImageOpen: (url: string) => void; onClick: () => void;
  onJumpToReply?: (id: string) => void;
}) => {
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const [pressing, setPressing] = useState(false);

  const startPress = useCallback((e: React.PointerEvent) => {
    pressStart.current = { x: e.clientX, y: e.clientY };
    setPressing(true);
    pressTimer.current = setTimeout(() => {
      try { navigator.vibrate(15); } catch (e) { /* ignore vibration errors */ }
      onLongPress();
      setPressing(false);
    }, 420);
  }, [onLongPress]);

  const endPress = useCallback(() => {
    clearTimeout(pressTimer.current);
    pressStart.current = null;
    setPressing(false);
  }, []);

  const movePress = useCallback((e: React.PointerEvent) => {
    if (!pressStart.current) return;
    const dx = Math.abs(e.clientX - pressStart.current.x);
    const dy = Math.abs(e.clientY - pressStart.current.y);
    if (dx > 10 || dy > 10) endPress();
  }, [endPress]);

  const time = format(new Date(msg.created_at), "h:mm a", { locale: ar });
  const tail = isMine ? "rounded-br-sm" : "rounded-bl-sm";
  const bubble = isMine
    ? "gradient-primary text-primary-foreground shadow-[0_4px_16px_rgba(var(--primary)/0.25)] border border-primary/20"
    : "glass-card bg-card/60 backdrop-blur-md border border-border/20 text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)]";

  return (
    <div className={`flex ${isMine ? "justify-start" : "justify-end"} ${!prevSameSender ? "mt-3" : "mt-0.5"} px-3
      ${selected ? "bg-primary/10 -mx-3 px-6 py-0.5 rounded-lg" : ""}`}
      onClick={() => { if (selectionMode) onClick(); }}>

      {selectionMode && (
        <div className={`flex items-center ${isMine ? "ml-2" : "mr-2"} flex-shrink-0`}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
            ${selected ? "bg-primary border-primary animate-pulse" : "border-muted-foreground/40"}`}>
            {selected && <Check size={11} className="text-primary-foreground" />}
          </div>
        </div>
      )}

      <SwipeReply onReply={onReply} isOwn={isMine}>
        <div
          data-msg-id={msg.id}
          style={{ transform: pressing ? "scale(0.97)" : "scale(1)", transition: "transform 0.15s ease" }}
          onPointerDown={startPress} onPointerMove={movePress} onPointerUp={endPress}
          onPointerLeave={endPress} onPointerCancel={endPress}
          onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
          className={`relative max-w-[78vw] md:max-w-[420px] rounded-2xl ${tail} ${bubble}
            ${msg.media_type === "image" ? "p-1" : "px-3.5 py-2.5"}
            ${msg.status === "sending" ? "opacity-70 animate-pulse" : ""}
            select-none cursor-pointer shadow-sm animate-bubble-mount`}>

          {/* Reply preview */}
          {replyMsg && !msg.is_deleted && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onJumpToReply?.(replyMsg.id); }}
              className={`w-full text-right flex items-start gap-1.5 mb-2 rounded-lg px-2 py-1.5 border-r-2 transition-colors hover:opacity-80 ${isMine ? "bg-primary-foreground/10 border-primary-foreground/60 text-primary-foreground" : "bg-secondary/40 border-primary text-foreground"}`}
            >
              {replyMsg.media_type === "image" && replyMsg.media_url && (
                <img src={replyMsg.media_url} className="w-8 h-8 rounded object-cover flex-shrink-0" alt="" />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-bold mb-0.5 ${isMine ? "text-primary-foreground" : "text-primary"}`}>
                  {replyMsg.sender_id === msg.sender_id ? "أنت" : replyMsg.sender?.full_name || replyMsg.sender?.username || "مستخدم"}
                </p>
                <p className={`text-[11px] truncate ${isMine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {replyMsg.is_deleted ? "🚫 تم حذف الرسالة" :
                    replyMsg.media_type === "image" ? "📷 صورة" :
                    replyMsg.media_type === "audio" ? "🎤 رسالة صوتية" :
                    replyMsg.content}
                </p>
              </div>
            </button>
          )}

          {/* Content */}
          {msg.is_deleted ? (
            <p className="text-sm text-muted-foreground italic font-cairo">🚫 تم حذف الرسالة</p>
          ) : msg.media_type === "image" && msg.media_url ? (
            <button onClick={() => onImageOpen(msg.media_url!)} className="block relative rounded-xl overflow-hidden">
              <img src={msg.media_url} className="block max-w-[240px] max-h-[320px] w-full object-cover" loading="lazy" alt="" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <ZoomIn size={24} className="text-white drop-shadow" />
              </div>
              {msg.content && <p className={`text-sm font-cairo px-2 pt-1.5 pb-1 ${isMine ? "text-primary-foreground" : "text-foreground"}`}>{msg.content}</p>}
            </button>
          ) : msg.media_type === "audio" && msg.media_url ? (
            <VoicePlayerInline url={msg.media_url} duration={msg.audio_duration} waveform={msg.waveform} isMine={isMine} />
          ) : (
            <p className={`text-[15px] font-cairo leading-relaxed whitespace-pre-wrap break-words ${isMine ? "text-primary-foreground" : "text-foreground"}`}>
              {msg.content}
            </p>
          )}

          {/* Meta */}
          <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-start" : "justify-end"}`}>
            {msg.is_edited && !msg.is_deleted && (
              <span className={`text-[9px] italic ${isMine ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>معدّلة</span>
            )}
            <span className={`text-[10px] ${isMine ? "text-primary-foreground/75" : "text-muted-foreground/60"}`}>{time}</span>
            <StatusIcon status={msg.status} isMine={isMine} />
          </div>

          {/* Reactions */}
          {reactions && reactions.length > 0 && (
            <div className={`absolute -bottom-3 ${isMine ? "right-2" : "left-2"} flex gap-0.5 rounded-full border bg-background/95 backdrop-blur px-1.5 py-0.5 shadow-sm`}>
              {reactions.map((r, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); onReact(r.emoji); }}
                  className={`text-sm flex items-center gap-0.5 ${r.mine ? "opacity-100" : "opacity-80"}`}>
                  {r.emoji}
                  {r.count > 1 && <span className="text-[9px] text-muted-foreground">{r.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </SwipeReply>
    </div>
  );
});

/* ─── Reactions + Actions Sheet ─── */
const MessageActionsSheet = memo(({ msg, isMine, isStarred, onClose, onReply, onReact, onEdit, onDelete, onCopy, onForward, onStar }: {
  msg: Msg; isMine: boolean; isStarred: boolean;
  onClose: () => void; onReply: () => void; onReact: (e: string) => void;
  onEdit?: () => void; onDelete?: () => void; onCopy?: () => void;
  onForward?: () => void; onStar?: () => void;
}) => {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const actions = [
    { icon: Reply, label: "رد", action: () => { onReply(); onClose(); }, color: "text-primary" },
    msg.media_type === "text" || !msg.media_type ? { icon: Copy, label: "نسخ", action: () => { onCopy?.(); onClose(); }, color: "text-foreground" } : null,
    { icon: Forward, label: "إعادة توجيه", action: () => { onForward?.(); onClose(); }, color: "text-accent" },
    { icon: Pin, label: isStarred ? "إلغاء التمييز" : "تمييز ⭐", action: () => { onStar?.(); onClose(); }, color: isStarred ? "text-amber-400" : "text-foreground" },
    isMine && !msg.is_deleted ? { icon: Edit3, label: "تعديل", action: () => { onEdit?.(); onClose(); }, color: "text-accent" } : null,
    isMine && !msg.is_deleted ? { icon: Trash2, label: "حذف", action: () => { onDelete?.(); onClose(); }, color: "text-destructive", destructive: true } : null,
  ].filter(Boolean) as { icon: any; label: string; action: () => void; color: string; destructive?: boolean }[];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-lg p-4 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        onClick={(e) => e.stopPropagation()}>

        {/* Emoji bar */}
        <div className="glass-card rounded-2xl px-3 py-2.5 flex items-center justify-around">
          {QUICK_EMOJIS.map((e) => (
            <motion.button key={e} whileTap={{ scale: 0.75 }} whileHover={{ scale: 1.3, y: -4 }}
              onClick={() => { onReact(e); onClose(); }}
              className="text-2xl leading-none p-1.5 rounded-full hover:bg-secondary/50 transition-colors">
              {e}
            </motion.button>
          ))}
        </div>

        {/* Actions */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {actions.map((a, i) => (
            <motion.button key={a.label} whileTap={{ scale: 0.98 }}
              onClick={a.action}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors
                ${a.destructive ? "hover:bg-destructive/10" : "hover:bg-secondary/30"}
                ${i > 0 ? "border-t border-border/15" : ""}`}>
              <a.icon size={17} className={a.color} />
              <span className={`text-sm font-cairo font-semibold flex-1 ${a.destructive ? "text-destructive" : "text-foreground"}`}>
                {a.label}
              </span>
            </motion.button>
          ))}
        </div>

        <button onClick={onClose}
          className="w-full glass-card rounded-2xl py-3.5 text-sm font-cairo font-semibold text-muted-foreground hover:bg-secondary/30 transition-colors">
          إلغاء
        </button>
      </motion.div>
    </motion.div>
  );
});

/* ─── Typing Indicator ─── */
const TypingDots = memo(() => (
  <div className="flex justify-end px-3 pb-1.5">
    <div className="glass-card bg-card/60 backdrop-blur-md border border-border/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center shadow-sm">
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.16 }} />
      ))}
    </div>
  </div>
));

/* ─── Image Preview Row ─── */
const ImagePreviewRow = memo(({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) => (
  <div className="flex gap-2 overflow-x-auto px-3 py-2 border-t border-border/15 bg-background/50">
    {files.map((f, i) => (
      <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-border/30">
        <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
        <button onClick={() => onRemove(i)}
          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center">
          <X size={11} />
        </button>
      </div>
    ))}
  </div>
));

/* ─── Voice Recording UI ─── */
const VoiceRecordingBar = memo(({ duration, waveform, onCancel, onSend, uploading }: {
  duration: number; waveform: number[]; onCancel: () => void; onSend: () => void; uploading: boolean;
}) => (
  <div className="flex items-center gap-2 px-3 py-2">
    <motion.button whileTap={{ scale: 0.9 }} onClick={onCancel}
      className="w-11 h-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
      <Trash2 size={18} />
    </motion.button>
    <div className="flex-1 flex items-center gap-2 bg-destructive/8 rounded-xl px-3 py-2 border border-destructive/20">
      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="w-2.5 h-2.5 rounded-full bg-destructive flex-shrink-0" />
      <span className="text-xs font-mono font-bold text-destructive tabular-nums">{fmt(duration)}</span>
      <div className="flex-1 flex items-end gap-[2px] h-6 overflow-hidden">
        {waveform.slice(-36).map((v, i) => (
          <div key={i} className="flex-1 rounded-full bg-destructive/50 transition-all"
            style={{ height: `${Math.max(15, v * 100)}%` }} />
        ))}
      </div>
    </div>
    <motion.button whileTap={{ scale: 0.9 }} onClick={onSend} disabled={uploading}
      className="w-11 h-11 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-lg disabled:opacity-50">
      {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} />}
    </motion.button>
  </div>
));

/* ─── Emoji Picker Panel ─── */
const EmojiPanel = memo(({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) => {
  const [cat, setCat] = useState(0);
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden border-t border-border/15 bg-background/95 backdrop-blur-xl">
      <div className="flex items-center gap-1 px-2 pt-2 overflow-x-auto">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button key={c.name} onClick={() => setCat(i)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-cairo font-bold whitespace-nowrap transition-colors ${cat === i ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary/30"}`}>
            {c.name}
          </button>
        ))}
        <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-secondary/30 flex-shrink-0">
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1 p-2 max-h-52 overflow-y-auto">
        {EMOJI_CATEGORIES[cat].emojis.map((e, i) => (
          <button key={`${e}-${i}`} onClick={() => onPick(e)}
            className="text-xl p-1.5 rounded-lg hover:bg-secondary/40 transition-colors leading-none">
            {e}
          </button>
        ))}
      </div>
    </motion.div>
  );
});

/* ─── Forward Dialog ─── */
const ForwardDialog = memo(({ onClose, onPick, currentUserId, currentChatId }: {
  onClose: () => void; onPick: (chatId: string, otherName: string) => void;
  currentUserId?: string; currentChatId?: string;
}) => {
  const { data: chats = [] } = useQuery({
    queryKey: ["forward-chats", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data } = await supabase.from("chats")
        .select("id, user1_id, user2_id, user1:profiles!chats_user1_id_fkey(id,username,full_name,avatar_url), user2:profiles!chats_user2_id_fkey(id,username,full_name,avatar_url)")
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .order("last_message_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!currentUserId,
  });
  const [q, setQ] = useState("");
  const list = (chats as any[]).filter((c) => c.id !== currentChatId).map((c) => {
    const other = c.user1_id === currentUserId ? c.user2 : c.user1;
    return { id: c.id, name: other?.full_name || other?.username || "?", avatar: other?.avatar_url };
  }).filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-lg bg-card border-t border-border/20 rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/40"><X size={16} /></button>
          <h3 className="font-cairo font-bold text-foreground">إعادة توجيه إلى</h3>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث..."
          className="w-full bg-secondary/30 rounded-xl px-3 py-2 text-sm font-cairo outline-none border border-border/20 focus:border-primary/40 mb-3 text-right" />
        <div className="flex-1 overflow-y-auto space-y-1">
          {list.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground font-cairo py-6">مفيش محادثات</p>
          ) : list.map((c) => (
            <button key={c.id} onClick={() => onPick(c.id, c.name)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/40 transition-colors text-right">
              <UserAvatar url={c.avatar} name={c.name} size="sm" />
              <span className="flex-1 font-cairo font-semibold text-sm text-foreground truncate">{c.name}</span>
              <Forward size={14} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
});

/* ─── Main ChatPage ─── */
const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, isLoading, sendChatMessage, markChatMessagesRead, bulkDeleteMessages, clearAllMessages } = useChatMessages(chatId);
  const { isOtherTyping, sendTyping } = useTypingIndicator(chatId);
  const { isBlocked, blockUser } = useBlockedUsers();
  const recorder = useVoiceRecorder();
  const { uploadImage, uploadAudio } = useMediaUpload();
  const { nicknames, setNickname } = useNicknames();
  const { editMessage, deleteMessage } = useChatMessageActions(chatId);
  const messageIds = (messages as Msg[]).map((m) => m.id);
  const { byMessage: reactionsByMessage, toggleReaction } = useChatReactions(chatId, messageIds);

  /* ─── Active-chat tracking (notification suppression) ─── */
  const { setActiveChat } = useActiveChat();
  useEffect(() => {
    if (!chatId) return;
    setActiveChat(chatId);
    // Tell the server we're focused on this chat (for server-side push suppression)
    void supabase.rpc("set_user_presence", { p_active_chat_id: chatId, p_is_online: true });
    const beat = window.setInterval(() => {
      void supabase.rpc("set_user_presence", { p_active_chat_id: chatId, p_is_online: true });
    }, 20_000);
    return () => {
      window.clearInterval(beat);
      setActiveChat(null);
      void supabase.rpc("set_user_presence", { p_active_chat_id: null, p_is_online: true });
    };
  }, [chatId, setActiveChat]);


  /* State */
  const [text, setText] = useState("");
  const [replyId, setReplyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showNickname, setShowNickname] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactingToId, setReactingToId] = useState<string | null>(null);
  const [forwardId, setForwardId] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("mstkhbi.starred") || "[]")); }
    catch { return new Set(); }
  });
  const toggleStar = useCallback((id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast("تم إلغاء التمييز"); }
      else { next.add(id); toast.success("تم التمييز ⭐"); }
      try { localStorage.setItem("mstkhbi.starred", JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }, []);
  const handleForward = useCallback(async (targetChatId: string, otherName: string) => {
    const m = (messages as Msg[]).find((x) => x.id === forwardId);
    if (!m) { setForwardId(null); return; }
    const safeContent = sanitizeTextForDatabase(m.content);
    const { error } = await supabase.from("chat_messages").insert({
      chat_id: targetChatId, sender_id: user?.id,
      content: safeContent || (m.media_type === "image" ? "📷 صورة" : m.media_type === "audio" ? "🎤 رسالة صوتية" : ""), media_url: m.media_url, media_type: m.media_type,
      audio_duration: m.audio_duration, waveform: m.waveform as any, status: "sent",
    });
    if (error) toast.error("فشل التوجيه");
    else toast.success(`تم التوجيه إلى ${otherName} ✅`);
    setForwardId(null);
  }, [forwardId, messages, user?.id]);

  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  /* Chat info */
  const { data: chatInfo } = useQuery({
    queryKey: ["chat-info", chatId],
    queryFn: async () => {
      if (!chatId) return null;
      const { data } = await supabase.from("chats")
        .select("*, user1:profiles!chats_user1_id_fkey(*), user2:profiles!chats_user2_id_fkey(*)")
        .eq("id", chatId).single();
      return data;
    },
    enabled: !!chatId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const otherUser = chatInfo ? (chatInfo.user1_id === user?.id ? chatInfo.user2 : chatInfo.user1) : null;
  const otherUserId = chatInfo ? (chatInfo.user1_id === user?.id ? chatInfo.user2_id : chatInfo.user1_id) : null;
  const isUserBlocked = otherUserId ? isBlocked(otherUserId) : false;

  const { data: otherProfile } = useQuery({
    queryKey: ["profile-online", otherUserId],
    queryFn: async () => {
      if (!otherUserId) return null;
      const { data } = await supabase.from("profiles").select("is_online,last_seen").eq("id", otherUserId).single();
      return data;
    },
    enabled: !!otherUserId,
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  /* Realtime online status */
  useEffect(() => {
    if (!otherUserId) return;
    const ch = supabase.channel(`profile-online-${otherUserId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${otherUserId}` }, (p) => {
        qc.setQueryData(["profile-online", otherUserId], (old: any) => ({ ...old, is_online: p.new.is_online, last_seen: p.new.last_seen }));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [otherUserId, qc]);

  const isOnline = otherProfile?.is_online || (otherUser as any)?.is_online;
  const lastSeen = otherProfile?.last_seen || (otherUser as any)?.last_seen;

  const realName = (otherUser as any)?.full_name || (otherUser as any)?.username || "...";
  const displayName = (otherUserId && nicknames[otherUserId]) || realName;
  const hasNickname = !!(otherUserId && nicknames[otherUserId]);
  const avatarUrl = (otherUser as any)?.avatar_url;
  const initial = (otherUser as any)?.username?.charAt(0)?.toUpperCase() || "?";

  const statusText = isOtherTyping ? "يكتب الآن..." :
    isOnline ? "متصل الآن" :
    lastSeen ? `آخر ظهور ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: ar })}` :
    "غير متصل";

  /* Auto-scroll */
  const scrollToBottom = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  }, []);

  const jumpToMessage = useCallback((id: string) => {
    const el = scrollRef.current?.querySelector(`[data-msg-id="${id}"]`) as HTMLElement | null;
    if (!el) { toast.info("الرسالة مش موجودة في القائمة"); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    }, 1500);
  }, []);

  useEffect(() => { scrollToBottom(false); }, [scrollToBottom]);
  useEffect(() => { scrollToBottom(); }, [messages.length, isOtherTyping, scrollToBottom]);

  /* Scroll to bottom when mobile keyboard opens (visualViewport shrinks) */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let prevHeight = vv.height;
    const onResize = () => {
      if (vv.height < prevHeight - 50) {
        // Keyboard opened — scroll down
        scrollToBottom(false);
      }
      prevHeight = vv.height;
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [scrollToBottom]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  }, []);

  /* Mark read */
  useEffect(() => {
    const hasUnread = (messages as Msg[]).some((m) => m.sender_id !== user?.id && m.status !== "read");
    if (hasUnread) markChatMessagesRead.mutate();
  }, [messages, user?.id]);

  /* Derived */
  const activeMsg = actionId ? (messages as Msg[]).find((m) => m.id === actionId) : null;
  const replyMsg = replyId ? (messages as Msg[]).find((m) => m.id === replyId) : null;
  const filteredMessages = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return messages as Msg[];
    const q = searchQuery.trim().toLowerCase();
    return (messages as Msg[]).filter((m) => (m.content || "").toLowerCase().includes(q));
  }, [messages, showSearch, searchQuery]);
  const grouped = groupMessages(filteredMessages);
  const hasContent = text.trim().length > 0 || images.length > 0;

  /* Auto-grow textarea */
  const autoGrow = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    sendTyping();
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [sendTyping]);

  /* Send */
  const handleSend = useCallback(async () => {
    if (isUserBlocked) return;
    const safeText = sanitizeTextForDatabase(text);

    if (images.length > 0) {
      setUploading(true);
      for (const file of images) {
        const url = await uploadImage(file);
        if (url) await sendChatMessage.mutateAsync({ content: safeText, mediaUrl: url, mediaType: "image", replyToId: replyId || undefined });
      }
      setImages([]);
      setUploading(false);
    } else if (safeText) {
      if (editId) {
        editMessage.mutate({ id: editId, content: safeText });
        setEditId(null);
      } else {
        sendChatMessage.mutate({ content: safeText, replyToId: replyId || undefined });
      }
    }
    setText("");
    setReplyId(null);
    if (textRef.current) textRef.current.style.height = "auto";
    scrollToBottom();
  }, [text, images, editId, replyId, isUserBlocked, uploadImage, sendChatMessage, editMessage, scrollToBottom]);

  /* Voice */
  const handleVoice = useCallback(async () => {
    if (recorder.isRecording) {
      const result = await recorder.stop();
      if (!result) return;
      setUploading(true);
      const url = await uploadAudio(result.blob);
      setUploading(false);
      if (!url) { toast.error("فشل رفع الصوت"); return; }
      sendChatMessage.mutate({ content: "", mediaUrl: url, mediaType: "audio", audioDuration: result.duration, waveform: result.waveform });
    } else {
      const ok = await recorder.start();
      if (!ok) toast.error("تعذر الوصول للميكروفون");
    }
  }, [recorder, uploadAudio, sendChatMessage]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  /* Start call */
  const startCall = useCallback(async (type: "audio" | "video") => {
    if (!user?.id || !otherUserId || !chatId) return;
    const { data, error } = await supabase.from("calls")
      .insert({ chat_id: chatId, caller_id: user.id, callee_id: otherUserId, type, status: "ringing" })
      .select("id").single();
    if (error) { toast.error("تعذر بدء المكالمة"); return; }
    navigate(`/call/${chatId}?type=${type}&caller=1&other=${otherUserId}&callId=${data.id}`);
  }, [user?.id, otherUserId, chatId, navigate]);

  /* Block */
  const handleBlock = useCallback(() => {
    if (!otherUserId) return;
    blockUser.mutate(otherUserId);
    toast.success("تم الحظر 🚫");
    setShowMenu(false);
  }, [otherUserId, blockUser]);

  /* Delete chat */
  const handleDeleteChat = useCallback(async () => {
    if (!chatId || !user?.id) return;
    const currentDeletedBy = (chatInfo as any)?.deleted_by || [];
    await supabase.from("chats").update({ deleted_by: [...currentDeletedBy, user.id] }).eq("id", chatId);
    qc.setQueryData(["chats", user.id], (old: any[]) => old?.filter((c: any) => c.id !== chatId) || []);
    toast.success("تم حذف المحادثة 🗑️");
    navigate("/chats");
  }, [chatId, user?.id, chatInfo, qc, navigate]);

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">

      {/* ──── Header ──── */}
      <header className="flex-shrink-0 bg-background/80 backdrop-blur-2xl border-b border-border/15 z-40 safe-top">
        <div className="flex items-center gap-2 px-3 py-2.5 max-w-2xl mx-auto">

          {/* Back */}
          {selectionMode ? (
            <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
              className="p-2 rounded-xl hover:bg-secondary/50 transition-colors">
              <X size={20} />
            </button>
          ) : (
            <button onClick={() => navigate("/chats")} className="p-2 rounded-xl hover:bg-secondary/50 transition-colors">
              <ArrowRight size={20} />
            </button>
          )}

          {/* Profile / Selection count */}
          {selectionMode ? (
            <div className="flex-1 text-right">
              <p className="font-cairo font-bold text-primary">{selectedIds.size} محدد</p>
            </div>
          ) : (
            <button onClick={() => { const uname = (otherUser as any)?.username; if (uname) navigate(`/${uname}`); }} className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center gap-1 justify-end">
                  <p className="font-cairo font-bold text-[15px] text-foreground leading-tight truncate">{displayName}</p>
                  {hasNickname && <Edit3 size={10} className="text-primary/60 flex-shrink-0" />}
                </div>
                <motion.p animate={{ opacity: 1 }} className={`text-[11px] font-cairo truncate ${isOnline && !isOtherTyping ? "text-green-400" : isOtherTyping ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {statusText}
                </motion.p>
              </div>
              <UserAvatar url={avatarUrl} name={displayName} size="sm" isOnline={!!isOnline} />
            </button>
          )}

          {/* Right actions */}
          {selectionMode ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { bulkDeleteMessages.mutate(Array.from(selectedIds)); setSelectionMode(false); setSelectedIds(new Set()); toast.success("تم الحذف"); }}
                className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors" disabled={selectedIds.size === 0}>
                <Trash2 size={18} />
              </button>
              <button onClick={() => { const txt = Array.from(selectedIds).map(id => (messages as Msg[]).find(m => m.id === id)?.content || "").filter(Boolean).join("\n"); if (txt) { navigator.clipboard.writeText(txt); toast.success("تم النسخ"); } setSelectionMode(false); setSelectedIds(new Set()); }}
                className="p-2 rounded-xl hover:bg-secondary/50 text-foreground transition-colors" disabled={selectedIds.size === 0}>
                <Copy size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => startCall("audio")}
                className="p-2 rounded-xl hover:bg-secondary/50 text-primary transition-colors">
                <Phone size={18} />
              </motion.button>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => startCall("video")}
                className="p-2 rounded-xl hover:bg-secondary/50 text-accent transition-colors">
                <Video size={18} />
              </motion.button>

              {/* Menu */}
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                  <MoreVertical size={18} />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <motion.div initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -4 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="absolute left-0 top-full mt-1.5 w-52 glass-card rounded-xl shadow-xl z-50 overflow-hidden py-1">
                        {[
                          { icon: Edit3, label: "تعديل اسم الصديق", action: () => { setShowNickname(true); setShowMenu(false); }, color: "text-primary" },
                          { icon: CheckSquare, label: "تحديد رسائل", action: () => { setSelectionMode(true); setShowMenu(false); }, color: "text-accent" },
                          { icon: Eraser, label: "تنظيف المحادثة", action: () => { clearAllMessages.mutate(); toast.success("تم 🧹"); setShowMenu(false); }, color: "text-foreground" },
                          { icon: Search, label: "بحث في الرسائل", action: () => { setShowSearch(true); setShowMenu(false); }, color: "text-foreground" },
                          { icon: Ban, label: "حظر", action: handleBlock, color: "text-destructive" },
                          { icon: Trash2, label: "حذف المحادثة", action: handleDeleteChat, color: "text-destructive" },
                        ].map((item, i) => (
                          <button key={i} onClick={item.action}
                            className={`w-full flex items-center gap-2.5 px-4 py-3 hover:bg-secondary/30 transition-colors text-right ${i > 3 ? "border-t border-border/15" : ""}`}>
                            <item.icon size={15} className={item.color} />
                            <span className={`text-sm font-cairo font-semibold flex-1 text-right ${i > 3 ? "text-destructive" : "text-foreground"}`}>{item.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>



        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border/15">
              <div className="flex items-center gap-2 px-3 py-2 max-w-2xl mx-auto">
                <Search size={16} className="text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); } }}
                  placeholder="بحث في الرسائل..."
                  className="flex-1 bg-transparent text-sm font-cairo text-foreground placeholder:text-muted-foreground outline-none"
                />
                {searchQuery && (
                  <span className="text-[10px] text-muted-foreground font-mono">{filteredMessages.length}</span>
                )}
                <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="p-1 rounded-lg hover:bg-secondary/50">
                  <ArrowRight size={16} className="text-muted-foreground rotate-180" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ──── Messages ──── */}
      <div ref={scrollRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain py-3 scroll-smooth"
        style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-primary" /></div>
          ) : messages.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 px-6">
              <UserAvatar url={avatarUrl} name={displayName} size="lg" className="mx-auto mb-4 shadow-lg" />
              <p className="font-cairo font-bold text-lg text-foreground">{displayName}</p>
              <p className="text-sm text-muted-foreground mt-1">ابدأ المحادثة 👋</p>
            </motion.div>
          ) : (
            grouped.map((group) => (
              <div key={group.date}>
                {/* Sticky Date Separator */}
                <div className="sticky top-0 z-20 flex items-center justify-center py-2 pointer-events-none">
                  <span className="text-[11px] font-bold text-muted-foreground bg-background/70 border border-border/10 backdrop-blur-md px-3 py-1 rounded-full pointer-events-auto shadow-sm">
                    {dateLabel(group.date, group.msgs[0].created_at)}
                  </span>
                </div>

                {group.msgs.map((msg, idx) => {
                  const isMine = msg.sender_id === user?.id;
                  const prevMsg = group.msgs[idx - 1];
                  const prevSameSender = !!prevMsg && prevMsg.sender_id === msg.sender_id;
                  const rMsg = msg.reply_to_id ? (messages as Msg[]).find((m) => m.id === msg.reply_to_id) : null;
                  const reactions = reactionsByMessage.get(msg.id);

                  return (
                    <div key={msg.id} className="relative">
                      <Bubble
                        msg={msg} isMine={isMine} prevSameSender={prevSameSender}
                        replyMsg={rMsg} reactions={reactions}
                        selected={selectedIds.has(msg.id)} selectionMode={selectionMode}
                        onLongPress={() => {
                          if (msg.is_deleted) return;
                          setReactingToId(null);
                          if (selectionMode) toggleSelect(msg.id);
                          else {
                            if (navigator.vibrate) navigator.vibrate(18);
                            setActionId(msg.id);
                          }
                        }}
                        onReply={() => { setReplyId(msg.id); setEditId(null); setActionId(null); setReactingToId(null); textRef.current?.focus(); }}
                        onReact={(e) => toggleReaction.mutate({ messageId: msg.id, emoji: e })}
                        onImageOpen={setViewerUrl}
                        onJumpToReply={jumpToMessage}
                        onClick={() => {
                          if (selectionMode) toggleSelect(msg.id);
                        }}
                      />
                      <AnimatePresence>
                        {reactingToId === msg.id && !selectionMode && !msg.is_deleted && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 6 }}
                            className={`mx-3 mt-1 mb-2 flex items-center gap-1 rounded-full border border-border/25 bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-xl ${isMine ? "justify-start" : "justify-end"}`}
                          >
                            {QUICK_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => { toggleReaction.mutate({ messageId: msg.id, emoji }); setReactingToId(null); }}
                                className="h-8 w-8 rounded-full text-lg leading-none transition-transform hover:scale-125 hover:bg-secondary/50"
                                aria-label={`ريأكت ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setActionId(msg.id)}
                              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary/50"
                              aria-label="المزيد"
                            >
                              <MoreVertical size={15} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {isOtherTyping && <TypingDots />}
          <div className="h-2" />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-28 right-4 w-10 h-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-lg z-20">
            <ChevronDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ──── Reply / Edit Banner ──── */}
      <AnimatePresence>
        {(replyMsg || editId) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 bg-primary/8 border-t border-primary/20 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 max-w-2xl mx-auto">
              <button onClick={() => { setReplyId(null); setEditId(null); setText(""); }}
                className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors flex-shrink-0">
                <X size={14} className="text-muted-foreground" />
              </button>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[11px] font-cairo font-bold text-primary">
                  {editId ? "✏️ تعديل الرسالة" : "↩️ ردًا على"}
                </p>
                {replyMsg && <p className="text-xs text-muted-foreground truncate">{replyMsg.content || (replyMsg.media_type === "image" ? "📷 صورة" : "🎤 صوت")}</p>}
              </div>
              {replyMsg?.media_type === "image" && replyMsg.media_url && (
                <img src={replyMsg.media_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
              )}
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${editId ? "bg-accent" : "bg-primary"}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──── Image preview ──── */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 overflow-hidden">
            <ImagePreviewRow files={images} onRemove={(i) => setImages((prev) => prev.filter((_, idx) => idx !== i))} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──── Input Area ──── */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-2xl border-t border-border/15
        pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/")); setImages(prev => [...prev, ...files].slice(0, 10)); e.target.value = ""; }} />

        {isUserBlocked ? (
          <div className="text-center py-3 px-4">
            <p className="text-sm text-destructive font-cairo">تم حظر هذا المستخدم 🚫</p>
          </div>
        ) : recorder.isRecording ? (
          <VoiceRecordingBar duration={recorder.duration} waveform={recorder.waveform}
            onCancel={async () => { await recorder.cancel(); }} onSend={handleVoice} uploading={uploading} />
        ) : (
          <div className="flex items-end gap-1.5 px-3 pt-2.5">
            {/* Attach */}
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => fileRef.current?.click()}
              className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors flex-shrink-0 mb-0.5">
              <ImageIcon size={20} />
            </motion.button>

            {/* Text input */}
            <div className="flex-1 flex items-end bg-secondary/40 border border-border/20 rounded-3xl px-3 py-1.5 focus-within:border-primary/40 transition-colors">
              <button onClick={() => setShowEmoji((v) => !v)} className={`transition-colors mr-1 mb-0.5 flex-shrink-0 ${showEmoji ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Smile size={18} />
              </button>
              <textarea ref={textRef} value={text} onChange={autoGrow}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                onFocus={() => setShowEmoji(false)}
                placeholder={editId ? "عدّل الرسالة..." : "اكتب رسالة..."}
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-[15px] font-cairo text-foreground placeholder:text-muted-foreground py-1 max-h-[140px] leading-normal" />
            </div>

            {/* Send / Voice */}
            <div className="flex-shrink-0 mb-0.5">
              <AnimatePresence mode="wait">
                {hasContent ? (
                  <motion.button key="send" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    whileTap={{ scale: 0.88 }} onClick={handleSend} disabled={uploading}
                    className="w-10 h-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-[0_2px_12px_hsl(var(--primary)/0.4)] disabled:opacity-50">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={17} />}
                  </motion.button>
                ) : (
                  <motion.button key="mic" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    whileTap={{ scale: 0.88 }} onClick={handleVoice} disabled={uploading}
                    className="w-10 h-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-[0_2px_12px_hsl(var(--primary)/0.4)] disabled:opacity-50">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Mic size={18} />}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        <AnimatePresence>
          {showEmoji && !isUserBlocked && !recorder.isRecording && (
            <EmojiPanel
              onPick={(e) => { setText((t) => t + e); textRef.current?.focus(); }}
              onClose={() => setShowEmoji(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ──── Actions Sheet ──── */}
      <AnimatePresence>
        {actionId && activeMsg && (
          <MessageActionsSheet
            msg={activeMsg}
            isMine={activeMsg.sender_id === user?.id}
            isStarred={starredIds.has(actionId)}
            onClose={() => setActionId(null)}
            onReply={() => { setReplyId(actionId); setEditId(null); textRef.current?.focus(); }}
            onReact={(e) => toggleReaction.mutate({ messageId: actionId, emoji: e })}
            onEdit={() => { setEditId(actionId); setText(activeMsg.content || ""); setReplyId(null); textRef.current?.focus(); }}
            onDelete={() => { deleteMessage.mutate(actionId); toast.success("تم الحذف"); }}
            onCopy={() => { if (activeMsg.content) { navigator.clipboard.writeText(activeMsg.content); toast.success("تم النسخ"); } }}
            onForward={() => setForwardId(actionId)}
            onStar={() => toggleStar(actionId)}
          />
        )}
      </AnimatePresence>

      {/* ──── Forward Dialog ──── */}
      <AnimatePresence>
        {forwardId && (
          <ForwardDialog
            currentUserId={user?.id}
            currentChatId={chatId}
            onClose={() => setForwardId(null)}
            onPick={handleForward}
          />
        )}
      </AnimatePresence>

      {/* ──── Image Viewer ──── */}
      <AnimatePresence>
        {viewerUrl && <ImageViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />}
      </AnimatePresence>

         {/* ──── Nickname Dialog ──── */}
      {otherUserId && (
        <NicknameDialog
          open={showNickname}
          onClose={() => setShowNickname(false)}
          contactId={otherUserId}
          realName={realName}
          currentNickname={nicknames[otherUserId]}
          onSave={(n) =>
            setNickname.mutate({
              contactId: otherUserId,
              nickname: n,
            })
          }
        />
      )}
    </div>
  );
};

export default ChatPage;
