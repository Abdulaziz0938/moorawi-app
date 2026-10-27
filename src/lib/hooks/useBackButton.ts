// [ezo-nav] React hook for phone back button
import { useEffect, useRef } from "react";
import { pushBackHandler } from "../historyStack";

export function useBackButton(isActive: boolean, onClose: () => void) {
  const ref = useRef(onClose);

  // [ezo-fix] تحديث الـ ref داخل useEffect وليس أثناء الريندر لمنع أخطاء React
  useEffect(() => {
    ref.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isActive) return;
    return pushBackHandler(() => ref.current());
  }, [isActive]);
}
