"use client";
import {useEffect, useRef, type RefObject} from 'react';
import {attachStudioDialogHistory} from '@/lib/studio-dialog-history';

export function useStudioDialogHistory(element: RefObject<HTMLElement | null>, onBack: () => void, enabled = true, blocked = false) {
  const latest = useRef({onBack, blocked});
  useEffect(() => {latest.current = {onBack, blocked};}, [onBack, blocked]);
  useEffect(() => {
    if (!enabled || !element.current?.closest('.showroom')) return;
    return attachStudioDialogHistory(window, () => latest.current.onBack(), () => latest.current.blocked);
  }, [element, enabled]);
}
