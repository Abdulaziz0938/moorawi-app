$ErrorActionPreference = "Stop"
$root = "C:\projects\moorawi-extract\moorawi-app-main"

function Convert-ToInternal($path, $label) {
  if (-not (Test-Path $path)) { Write-Host "SKIP: $label (not found)"; return }
  $c = Get-Content $path -Raw
  $c = $c -replace 'import \{ mutation \} from', 'import { internalMutation } from'
  $c = $c -replace '= mutation\(\{', '= internalMutation({'
  Set-Content $path -Value $c -Encoding UTF8
  Write-Host "OK: $label"
}

Write-Host "=== C-1: fix.ts ==="
Convert-ToInternal "$root\convex\fix.ts" "fix.ts"

Write-Host "=== C-2: vip.ts rechargeAndUpgradeUser ==="
$f = "$root\convex\vip.ts"
$c = Get-Content $f -Raw
$c = $c -replace 'export const rechargeAndUpgradeUser = mutation\(', 'export const rechargeAndUpgradeUser = internalMutation('
Set-Content $f -Value $c -Encoding UTF8
Write-Host "OK: vip.ts"

Write-Host "=== C-3: resetStats.ts ==="
Convert-ToInternal "$root\convex\resetStats.ts" "resetStats.ts"

Write-Host "=== C-4: cleanup_junk.ts ==="
Convert-ToInternal "$root\convex\cleanup_junk.ts" "cleanup_junk.ts"

Write-Host "=== C-5: fix_social.ts ==="
Convert-ToInternal "$root\convex\fix_social.ts" "fix_social.ts"

Write-Host "=== C-6: bind_dragon.ts + seed files ==="
Convert-ToInternal "$root\convex\bind_dragon.ts" "bind_dragon.ts"

$seedFiles = @(
  "seed_all_animations", "seed_all_assets", "seed_apk_svga", "seed_cache_webp",
  "seed_custom_svga", "seed_extracted_svga", "seed_ezo_bindings", "seed_pag",
  "seed_rest_webp", "seed_svga", "seed_vip_animations", "seed_webp", "import_web_svga"
)
foreach ($name in $seedFiles) {
  Convert-ToInternal "$root\convex\$name.ts" "$name.ts"
}

Write-Host ""
Write-Host "===================================="
Write-Host "  C-1 to C-6 COMPLETE"
Write-Host "===================================="