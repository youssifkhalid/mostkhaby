/**
 * ActiveChatContext
 * ─────────────────
 * Single source of truth for "is the user currently inside / focused on a chat?".
 *
 * - activeChatId: the chatId the user is currently viewing (null otherwise)
 * - isWindowFocused / isPageVisible: window/document state
 * - isAppActive: combined (focused + visible)
 *
 * The notificationRouter and the service worker both read from this
 * (via swBridge) to decide whether to surface notifications.
 */

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { syncActiveStateToSW } from "@/lib/swBridge";

interface ActiveChatContextValue {
  activeChatId: string | null;
  setActiveChat: (chatId: string | null) => void;
  isWindowFocused: boolean;
  isPageVisible: boolean;
  isAppActive: boolean;
}

const ActiveChatContext = createContext<ActiveChatContextValue>({
  activeChatId: null,
  setActiveChat: () => {},
  isWindowFocused: true,
  isPageVisible: true,
  isAppActive: true,
});

export const ActiveChatProvider = ({ children }: { children: ReactNode }) => {
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [isWindowFocused, setFocused] = useState(typeof document !== "undefined" ? document.hasFocus() : true);
  const [isPageVisible, setVisible] = useState(typeof document !== "undefined" ? !document.hidden : true);

  const setActiveChat = useCallback((chatId: string | null) => {
    setActiveChatIdState(chatId);
    try {
      if (chatId) sessionStorage.setItem("activeChatId", chatId);
      else sessionStorage.removeItem("activeChatId");
    } catch {}
  }, []);

  // window/document lifecycle listeners
  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    const onVisibility = () => setVisible(!document.hidden);
    const onPageHide = () => setVisible(false);
    const onPageShow = () => setVisible(!document.hidden);

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const isAppActive = isWindowFocused && isPageVisible;

  // Sync to service worker (IndexedDB + postMessage) on any change
  useEffect(() => {
    syncActiveStateToSW({ activeChatId, isAppActive });
  }, [activeChatId, isAppActive]);

  const value = useMemo(
    () => ({ activeChatId, setActiveChat, isWindowFocused, isPageVisible, isAppActive }),
    [activeChatId, setActiveChat, isWindowFocused, isPageVisible, isAppActive]
  );

  return <ActiveChatContext.Provider value={value}>{children}</ActiveChatContext.Provider>;
};

export const useActiveChat = () => useContext(ActiveChatContext);
