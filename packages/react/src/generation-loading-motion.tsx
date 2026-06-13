import { useMemo, type CSSProperties } from 'react';

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: string) {
  let state = hashSeed(seed) || 1;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export interface LoadingMotionStyle extends CSSProperties {
  '--motion-d1': string;
  '--motion-d2': string;
  '--motion-d3': string;
  '--motion-delay1': string;
  '--motion-delay2': string;
  '--motion-delay3': string;
}

export function useLoadingMotionStyle(seed: string): LoadingMotionStyle {
  return useMemo(() => {
    const random = createSeededRandom(seed);

    return {
      '--motion-d1': `${2.4 + random() * 2.8}s`,
      '--motion-d2': `${3.2 + random() * 3.4}s`,
      '--motion-d3': `${3.6 + random() * 3}s`,
      '--motion-delay1': `${-(random() * 7).toFixed(2)}s`,
      '--motion-delay2': `${-(random() * 8).toFixed(2)}s`,
      '--motion-delay3': `${-(random() * 6).toFixed(2)}s`,
    } as LoadingMotionStyle;
  }, [seed]);
}

export interface GenerationLoadingMotionProps {
  seed: string;
  className?: string;
}

export function GenerationLoadingMotion(props: GenerationLoadingMotionProps) {
  const motionStyle = useLoadingMotionStyle(props.seed);
  const className = ['nova-generation-loading-motion', props.className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} style={motionStyle} aria-hidden>
      <span className="nova-generation-loading-motion__layer nova-generation-loading-motion__layer--1" />
      <span className="nova-generation-loading-motion__layer nova-generation-loading-motion__layer--2" />
      <span className="nova-generation-loading-motion__layer nova-generation-loading-motion__layer--3" />
      <span className="nova-generation-loading-motion__grain" />
      <span className="nova-generation-loading-motion__sweep" />
    </div>
  );
}
