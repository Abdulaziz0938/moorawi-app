// [ezo-anim] Smart defaults for VIP asset animations
// يحوّل نوع الأصل إلى animation مناسب تلقائياً

export type AnimationType =
  | "none"
  | "rotate"
  | "pulse"
  | "breathe"
  | "shimmer"
  | "float"
  | "glow"
  | "sparkle"
  | "rotate-pulse"
  | "shimmer-rotate"
  | "float-glow";

export interface AnimConfig {
  animation: AnimationType;
  speed: number;      // بالثواني
  scale: number;      // قوة التأثير
  direction: "normal" | "reverse";
}

// Helper: detect asset type from key
export function assetSlot(key: string): string {
  // "vip.frame.3" → "frame"
  // "vip.halo.7" → "halo"
  // "vip.background.2" → "background"
  const parts = key.split(".");
  return parts[1] ?? "";
}

// Smart defaults: كل نوع له animation افتراضي فخم
export const SMART_DEFAULTS: Record<string, AnimConfig> = {
  // ─── الإطارات: دوران بطيء ───
  frame: {
    animation: "pulse",
    speed: 2.5,
    scale: 0.06,
    direction: "normal",
  },

  // ─── الهالات: نبض ناعم ───
  halo: {
    animation: "rotate",
    speed: 20,
    scale: 1.0,
    direction: "normal",
  },

  // ─── الخلفيات: لمعان متحرك ───
  background: {
    animation: "shimmer",
    speed: 8,
    scale: 1.0,
    direction: "normal",
  },

  // ─── الشعارات: توهج تنفّسي ───
  logo: {
    animation: "glow",
    speed: 3,
    scale: 1.0,
    direction: "normal",
  },

  // ─── الميداليات: نبض قوي ───
  medal: {
    animation: "sparkle",
    speed: 2,
    scale: 1.0,
    direction: "normal",
  },

  // ─── البطاقات: طفو ───
  card: {
    animation: "float",
    speed: 3.5,
    scale: 4,
    direction: "normal",
  },

  // ─── الأسماء: لمعان ───
  nickname: {
    animation: "shimmer",
    speed: 3,
    scale: 1.0,
    direction: "normal",
  },

  // ─── الدخول: شرارات ───
  entry: {
    animation: "sparkle",
    speed: 1.5,
    scale: 1.0,
    direction: "normal",
  },

  // ─── الموجة: نبض ───
  wave: {
    animation: "breathe",
    speed: 1.8,
    scale: 1.0,
    direction: "normal",
  },

  // ─── الفقاعات: طفو + توهج ───
  bubble: {
    animation: "float-glow",
    speed: 4,
    scale: 3,
    direction: "normal",
  },

  // ─── Hero (الصورة الرئيسية): نبض ناعم ───
  hero: {
    animation: "pulse",
    speed: 3,
    scale: 0.03,
    direction: "normal",
  },

  // ─── Default ───
  default: {
    animation: "none",
    speed: 3,
    scale: 1,
    direction: "normal",
  },
};

// Resolve: من key → config
export function resolveAnimConfig(
  key: string,
  overrides?: Partial<AnimConfig> | null
): AnimConfig {
  const slot = assetSlot(key);
  const base = SMART_DEFAULTS[slot] ?? SMART_DEFAULTS.default;
  return {
    animation: overrides?.animation ?? base.animation,
    speed: overrides?.speed ?? base.speed,
    scale: overrides?.scale ?? base.scale,
    direction: overrides?.direction ?? base.direction,
  };
}

// Build className + style for React
export function buildAnimProps(
  key: string,
  overrides?: Partial<AnimConfig> | null
): { className: string; style: React.CSSProperties } {
  const cfg = resolveAnimConfig(key, overrides);
  if (cfg.animation === "none") {
    return { className: "", style: {} };
  }
  return {
    className: `ezo-anim-${cfg.animation}`,
    style: {
      ["--ezo-speed" as any]: `${cfg.speed}s`,
      ["--ezo-scale" as any]: cfg.scale,
      ["--ezo-dir" as any]: cfg.direction,
    },
  };
}
