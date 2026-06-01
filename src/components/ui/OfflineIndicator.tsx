import { useSyncState } from '@/hooks/useSyncState';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount } = useSyncState();

  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg',
        isOnline
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>أنت في وضع offline</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>جاري المزامنة...</span>
          {pendingCount > 0 && <span className="ml-auto text-xs">({pendingCount})</span>}
        </>
      ) : pendingCount > 0 ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>{pendingCount} رسالة قيد الانتظار</span>
        </>
      ) : null}
    </div>
  );
}
