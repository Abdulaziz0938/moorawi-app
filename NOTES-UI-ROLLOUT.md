# Ezo UI Design Rollout — ملخص

## التاريخ
2026-10-13

## النطاق
تطبيق موحد لمكونات UI على 13 شاشة رئيسية.

## Components الموحدة
- Card (6 tones: default/purple/gold/emerald/pink/danger)
- StatBadge (6 tones: default/gold/purple/emerald/pink/blue)
- SectionTitle (5 tones: default/gold/purple/emerald/pink)
- RankBadge
- MedalBadge
- VipAvatar

## الشاشات المحدّثة
ProfilePage, WalletSheet, SettingsSheet, MeTab, DiscoverTab,
RoomsTab, MessagesTab, MomentsTab, MyHostView, RoomSearchScreen,
AgencyEntryScreen, AgencyOverviewView, AuthScreen.

## الشاشات المتجاوزة (بذكاء)
- RoomView: animations/gaming — لا يحتاج Card
- MedalsSheet: يستخدم MedalBadge مسبقاً

## الدروس التقنية
1. تجنب str.replace مع نص عربي داخل heredoc (bidi issues)
2. استخدم re.subn مع [ \t]* للمسافات البادئة
3. استخدم .*? + DOTALL للنص العربي
4. wrapper <button> حول StatBadge لحفظ onClick
5. Wrapper div عند تحويل button→Card إذا كان فيه gradient

## Commit List
e714b5c, 40a23a3, 3570d42, 9f4ed2b, 541f78e, d81eb04,
0cb6aa3, 5548489, f9dc092, f29c440, 1e840e0, 99c7671,
23c779f, 499191f
