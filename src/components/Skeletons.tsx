import { Skeleton } from "@/components/ui/skeleton";

export const ChatListSkeleton = () => (
  <div className="space-y-2 p-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-card/40 border border-border/20">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-3 w-10" />
      </div>
    ))}
  </div>
);

export const MessageListSkeleton = () => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
        <Skeleton className={`h-10 ${i % 2 ? "w-40" : "w-52"} rounded-2xl`} />
      </div>
    ))}
  </div>
);

export const NotificationsSkeleton = () => (
  <div className="space-y-2 p-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/40 border border-border/20">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
    ))}
  </div>
);

export const ProfileSkeleton = () => (
  <div className="p-6 space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="w-20 h-20 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-2/3" />
    <div className="grid grid-cols-3 gap-3 pt-4">
      {[0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
    </div>
  </div>
);
