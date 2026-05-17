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

  const align = isOwn ? "justify-end" : "justify-start";
  const tone = isOwn
    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
    : "bg-muted text-foreground rounded-2xl rounded-bl-sm";

  return (
    <div
      className={`group relative flex w-full items-end gap-2 px-3 ${align} ${selected ? "bg-primary/5" : ""}`}
      onClick={() => {
        if (selectionMode) props.onToggleSelect?.(m);
        if (menuOpen) setMenuOpen(false);
      }}
    >
      {!isOwn && showAvatar && (
        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
          {m.sender?.avatar_url && <img src={m.sender.avatar_url} alt="" className="h-full w-full object-cover" />}
        </div>
      )}

      <SwipeReply direction={isOwn ? "left" : "right"} onReply={() => props.onReply(m)}>
        <motion.div
          layout
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          {...handlers}
          className={`relative max-w-[78vw] md:max-w-md ${tone} ${
            m.type === "image" ? "p-1" : "px-3 py-2"
          } shadow-sm select-none`}
        >
          {!isOwn && showAvatar && (
            <div className="mb-0.5 text-[11px] font-medium text-primary">{m.sender?.name}</div>
          )}

          {m.reply_to && (
            <ReplyPreview reply={m.reply_to} compact />
          )}

          {m.type === "image" && m.media_urls?.length ? (
            <>
              <MediaGrid urls={m.media_urls} onOpen={(i) => { setGalleryIdx(i); setGalleryOpen(true); }} />
              {m.content && <div className="px-2 pt-1.5 text-[15px] leading-snug">{m.content}</div>}
            </>
          ) : m.type === "voice" && m.voice_url ? (
            <div className="min-w-[200px]">
              <VoicePlayer
                url={m.voice_url}
                duration={m.voice_duration}
                waveform={m.voice_waveform}
                tint={isOwn ? "primary" : "muted"}
              />
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.content}</div>
          )}

          <div className={`mt-1 flex items-center justify-end gap-1 text-[10.5px] ${isOwn ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {m.edited_at && <span>edited</span>}
            <span>{timeOf(m.created_at)}</span>
            {isOwn && <StatusIcon status={m.status} />}
          </div>

          {Object.keys(reactionsGrouped).length > 0 && (
            <div className={`absolute -bottom-3 ${isOwn ? "right-2" : "left-2"} flex gap-0.5 rounded-full border bg-background px-1.5 py-0.5 text-xs shadow-sm`}>
              {Object.entries(reactionsGrouped).map(([emoji, count]) => (
                <span key={emoji} className="flex items-center gap-0.5">
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-[10px] text-muted-foreground">{count}</span>}
                </span>
              ))}
            </div>
          )}

          <AnimatePresence>
            {menuOpen && (
              <div className={`absolute z-30 ${isOwn ? "right-0" : "left-0"} -top-2 -translate-y-full`}>
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
