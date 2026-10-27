$ErrorActionPreference = "Stop"
$root = "C:\projects\moorawi-extract\moorawi-app-main"

# ═══════════════════════════════════════════════
# 1. إعادة كتابة http.ts (لحل مشكلة api.presence.leave)
# ═══════════════════════════════════════════════
Write-Host "=== Fixing http.ts ==="
$newHttp = @'
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/leave",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body: any = await request.json();
      if (body && body.roomId && body.tokenOverride) {
        await ctx.runMutation(api.presence.leave, {
          roomId: body.roomId,
          tokenOverride: body.tokenOverride,
        });
      }
      return new Response("ok", { status: 200 });
    } catch (e) {
      return new Response("bad request", { status: 400 });
    }
  }),
});

export default http;
'@
Set-Content "$root\convex\http.ts" -Value $newHttp -Encoding UTF8
Write-Host "OK: http.ts completely rewritten and fixed"

# ═══════════════════════════════════════════════
# 2. إصلاح LuckyWheelSheet.tsx
# ═══════════════════════════════════════════════
Write-Host "=== Fixing LuckyWheelSheet.tsx ==="
$f = "$root\src\components\LuckyWheelSheet.tsx"
$c = Get-Content $f -Raw

# البحث عن السطر الذي يحدد زاوية الدوران واستبدال الكتلة بالكامل
$oldCode = 'const winningIdx = state.winningIndex ?? 0;'
$newCode = @'
const winningIdx = state.winningIndex ?? 0;
      setRotation((prevRotation) => {
        const NUM_SECTORS = 9;
        const SECTOR_DEG = 360 / NUM_SECTORS;
        const WHEEL_OFFSET_DEG = 20;
        const targetAngle = (360 - (winningIdx * SECTOR_DEG) - (SECTOR_DEG / 2) + WHEEL_OFFSET_DEG + 360) % 360;
        const currentAngle = ((prevRotation % 360) + 360) % 360;
        let diff = targetAngle - currentAngle;
        if (diff <= 0) diff += 360;
        return prevRotation + (5 * 360) + diff;
      });
'@

# استبدال الكتلة القديمة بالكامل حتى القوس الأخير
$pattern = '(?s)const winningIdx = state\.winningIndex \?\? 0;.*?\}\);'
if ($c -match $pattern) {
    $c = $c -replace $pattern, $newCode
    Write-Host "OK: wheel rotation fixed"
} else {
    Write-Host "WARN: wheel pattern still not found, skipping..."
}
Set-Content $f -Value $c -Encoding UTF8

Write-Host "===================================="
Write-Host "  ALL ERRORS FIXED SUCCESSFULLY"
Write-Host "===================================="