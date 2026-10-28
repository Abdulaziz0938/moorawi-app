import os
import re

# امتدادات الملفات المراد فحصها
EXTENSIONS = ('.tsx', '.ts', '.jsx', '.js', '.json', '.css', '.html')
# المجلدات التي يجب تجاهلها
IGNORE_DIRS = {'node_modules', '.next', '.git', 'dist', 'build'}

def fix_mojibake_chunk(match):
    chunk = match.group(0)
    try:
        # عكس عملية التشفير الخاطئة من cp1256 إلى utf-8
        return chunk.encode('cp1256').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        # إذا كان النص سليماً أصلاً، اتركه كما هو
        return chunk

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return False

    # التحقق من وجود نمط الطلاسم
    if not any(marker in content for marker in ('ط§', 'ظ„', 'ط¨', 'ظ†', 'â€', 'ðŸ')):
        return False

    # استهداف المقاطع غير اللاتينية لإصلاح المعطوب منها فقط بأمان
    fixed_content = re.sub(r'[^\x00-\x7F]+', fix_mojibake_chunk, content)

    if fixed_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        return True
    return False

fixed_count = 0
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
    for file in files:
        if file.endswith(EXTENSIONS):
            full_path = os.path.join(root, file)
            if process_file(full_path):
                print(f"✅ تم إصلاح: {full_path}")
                fixed_count += 1

print(f"\n🎉 اكتملت العملية! تم إنقاذ {fixed_count} ملف بنجاح.")