# NOTES — مشروع الدولة المعراوية (moorawi-app)

آخر تحديث: 2026-10-09
Owner ID: 1 (username: abdulaziz0938)

## معلومات المشروع
- GitHub: https://github.com/Abdulaziz0938/moorawi-app.git
- Vercel: https://moorawi-app.vercel.app
- Convex Prod: https://quixotic-squid-253.convex.cloud
- Cloudinary: wdicx984 / preset: moorawi_unsigned

## التقنيات
React + Vite + TS + Tailwind v3 + Convex + Agora + Cloudinary + lucide-react

## ✅ ما تم إنجازه (مكتمل)

### الأساس
- تسجيل/دخول (Custom Auth) + Onboarding + Dashboard 5 تبويبات
- غرف صوتية (Agora) + مايكات + رتب (owner/mod/speaker/listener)
- هدايا جماعية + waterfall + كومبو
- Leaderboard + Podium

### النظام الجديد (Economy + Shop)
- **25 جدول** في Schema (wallet, shop, vip, medals, relations, ...)
- **wallet.ts**: balance / spend / reward / recharge / exchangeDiamonds
- **shop.ts**: listByCategory / buyItem / sendItem / equipItem / unequipItem
- **seedShop.ts**: 51 منتج (14 frames, 11 vehicles, 8 effects, 7 bubbles, 8 waves, 3 cards)
- **WalletSheet.tsx**: محفظة كاملة (رصيد + شحن 7 باقات + استبدال ماس + سجل)
- **ShopSheet.tsx**: 6 تصنيفات + شراء/تفعيل (أيقونات lucide مؤقتاً)
- **ServicesSection.tsx**: 10 أزرار + 7 قائمة سفلية

### Branding
- الاسم الصحيح: **الدولة المعراوية** (نسبة لمعرة النعمان)

## 🚧 المهام القادمة

### أولوية عالية
1. **Admin Panel** — لوحة للمالك (ID:1) لتعديل المستخدمين
2. **الأوسمة** — 6 رتب (C/B/A/S/SS/SSS) + تصنيفات
3. **المستوى + مكافآت** — Progress 0-139 + rewards
4. **العلاقات (CP)** — CP + أخ/أخت/صديق + طلبات

### متوسطة
5. **VIP** — 7 مستويات + 33 ميزة
6. **الزيارات الأخيرة** — تتبع زوار البروفايل/الغرفة
7. **المهام** — يومية + دخول 7 أيام
8. **المصادقة** — رفع صورة حقيقية
9. **الملكة (CP)** — 3 مستويات

### مؤجل
- الوكالة + المضيف + الأسطورة
- VIP خاصة بالداعمين
- اللحظات + اكتشاف
- الرسائل + الإشعارات
- **الصور الحقيقية** (Frames/Vehicles/...) — عند توفرها

## 📋 قواعد العمل
1. أمر Termux واحد + شرح
2. تحقق قبل الانتقال
3. لا حذف بدون سؤال
4. commit + push بعد كل مرحلة
5. Backend: npx convex dev --once + npx convex deploy
6. npx tsc -b --noEmit قبل push
7. imports: إدراج يدوي
8. لا regex عام على import block
9. قبل استبدال كتلة: اطبع 30 سطراً
10. **لا إيموجي في UI** (lucide-react أو PNG)
11. **dialog.confirm/alert** دائماً (لا native)
12. **CapsuleBadge** في كل مكان فيه اسم

## 🔧 أوامر أساسية
- فحص: `cd ~/moorawi-app && npx tsc -b --noEmit 2>&1 | head -20`
- Deploy: `npx convex dev --once && npx convex deploy`
- Push: `git add . && git commit -m "..." && git push`

## 📊 Schema الحالي (25 جدول)
users, counters, rooms, roomMembers, micSeats, messages, micInvites,
micRequests, roomActions, gifts, giftTransactions, auditLogs,
walletTransactions, shopItems, userInventory, vipSubscriptions,
medals, userMedals, relationships, relationshipRequests, follows,
visits, missions, userMissions, verificationRequests
