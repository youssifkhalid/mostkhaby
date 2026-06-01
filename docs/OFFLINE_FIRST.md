## 🔴⚫ Offline-First Architecture - Mostkhaby

> تطبيق 99% أوفلاين - الرسائل تُرسل وتُستقبل دائماً

### 📋 Overview

This implementation transforms Mostkhaby into a true offline-first messaging app where:
- ✅ **Messaging works 100% offline** - Messages are stored locally immediately
- ✅ **Automatic sync** - When online, messages sync to server automatically
- ✅ **No data loss** - Pending messages stay in queue until delivered
- ✅ **Smart retries** - Exponential backoff for failed syncs
- ✅ **Media caching** - Images/voice compressed and cached locally
- ✅ **Background sync** - Messages sync even when app is closed
- ✅ **Push notifications** - Receive messages offline, notified when online

---

## 🏗️ Architecture

### Core Components

```
src/lib/
├── db/
│   ├── types.ts           # TypeScript interfaces
│   ├── offline.ts         # Dexie.js database setup
│   └── media.ts          # Image compression & caching
├── sync/
│   └── syncManager.ts    # Core sync orchestrator
└── service-worker-register.ts

src/hooks/
└── useSyncState.ts        # React hook for UI

src/components/ui/
└── OfflineIndicator.tsx   # Status display
```

---

## 🗄️ Database Schema (IndexedDB via Dexie)

### Tables

| Table | Purpose | Indexes |
|-------|---------|---------|
| `messages` | All messages (sent & received) | `chatId`, `timestamp`, `status`, `isLocalOnly` |
| `chats` | Chat metadata | `lastMessageTime` |
| `users` | User profiles | (primary) |
| `contacts` | Contact list | `name` |
| `syncQueue` | Pending operations | `status`, `action`, `nextRetryTime` |
| `drafts` | Message drafts | `chatId` |

### Message Status Flow

```
[Offline]
  ↓
create message → store in messages table
  ↓
add to syncQueue with status='pending'
  ↓
[Online]
  ↓
syncManager picks it up
  ↓
POST to /api/messages
  ↓
✓ Success → status='delivered', syncedAt=timestamp
✗ Failed → status='pending', retries++, nextRetryTime=backoff
```

---

## 🔄 Sync Manager

### How It Works

1. **Online Detection**
   - Listens to `window.online` / `window.offline` events
   - Notifies all subscribers of state change

2. **Pending Sync Queue**
   - Queries all items with `status='pending'`
   - Respects `nextRetryTime` for exponential backoff
   - Max 5 retries per item (configurable)

3. **Processing**
   ```typescript
   for each pending item:
     if retries >= maxRetries:
       mark as 'failed'
     if nextRetryTime > now:
       skip (not yet)
     try:
       POST /api/messages or other action
       mark as 'synced'
     catch error:
       retries++
       nextRetryTime = now + 2^retries * 5000ms
   ```

4. **Subscriber Notifications**
   - UI components listen via `useSyncState()` hook
   - Updates: `{ isOnline, isSyncing, pendingCount, error }`

---

## 📱 Usage in Components

### Wrap app with offline indicator

```tsx
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { registerServiceWorker } from '@/lib/service-worker-register';
import { db, initMediaDB } from '@/lib/db/offline';

function App() {
  useEffect(() => {
    registerServiceWorker();
    initMediaDB();
  }, []);

  return (
    <div>
      <OfflineIndicator />
      {/* Rest of app */}
    </div>
  );
}
```

### Send message (works offline)

```tsx
import { db } from '@/lib/db/offline';
import { syncManager } from '@/lib/sync/syncManager';
import { v4 as uuid } from 'uuid';

async function handleSendMessage(chatId: string, text: string) {
  const messageId = uuid();
  const now = Date.now();

  // 1. Create message object
  const message = {
    id: messageId,
    chatId,
    text,
    senderId: currentUser.id,
    senderName: currentUser.name,
    timestamp: now,
    status: syncManager.isCurrentlyOnline() ? 'sending' : 'pending',
    media: [],
    reactions: [],
    isLocalOnly: !syncManager.isCurrentlyOnline(),
  };

  // 2. Store immediately (even if offline)
  await db.messages.add(message);

  // 3. Add to sync queue
  await db.syncQueue.add({
    action: 'send',
    payload: message,
    timestamp: now,
    retries: 0,
    maxRetries: 5,
    status: 'pending',
  });

  // 4. If online, sync immediately
  if (syncManager.isCurrentlyOnline()) {
    await syncManager.syncPendingData();
  }
}
```

### Track sync state in UI

