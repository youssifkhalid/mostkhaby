# 🔧 Mostkhaby — Full Fix Documentation

## Root Cause Analysis

### 1. 🔴 403 Forbidden — RLS Errors

**Root cause:** The `chat_messages` UPDATE policy `"Chat participants can update message status"` had:
```sql
USING (EXISTS (SELECT 1 FROM chats WHERE id = chat_id AND (user1_id = auth.uid() OR user2_id = auth.uid())))
```
This allows ANY participant to UPDATE any message in the chat (including the sender's messages). But it conflicts with `"Senders can update own chat messages"` which has a `WITH CHECK (sender_id = auth.uid())`. When the **recipient** tries to mark a message as read (`UPDATE status = 'read'`), the second policy blocks them if the sender check fires.

**Fix:** Split into two clean policies:
- `"Recipients can mark messages read"` — `sender_id != auth.uid()` — for status/is_read updates
- `"Senders can update own chat messages"` — `sender_id = auth.uid()` — for edit/delete

Also: `"System can insert notifications"` previously had `WITH CHECK (true)` open to `anon` role. Now restricted.

---

### 2. 🔴 Unread System — Not Database-Driven

**Root cause:** The old `useUnreadMessages` was scanning all `chat_messages` rows for each user (`.neq("status", "read")`). This:
- Breaks across devices (device A reads, device B doesn't know)
- Creates race conditions when the user is in a chat
- Gets stale on refresh because `status` field is per-row, not per-user

**Fix:** New architecture using `chat_read_receipts` table:
```
chat_read_receipts (chat_id, user_id, last_read_at)
```
- `get_unread_counts(p_user_id)` DB function counts messages newer than `last_read_at`
- `mark_chat_read(p_chat_id, p_user_id)` upserts the timestamp — called when user opens a chat
- Both are `SECURITY DEFINER` → zero RLS issues
- Accurate across any number of devices/sessions

---

### 3. 🔴 Realtime — "cannot add postgres_changes after subscribe()"

**Root cause:** The old `GlobalMessageListener` had a single `useEffect` that:
1. Built a channel
2. Called `.subscribe()`
3. Then tried to conditionally call `.on()` again later (via settings changing)

The fix was mostly in place in your current code (separate channels per concern). However, the old `unread-rt-{id}` channel was trying to watch `UPDATE` on `chat_messages` globally — very expensive and unreliable.

**Fix:** Removed `unread-rt-{id}` channel entirely. Unread is now managed via:
- `receipts-{id}` channel watches `chat_read_receipts` (lightweight)
- New message arrives → `invalidateQueries(["unread-counts"])` → DB refetch

---

### 4. 🔴 Push Notifications — Background Delivery

**Root cause:** The trigger `notify_on_new_chat_message()` calls `net.http_post()` to the Edge Function. This works correctly IF:
1. `pg_net` extension is enabled (it is, per migration)
2. VAPID keys are set as Supabase secrets
3. The Edge Function URL in the trigger matches your project ID

**Remaining issue in your trigger:** The URL is hardcoded to `ydpeqyydxnnxiwofarmr.supabase.co`. This is correct only if that's your project. The Edge Function itself had a minor issue with missing TTL/urgency headers — now fixed.

---

### 5. 🟡 Chat List — Missing `last_message_sender_id`

**Root cause:** The `chats` table had no `last_message_sender_id` column, so the UI couldn't show "You: ..." vs the other person's name for the last message preview.

**Fix:** Added `last_message_sender_id` column + updated `update_chat_last_message()` trigger to populate it.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260519000001_master_fix.sql` | New migration — all DB fixes |
| `src/hooks/useUnreadMessages.ts` | Rewritten — DB-driven via `get_unread_counts` RPC |
| `src/hooks/useChats.ts` | Updated `CHAT_SELECT` + `markChatMessagesRead` uses RPC |
| `src/components/GlobalMessageListener.tsx` | Removed `unread-rt` channel, added `receipts` channel, uses `invalidateQueries` |
| `supabase/functions/send-push/index.ts` | Added TTL/urgency headers, better error handling |

---

## Deployment Steps

### Step 1: Run the migration
```bash
# In Supabase Dashboard → SQL Editor, run:
supabase/migrations/20260519000001_master_fix.sql

# OR via CLI:
supabase db push
```

### Step 2: Deploy the Edge Function
```bash
supabase functions deploy send-push
```

### Step 3: Set VAPID secrets (if not already done)
```bash
# Generate VAPID keys once:
npx web-push generate-vapid-keys

# Set them:
supabase secrets set VAPID_PUBLIC_KEY=<your_public_key>
supabase secrets set VAPID_PRIVATE_KEY=<your_private_key>
supabase secrets set VAPID_SUBJECT=mailto:your@email.com
```

### Step 4: Replace frontend files
Replace these files with the fixed versions:
- `src/hooks/useUnreadMessages.ts`
- `src/hooks/useChats.ts`
- `src/components/GlobalMessageListener.tsx`

### Step 5: Verify the `VITE_SUPABASE_PROJECT_ID` env var
The push notification system uses this:
```env
VITE_SUPABASE_PROJECT_ID=ydpeqyydxnnxiwofarmr
```
Make sure it's in your `.env` file.

---

## Architecture Summary (Post-Fix)

```
User opens chat
    │
    ▼
ChatPage calls markChatMessagesRead()
    │
    ▼
supabase.rpc("mark_chat_read", {chat_id, user_id})
    │
    ▼
DB upserts chat_read_receipts (chat_id, user_id, last_read_at = now())
    │
    ▼
Realtime "receipts-{id}" fires on other devices
    │
    ▼
invalidateQueries(["unread-counts"]) on all devices
    │
    ▼
get_unread_counts() refetched → badge updates everywhere
```

```
New message arrives (via Supabase trigger)
    │
    ├─► notify_on_new_chat_message() → send-push Edge Function → Web Push → SW → Notification
    │
    └─► Realtime INSERT on chat_messages
            │
            ▼
        GlobalMessageListener receives it
            │
            ├── User ON this chat → mark_chat_read() immediately
            └── User NOT on chat → invalidateQueries(["unread-counts"]) → badge appears
```

---

## Testing Checklist

- [ ] Open chat on Device A — unread badge clears on Device B within 2s
- [ ] Send message — appears instantly on both devices
- [ ] Close app on Device B — receive push notification
- [ ] Refresh page — unread counts are correct
- [ ] Log out and back in — unread counts reload correctly
- [ ] No 403 errors in browser console on any chat operation
