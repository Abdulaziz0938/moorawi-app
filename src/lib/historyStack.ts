// [moorawi-nav] Phone back button handler
// Every open overlay/screen registers a handler; back pops the top one.

type Handler = { id: string; onClose: () => void; active: boolean };

const handlers = new Map<string, Handler>();
let ignoreNextPopstate = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (ignoreNextPopstate) {
      ignoreNextPopstate = false;
      return;
    }
    const ids = Array.from(handlers.keys());
    const topId = ids[ids.length - 1];
    if (!topId) return;
    const h = handlers.get(topId);
    if (!h || !h.active) return;
    h.active = false;
    handlers.delete(topId);
    try {
      h.onClose();
    } catch (e) {
      console.error("[historyStack] onClose error:", e);
    }
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
    // Remove our history entry if it's the current one
    if (window.history.state?.__ezo === id) {
      ignoreNextPopstate = true;
      window.history.back();
    }
  };
}
