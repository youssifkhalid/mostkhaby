import { AnimatePresence, motion } from "framer-motion";
import { Paperclip, Send, Smile, X, Image as ImageIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { ReplyTo } from "@/types/chat";
import { ReplyPreview } from "./ReplyPreview";
import { VoiceRecorder } from "./VoiceRecorder";

export interface ChatInputSubmit {
  text?: string;
  images?: File[];
  voice?: { blob: Blob; duration: number; waveform: number[] };
  reply_to?: ReplyTo | null;
}

interface Props {
  onSubmit: (payload: ChatInputSubmit) => void | Promise<void>;
  onTyping?: () => void;
  reply?: ReplyTo | null;
  onCancelReply?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSubmit, onTyping, reply, onCancelReply,
  placeholder = "Message", disabled,
}: Props) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasContent = text.trim().length > 0 || images.length > 0;

  const send = () => {
    if (!hasContent) return;
    onSubmit({ text: text.trim() || undefined, images: images.length ? images : undefined, reply_to: reply });
    setText("");
    setImages([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const autoGrow = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping?.();
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...files].slice(0, 10));
    e.target.value = "";
  };

  return (
    <div className="border-t bg-background px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
      <AnimatePresence>
        {reply && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-1 pb-2"
          >
            <ReplyPreview reply={reply} onClose={onCancelReply} />
          </motion.div>
        )}
      </AnimatePresence>

      {images.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto px-1">
          {images.map((f, i) => {
            const url = URL.createObjectURL(f);
            return (
              <div key={i} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border">
                <img src={url} className="h-full w-full object-cover" alt="" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative flex items-end gap-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Attach image"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />

        <div className="flex flex-1 items-end rounded-3xl border bg-muted/40 px-3 py-1.5">
          <button type="button" className="mr-1 text-muted-foreground hover:text-foreground" aria-label="Emoji">
            <Smile className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={autoGrow}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={placeholder}
            disabled={disabled}
            className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-snug outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="relative">
          {hasContent ? (
            <motion.button
              key="send"
              type="button"
              onClick={send}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </motion.button>
          ) : (
            <VoiceRecorder
              onSend={(blob, duration, waveform) =>
                onSubmit({ voice: { blob, duration, waveform }, reply_to: reply })
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
