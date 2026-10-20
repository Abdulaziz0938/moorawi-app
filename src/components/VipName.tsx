// [ezo-ui] VipName — اسم بتدرج لوني متحرك حسب مستوى VIP
import type { ReactNode } from "react";

interface Props {
  level: number;         // 0-7
  children: ReactNode;
  className?: string;
  animate?: boolean;     // تشغيل/إيقاف الحركة
}

/**
 * VipName يعرض الاسم بـ:
 * - VIP 0: لون عادي (لا تأثير)
 * - VIP 1-7: تدرج لوني متحرك + توهج خفيف
 *
 * في المستقبل يمكن استبدال التدرج بصورة من DB (assets)
 */
export default function VipName({ level, children, className = "", animate = true }: Props) {
  if (level < 1 || level > 7) {
    return <span className={className}>{children}</span>;
  }

  const gradientClass = `vip-gradient vip-gradient-${level}`;
  const animClass = animate ? "" : "[animation-play-state:paused]";

  return (
    <span
      className={`${gradientClass} ${animClass} ${className}`}
      style={{ display: "inline-block" }}
    >
      {children}
    </span>
  );
}
