import { useEffect, useRef, useState } from 'react';

const DEFAULT_EXPECTED_DURATION_MS = 5 * 60 * 1000;
const SEEDREAM_EXPECTED_DURATION_MS = 10 * 1000;
const IMAGE2_EXPECTED_DURATION_MS = 3 * 60 * 1000;
const FINISH_DURATION_MS = 3 * 1000;
const MAX_RUNNING_PROGRESS = 99;

export function formatGenerationProgressLabel(progress: number): string {
  if (progress > 0) return `${progress}%造梦中`;
  return '0%造梦中';
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function useFakeGenerationProgress(
  batchKey: string,
  isComplete: boolean,
  enabled: boolean,
  generationModel?: string,
) {
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef(Date.now());
  const finishStartRef = useRef<{ at: number; from: number } | null>(null);
  const progressRef = useRef(0);
  const frameRef = useRef<number>();
  const bumpTimerRef = useRef<number>();
  const expectedDurationMsRef = useRef(DEFAULT_EXPECTED_DURATION_MS);

  useEffect(() => {
    const normalizedModel = generationModel?.trim().toLowerCase() ?? '';

    if (normalizedModel.includes('seedream')) {
      expectedDurationMsRef.current = SEEDREAM_EXPECTED_DURATION_MS;
      return;
    }

    if (normalizedModel.includes('image-2') || normalizedModel.includes('gpt-image-2')) {
      expectedDurationMsRef.current = IMAGE2_EXPECTED_DURATION_MS;
      return;
    }

    expectedDurationMsRef.current = DEFAULT_EXPECTED_DURATION_MS;
  }, [generationModel]);

  useEffect(() => {
    startedAtRef.current = Date.now();
    finishStartRef.current = null;
    progressRef.current = 0;
    setProgress(0);
  }, [batchKey]);

  useEffect(() => {
    const clearTimers = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (bumpTimerRef.current) window.clearTimeout(bumpTimerRef.current);
    };

    if (!enabled) {
      clearTimers();
      return;
    }

    if (isComplete) {
      const tickFinish = () => {
        const now = Date.now();

        if (!finishStartRef.current) {
          finishStartRef.current = {
            at: now,
            from: progressRef.current,
          };
        }

        const { at, from } = finishStartRef.current;
        const ratio = Math.min(1, (now - at) / FINISH_DURATION_MS);
        const next = Math.min(100, Math.round(from + (100 - from) * ratio));
        progressRef.current = next;
        setProgress(next);

        if (ratio < 1) {
          frameRef.current = requestAnimationFrame(tickFinish);
        }
      };

      frameRef.current = requestAnimationFrame(tickFinish);
      return clearTimers;
    }

    const scheduleRandomBump = () => {
      const delay = randomBetween(1200, 5500);
      bumpTimerRef.current = window.setTimeout(() => {
        const elapsed = Date.now() - startedAtRef.current;
        const expectedDurationMs = expectedDurationMsRef.current;
        const timeRatio = Math.min(1, elapsed / expectedDurationMs);
        const expectedCeiling = Math.min(
          MAX_RUNNING_PROGRESS,
          Math.round(timeRatio * MAX_RUNNING_PROGRESS + randomBetween(0, 6)),
        );
        const bump = Math.round(randomBetween(1, 8));
        const monotonic = Math.min(
          MAX_RUNNING_PROGRESS,
          Math.max(progressRef.current, Math.min(expectedCeiling, progressRef.current + bump)),
        );

        progressRef.current = monotonic;
        setProgress(monotonic);

        if (monotonic < MAX_RUNNING_PROGRESS && elapsed < expectedDurationMs) {
          scheduleRandomBump();
        }
      }, delay);
    };

    scheduleRandomBump();
    return clearTimers;
  }, [batchKey, enabled, isComplete]);

  const revealImage = isComplete && progress >= 100;

  return { progress, revealImage };
}
