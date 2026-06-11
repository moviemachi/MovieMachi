import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe global console interceptor for sandbox/offline test containers
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = function (...args) {
    const isFirestoreNetworkError = args.some(arg => {
      if (!arg) return false;
      const str = typeof arg === "string" ? arg : (arg instanceof Error ? arg.message : String(arg));
      const lower = str.toLowerCase();
      return (
        lower.includes("@firebase/firestore") ||
        lower.includes("could not reach cloud firestore") ||
        lower.includes("failed to get document from server") ||
        lower.includes("unable to reach database") ||
        lower.includes("quota exceeded")
      );
    });

    if (isFirestoreNetworkError) {
      console.warn("[Firestore Main Handler Warning]: Rerouted connection state:", ...args);
      return;
    }
    originalError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