```tsx
import { useSyncState } from '@/hooks/useSyncState';

function ChatHeader() {
  const { isOnline, isSyncing, pendingCount } = useSyncState();

  return (
    <div>
      <h2>Chat</h2>
      {!isOnline && <span>🔴 Offline</span>}
      {isSyncing && <span>🔄 Syncing...</span>}
      {pendingCount > 0 && <span>⏳ {pendingCount} pending</span>}
    </div>
  );
}
```

---

## 📸 Media Handling

### Compress & Cache Images

```tsx
import { compressAndCacheImage } from '@/lib/db/media';

async function handleImageSelect(file: File) {
  const { blob, localPath, originalSize } = await compressAndCacheImage(file);
  
  console.log(`Original: ${originalSize}b → Compressed: ${blob.size}b`);
  
  // Store reference in message
  message.media.push({
    id: uuid(),
    messageId: message.id,
    type: 'image',
    localPath,
    size: blob.size,
    synced: false,
  });
}
```

### Cache Cleanup
- Automatic cleanup after 7 days
- Respects 50MB cache limit
- Older files deleted first

---

## 🔔 Service Worker Features

Located at: `public/service-worker.ts`

### Network Strategies

| Route | Strategy |
|-------|----------|
| `/api/*` | Network first, fallback to cache |
| Static files | Stale-while-revalidate |

### Background Sync
- Syncs pending messages even if app closed
- Uses `BackgroundSync` API (when available)

### Push Notifications
- Receives notifications while offline
- Displays on connection restored

---

## 🚀 Setup & Installation

### 1. Add dependencies

```bash
npm install dexie idb
```

### 2. Register Service Worker in App

```tsx
// src/main.tsx or App.tsx
import { registerServiceWorker } from '@/lib/service-worker-register';

registerServiceWorker();
```

### 3. Initialize media DB

```tsx
import { initMediaDB } from '@/lib/db/media';

useEffect(() => {
  initMediaDB();
}, []);
```

### 4. Add OfflineIndicator to layout

```tsx
<OfflineIndicator />
```

---

## 📊 Storage Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| IndexedDB | 50MB+ | Browser dependent, usually plenty |
| Media Cache | 50MB | Auto-cleanup old files |
| Message History | Unlimited | Limited by device storage |

---

## 🔧 Configuration

Edit `src/lib/sync/syncManager.ts`:

```typescript
private minSyncInterval = 5000;      // Wait 5s between syncs
private syncInterval = setInterval(..., 10000);  // Check every 10s

// Exponential backoff
nextRetryTime = now + Math.pow(2, retryCount) * 5000ms;
```

---

## 🐛 Debugging

### View Sync Queue

```typescript
const pending = await db.syncQueue.where('status').equals('pending').toArray();
console.log(pending);
```

### Check Message Status

```typescript
const messages = await db.messages.where('chatId').equals(chatId).toArray();
messages.forEach(m => console.log(`${m.text}: ${m.status}`));
```

### View Storage Stats

```typescript
import { getDBStats } from '@/lib/db/offline';

const stats = await getDBStats();
console.log(stats);
// { messages: 150, chats: 5, syncQueuePending: 3, totalSize: 0 }
```

### Clear All Data

```typescript
import { clearAllData } from '@/lib/db/offline';
import { clearMediaCache } from '@/lib/db/media';

await clearAllData();
await clearMediaCache();
```

---

## 📋 Features Checklist

- [x] IndexedDB offline storage
- [x] Automatic sync on connection
- [x] Exponential backoff retry logic
- [x] Image compression & caching
- [x] Service Worker with network strategies
- [x] React hooks for sync state
- [x] UI indicator components
- [x] Background sync (SW API)
- [x] Push notifications
- [ ] Conflict resolution (TODO)
- [ ] End-to-end encryption (TODO)
- [ ] Full-text search (TODO)

---

## 🎯 Performance

### Optimization Tips

1. **Message batching**: Sync multiple messages in one request
2. **Lazy loading**: Load old messages on demand
3. **Compression**: Images auto-compressed to 80% JPEG quality
4. **Indexing**: Optimize queries with proper indexes

### Expected Performance

| Operation | Time |
|-----------|------|
| Send message (offline) | < 50ms (local store) |
| Sync 1 message | 100-500ms (network dependent) |
| Load 100 messages | < 200ms (from IndexedDB) |
| Compress image | 100-300ms (depends on size) |

---

## 🤝 Contributing

To extend this implementation:

1. Add new tables to `db.version(2).stores()`
2. Implement migration logic in constructor
3. Add new sync actions to `processSyncItem()`
4. Update type definitions in `types.ts`

---

## 📚 References

- [Dexie.js Documentation](https://dexie.org/)
- [idb Library](https://github.com/jakearchibald/idb)
- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API)

---

## 📝 License

MIT
