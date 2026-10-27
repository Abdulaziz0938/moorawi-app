$ErrorActionPreference = "Stop"
$root = "C:\projects\moorawi-extract\moorawi-app-main"

# ═══════════════════════════════════════════════
# C-10a: SvgaPlayer.tsx (إصلاح مشكلة 100vw)
# ═══════════════════════════════════════════════
Write-Host "=== C-10a: SvgaPlayer.tsx ==="
$newSvga = @'
import { useEffect, useRef } from "react";
import SVGA from "svgaplayerweb";

interface Props {
  src: string;
  loops?: number;
  className?: string;
  onFinish?: () => void;
  autoPlay?: boolean;
}

export default function SvgaPlayer({ src, loops = 0, className = "", onFinish, autoPlay = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<any>(null);
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  useEffect(() => {
    if (!canvasRef.current || !src) return;
    const canvas = canvasRef.current;
    let player: any = null;
    let parser: any = null;

    try {
      player = new (SVGA as any).Player(canvas);
      parser = new (SVGA as any).Parser();
      playerRef.current = player;
      player.setContentMode("AspectFit");
      player.setClipsToBounds(false);
      player.loops = loops;
      if (onFinishRef.current) player.onFinished(() => onFinishRef.current?.());
      parser.load(src, (videoItem: any) => {
        try {
          player.setVideoItem(videoItem);
          if (autoPlay) player.startAnimation();
        } catch (e: any) { console.error("[svga]", e); }
      }, (err: any) => { console.error("[svga] load error:", err); });
    } catch (e: any) { console.error("[svga]", e); }

    return () => { try { player?.clear(); } catch {} };
  }, [src, loops, autoPlay]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
'@
Set-Content "$root\src\components\ui\SvgaPlayer.tsx" -Value $newSvga -Encoding UTF8
Write-Host "OK: SvgaPlayer.tsx"

# ═══════════════════════════════════════════════
# C-10b: PagPlayer.tsx (استخدام npm + singleton)
# ═══════════════════════════════════════════════
Write-Host "=== C-10b: PagPlayer.tsx ==="
$newPag = @'
import { useEffect, useRef } from "react";
import { PAGInit } from "libpag";

let pagPromise: Promise<any> | null = null;
function getPAG() {
  if (!pagPromise) {
    pagPromise = PAGInit({ locateFile: (f: string) => `/pag/${f}` });
  }
  return pagPromise;
}

export default function PagPlayer({ src, className = "" }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pagViewRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const PAG = await getPAG();
        const pagFile = await PAG.PAGFile.load(src);
        if (!isMounted || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width = pagFile.width();
        canvas.height = pagFile.height();

        const view = await PAG.PAGView.init(pagFile, canvas);
        if (!isMounted) { try { view.destroy(); } catch {} return; }
        pagViewRef.current = view;
        view.setRepeatCount(1);
        view.play();
      } catch (e: any) {
        console.error("[PAG] load error:", e);
      }
    })();

    return () => {
      isMounted = false;
      try { pagViewRef.current?.destroy(); } catch {}
      pagViewRef.current = null;
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent" }}
    />
  );
}
'@
Set-Content "$root\src\components\ui\PagPlayer.tsx" -Value $newPag -Encoding UTF8
Write-Host "OK: PagPlayer.tsx"

# ═══════════════════════════════════════════════
# C-11: LuckyWheelSheet.tsx (إصلاح زاوية العجلة)
# ═══════════════════════════════════════════════
Write-Host "=== C-11: LuckyWheelSheet.tsx ==="
$f = "$root\src\components\LuckyWheelSheet.tsx"
$c = Get-Content $f -Raw

$oldWheel = @'
      // حفظ رهانات المستخدم لاستخدامها في زر "كرر"
      if (data.myTotalBet > 0) {
        setLastRoundBets(data.myBets);
      }

      // حساب الزاوية بحيث يتوقف السهم في منتصف القطاع بدقة
      // [ezo-fix] حساب الزاوية النهائي (مع إزاحة لتصحيح الانعكاس)
      const numSectors = 9;
      const sectorSize = 360 / numSectors;
      const index = state.winningIndex;
      
      // بناءً على الاختبار: السهم يعطي القطاع المعاكس، لذا نضيف 180 درجة (نصف دورة)
      // + نضبط الإزاحة لتناسب الصورة الحالية
      const offsetCorrection = 20;
      const baseAngle = (index - 1) * sectorSize + (sectorSize / 2);
      // [ezo-fix] عكس الاتجاه بناءً على انعكاس LTR
      // [ezo-fix] عكس اتجاه الدوران للتصحيح البصري
      const targetStopAngle = 360 - (state.winningIndex * (360 / 9));
      const extraSpins = 360 * 6;
      console.log(`[EZO-WHEEL] WinningIndex: ${state.winningIndex} | TargetAngle: ${targetStopAngle}`);
                  const winningIdx = state.winningIndex ?? 0;
      setRotation((prevRotation) => {
        // بما أن العجلة تدور مع عقارب الساعة، لجلب الشريحة winningIdx إلى السهم:
        const targetAngle = (360 - (winningIdx * 40)) % 360;
        const currentAngle = ((prevRotation % 360) + 360) % 360;
        
        let diff = targetAngle - currentAngle;
        if (diff <= 0) diff += 360;

        return prevRotation + (5 * 360) + diff;
      });
'@

$newWheel = @'
      if (data.myTotalBet > 0) {
        setLastRoundBets(data.myBets);
      }

      const NUM_SECTORS = 9;
      const SECTOR_DEG = 360 / NUM_SECTORS;
      const WHEEL_OFFSET_DEG = 20;
      const winningIdx = state.winningIndex ?? 0;
      setRotation((prevRotation) => {
        const targetAngle = (360 - (winningIdx * SECTOR_DEG) - (SECTOR_DEG / 2) + WHEEL_OFFSET_DEG + 360) % 360;
        const currentAngle = ((prevRotation % 360) + 360) % 360;
        let diff = targetAngle - currentAngle;
        if (diff <= 0) diff += 360;
        const EXTRA_SPINS = 5 * 360;
        return prevRotation + EXTRA_SPINS + diff;
      });
'@
if ($c.Contains($oldWheel)) {
  $c = $c.Replace($oldWheel, $newWheel)
  Write-Host "OK: wheel rotation fixed"
} else {
  Write-Host "WARN: wheel pattern not found"
}
Set-Content $f -Value $c -Encoding UTF8

# ═══════════════════════════════════════════════
# C-12: RoomView.tsx & EntryEffectOverlay.tsx
# ═══════════════════════════════════════════════
Write-Host "=== C-12: Entry Animation timing ==="
$f = "$root\src\components\RoomView.tsx"
$c = Get-Content $f -Raw

$old1 = @'
  // [ezo-entry] تشغيل دخولية (مركبة) المستخدم نفسه عند تحميل بياناته
  useEffect(() => {
    if (!myInfo?.userId || myEntryPlayedRef.current) return;
    myEntryPlayedRef.current = true;
    
    // تأخير بسيط للتأكد من أن الغرفة ظهرت بالكامل
    const timer = setTimeout(() => {
      setActiveEntryUserId(myInfo.userId);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [myInfo?.userId]);
'@
$new1 = @'
  // [ezo-fix C-12] تشغيل دخولية المستخدم نفسه — من useEffect(members) فقط
'@
if ($c.Contains($old1)) {
  $c = $c.Replace($old1, $new1)
  Write-Host "OK: RoomView entry effect removed"
}
Set-Content $f -Value $c -Encoding UTF8

$f2 = "$root\src\components\ui\EntryEffectOverlay.tsx"
$c2 = Get-Content $f2 -Raw
$c2 = $c2 -replace 'setTimeout\(\(\) => onFinish\(\), 15000\)', 'setTimeout(() => onFinish(), 4500)'
Set-Content $f2 -Value $c2 -Encoding UTF8
Write-Host "OK: EntryEffectOverlay timeout"

# ═══════════════════════════════════════════════
# H-4: gifts.ts (Diamonds + Rocket)
# ═══════════════════════════════════════════════
Write-Host "=== H-4: gifts.ts ==="
$f = "$root\convex\gifts.ts"
$c = Get-Content $f -Raw

$oldD = @'
    // [ezo-levels] 1 coin received = 1 Charm XP
    await ctx.db.patch("users", args.toUserId, {
      charms: (target.charms ?? 0) + totalPrice,
      totalReceived: (target.totalReceived ?? 0) + totalPrice,
    });
'@
$newD = @'
    // [ezo-fix H-4] ماس للمستلم (30% مضيف / 70% عادي)
    await ctx.db.patch("users", args.toUserId, {
      charms: (target.charms ?? 0) + totalPrice,
      totalReceived: (target.totalReceived ?? 0) + totalPrice,
      ...(target.agencyId ? {
        diamonds: (target.diamonds ?? 0) + Math.floor(totalPrice * 0.3),
        hostIncomeMonth: (target.hostIncomeMonth ?? 0) + totalPrice,
      } : {
        diamonds: (target.diamonds ?? 0) + Math.floor(totalPrice * 0.7),
      }),
    });
'@
if ($c.Contains($oldD)) { $c = $c.Replace($oldD, $newD) }

$oldR = @'
    // [ezo-trophy] Add to room weekly total
    await updateRoomWeekly(ctx, args.roomId, totalPrice);

    // [ezo-medals] Auto-grant medals for sender + receiver
'@
$newR = @'
    // [ezo-trophy] Add to room weekly total
    await updateRoomWeekly(ctx, args.roomId, totalPrice);

    // [ezo-fix H-4] شحن الصاروخ
    try {
      await ctx.scheduler.runAfter(0, internal.rockets.addEnergy, {
        roomId: args.roomId,
        fromUserId: user._id,
        amount: totalPrice,
      });
    } catch (e) { console.error("[rocket] addEnergy failed:", e); }

    // [ezo-medals] Auto-grant medals for sender + receiver
'@
if ($c.Contains($oldR)) { $c = $c.Replace($oldR, $newR) }
Set-Content $f -Value $c -Encoding UTF8
Write-Host "OK: gifts.ts"

# ═══════════════════════════════════════════════
# H-10: VipEntryOverlay.tsx (Dynamic Asset)
# ═══════════════════════════════════════════════
Write-Host "=== H-10: VipEntryOverlay.tsx ==="
$newVip = @'
import { useEffect, useState } from "react";
import SvgaPlayer from "./ui/SvgaPlayer";
import { haptic } from "../lib/haptics";
import { useAssets } from "../lib/assets";

interface Entry {
  _id: string;
  userId: string;
  level: number;
  name: string;
  avatarUrl?: string;
  createdAt: number;
}

export default function VipEntryOverlay({ entry }: { entry: Entry | null }) {
  const assets = useAssets();
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<Entry | null>(null);

  useEffect(() => {
    if (entry && (!active || entry._id !== active._id)) {
      setActive(entry);
      setVisible(true);
      haptic("heavy");
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [entry, active]);

  if (!visible || !active) return null;

  const assetUrl =
    assets[`vip.entry.${active.level}`] ??
    assets["vip.entry.3"] ??
    "https://res.cloudinary.com/wdicx984/raw/upload/v1792714809/ztvoqlnpvf7vuuwct3xa.svga";

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none bg-transparent">
      <SvgaPlayer src={assetUrl} className="w-full h-full" loops={0} autoPlay={true} />
    </div>
  );
}
'@
Set-Content "$root\src\components\VipEntryOverlay.tsx" -Value $newVip -Encoding UTF8
Write-Host "OK: VipEntryOverlay.tsx"

Write-Host "===================================="
Write-Host "  C-10 to C-12 + H-4 + H-10 COMPLETE"
Write-Host "===================================="