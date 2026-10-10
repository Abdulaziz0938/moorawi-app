// [moorawi-vip] Active VIP helper
//
// A user has active VIP only if:
//   - vipLevel > 0
//   - AND (no expiry OR expiry in the future)
//
// NOTE: The previous vipLevelFromTotalSent / vipLevelFromTotalReceived
// helpers were WRONG — they computed a 0-7 tier from spending/receiving,
// mixing VIP with Wealth/Charm levels. Removed.
// Wealth/Charm levels now come from convex/lib/levels.ts::levelFromValue.

export function activeVipLevel(
  user: { vipLevel?: number; vipExpiresAt?: number } | null | undefined
): number {
  if (!user) return 0;
  const lvl = user.vipLevel ?? 0;
  if (lvl <= 0) return 0;
  const exp = user.vipExpiresAt ?? 0;
  if (exp > 0 && exp <= Date.now()) return 0;
  return lvl;
}
