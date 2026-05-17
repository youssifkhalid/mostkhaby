
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useState, useRef, useEffect, useCallback, memo } from "react";
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
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import OnlineIndicator from "@/components/OnlineIndicator";
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
  if (status === "sending") return <Clock size={11} className="opacity-50" />;
  if (status === "read") return <CheckCheck size={13} className="text-blue-400" />;
  if (status === "delivered") return <CheckCheck size={13} className="opacity-60" />;
  return <Check size={13} className="opacity-60" />;
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
            if (navigator.vibrate) navigator.vibrate(12);
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
  onLongPress, onReply, onReact, onImageOpen, onClick
}: {
  msg: Msg; isMine: boolean; prevSameSender: boolean;
  replyMsg?: Msg | null; reactions?: { emoji: string; count: number; mine: boolean }[];
  selected?: boolean; selectionMode?: boolean;
  onLongPress: () => void; onReply: () => void; onReact: (e: string) => void;
  onImageOpen: (url: string) => void; onClick: () => void;
}) => {
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  const [pressing, setPressing] = useState(false);

  const startPress = useCallback(() => {
    setPressing(true);
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(15);
      onLongPress();
      setPressing(false);
    }, 420);
  }, [onLongPress]);

  const endPress = useCallback(() => {
    clearTimeout(pressTimer.current);
    setPressing(false);
  }, []);

  const time = format(new Date(msg.created_at), "h:mm a", { locale: ar });
  const tail = isMine ? "rounded-br-sm" : "rounded-bl-sm";
  const bubble = isMine
    ? "bg-gradient-to-br from-primary/30 to-primary/15 border border-primary/30"
    : "bg-gradient-to-br from-secondary/80 to-secondary/50 border border-border/20";

  return (
    <div className={`flex ${isMine ? "justify-strart" : "justify-end"} ${!prevSameSender ? "mt-3" : "mt-0.5"} px-3
      ${selected ? "bg-primary/10 -mx-3 px-6 py-0.5 rounded-lg" : ""}`}
      onClick={selectionMode ? onClick : undefined}>

      {selectionMode && (
        <div className={`flex items-center ${isMine ? "ml-2" : "mr-2"} flex-shrink-0`}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
            ${selected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
            {selected && <Check size={11} className="text-primary-foreground" />}
          </div>
        </div>
      )}

      <SwipeReply onReply={onReply} isOwn={isMine}>
        <motion.div
          animate={{ scale: pressing ? 0.97 : 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 30 }}
          initial={{ opacity: 0, y: 4, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          onPointerDown={startPress} onPointerUp={endPress}
          onPointerLeave={endPress} onPointerCancel={endPress}
          onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
          className={`relative max-w-[78vw] md:max-w-[420px] rounded-2xl ${tail} ${bubble}
            ${msg.media_type === "image" ? "p-1" : "px-3.5 py-2.5"}
            ${msg.status === "sending" ? "opacity-70" : ""}
            select-none cursor-pointer shadow-sm`}>

          {/* Reply preview */}
          {replyMsg && !msg.is_deleted && (
            <div className="flex items-start gap-1.5 mb-2 bg-background/30 rounded-lg px-2 py-1.5 border-r-2 border-primary/60">
              {replyMsg.media_type === "image" && replyMsg.media_url && (
                <img src={replyMsg.media_url} className="w-8 h-8 rounded object-cover flex-shrink-0" alt="" />
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-primary mb-0.5">
                  {replyMsg.sender_id === msg.sender_id ? "أنت" : replyMsg.sender?.full_name || replyMsg.sender?.username || "مستخدم"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {replyMsg.is_deleted ? "🚫 تم حذف الرسالة" :
                    replyMsg.media_type === "image" ? "📷 صورة" :
                    replyMsg.media_type === "audio" ? "🎤 رسالة صوتية" :
                    replyMsg.content}
                </p>
              </div>
            </div>
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
              {msg.content && <p className="text-sm font-cairo px-2 pt-1.5 pb-1 text-foreground">{msg.content}</p>}
            </button>
          ) : msg.media_type === "audio" && msg.media_url ? (
            <VoicePlayerInline url={msg.media_url} duration={msg.audio_duration} waveform={msg.waveform} isMine={isMine} />
          ) : (
            <p className="text-[15px] font-cairo leading-relaxed whitespace-pre-wrap break-words text-foreground">
              {msg.content}
            </p>
          )}

          {/* Meta */}
          <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-start" : "justify-end"}`}>
            {msg.is_edited && !msg.is_deleted && (
              <span className="text-[9px] text-muted-foreground/60 italic">معدّلة</span>
            )}
            <span className="text-[10px] text-muted-foreground/60">{time}</span>
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
        </motion.div>
      </SwipeReply>
    </div>
  );
});

/* ─── Reactions + Actions Sheet ─── */
const MessageActionsSheet = memo(({ msg, isMine, onClose, onReply, onReact, onEdit, onDelete, onCopy }: {
  msg: Msg; isMine: boolean;
  onClose: () => void; onReply: () => void; onReact: (e: string) => void;
  onEdit?: () => void; onDelete?: () => void; onCopy?: () => void;
}) => {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const actions = [
    { icon: Reply, label: "رد", action: () => { onReply(); onClose(); }, color: "text-primary" },
    msg.media_type === "text" || !msg.media_type ? { icon: Copy, label: "نسخ", action: () => { onCopy?.(); onClose(); }, color: "text-foreground" } : null,
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
  <div className="flex justify-end px-3 pb-1">
    <div className="bg-secondary/60 border border-border/20 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="w-2 h-2 rounded-full bg-muted-foreground/50"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
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

  useEffect(() => { scrollToBottom(false); }, []);
  useEffect(() => { scrollToBottom(); }, [messages.length, isOtherTyping]);

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
  const grouped = groupMessages(messages as Msg[]);
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

    if (images.length > 0) {
      setUploading(true);
      for (const file of images) {
        const url = await uploadImage(file);
        if (url) await sendChatMessage.mutateAsync({ content: text.trim() || "", mediaUrl: url, mediaType: "image", replyToId: replyId || undefined });
      }
      setImages([]);
      setUploading(false);
    } else if (text.trim()) {
      if (editId) {
        editMessage.mutate({ id: editId, content: text.trim() });
        setEditId(null);
      } else {
        sendChatMessage.mutate({ content: text.trim(), replyToId: replyId || undefined });
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

  /* Selection */
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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
            <button onClick={() => {}} className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center gap-1 justify-end">
                  <p className="font-cairo font-bold text-[15px] text-foreground leading-tight truncate">{displayName}</p>
                  {hasNickname && <Edit3 size={10} className="text-primary/60 flex-shrink-0" />}
                </div>
                <motion.p animate={{ opacity: 1 }} className={`text-[11px] font-cairo truncate ${isOnline && !isOtherTyping ? "text-green-400" : isOtherTyping ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {statusText}
                </motion.p>
              </div>
              <div className="relative flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} className="w-10 h-10 rounded-xl object-cover" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {initial}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineIndicator isOnline={!!isOnline} />
                </div>
              </div>
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
                          { icon: Search, label: "بحث في الرسائل", action: () => { toast.info("قريبًا ✨"); setShowMenu(false); }, color: "text-foreground" },
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
              <div className="w-20 h-20 mx-auto gradient-primary rounded-3xl flex items-center justify-center mb-4 shadow-lg">
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full rounded-3xl object-cover" alt="" /> :
                  <span className="text-2xl font-bold text-primary-foreground">{initial}</span>}
              </div>
              <p className="font-cairo font-bold text-lg text-foreground">{displayName}</p>
              <p className="text-sm text-muted-foreground mt-1">ابدأ المحادثة 👋</p>
            </motion.div>
          ) : (
            grouped.map((group) => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 h-px bg-border/20" />
                  <span className="text-[11px] text-muted-foreground/60 font-cairo bg-secondary/30 px-3 py-1 rounded-full">
                    {dateLabel(group.date)}
                  </span>
                  <div className="flex-1 h-px bg-border/20" />
                </div>

                {group.msgs.map((msg, idx) => {
                  const isMine = msg.sender_id === user?.id;
                  const prevMsg = group.msgs[idx - 1];
                  const prevSameSender = !!prevMsg && prevMsg.sender_id === msg.sender_id;
                  const rMsg = msg.reply_to_id ? (messages as Msg[]).find((m) => m.id === msg.reply_to_id) : null;
                  const reactions = reactionsByMessage.get(msg.id);

                  return (
                    <Bubble key={msg.id}
                      msg={msg} isMine={isMine} prevSameSender={prevSameSender}
                      replyMsg={rMsg} reactions={reactions}
                      selected={selectedIds.has(msg.id)} selectionMode={selectionMode}
                      onLongPress={() => {
                        if (msg.is_deleted) return;
                        if (!selectionMode) {
                          if (navigator.vibrate) navigator.vibrate(18);
                          setSelectionMode(true);
                          setSelectedIds(new Set([msg.id]));
                        } else toggleSelect(msg.id);
                      }}
                      onReply={() => { setReplyId(msg.id); setEditId(null); textRef.current?.focus(); }}
                      onReact={(e) => toggleReaction.mutate({ messageId: msg.id, emoji: e })}
                      onImageOpen={setViewerUrl}
                      onClick={() => {
                        if (selectionMode) toggleSelect(msg.id);
                        else if (!msg.is_deleted) setActionId(msg.id);
                      }}
                    />
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
              <button className="text-muted-foreground hover:text-foreground transition-colors mr-1 mb-0.5 flex-shrink-0">
                <Smile size={18} />
              </button>
              <textarea ref={textRef} value={text} onChange={autoGrow}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
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
      </div>

      {/* ──── Actions Sheet ──── */}
      <AnimatePresence>
        {actionId && activeMsg && (
          <MessageActionsSheet
            msg={activeMsg}
            isMine={activeMsg.sender_id === user?.id}
            onClose={() => setActionId(null)}
            onReply={() => { setReplyId(actionId); setEditId(null); textRef.current?.focus(); }}
            onReact={(e) => toggleReaction.mutate({ messageId: actionId, emoji: e })}
            onEdit={() => { setEditId(actionId); setText(activeMsg.content || ""); setReplyId(null); textRef.current?.focus(); }}
            onDelete={() => { deleteMessage.mutate(actionId); toast.success("تم الحذف"); }}
            onCopy={() => { if (activeMsg.content) { navigator.clipboard.writeText(activeMsg.content); toast.success("تم النسخ"); } }}
          />
        )}
      </AnimatePresence>

      {/* ──── Image Viewer ──── */}
      <AnimatePresence>
        {viewerUrl && <ImageViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />}
      </AnimatePresence>

      {/* ──── Nickname Dialog ──── */}
      {otherUserId && (
        <NicknameDialog open={showNickname} onClose={() => setShowNickname(false)}
          contactId={otherUserId} realName={realName}
          currentNickname={nicknames[otherUserId]}




export default ChatPage;
          onSave={(n) => setNickname.mutate({ contactId: otherUserId, nickname: n })} />
      )}
    </div>
  );
};

export default ChatPage;
