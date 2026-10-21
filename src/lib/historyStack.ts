// [ezo-nav] APK-like back button — simple, reliable, never exits
// One persistent guard in history. Every popstate: close top handler OR re-arm.
type Handler = { id: string; onClose: () => void; active: boolean };

const handlers: Handler[] = [];
let ignoreNextPopstate = false;
let initialized = false;

function pushGuard() {
  try {
    window.history.pushState({ __ezo_guard: 1 }, "");
  } catch (_) {}
}

export function initHistoryGuard() {
  if (typeof window === "undefined") return;
  if (initialized) {
    // Re-arm in case the guard was lost (e.g., after deep-link navigation)
    pushGuard();
    return;
  }
  initialized = true;
  pushGuard();

  window.addEventListener("popstate", () => {
    if (ignoreNextPopstate) {
      ignoreNextPopstate = false;
      return;
    }
    // Find topmost active handler (last in array)
    for (let i = handlers.length - 1; i >= 0; i--) {
      if (handlers[i].active) {
        handlers[i].active = false;
        const h = handlers[i];
        handlers.splice(i, 1);
        try {
          h.onClose();
        } catch (err) {
          console.error("[historyStack] onClose error:", err);
        }
        break;
      }
    }
    // ALWAYS re-arm — user never exits browser
    pushGuard();
  });
}

export function pushBackHandler(onClose: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h: Handler = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    onClose,
    active: true,
  };
  handlers.push(h);
  return () => {
    h.active = false;
    const i = handlers.indexOf(h);
    if (i >= 0) handlers.splice(i, 1);
  };
}
