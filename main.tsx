import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if ("serviceWorker" in navigator) {
  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const isPreview =
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname === "localhost";

  if (inIframe || isPreview) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
    // Listen for navigation requests from SW (notification clicks)
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "navigate" && e.data.url) {
        window.location.href = e.data.url;
      }
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
