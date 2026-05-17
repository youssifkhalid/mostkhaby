# Chat Module — Drop-in (Phase 1: Core + Media)

Copy each file to the EXACT path below inside your Vite + React + Tailwind project.

## File paths

```
src/types/chat.ts
src/hooks/useLongPress.ts
src/components/chat/SwipeReply.tsx
src/components/chat/ReplyPreview.tsx
src/components/chat/ReactionsBar.tsx
src/components/chat/MessageMenu.tsx
src/components/chat/TypingIndicator.tsx
src/components/chat/MediaGrid.tsx
src/components/chat/ImageGallery.tsx
src/components/chat/VoicePlayer.tsx
src/components/chat/VoiceRecorder.tsx
src/components/chat/ChatInput.tsx
src/components/chat/ChatBubble.tsx
src/components/chat/SelectedToolbar.tsx
src/components/chat/ChatWindow.tsx
```

## Required dependencies

```bash
npm i framer-motion lucide-react
```

The components use:
- Tailwind tokens already present in shadcn projects: `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `bg-popover`, `text-foreground`, `border`, `bg-background`, `text-destructive`. No new tokens required.
- Path alias `@/` (already configured in shadcn projects).

## Usage

```tsx
import { ChatWindow } from "@/components/chat/ChatWindow";

<ChatWindow
  currentUserId={me.id}
  messages={messages}                 // Message[] sorted ascending
  typingUsers={typing}                // [{ id, name }]
  onSend={async ({ text, images, voice, reply_to }) => {
    // 1. upload images -> get URLs    (Supabase storage)
    // 2. upload voice.blob -> get URL
    // 3. insert into messages table with reply_to JSON
  }}
  onReact={(m, emoji) => upsertReaction(m.id, emoji)}
  onDelete={(ms) => softDelete(ms.map(x => x.id))}
  onForward={(ms) => openForwardSheet(ms)}
  onEdit={(m) => openEditor(m)}
  onPin={(m) => pinMessage(m.id)}
  onTyping={() => broadcastTyping()}
/>
```

## Features included (Phase 1)

- WhatsApp-style bubbles (own vs other) with tail, time, status ticks (sending/sent/delivered/read)
- Swipe-to-reply (drag horizontally, haptic on threshold)
- Long-press menu: Reply / Copy / Forward / Pin / Select / Edit / Delete
- Quick reactions bar (❤️😂😮😢👍🔥 + more)
- Reactions chip rendered under the bubble
- Reply preview inside input AND inside the bubble
- Selection mode + top toolbar (count, reply/copy/forward/pin/delete)
- Typing indicator with animated dots
- Multi-image gallery grid (1/2/3/4+ layouts with +N overlay)
- Full-screen image viewer (swipe/arrow keys, download, counter)
- Voice messages:
  - Hold-to-record with live waveform sampling
  - Slide-left to cancel, slide-up to lock
  - Waveform playback with progress fill
- Auto-grow textarea, Enter to send / Shift+Enter for newline
- Safe-area aware (iOS notch)
- Mobile-first, responsive, dark-mode ready via existing tokens
- No external state lib required — pure props

## Wiring notes

- `Message.reply_to` is denormalized (id, author_name, preview, type, media_url) so deletes don't break the quoted snippet.
- `Message.voice_waveform` is `number[] 0..1` (~80 samples). Persist it as JSONB.
- `Message.status` is rendered only for own messages.
- Reactions are a flat array `{ emoji, user_id }[]`; the bubble groups & counts them.

Phase 2 (not in this drop): full-screen voice waveform, video, files, drafts, scheduled messages, link previews, mentions, search, pinned bar.
