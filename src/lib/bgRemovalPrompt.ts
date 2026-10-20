// [ezo-bg-removal] نظام سؤال إزالة الخلفية قبل الرفع
let pendingResolver: ((v: { remove: boolean; remember: boolean }) => void) | null = null;
let pendingRequest: { fileName: string; filePreview?: string } | null = null;
const listeners = new Set<() => void>();

export function subscribeBgPrompt(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getPendingBgPrompt() {
  return pendingRequest;
}

export function askBgRemoval(file?: File): Promise<boolean> {
  return new Promise((resolve) => {
    pendingRequest = {
      fileName: file?.name ?? "",
      filePreview: file ? URL.createObjectURL(file) : undefined,
    };
    pendingResolver = (v) => {
      if (v.remember) setRememberedChoice(v.remove);
      resolve(v.remove);
    };
    listeners.forEach((fn) => fn());
  });
}

export function answerBgRemoval(remove: boolean, remember: boolean): void {
  const r = pendingResolver;
  const preview = pendingRequest?.filePreview;
  pendingResolver = null;
  pendingRequest = null;
  if (preview) {
    try { URL.revokeObjectURL(preview); } catch {}
  }
  listeners.forEach((fn) => fn());
  r?.({ remove, remember });
}

const LS_KEY = "ezo_bg_removal_pref";

export function getRememberedChoice(): boolean | null {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "remove") return true;
    if (v === "keep") return false;
    return null;
  } catch { return null; }
}

export function setRememberedChoice(remove: boolean): void {
  try { localStorage.setItem(LS_KEY, remove ? "remove" : "keep"); } catch {}
}

export function clearRememberedChoice(): void {
  try { localStorage.removeItem(LS_KEY); } catch {}
}
