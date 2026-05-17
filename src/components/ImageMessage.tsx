import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

const ImageMessage = ({ url }: { url: string }) => {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="relative block rounded-xl overflow-hidden max-w-[240px] bg-muted/40"
      >
        {!loaded && <div className="absolute inset-0 bg-muted animate-pulse" style={{ aspectRatio: "4/3" }} />}
        <img
          src={url}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`block w-full h-auto max-h-[300px] object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
          alt=""
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
          >
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur">
              <X size={20} />
            </button>
            <a
              href={url}
              download
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur"
            >
              <Download size={18} />
            </a>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={url}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl"
              alt=""
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageMessage;
