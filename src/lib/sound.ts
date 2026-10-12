// [ezo-ux] أصوات UI مُصنَّعة (بدون ملفات mp3)
let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  const c = ctx as AudioContext;
  if (c.state === "suspended") c.resume().catch(() => {});
  return c;
}

interface ToneOptions {
  freq?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
}

function play(opts: ToneOptions): void {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    const freq = opts.freq ?? 700;
    const duration = opts.duration ?? 0.06;
    const gain = opts.gain ?? 0.05;
    o.type = opts.type ?? "sine";
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (opts.slideTo) {
      o.frequency.exponentialRampToValueAtTime(
        Math.max(1, opts.slideTo),
        c.currentTime + duration
      );
    }
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration + 0.02);
  } catch {}
}

export const sound = {
  click()    { play({ freq: 900, duration: 0.04, gain: 0.04 }); },
  tap()      { play({ freq: 1200, duration: 0.03, gain: 0.03 }); },
  success()  { play({ freq: 700, duration: 0.08, gain: 0.05, slideTo: 1400 }); },
  error()    { play({ freq: 400, duration: 0.12, gain: 0.06, slideTo: 200, type: "square" }); },
  message()  { play({ freq: 1000, duration: 0.05, gain: 0.04, slideTo: 1500 }); },
  notification() { play({ freq: 800, duration: 0.06, gain: 0.05, slideTo: 1200 }); },
  open()     { play({ freq: 500, duration: 0.1, gain: 0.04, slideTo: 1000 }); },
  close()    { play({ freq: 800, duration: 0.08, gain: 0.03, slideTo: 400 }); },
  enable(v: boolean) { enabled = v; },
  isEnabled() { return enabled; },
};

// استرجاع التفضيل من localStorage
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("ezo_sound");
  enabled = saved !== "off";
}
