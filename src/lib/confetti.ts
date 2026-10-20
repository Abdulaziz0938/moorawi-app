// [ezo-ux] احتفالات احترافية
import confetti from "canvas-confetti";

const EZO_COLORS = ["#a855f7", "#fbbf24", "#f472b6", "#60a5fa", "#34d399"];

export function celebrateSuccess(): void {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: EZO_COLORS,
    zIndex: 9999,
    disableForReducedMotion: true,
  });
}

export function celebrateBig(): void {
  const duration = 2500;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors: EZO_COLORS,
      zIndex: 9999,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors: EZO_COLORS,
      zIndex: 9999,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function celebrateBurst(x = 0.5, y = 0.5): void {
  confetti({
    particleCount: 60,
    startVelocity: 35,
    spread: 360,
    origin: { x, y },
    colors: EZO_COLORS,
    zIndex: 9999,
    disableForReducedMotion: true,
  });
}
