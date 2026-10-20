// [ezo-nav] React hook for phone back button
import { useEffect, useRef } from "react";
import { pushBackHandler } from "../historyStack";

export function useBackButton(isActive: boolean, onClose: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;

  useEffect(() => {
    if (!isActive) return;
    return pushBackHandler(() => ref.current());
  }, [isActive]);
}
