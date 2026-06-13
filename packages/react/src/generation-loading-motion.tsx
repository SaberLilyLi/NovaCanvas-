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

function pickBetween(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

const DIRECTIONS = ['normal', 'reverse', 'alternate', 'alternate-reverse'] as const;
const TIMING_FUNCTIONS = [
  'ease-in-out',
  'ease',
  'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
  'cubic-bezier(0.22, 1, 0.36, 1)',
  'cubic-bezier(0.64, 0, 0.36, 1)',
] as const;

function generateBlobKeyframes(name: string, random: () => number): string {
  const stepCount = 4 + Math.floor(random() * 5);
  const frames: string[] = [];

  for (let index = 0; index < stepCount; index += 1) {
    const progress = stepCount === 1 ? 0 : (index / (stepCount - 1)) * 100;
    const translateX = pickBetween(random, -42, 42);
    const translateY = pickBetween(random, -38, 38);
    const scale = pickBetween(random, 0.78, 1.28);
    const rotate = pickBetween(random, -28, 28);
    const opacity = pickBetween(random, 0.28, 0.96);

    frames.push(
      `${progress.toFixed(1)}% { opacity: ${opacity.toFixed(3)}; transform: translate3d(${translateX.toFixed(2)}%, ${translateY.toFixed(2)}%, 0) scale(${scale.toFixed(3)}) rotate(${rotate.toFixed(2)}deg); }`,
    );
  }

  return `@keyframes ${name} { ${frames.join(' ')} }`;
}

function generateFlickerKeyframes(name: string, random: () => number): string {
  const stepCount = 5 + Math.floor(random() * 4);
  const frames: string[] = [];

  for (let index = 0; index < stepCount; index += 1) {
    const progress = stepCount === 1 ? 0 : (index / (stepCount - 1)) * 100;
    const opacity = pickBetween(random, 0.08, 0.55);
    const blur = pickBetween(random, 18, 42);
    const scale = pickBetween(random, 0.92, 1.18);

    frames.push(
      `${progress.toFixed(1)}% { opacity: ${opacity.toFixed(3)}; filter: blur(${blur.toFixed(1)}px); transform: scale(${scale.toFixed(3)}); }`,
    );
  }

  return `@keyframes ${name} { ${frames.join(' ')} }`;
}

interface MotionBlob {
  key: string;
  animationName: string;
  duration: number;
  delay: number;
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  timingFunction: string;
  style: CSSProperties;
}

interface MotionDefinition {
  scopeId: string;
  stylesheet: string;
  containerStyle: CSSProperties;
  blobs: MotionBlob[];
  flicker?: {
    animationName: string;
    duration: number;
    delay: number;
    style: CSSProperties;
  };
}

function buildMotionDefinition(seed: string): MotionDefinition {
  const random = createSeededRandom(seed);
  const scopeId = `nova-motion-${hashSeed(seed).toString(36)}`;
  const blobCount = 4 + Math.floor(random() * 4);
  const keyframes: string[] = [];
  const blobs: MotionBlob[] = [];

  const hueBase = pickBetween(random, 188, 228);
  const hueSpread = pickBetween(random, 18, 42);
  const satBase = pickBetween(random, 58, 82);
  const lightBase = pickBetween(random, 72, 88);

  for (let index = 0; index < blobCount; index += 1) {
    const animationName = `${scopeId}-blob-${index}`;
    keyframes.push(generateBlobKeyframes(animationName, random));

    const hue = hueBase + pickBetween(random, -hueSpread, hueSpread);
    const saturation = satBase + pickBetween(random, -16, 12);
    const lightness = lightBase + pickBetween(random, -14, 8);
    const alpha = pickBetween(random, 0.34, 0.88);

    blobs.push({
      key: animationName,
      animationName,
      duration: pickBetween(random, 2.6, 9.4),
      delay: -pickBetween(random, 0.4, 11.5),
      direction: DIRECTIONS[Math.floor(random() * DIRECTIONS.length)] ?? 'alternate',
      timingFunction:
        TIMING_FUNCTIONS[Math.floor(random() * TIMING_FUNCTIONS.length)] ?? 'ease-in-out',
      style: {
        top: `${pickBetween(random, -28, 58).toFixed(2)}%`,
        left: `${pickBetween(random, -24, 62).toFixed(2)}%`,
        width: `${pickBetween(random, 34, 78).toFixed(2)}%`,
        height: `${pickBetween(random, 32, 82).toFixed(2)}%`,
        borderRadius: `${pickBetween(random, 28, 68).toFixed(2)}%`,
        filter: `blur(${pickBetween(random, 14, 36).toFixed(1)}px)`,
        background: `radial-gradient(circle at ${pickBetween(random, 18, 82).toFixed(1)}% ${pickBetween(random, 12, 88).toFixed(1)}%, hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${lightness.toFixed(1)}%, ${alpha.toFixed(3)}) 0%, transparent ${pickBetween(random, 58, 78).toFixed(1)}%)`,
      },
    });
  }

  const flickerName = `${scopeId}-flicker`;
  keyframes.push(generateFlickerKeyframes(flickerName, random));

  const bgHueA = hueBase + pickBetween(random, -10, 8);
  const bgHueB = hueBase + pickBetween(random, -18, 16);
  const bgHueC = hueBase + pickBetween(random, -24, 22);

  return {
    scopeId,
    stylesheet: keyframes.join('\n'),
    containerStyle: {
      background: [
        `radial-gradient(circle at ${pickBetween(random, 8, 92).toFixed(1)}% ${pickBetween(random, 6, 94).toFixed(1)}%, hsl(${bgHueA.toFixed(1)}, ${pickBetween(random, 52, 74).toFixed(1)}%, ${pickBetween(random, 78, 92).toFixed(1)}%) 0%, transparent ${pickBetween(random, 42, 68).toFixed(1)}%)`,
        `radial-gradient(circle at ${pickBetween(random, 4, 96).toFixed(1)}% ${pickBetween(random, 8, 92).toFixed(1)}%, hsl(${bgHueB.toFixed(1)}, ${pickBetween(random, 48, 70).toFixed(1)}%, ${pickBetween(random, 70, 86).toFixed(1)}%) 0%, transparent ${pickBetween(random, 46, 72).toFixed(1)}%)`,
        `linear-gradient(${pickBetween(random, 108, 156).toFixed(1)}deg, hsl(${bgHueC.toFixed(1)}, ${pickBetween(random, 44, 68).toFixed(1)}%, ${pickBetween(random, 74, 88).toFixed(1)}%) 0%, hsl(${bgHueA.toFixed(1)}, ${pickBetween(random, 40, 62).toFixed(1)}%, ${pickBetween(random, 68, 82).toFixed(1)}%) 52%, hsl(${bgHueB.toFixed(1)}, ${pickBetween(random, 46, 66).toFixed(1)}%, ${pickBetween(random, 72, 86).toFixed(1)}%) 100%)`,
      ].join(', '),
    },
    blobs,
    flicker: {
      animationName: flickerName,
      duration: pickBetween(random, 3.8, 11.2),
      delay: -pickBetween(random, 0.8, 9.6),
      style: {
        top: `${pickBetween(random, -18, 36).toFixed(2)}%`,
        left: `${pickBetween(random, -16, 48).toFixed(2)}%`,
        width: `${pickBetween(random, 48, 96).toFixed(2)}%`,
        height: `${pickBetween(random, 42, 92).toFixed(2)}%`,
        borderRadius: `${pickBetween(random, 24, 72).toFixed(2)}%`,
        background: `radial-gradient(circle at ${pickBetween(random, 20, 80).toFixed(1)}% ${pickBetween(random, 18, 82).toFixed(1)}%, hsla(${pickBetween(random, 180, 240).toFixed(1)}, ${pickBetween(random, 36, 72).toFixed(1)}%, ${pickBetween(random, 82, 98).toFixed(1)}%, ${pickBetween(random, 0.12, 0.42).toFixed(3)}) 0%, transparent 72%)`,
      },
    },
  };
}

export interface GenerationLoadingMotionProps {
  seed: string;
  className?: string;
}

export function GenerationLoadingMotion(props: GenerationLoadingMotionProps) {
  const motion = useMemo(() => buildMotionDefinition(props.seed), [props.seed]);
  const className = ['nova-generation-loading-motion', props.className]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <style>{motion.stylesheet}</style>
      <div className={className} style={motion.containerStyle} aria-hidden>
        {motion.blobs.map((blob) => (
          <span
            key={blob.key}
            className="nova-generation-loading-motion__blob"
            style={{
              ...blob.style,
              animation: `${blob.animationName} ${blob.duration.toFixed(2)}s ${blob.timingFunction} ${blob.delay.toFixed(2)}s infinite ${blob.direction}`,
            }}
          />
        ))}
        {motion.flicker ? (
          <span
            className="nova-generation-loading-motion__flicker"
            style={{
              ...motion.flicker.style,
              animation: `${motion.flicker.animationName} ${motion.flicker.duration.toFixed(2)}s ease-in-out ${motion.flicker.delay.toFixed(2)}s infinite alternate`,
            }}
          />
        ) : null}
      </div>
    </>
  );
}
