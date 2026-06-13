import { useEffect, useRef, useState, type RefObject } from 'react';

const COMPACT_ENTER_PX = 72;
const COMPACT_EXIT_PX = 20;
const STATE_LOCK_MS = 420;

function getDistanceFromBottom(element: HTMLElement): number {
  return element.scrollHeight - element.scrollTop - element.clientHeight;
}

export function useComposerCompact(
  messagesRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  locked = false,
): boolean {
  const [isCompact, setIsCompact] = useState(false);
  const compactRef = useRef(false);
  const lockUntilRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!enabled) {
      compactRef.current = false;
      setIsCompact(false);
      return;
    }

    const element = messagesRef.current;
    if (!element) return;

    const updateCompact = () => {
      if (locked || Date.now() < lockUntilRef.current) return;

      const distance = getDistanceFromBottom(element);
      if (!compactRef.current && distance > COMPACT_ENTER_PX) {
        compactRef.current = true;
        lockUntilRef.current = Date.now() + STATE_LOCK_MS;
        setIsCompact(true);
        return;
      }
      if (compactRef.current && distance < COMPACT_EXIT_PX) {
        compactRef.current = false;
        lockUntilRef.current = Date.now() + STATE_LOCK_MS;
        setIsCompact(false);
      }
    };

    const onScroll = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(updateCompact);
    };

    updateCompact();
    element.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', onScroll);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [enabled, locked, messagesRef]);

  return isCompact;
}
