// [ezo-nav] Phone back button handler
// Pattern: permanent guard entry traps the user inside the app.
// Back press → close top handler OR re-arm guard (never exits browser).
// Result: behaves exactly like a native APK.

type Handler = { id: string; onClose: () => void; active: boolean };

const handlers = new Map<string, Handler>();
let ignoreNextPopstate = false;

function pushGuard() {
  try {
    window.history.pushState({ __ezo_root: true }, "", location.href);
  } catch (_) {}
}

if (typeof window !== "undefined") {
  // Install guard on first load
  pushGuard();

  window.addEventListener("popstate", () => {
    if (ignoreNextPopstate) {
      ignoreNextPopstate = false;
      return;
    }

    const ids = Array.from(handlers.keys());
    const topId = ids[ids.length - 1];

    if (topId) {
      const h = handlers.get(topId);
      if (h && h.active) {
        h.active = false;
        handlers.delete(topId);
        try {
          h.onClose();
        } catch (err) {
          console.error("[historyStack] onClose error:", err);
        }
      }
    }

    // Always re-arm the guard — user never leaves the browser
    pushGuard();
  });
}

export function pushBackHandler(onClose: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const h: Handler = { id, onClose, active: true };
  handlers.set(id, h);
  window.history.pushState({ __ezo: id }, "");
  return () => {
    if (!h.active) return;
    h.active = false;
    handlers.delete(id);
    if (window.history.state?.__ezo === id) {
      ignoreNextPopstate = true;
      window.history.back();
    }
  };
}
