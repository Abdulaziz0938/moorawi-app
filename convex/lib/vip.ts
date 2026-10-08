// [moorawi] VIP level calculation — shared across all queries
export function vipLevelFromTotalSent(totalSent: number): number {
  const T = [1000, 5000, 20000, 50000, 100000, 250000, 500000];
  return T.filter((x) => totalSent >= x).length;
}

export function vipLevelFromTotalReceived(totalReceived: number): number {
  const T = [1000, 5000, 20000, 50000, 100000, 250000, 500000];
  return T.filter((x) => totalReceived >= x).length;
}
