import React, { useRef, useState } from 'react';
import { TouchDir } from '../game/Input';

interface TouchControlsProps {
  /** Held directions (same as the arrow keys) */
  onDirs: (dirs: TouchDir[]) => void;
  /** Big button = Space bar */
  onAttack: (held: boolean) => void;
  /** overlay = translucent on top of the game (play mode), panel = under the game */
  variant: 'overlay' | 'panel';
}

const vibrate = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
};

/**
 * Simplest possible mobile controls, identical to the keyboard:
 *  - left thumb: direction cross (slide your thumb, it follows — never gets stuck)
 *  - right thumb: one big FRAPPE button (= Space)
 */
export const TouchControls: React.FC<TouchControlsProps> = ({ onDirs, onAttack, variant }) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const padPointer = useRef<number | null>(null);
  const dirsRef = useRef<string>('');
  const [dirs, setDirs] = useState<TouchDir[]>([]);
  const [attackHeld, setAttackHeld] = useState(false);

  const setPadDirs = (next: TouchDir[]) => {
    const key = next.join();
    if (key === dirsRef.current) return;
    dirsRef.current = key;
    if (next.length) vibrate(10);
    setDirs(next);
    onDirs(next);
  };

  const updatePad = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (clientY - (r.top + r.height / 2)) / (r.height / 2);
    const next: TouchDir[] = [];
    if (Math.hypot(dx, dy) > 0.2) {
      const t = 0.4; // allows diagonals (e.g. up + forward)
      if (dx < -t) next.push('arrowleft');
      if (dx > t) next.push('arrowright');
      if (dy < -t) next.push('arrowup');
      if (dy > t) next.push('arrowdown');
    }
    setPadDirs(next);
  };

  const releasePad = () => {
    padPointer.current = null;
    setPadDirs([]);
  };

  const attack = (held: boolean) => {
    if (held) vibrate(25);
    setAttackHeld(held);
    onAttack(held);
  };

  const isOverlay = variant === 'overlay';
  const has = (d: TouchDir) => dirs.includes(d);
  const arm = (on: boolean) =>
    `absolute flex items-center justify-center text-2xl font-black rounded-xl pointer-events-none ${
      on
        ? 'bg-amber-500 text-stone-950'
        : isOverlay
        ? 'bg-white/20 text-white/80 border border-white/30'
        : 'bg-stone-800 text-stone-200 border border-stone-700'
    }`;

  const padSize = isOverlay ? 'w-[min(42vh,190px)] h-[min(42vh,190px)]' : 'w-44 h-44';
  const fireSize = isOverlay ? 'w-[min(30vh,130px)] h-[min(30vh,130px)]' : 'w-32 h-32';

  return (
    <div
      className={`select-none touch-none ${
        isOverlay
          ? 'absolute inset-x-0 bottom-0 flex items-end justify-between px-[max(env(safe-area-inset-left),14px)] pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none'
          : 'w-full max-w-[960px] mt-3 bg-stone-950/90 border border-stone-800 rounded-2xl p-4 flex items-center justify-between'
      }`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Direction cross */}
      <div
        ref={padRef}
        className={`${padSize} relative pointer-events-auto`}
        onPointerDown={(e) => {
          e.preventDefault();
          padPointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          updatePad(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (padPointer.current === e.pointerId) updatePad(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => padPointer.current === e.pointerId && releasePad()}
        onPointerCancel={(e) => padPointer.current === e.pointerId && releasePad()}
        onLostPointerCapture={(e) => padPointer.current === e.pointerId && releasePad()}
      >
        <div className={`${arm(has('arrowup'))} left-1/3 top-0 w-1/3 h-1/3`}>▲</div>
        <div className={`${arm(has('arrowdown'))} left-1/3 bottom-0 w-1/3 h-1/3`}>▼</div>
        <div className={`${arm(has('arrowleft'))} left-0 top-1/3 w-1/3 h-1/3`}>◀</div>
        <div className={`${arm(has('arrowright'))} right-0 top-1/3 w-1/3 h-1/3`}>▶</div>
      </div>

      {!isOverlay && (
        <div className="hidden sm:block text-center text-xs text-stone-400 max-w-[240px]">
          Comme au clavier : <strong className="text-stone-200">flèches</strong> +{' '}
          <strong className="text-amber-300">FRAPPE</strong> (= Espace)
        </div>
      )}

      {/* Single attack button (= Space) */}
      <button
        className={`${fireSize} pointer-events-auto rounded-full flex items-center justify-center font-black text-stone-950 text-sm border-4 transition-transform ${
          attackHeld
            ? 'scale-95 bg-amber-300 border-white'
            : isOverlay
            ? 'bg-amber-500/80 border-yellow-200/80'
            : 'bg-amber-500 border-yellow-200'
        }`}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          attack(true);
        }}
        onPointerUp={() => attack(false)}
        onPointerCancel={() => attack(false)}
        onLostPointerCapture={() => attack(false)}
      >
        FRAPPE
      </button>
    </div>
  );
};
