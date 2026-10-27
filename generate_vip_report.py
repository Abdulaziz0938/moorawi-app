import os, re, json, subprocess

print("="*70)
print("📊 التقرير الهندسي الشامل لنظام VIP في Ezo Group")
print("="*70)

# 1. جلب الأصول
print("\n🔷 القسم 1: الأصول المخزنة في قاعدة البيانات (assets)")
print("-" * 70)
try:
    out = subprocess.check_output("npx convex run assets:list --prod 2>/dev/null", shell=True).decode('utf-8')
    assets = json.loads(out)
    vip_assets = [a for a in assets if a['key'].startswith('vip.')]
    
    categories = {}
    for a in vip_assets:
        cat = a['key'].split('.')[1] if '.' in a['key'] else 'other'
        if cat not in categories: categories[cat] = []
        categories[cat].append(a)
    
    for cat, items in sorted(categories.items()):
        print(f"  📁 فئة: {cat.upper()} ({len(items)} أصل)")
        for it in sorted(items, key=lambda x: x['key']):
            url = it.get('imageUrl', '')
            # تحديد النوع
            ext = '?'
            if '.svga' in url: ext = 'SVGA'
            elif '.pag' in url: ext = 'PAG'
            elif '.webp' in url: ext = 'WebP'
            elif '.png' in url or '.jpg' in url: ext = 'صورة'
            print(f"     • {it['key']:35s} [{ext}]")
        print()
except Exception as e:
    print(f"  ❌ خطأ: {e}")

# 2. مستويات VIP
print("\n🔷 القسم 2: مستويات VIP (كيف يرتقي المستخدم؟)")
print("-" * 70)
with open('convex/vip.ts', 'r') as f:
    code = f.read()

# استخراج الشروط
match = re.search(r'VIP_TIERS\s*=\s*\[(.*?)\];', code, re.DOTALL)
if match:
    print("  شروط الترقية:")
    lines = match.group(1).strip().split('\n')
    for line in lines:
        if 'minCoins' in line:
            print(f"    {line.strip()}")
else:
    # البحث في calculateEzoVipLevel
    match = re.search(r'function calculateEzoVipLevel.*?\n\}', code, re.DOTALL)
    if match:
        print(match.group(0)[:500])

# 3. كيف يظهر VIP في الشاشات
print("\n🔷 القسم 3: الأصول وكيف تُستخدم في الشاشات")
print("-" * 70)
screens = {
    'src/components/ProfilePage.tsx': 'البروفايل',
    'src/components/MiniProfileSheet.tsx': 'الميني بروفايل',
    'src/components/RoomView.tsx': 'الغرفة الصوتية',
    'src/components/VipEntryOverlay.tsx': 'شريط الدخول',
    'src/components/ui/VipAvatar.tsx': 'الإطار حول الأفاتار',
    'src/components/ui/VipTopOrnament.tsx': 'الزخرفة (شريط V)',
    'src/components/VipName.tsx': 'اسم VIP'
}

for path, name in screens.items():
    if not os.path.exists(path): continue
    print(f"\n  📱 {name} ({path}):")
    with open(path, 'r') as f:
        code = f.read()
    
    # البحث عن أي مفتاح vip.
    matches = re.findall(r'vip\.[a-zA-Z0-9_.${}]+', code)
    unique_keys = set([m for m in matches if '${' not in m])
    dynamic_keys = [m for m in matches if '${' in m]
    
    if unique_keys:
        for k in sorted(unique_keys):
            print(f"     • مفتاح ثابت: {k}")
    if dynamic_keys:
        for k in sorted(set(dynamic_keys)):
            print(f"     • مفتاح ديناميكي: {k}")
    if not unique_keys and not dynamic_keys:
        print("     (لا يستخدم مفاتيح vip. مباشرة)")

# 4. كيف يرتقي المستخدم
print("\n🔷 القسم 4: آلية الترقية التلقائية")
print("-" * 70)
with open('convex/wallet.ts', 'r') as f:
    code = f.read()
    if 'calculateEzoVipLevel' in code:
        print("  ✅ يتم الترقية عند الشحن (wallet.ts)")
    else:
        print("  ❌ لا يتم الترقية عند الشحن")

with open('convex/agents.ts', 'r') as f:
    code = f.read()
    if 'calculateEzoVipLevel' in code:
        print("  ✅ يتم الترقية عند شحن الوكيل (agents.ts)")
    else:
        print("  ❌ لا يتم الترقية عند شحن الوكيل")

with open('convex/adminPanel.ts', 'r') as f:
    code = f.read()
    if 'calculateEzoVipLevel' in code:
        print("  ✅ يتم الترقية عند منح الأدمن (adminPanel.ts)")
    else:
        print("  ❌ لا يتم الترقية عند منح الأدمن")

# 5. الميزات (Benefits)
print("\n🔷 القسم 5: ميزات VIP")
print("-" * 70)
with open('convex/vip.ts', 'r') as f:
    code = f.read()
    # البحث عن أي مصفوفة benefits
    match = re.search(r'const (?:BENEFITS|DEFAULT_BENEFITS)\s*=\s*\[(.*?)\];', code, re.DOTALL)
    if match:
        print(match.group(1)[:800])
    else:
        print("  (لا توجد مصفوفة benefits ثابتة. تحقق من seedBenefits)")

# 6. الجدول (Schema)
print("\n🔷 القسم 6: حقول VIP في قاعدة البيانات")
print("-" * 70)
with open('convex/schema.ts', 'r') as f:
    code = f.read()
    # البحث عن جدول users
    match = re.search(r'users:\s*defineTable\(\{(.*?)\}\)', code, re.DOTALL)
    if match:
        users_fields = match.group(1)
        vip_fields = [line.strip() for line in users_fields.split('\n') if 'vip' in line.lower() or 'recharged' in line.lower()]
        print("  حقول في users:")
        for f in vip_fields:
            print(f"    • {f}")
    
    # البحث عن جدول vipBenefits
    if 'vipBenefits' in code:
        match = re.search(r'vipBenefits:\s*defineTable\(\{(.*?)\}\)', code, re.DOTALL)
        if match:
            print("\n  جدول vipBenefits:")
            print(f"    {match.group(1)[:200]}")

print("\n" + "="*70)
print("✅ انتهى التقرير")
print("="*70)
