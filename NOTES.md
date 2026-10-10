# NOTES — مشروع الدولة المعراوية (moorawi-app)

آخر تحديث: 2026-10-10
Owner ID: 1 (username: abdulaziz0938)

## معلومات المشروع
- GitHub: https://github.com/Abdulaziz0938/moorawi-app.git
- Vercel: https://moorawi-app.vercel.app
- Convex Prod: https://quixotic-squid-253.convex.cloud
- Cloudinary: wdicx984 / preset: moorawi_unsigned

## التقنيات
React + Vite + TS + Tailwind v3 + Convex + Agora + Cloudinary + lucide-react

## ✅ ما تم إنجازه (جلسة 2026-10-10)

### Auth + Onboarding
- Custom Auth (signup/signin/guest) + session tokens
- Owner account (abdulaziz0938 / ID:1)

### Levels + Badges (النظام الأساسي)
- `src/lib/levels.ts` — Lookup Table 0-100 (×3.5 growth, Lv.100 = 4B)
- `src/lib/levelBadges.ts` — 11 tiers للجاذبية + الثراء
- `src/components/LevelBadge.tsx` — Pill [N] + Heart/Gem (دعم صور مستقبلية)
- `src/components/UserBadges.tsx` — UserName v2 (Conditional rendering)
- `src/components/MedalsRow.tsx` — صف الأوسمة

### Economy
- `convex/wallet.ts` — balance/spend/reward/recharge/exchangeDiamonds
- `convex/shop.ts` — buyItem/sendItem/equipItem
- `convex/seedShop.ts` — 51 منتج
- `src/components/WalletSheet.tsx` — محفظة كاملة
- `src/components/ShopSheet.tsx` — متجر 6 تصنيفات

### Social
- `convex/follows.ts` — toggle + counters
- `convex/visits.ts` — record + recent

### Profile (مُعاد بناؤه بالكامل)
- `convex/profileFull.getFull` — Single Source of Truth
- `src/components/MiniProfileSheet.tsx` — Avatar/الاسم/ID(copy)/chips/badges/bio/stats/medals/property/actions
- `src/components/ProfilePage.tsx` — نفس + غرفتي + 4 Tabs (معلومات/الأصول/العلاقة/لحظات)

### Room Enhancements
- `convex/rooms.weeklyTotal` — كأس الروم (Lazy reset كل أسبوع)
- `convex/rewards.ts` — مكافآت (1M→10K, 3M→30K, 6M→60K + VIP)
- `convex/rooms.getStaffPermissions` + `updateStaffPermissions`
- `src/components/RoomInfoSheet.tsx` — بطاقة الغرفة
- `src/components/StaffSettingsSheet.tsx` — 3 tabs (قائمة/أذونات/سجلات)
- `convex/rooms.roomNumber` — رقم تسلسلي (يبدأ 10000)

### Admin
- `convex/adminPanel.ts` — listUsers/updateUser/grantCoins/updateShopItem
- `src/components/AdminPanelSheet.tsx` — لوحة المالك

### Medals (Auto-grant)
- `convex/medals.ts` — 38 وسم (6 tiers)
- `checkAndGrantMedals` — إسناد تلقائي عند الهدايا

### Fixes
- `gifts.send` = 1:1 Poppo (charms += totalPrice)
- Chat names clickable → MiniProfile
- TopBar owner avatar → RoomInfoSheet
- RoomView owner.userId (fix crash)

## 🚧 المهام القادمة

### 🔥 عاجل
1. **VIP System** — vipLevel لا يعرض (فحص DB + زر شراء + عرض 7 مستويات)
2. **ProfilePage Tabs مكتملة:**
   - معلومات: صور الحياة (9 صور) + أفضل داعم
   - الأصول: هدايا/أوسمة/إطارات/مركبات (من inventory)
   - العلاقة: CP + أخ/أخت/صديق
   - لحظات: منشورات

### متوسطة
3. العلاقات (CP) — طلب + قبول
4. المهام اليومية + 7 أيام
5. الزيارات الأخيرة (تتبع + عرض)
6. المصادقة (رفع صورة)

### مؤجل
- الوكالة + المضيف + الأسطورة
- VIP خاصة بالداعمين
- الصور الحقيقية للأصول

## 📋 قواعد العمل
1. أمر Termux واحد + شرح
2. تحقق قبل الانتقال
3. commit + push بعد كل مرحلة
4. Backend: convex dev --once + convex deploy
5. tsc -b --noEmit قبل push
6. imports يدوي (لا regex)
7. قبل الاستبدال: اطبع 30 سطر
8. لا إيموجي في UI (استثناء 👑 Podium)
9. dialog.confirm/alert (لا native)
10. Single Source of Truth (profileFull + UserName)

## Schema (28 جدول)
users, counters, rooms, roomMembers, micSeats, messages, micInvites,
micRequests, roomActions, gifts, giftTransactions, auditLogs,
walletTransactions, shopItems, userInventory, vipSubscriptions,
medals, userMedals, relationships, relationshipRequests, follows,
visits, missions, userMissions, verificationRequests, roomWeeklyRewards

## 🔧 أوامر أساسية
فحص: cd ~/moorawi-app && npx tsc -b --noEmit 2>&1 | head -20
Deploy: npx convex dev --once && npx convex deploy
Push: git add . && git commit -m "..." && git push
Backup: cd ~ && tar -czf moorawi-backup-$(date +%Y-%m-%d_%H-%M).tar.gz --exclude='node_modules' --exclude='.git' --exclude='dist' moorawi-app/
