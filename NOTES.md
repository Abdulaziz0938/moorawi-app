# NOTES — مشروع الدولة المعراوية (moorawi-app)

آخر تحديث: 2026-10-08
Owner ID: 1

## معلومات المشروع
- GitHub: https://github.com/Abdulaziz0938/moorawi-app.git
- Vercel: https://moorawi-app.vercel.app
- Convex Prod: https://quixotic-squid-253.convex.cloud
- Cloudinary: wdicx984 / preset: moorawi_unsigned

## التقنيات
React + Vite + TS + Tailwind v3 + Convex + Agora + Cloudinary + lucide-react

## الملفات الرئيسية
### Frontend (src/components/)
RoomView.tsx, MiniProfileSheet.tsx, ProfilePage.tsx, LeaderboardSheet.tsx,
MembersSheet.tsx, MemberRow.tsx, ActivitySheet.tsx, MicRequestsSheet.tsx,
SettingsSheet.tsx, GiftSheet.tsx, CompactChatInput.tsx, Onboarding.tsx,
RoomList.tsx, UserBadges.tsx (PvipBadge, VipBanner, AdminBadge, UserName)

### Frontend (src/lib/)
agora.ts, device.ts, cloudinary.ts, dialog.tsx

### Assets (public/)
- vip/vip1-7.png + pvip1-7.png
- badges/badge-super.png, badge-admin.png

### Backend (convex/)
schema.ts, gifts.ts, messages.ts, mics.ts, rooms.ts, users.ts, profiles.ts
lib/auth.ts, lib/vip.ts

## ما تم إنجازه (35 ميزة)
### الأساس (1-11)
تسجيل (Device ID) | Onboarding | صفحة الغرف | غرفة الصوت (Agora) |
نظام المايكات 1-24 | إدارة الغرفة | الدردشة | الهدايا | كومبو + نبضة |
بانرات 3 مستويات | Cloudinary

### الهدايا (12-15)
هدايا جماعية sendBatch | أنيميشن multiGiftFly | شلال waterfall |
عدّاد الكومبو الفعلي

### الشات (16-17)
فلترة since | UserName موحّد في 6 أماكن

### البروفايل (18-20)
MiniProfileSheet glass | ProfilePage كاملة | Avatar menu + preview

### الأدوار (21-25)
micRequests | كتم مزدوج | قائمة المايك | kick/ban/promote/demote/removeFromSeat |
ActivitySheet

### الشارات (26-30)
VIP 1-7 + Pvip 1-7 | Admin super/mod | Charm + Wealth capsules |
UserName موحّد | Owner ID = 1

### النظام (31-35)
dialog مخصص | MembersSheet | MemberRow موحّدة | TopBar 2-rows | badge-glow CSS

## المهام القادمة
### عاجل
1) استبدال الإيموجي بـ SVG (قاعدة 15)
   الاستثناء: 👑 في Leaderboard Podium
   المتبقي:
   - RoomView.tsx:1105 — 🎁 → Gift
   - SettingsSheet.tsx:425 — 🎁 → Gift
   - GiftSheet.tsx:327 — 🎁 → Gift
   - LeaderboardSheet.tsx:105 — 👑 (يبقى)
   - LeaderboardSheet.tsx:141 — 🏠 → Home
   - LeaderboardSheet.tsx:156 — ✨ → Sparkles
   - LeaderboardSheet.tsx:161 — 💎 → Gem
   - LeaderboardSheet.tsx:304 — 🏠 → Home
   - UserBadges.tsx:156 — ✨ → Sparkles
   - UserBadges.tsx:164 — 💎 → Gem
   - MemberRow.tsx:102 — ✨ → Sparkles
   - MemberRow.tsx:108 — 💎 → Gem

2) تفعيل الأزرار المتبقية في SettingsSheet
   - قفل الغرفة، موسيقى، الديكور، وظيفة، صرف
   - Quick Tools: دردشة موجزة، كتم صوت، عازل صوت، تشغيل الشاشة دوماً،
     مغير الصوت، تأثيرات هدية، تأثيرات مركبة، عملية خلفية

### متوسطة
3) Leaderboard جديد (عالمي)
4) Leaderboard تصنيف الساعات (schema + heartbeat)
5) Admin Panel (ID:1)
6) الأصدقاء + العائلات + الوكالة

## قواعد العمل (15)
1. أمر Termux واحد + شرح
2. تحقق قبل الانتقال
3. لا حذف/تعديل بدون سؤال
4. commit + push بعد كل مرحلة
5. Backend: npx convex dev --once + npx convex deploy (الاثنين)
6. انتظار Vercel ~دقيقة
7. أوامر واضحة للنسخ
8. imports: إدراج يدوي (لا regex)
9. عند تعديل Backend → check Frontend type
10. npx tsc -b --noEmit قبل كل push
11. قبل تعديل import block: نمط محدد (لا regex عام)
12. قبل استبدال دالة: تحقق من عدم وجود نسخ مكررة
13. لا نضيف أزرار — فعّل الموجود
14. قبل استبدال كتلة: اطبع 30 سطراً أولاً
15. لا إيموجي في UI — SVG من lucide-react أو PNG
    استثناء: 👑 في Leaderboard Podium

## أوامر أساسية
فحص TypeScript:
cd ~/moorawi-app && npx tsc -b --noEmit 2>&1 | head -20

Deploy Backend:
cd ~/moorawi-app && npx convex dev --once && npx convex deploy

Push Frontend:
cd ~/moorawi-app && git add . && git commit -m "..." && git push

Backup:
cd ~ && tar -czf moorawi-backup-$(date +%Y-%m-%d_%H-%M).tar.gz --exclude='node_modules' --exclude='.git' --exclude='dist' moorawi-app/
