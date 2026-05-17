import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  urls: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export function ImageGallery({ urls, initialIndex = 0, open, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(urls.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, urls.length, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={onClose}
        >
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <a
              href={urls[index]}
              download
              onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Download"
            >
              <Download className="h-5 w-5" />
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {urls.length > 1 && index > 0 && (
            <button
              className="absolute left-3 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); setIndex((i) => i - 1); }}
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {urls.length > 1 && index < urls.length - 1 && (
            <button
              className="absolute right-3 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); setIndex((i) => i + 1); }}
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={urls[index]}
              src={urls[index]}
              alt=""
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-[92vw] object-contain"
            />
          </AnimatePresence>

          {urls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
              {index + 1} / {urls.length}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
