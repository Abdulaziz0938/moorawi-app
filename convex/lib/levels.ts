// [moorawi-levels] Backend mirror of src/lib/levels.ts
// Only levelFromValue is needed server-side. Keep THRESHOLDS in sync.

export const MAX_LEVEL = 100;

const THRESHOLDS: number[] = (() => {
  const t: number[] = new Array(MAX_LEVEL + 1).fill(0);
  t[0] = 0;
  t[1] = 500;
  let cur = 500;
  const steps = [
    { from: 2,  to: 10,  inc: 5_500 },
    { from: 11, to: 20,  inc: 12_500 },
    { from: 21, to: 30,  inc: 42_500 },
    { from: 31, to: 40,  inc: 150_000 },
    { from: 41, to: 50,  inc: 540_000 },
    { from: 51, to: 60,  inc: 1_850_000 },
    { from: 61, to: 70,  inc: 6_400_000 },
    { from: 71, to: 80,  inc: 23_000_000 },
    { from: 81, to: 90,  inc: 78_000_000 },
    { from: 91, to: 100, inc: 290_000_000 },
  ];
  for (const s of steps) {
    for (let l = s.from; l <= s.to; l++) {
      cur += s.inc;
      t[l] = cur;
    }
  }
  return t;
})();

export function levelFromValue(value: number): number {
  const v = Math.max(0, value ?? 0);
  if (v < THRESHOLDS[1]) return 0;
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (v >= THRESHOLDS[l]) return l;
  }
  return 0;
}
