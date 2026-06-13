import { useEffect, useRef, useState, type RefObject } from 'react';

const BOTTOM_EPSILON_PX = 24;
const ACTIVE_TURN_ENTER_OFFSET_PX = 280;
const ACTIVE_TURN_EXIT_OFFSET_PX = 420;
const STATE_LOCK_MS = 420;

function getDistanceFromBottom(element: HTMLElement): number {
  return element.scrollHeight - element.scrollTop - element.clientHeight;
}

function getLatestGenerationTurn(element: HTMLElement): HTMLElement | null {
  const turns = element.querySelectorAll<HTMLElement>('.nova-generation-turn');
  return turns.length > 0 ? turns[turns.length - 1] ?? null : null;
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
      if (distance <= BOTTOM_EPSILON_PX) {
        if (compactRef.current) {
          compactRef.current = false;
          lockUntilRef.current = Date.now() + STATE_LOCK_MS;
          setIsCompact(false);
        }
        return;
      }

      const latestTurn = getLatestGenerationTurn(element);
      if (!latestTurn) {
        if (compactRef.current) {
          compactRef.current = false;
          lockUntilRef.current = Date.now() + STATE_LOCK_MS;
          setIsCompact(false);
        }
        return;
      }

      const containerRect = element.getBoundingClientRect();
      const latestTurnRect = latestTurn.getBoundingClientRect();
      const latestTurnBottomInContainer = latestTurnRect.bottom - containerRect.top;
      const enterThreshold = containerRect.height - ACTIVE_TURN_ENTER_OFFSET_PX;
      const exitThreshold = containerRect.height - ACTIVE_TURN_EXIT_OFFSET_PX;

      if (!compactRef.current && latestTurnBottomInContainer >= enterThreshold) {
        compactRef.current = true;
        lockUntilRef.current = Date.now() + STATE_LOCK_MS;
        setIsCompact(true);
        return;
      }

      if (compactRef.current && latestTurnBottomInContainer <= exitThreshold) {
        compactRef.current = false;
        lockUntilRef.current = Date.now() + STATE_LOCK_MS;
        setIsCompact(false);
      }
    };

    const onScroll = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(updateCompact);
    };

    const resizeObserver = new ResizeObserver(() => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(updateCompact);
    });

    updateCompact();
    element.addEventListener('scroll', onScroll, { passive: true });
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [enabled, locked, messagesRef]);

  return isCompact;
}
