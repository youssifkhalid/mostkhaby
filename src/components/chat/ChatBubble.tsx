import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCheck, Clock } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/types/chat";
import { useLongPress } from "@/hooks/useLongPress";
import { ImageGallery } from "./ImageGallery";
import { MediaGrid } from "./MediaGrid";
import { MessageMenu } from "./MessageMenu";
import { ReactionsBar } from "./ReactionsBar";
import { ReplyPreview } from "./ReplyPreview";
import { SwipeReply } from "./SwipeReply";
import { VoicePlayer } from "./VoicePlayer";

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  onReply: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  onCopy?: (m: Message) => void;
  onDelete?: (m: Message) => void;
  onEdit?: (m: Message) => void;
  onForward?: (m: Message) => void;
  onPin?: (m: Message) => void;
  onSelect?: (m: Message) => void;
  onToggleSelect?: (m: Message) => void;
}

function timeOf(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status?: Message["status"] }) {
  if (status === "sending") return <Clock className="h-3 w-3 opacity-70" />;
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-sky-300" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 opacity-80" />;
  if (status === "sent") return <Check className="h-3.5 w-3.5 opacity-80" />;
  return null;
}

export function ChatBubble(props: Props) {
  const { message: m, isOwn, showAvatar = true, selected, selectionMode } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const { handlers } = useLongPress(() => {
    if (selectionMode) return;
    setMenuOpen(true);
  }, { delay: 380 });

  const reactionsGrouped = (m.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  const align = isOwn ? "justify-end flex-row-reverse" : "justify-start";
  
  // Luxury 2026 container styles
  const tone = isOwn
    ? "bg-gradient-to-tr from-primary via-primary/95 to-primary/85 text-primary-foreground rounded-3xl rounded-br-sm shadow-[0_6px_20px_-4px_rgba(139,92,246,0.35)] border border-primary/20"
    : "glass-card bg-card/85 backdrop-blur-xl border border-border/20 text-foreground rounded-3xl rounded-bl-sm shadow-[0_4px_16px_rgba(0,0,0,0.06)]";

  return (
    <div
      className={`group relative flex w-full items-end gap-2.5 px-4 my-2 transition-all duration-300 ${
        selected ? "bg-primary/5 py-1" : ""
      }`}
      onClick={() => {
        if (selectionMode) props.onToggleSelect?.(m);
        if (menuOpen) setMenuOpen(false);
      }}
    >
      {/* Animated selection checkbox */}
      {selectionMode && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all duration-200 ${
            selected
              ? "bg-primary border-primary text-primary-foreground scale-110 shadow-md shadow-primary/20"
              : "border-muted-foreground/45 hover:border-primary/50"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5 stroke-[3.5]" />}
        </motion.div>
      )}

      {!isOwn && showAvatar && (
        <motion.div 
          whileHover={{ scale: 1.1 }}
          className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border/10 bg-card shadow-sm"
        >
          {m.sender?.avatar_url ? (
            <img src={m.sender.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-tr from-primary/20 to-accent/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {m.sender?.name?.charAt(0) || "U"}
            </div>
          )}
        </motion.div>
      )}

      <SwipeReply direction={isOwn ? "left" : "right"} onReply={() => props.onReply(m)}>
        <motion.div
          layout
          initial={{ opacity: 0, x: isOwn ? 18 : -18, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          whileTap={{ scale: selectionMode ? 0.98 : 0.99 }}
          {...handlers}
          className={`relative max-w-[78vw] md:max-w-md ${tone} ${
            m.type === "image" ? "p-1.5" : "px-4 py-2.5"
          } select-none transition-shadow duration-300 hover:shadow-lg`}
        >
          {!isOwn && showAvatar && (
            <div className="mb-1 text-[11px] font-black font-cairo tracking-wide text-primary/90 flex items-center gap-1">
              {m.sender?.name}
              {m.sender?.is_online && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
          )}

          {m.reply_to && (
            <div className="mb-2 rounded-xl bg-black/5 dark:bg-white/5 p-2 border-r-2 border-primary">
              <ReplyPreview reply={m.reply_to} compact />
            </div>
          )}

          {m.type === "image" && m.media_urls?.length ? (
            <>
              <div className="rounded-2xl overflow-hidden shadow-inner border border-white/5">
                <MediaGrid urls={m.media_urls} onOpen={(i) => { setGalleryIdx(i); setGalleryOpen(true); }} />
              </div>
              {m.content && <div className="px-2 pt-2 text-[15px] leading-relaxed font-cairo">{m.content}</div>}
            </>
          ) : m.type === "voice" && m.voice_url ? (
            <div className="min-w-[210px] py-1">
              <VoicePlayer
                url={m.voice_url}
                duration={m.voice_duration}
                waveform={m.voice_waveform}
                tint={isOwn ? "primary" : "muted"}
              />
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed font-cairo">{m.content}</div>
          )}

          <div className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${
            isOwn ? "text-primary-foreground/75" : "text-muted-foreground/80"
          }`}>
            {m.edited_at && <span className="text-[9px] font-cairo opacity-70">تم تعديلها</span>}
            <span className="font-sans font-medium">{timeOf(m.created_at)}</span>
            {isOwn && <StatusIcon status={m.status} />}
          </div>

          {Object.keys(reactionsGrouped).length > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`absolute -bottom-3 ${
                isOwn ? "right-3" : "left-3"
              } flex gap-1 rounded-full border border-border/20 bg-background/95 backdrop-blur-md px-2 py-0.5 text-xs shadow-md shadow-black/10`}
            >
              {Object.entries(reactionsGrouped).map(([emoji, count]) => (
                <motion.span 
                  whileHover={{ scale: 1.15 }}
                  key={emoji} 
                  className="flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-[9px] font-extrabold text-muted-foreground">{count}</span>}
                </motion.span>
              ))}
            </motion.div>
          )}

          <AnimatePresence>
            {menuOpen && (
              <div className={`absolute z-30 ${isOwn ? "right-0" : "left-0"} -top-2 -translate-y-full`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className="mb-2">
                    <ReactionsBar
                      onPick={(e) => { props.onReact(m, e); setMenuOpen(false); }}
                    />
                  </div>
                  <MessageMenu
                    isOwn={isOwn}
                    canEdit={m.type === "text"}
                    onReply={() => { props.onReply(m); setMenuOpen(false); }}
                    onCopy={m.type === "text" && props.onCopy ? () => { props.onCopy?.(m); setMenuOpen(false); } : undefined}
                    onForward={props.onForward ? () => { props.onForward?.(m); setMenuOpen(false); } : undefined}
                    onPin={props.onPin ? () => { props.onPin?.(m); setMenuOpen(false); } : undefined}
                    onSelect={props.onSelect ? () => { props.onSelect?.(m); setMenuOpen(false); } : undefined}
                    onEdit={props.onEdit ? () => { props.onEdit?.(m); setMenuOpen(false); } : undefined}
                    onDelete={props.onDelete ? () => { props.onDelete?.(m); setMenuOpen(false); } : undefined}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </SwipeReply>

      {m.type === "image" && m.media_urls && (
        <ImageGallery
          urls={m.media_urls}
          initialIndex={galleryIdx}
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}
