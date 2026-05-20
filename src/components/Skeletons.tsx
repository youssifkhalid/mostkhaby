import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const shimmerCard = "glass-card border border-border/10 overflow-hidden";

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export const ChatListSkeleton = () => (
  <motion.div className="space-y-2.5 p-3" {...stagger} initial="initial" animate="animate">
    {Array.from({ length: 6 }).map((_, i) => (
      <motion.div key={i} {...fadeIn} className={`flex items-center gap-3 p-3.5 rounded-2xl ${shimmerCard}`}>
        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3.5 w-28 rounded-lg" />
          <Skeleton className="h-3 w-44 rounded-lg" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Skeleton className="h-2.5 w-10 rounded-lg" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </motion.div>
    ))}
  </motion.div>
);

export const MessageListSkeleton = () => (
  <motion.div className="space-y-3 p-4" {...stagger} initial="initial" animate="animate">
    {Array.from({ length: 7 }).map((_, i) => (
      <motion.div key={i} {...fadeIn} className={`flex ${i % 3 !== 0 ? "justify-start" : "justify-end"}`}>
        <Skeleton className={`rounded-2xl ${i % 3 !== 0 ? "w-52 h-12 rounded-bl-sm" : "w-40 h-10 rounded-br-sm"}`} />
      </motion.div>
    ))}
  </motion.div>
);

export const NotificationsSkeleton = () => (
  <motion.div className="space-y-2.5 p-3" {...stagger} initial="initial" animate="animate">
    {Array.from({ length: 5 }).map((_, i) => (
      <motion.div key={i} {...fadeIn} className={`flex items-center gap-3 p-4 rounded-2xl ${shimmerCard}`}>
        <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4 rounded-lg" />
          <Skeleton className="h-2.5 w-20 rounded-lg" />
        </div>
        <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
      </motion.div>
    ))}
  </motion.div>
);

export const ProfileSkeleton = () => (
  <motion.div className="p-6 space-y-5" {...stagger} initial="initial" animate="animate">
    <motion.div {...fadeIn} className="flex flex-col items-center gap-4">
      <Skeleton className="w-24 h-24 rounded-2xl" />
      <div className="space-y-2 text-center w-full max-w-[200px]">
        <Skeleton className="h-5 w-32 rounded-lg mx-auto" />
        <Skeleton className="h-3 w-24 rounded-lg mx-auto" />
      </div>
    </motion.div>
    <motion.div {...fadeIn} className="flex justify-center gap-8">
      {[0, 1].map(i => (
        <div key={i} className="flex flex-col items-center gap-1">
          <Skeleton className="h-6 w-10 rounded-lg" />
          <Skeleton className="h-3 w-12 rounded-lg" />
        </div>
      ))}
    </motion.div>
    <motion.div {...fadeIn} className="grid grid-cols-4 gap-2.5">
      {[0, 1, 2, 3].map(i => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </motion.div>
    <motion.div {...fadeIn}>
      <Skeleton className="h-28 rounded-2xl" />
    </motion.div>
  </motion.div>
);

export const SettingsSkeleton = () => (
  <motion.div className="p-4 space-y-3" {...stagger} initial="initial" animate="animate">
    {Array.from({ length: 6 }).map((_, i) => (
      <motion.div key={i} {...fadeIn} className={`flex items-center gap-3 p-4 rounded-2xl ${shimmerCard}`}>
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-24 rounded-lg" />
          <Skeleton className="h-2.5 w-40 rounded-lg" />
        </div>
        <Skeleton className="w-10 h-5 rounded-full" />
      </motion.div>
    ))}
  </motion.div>
);
