import { useCallback, useRef } from "react";

interface Options {
  delay?: number;
  moveThreshold?: number;
  onStart?: () => void;
  onCancel?: () => void;
}

export function useLongPress(onLongPress: () => void, options: Options = {}) {
  const { delay = 400, moveThreshold = 8, onStart, onCancel } = options;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const triggered = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      triggered.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      onStart?.();
      timer.current = setTimeout(() => {
        triggered.current = true;
        if (navigator.vibrate) navigator.vibrate(10);
        onLongPress();
      }, delay);
    },
    [delay, onLongPress, onStart],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold) {
        clear();
        onCancel?.();
      }
    },
    [moveThreshold, clear, onCancel],
  );

  const onPointerUp = useCallback(() => {
    clear();
    start.current = null;
  }, [clear]);

  const onPointerLeave = onPointerUp;
  const onPointerCancel = onPointerUp;

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onPointerCancel },
    didTrigger: () => triggered.current,
  };
}
