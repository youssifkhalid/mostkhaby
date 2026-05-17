import { useCallback, useMemo, useState } from "react";
import type { Message, ReplyTo } from "@/types/chat";
import { ChatBubble } from "./ChatBubble";
import { ChatInput, type ChatInputSubmit } from "./ChatInput";
import { SelectedToolbar } from "./SelectedToolbar";
import { TypingIndicator } from "./TypingIndicator";

interface Props {
  currentUserId: string;
  messages: Message[];
  typingUsers?: { id: string; name: string }[];
  onSend: (payload: ChatInputSubmit) => void | Promise<void>;
  onReact: (m: Message, emoji: string) => void;
  onDelete?: (ms: Message[]) => void;
  onForward?: (ms: Message[]) => void;
  onEdit?: (m: Message) => void;
  onPin?: (m: Message) => void;
  onTyping?: () => void;
}

/**
 * Drop-in container that wires up bubbles, selection, reply state and input.
 * Wrap this in your conversation page; pass realtime messages in.
 */
export function ChatWindow({
  currentUserId, messages, typingUsers = [], onSend, onReact,
  onDelete, onForward, onEdit, onPin, onTyping,
}: Props) {
  const [reply, setReply] = useState<ReplyTo | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectionMode = selected.size > 0;
  const selectedMessages = useMemo(
    () => messages.filter((m) => selected.has(m.id)),
    [messages, selected],
  );

  const toReply = useCallback((m: Message): ReplyTo => ({
    id: m.id,
    author_name: m.sender?.name ?? "User",
    preview: m.content ?? (m.type === "image" ? "Photo" : m.type === "voice" ? "Voice message" : ""),
    type: m.type,
    media_url: m.media_urls?.[0] ?? null,
  }), []);

  const toggleSelect = (m: Message) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
      return next;
    });
  };

  return (
    <div className="relative flex h-full flex-col">
      <SelectedToolbar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onReply={selected.size === 1 ? () => { setReply(toReply(selectedMessages[0])); setSelected(new Set()); } : undefined}
        onCopy={() => {
          const text = selectedMessages.map((m) => m.content ?? "").filter(Boolean).join("\n");
          if (text) navigator.clipboard.writeText(text);
          setSelected(new Set());
        }}
        onForward={onForward ? () => { onForward(selectedMessages); setSelected(new Set()); } : undefined}
        onPin={onPin && selected.size === 1 ? () => { onPin(selectedMessages[0]); setSelected(new Set()); } : undefined}
        onDelete={onDelete ? () => { onDelete(selectedMessages); setSelected(new Set()); } : undefined}
      />

      <div className="flex-1 overflow-y-auto py-3 space-y-1.5 pt-16">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showAvatar = !prev || prev.sender_id !== m.sender_id;
          return (
            <ChatBubble
              key={m.id}
              message={m}
              isOwn={m.sender_id === currentUserId}
              showAvatar={showAvatar}
              selected={selected.has(m.id)}
              selectionMode={selectionMode}
              onReply={(msg) => setReply(toReply(msg))}
              onReact={onReact}
              onCopy={(msg) => msg.content && navigator.clipboard.writeText(msg.content)}
              onDelete={onDelete ? (msg) => onDelete([msg]) : undefined}
              onForward={onForward ? (msg) => onForward([msg]) : undefined}
              onEdit={onEdit}
              onPin={onPin}
              onSelect={(msg) => setSelected(new Set([msg.id]))}
              onToggleSelect={toggleSelect}
            />
          );
        })}

        {typingUsers.map((u) => (
          <TypingIndicator key={u.id} name={u.name} />
        ))}
      </div>

      <ChatInput
        onSubmit={async (payload) => { await onSend(payload); setReply(null); }}
        onTyping={onTyping}
        reply={reply}
        onCancelReply={() => setReply(null)}
      />
    </div>
  );
}
