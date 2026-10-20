// [moorawi] Custom glassmorphism dialog system — replaces native alert()
import { useEffect, useState } from "react";

type DialogState = {
  id: number;
  type: "alert" | "confirm";
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type Listener = (state: DialogState | null) => void;

class DialogManager {
  private listeners: Set<Listener> = new Set();
  private current: DialogState | null = null;
  private nextId = 1;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.current);
    return () => { this.listeners.delete(fn); };
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this.current));
  }

  alert(message: string, title?: string) {
    this.current = {
      id: this.nextId++,
      type: "alert",
      title: title ?? "",
      message,
      confirmText: "حسناً",
    };
    this.emit();
  }

  confirm(message: string, onConfirm: () => void, title?: string, confirmText = "تأكيد", cancelText = "إلغاء") {
    this.current = {
      id: this.nextId++,
      type: "confirm",
      title: title ?? "",
      message,
      confirmText,
      cancelText,
      onConfirm,
      onCancel: () => {},
    };
    this.emit();
  }

  close() {
    this.current = null;
    this.emit();
  }

  handleConfirm() {
    const c = this.current;
    this.close();
    c?.onConfirm?.();
  }
}

export const dialog = new DialogManager();

// Component to mount once
export function DialogHost() {
  const [state, setState] = useState<DialogState | null>(null);

  useEffect(() => {
    const unsub = dialog.subscribe(setState);
    return () => { unsub(); };
  }, []);

  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
        onClick={() => dialog.close()}
      />

      {/* Dialog card */}
      <div
        key={state.id}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden border border-white/20 shadow-2xl animate-[dialogPop_0.25s_cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
          background: "linear-gradient(145deg, rgba(30,27,75,0.85) 0%, rgba(15,12,40,0.92) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Glow border top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />

        {/* Content */}
        <div className="px-6 pt-6 pb-5 text-center">
          {state.title && (
            <h3 className="text-white text-base font-black mb-2">{state.title}</h3>
          )}
          <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">{state.message}</p>
        </div>

        {/* Buttons */}
        <div className="px-4 pb-4 flex gap-2">
          {state.type === "confirm" && (
            <button
              onClick={() => dialog.close()}
              className="flex-1 py-3 rounded-2xl text-white/80 text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/15 transition active:scale-95"
            >
              {state.cancelText ?? "إلغاء"}
            </button>
          )}
          <button
            onClick={() => dialog.handleConfirm()}
            className="flex-1 py-3 rounded-2xl text-white text-sm font-black transition active:scale-95 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
              boxShadow: "0 8px 24px -8px rgba(168,85,247,0.6)",
            }}
          >
            {state.confirmText ?? "حسناً"}
          </button>
        </div>
      </div>
    </div>
  );
}
