// VIP level 0-7 is derived from total coins spent on gifts.
export const VIP_THRESHOLDS = [1000, 5000, 20000, 50000];

export function vipLevel(totalSent: number): number {
  return VIP_THRESHOLDS.filter((t) => totalSent >= t).length;
}
