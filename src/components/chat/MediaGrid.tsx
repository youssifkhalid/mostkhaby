import { useMemo } from "react";

interface Props {
  urls: string[];
  onOpen: (index: number) => void;
}

/**
 * WhatsApp-style image grid (1..4+ items, last shows +N overlay).
 */
export function MediaGrid({ urls, onOpen }: Props) {
  const shown = useMemo(() => urls.slice(0, 4), [urls]);
  const extra = urls.length - shown.length;

  const layout =
    shown.length === 1 ? "grid-cols-1" :
    shown.length === 2 ? "grid-cols-2" :
    shown.length === 3 ? "grid-cols-2 grid-rows-2" :
    "grid-cols-2 grid-rows-2";

  return (
    <div className={`grid ${layout} gap-0.5 overflow-hidden rounded-2xl`}>
      {shown.map((url, i) => {
        const span3rd = shown.length === 3 && i === 0 ? "row-span-2" : "";
        const isLast = i === shown.length - 1 && extra > 0;
        return (
          <button
            key={url + i}
            type="button"
            onClick={() => onOpen(i)}
            className={`relative aspect-square overflow-hidden bg-muted ${span3rd}`}
          >
            <img src={url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
            {isLast && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-semibold text-white">
                +{extra}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
