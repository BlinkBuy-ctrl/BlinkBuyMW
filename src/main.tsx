import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Catch unhandled promise rejections — prevents silent freezes
window.addEventListener("unhandledrejection", (e) => {
  console.error("[Unhandled]", e.reason);
  // Prevent the error from silently killing async chains
  e.preventDefault();
});

// Register Service Worker for PWA/offline support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
