// [ezo-ux] اهتزاز خفيف — يعمل على iOS/Android
export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const PATTERNS: Record<HapticType, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 32,
  success: [10, 40, 15],
  warning: [20, 40, 20],
  error: [30, 40, 30, 40, 30],
};

export function haptic(type: HapticType = "light"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[type]);
  } catch {}
}

export function hapticLight() { haptic("light"); }
export function hapticSuccess() { haptic("success"); }
export function hapticError() { haptic("error"); }
