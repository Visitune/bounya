import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Shield, Sparkles, Zap, Flame } from 'lucide-react';

interface TouchControlsProps {
  onAction: (action: 'PUNCH_HIGH' | 'PUNCH_MID' | 'KICK_MID' | 'KICK_ROUNDHOUSE' | 'KICK_LOW_SWEEP' | 'KICK_FLYING' | 'JUMP' | 'CROUCH' | 'LEFT' | 'RIGHT') => void;
  onDirectionDown: (dir: 'arrowleft' | 'arrowright' | 'arrowup' | 'arrowdown') => void;
  onDirectionUp: (dir: 'arrowleft' | 'arrowright' | 'arrowup' | 'arrowdown') => void;
  isMobileDevice?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onAction,
  onDirectionDown,
  onDirectionUp,
  isMobileDevice = false
}) => {
  const [activeDir, setActiveDir] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<'arcade' | 'direct'>('arcade');

  const triggerHaptic = (pattern: number | number[] = 25) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  const handleDirStart = (dir: 'arrowleft' | 'arrowright' | 'arrowup' | 'arrowdown') => {
    triggerHaptic(18);
    setActiveDir(dir);
    onDirectionDown(dir);
  };

  const handleDirEnd = (dir: 'arrowleft' | 'arrowright' | 'arrowup' | 'arrowdown') => {
    if (activeDir === dir) {
      setActiveDir(null);
    }
    onDirectionUp(dir);
  };

  const handleAction = (action: Parameters<TouchControlsProps['onAction']>[0]) => {
    triggerHaptic([20, 15, 30]);
    onAction(action);
  };

  // Spacebar Attack Simulation using active direction
  const handleSpaceAttack = () => {
    triggerHaptic(35);
    if (activeDir === 'arrowup') {
      onAction('PUNCH_HIGH');
    } else if (activeDir === 'arrowdown') {
      onAction('KICK_LOW_SWEEP');
    } else if (activeDir === 'arrowleft') {
      onAction('KICK_ROUNDHOUSE');
    } else if (activeDir === 'arrowright') {
      onAction('KICK_MID');
    } else {
      onAction('PUNCH_MID');
    }
  };

  return (
    <div className="w-full max-w-[960px] mx-auto select-none touch-none">
      {/* Control style tabs */}
      <div className="flex items-center justify-between px-2 mb-2 text-xs">
        <div className="flex items-center gap-1.5 text-stone-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-bold text-stone-300">Manette Virtuelle Mobile / Tablette</span>
        </div>

        <div className="flex items-center gap-1 bg-stone-900/90 p-0.5 rounded-lg border border-stone-800">
          <button
            onClick={() => setControlMode('arcade')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
              controlMode === 'arcade'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Mode Arcade (Pouces G/D)
          </button>
          <button
            onClick={() => setControlMode('direct')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
              controlMode === 'direct'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Boutons Directs
          </button>
        </div>
      </div>

      {controlMode === 'arcade' ? (
        /* Dual-Thumb Arcade Layout: Left Thumb Joystick + Right Thumb Attack Cluster */
        <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-3 grid grid-cols-2 gap-4 shadow-2xl">
          {/* Left Thumb: Ergonomic D-PAD */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] font-extrabold text-stone-400 mb-2 uppercase tracking-wider">
              Pouce Gauche · Mouvements
            </span>

            <div className="relative w-36 h-36 flex items-center justify-center bg-stone-900/80 rounded-full border border-stone-800/80 shadow-inner">
              {/* Center Pivot Indicator */}
              <div className="w-9 h-9 rounded-full bg-stone-950 border border-stone-700/80 flex items-center justify-center text-stone-500 font-pixel text-[8px] pointer-events-none">
                C64
              </div>

              {/* UP */}
              <button
                onPointerDown={() => handleDirStart('arrowup')}
                onPointerUp={() => handleDirEnd('arrowup')}
                onPointerCancel={() => handleDirEnd('arrowup')}
                className={`absolute top-1.5 w-11 h-11 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
                  activeDir === 'arrowup'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
                title="Sauter"
              >
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* DOWN */}
              <button
                onPointerDown={() => handleDirStart('arrowdown')}
                onPointerUp={() => handleDirEnd('arrowdown')}
                onPointerCancel={() => handleDirEnd('arrowdown')}
                className={`absolute bottom-1.5 w-11 h-11 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
                  activeDir === 'arrowdown'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
                title="S'accroupir / Esquive"
              >
                <ArrowDown className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* LEFT */}
              <button
                onPointerDown={() => handleDirStart('arrowleft')}
                onPointerUp={() => handleDirEnd('arrowleft')}
                onPointerCancel={() => handleDirEnd('arrowleft')}
                className={`absolute left-1.5 w-11 h-11 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
                  activeDir === 'arrowleft'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
                title="Reculer / Garde"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* RIGHT */}
              <button
                onPointerDown={() => handleDirStart('arrowright')}
                onPointerUp={() => handleDirEnd('arrowright')}
                onPointerCancel={() => handleDirEnd('arrowright')}
                className={`absolute right-1.5 w-11 h-11 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
                  activeDir === 'arrowright'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
                title="Avancer"
              >
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Right Thumb: Arcade Action Cluster */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] font-extrabold text-stone-400 mb-2 uppercase tracking-wider">
              Pouce Droit · Frappes
            </span>

            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Massive Primary Strike Button (Espace adaptatif) */}
              <button
                onPointerDown={handleSpaceAttack}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 active:from-amber-700 active:to-yellow-500 text-stone-950 font-black text-xs uppercase flex flex-col items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] border-2 border-yellow-200 active:scale-95 transition-transform"
                title="Frapper (Espace combiné à la direction)"
              >
                <Zap className="w-6 h-6 stroke-[3]" />
                <span className="text-[10px] font-extrabold mt-0.5 tracking-tight">FRAPPE</span>
              </button>

              {/* Satellite Fast Action 1: High Punch */}
              <button
                onPointerDown={() => handleAction('PUNCH_HIGH')}
                className="absolute top-0 right-1 w-10 h-10 rounded-full bg-red-600/90 active:bg-red-500 text-white font-bold text-[10px] flex items-center justify-center border border-red-400 shadow-md active:scale-90 transition-transform"
                title="Coup de Poing Haut (Ippon)"
              >
                Haut
              </button>

              {/* Satellite Fast Action 2: Roundhouse Kick */}
              <button
                onPointerDown={() => handleAction('KICK_ROUNDHOUSE')}
                className="absolute right-0 bottom-4 w-10 h-10 rounded-full bg-purple-600/90 active:bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center border border-purple-400 shadow-md active:scale-90 transition-transform"
                title="Pied Circulaire (Ippon)"
              >
                Circ.
              </button>

              {/* Satellite Fast Action 3: Low Sweep */}
              <button
                onPointerDown={() => handleAction('KICK_LOW_SWEEP')}
                className="absolute bottom-0 left-3 w-10 h-10 rounded-full bg-blue-600/90 active:bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center border border-blue-400 shadow-md active:scale-90 transition-transform"
                title="Balayette Basse"
              >
                Balaye
              </button>

              {/* Satellite Fast Action 4: Flying Kick */}
              <button
                onPointerDown={() => handleAction('KICK_FLYING')}
                className="absolute top-1 left-2 w-10 h-10 rounded-full bg-emerald-600/90 active:bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center border border-emerald-400 shadow-md active:scale-90 transition-transform"
                title="Pied Sauté Volant (Ippon)"
              >
                Volant
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Direct Action Grid Mode */
        <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-3 grid grid-cols-1 md:grid-cols-2 gap-3 shadow-xl">
          {/* Movement Box */}
          <div className="flex items-center justify-between bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/80">
            <span className="text-xs font-bold text-stone-300">Déplacement :</span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onPointerDown={() => handleDirStart('arrowleft')}
                onPointerUp={() => handleDirEnd('arrowleft')}
                className="h-11 w-11 bg-stone-800 active:bg-amber-500 rounded-lg flex items-center justify-center text-stone-200 active:text-stone-950 font-bold border border-stone-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onPointerDown={() => handleDirStart('arrowright')}
                onPointerUp={() => handleDirEnd('arrowright')}
                className="h-11 w-11 bg-stone-800 active:bg-amber-500 rounded-lg flex items-center justify-center text-stone-200 active:text-stone-950 font-bold border border-stone-700"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onPointerDown={() => handleDirStart('arrowup')}
                onPointerUp={() => handleDirEnd('arrowup')}
                className="h-11 w-11 bg-stone-800 active:bg-amber-500 rounded-lg flex items-center justify-center text-stone-200 active:text-stone-950 font-bold border border-stone-700"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <button
                onPointerDown={() => handleDirStart('arrowdown')}
                onPointerUp={() => handleDirEnd('arrowdown')}
                className="h-11 w-11 bg-stone-800 active:bg-amber-500 rounded-lg flex items-center justify-center text-stone-200 active:text-stone-950 font-bold border border-stone-700"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Attacks Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleAction('PUNCH_MID')}
              className="h-11 bg-stone-800 active:bg-amber-600 rounded-lg text-xs font-bold text-stone-200 border border-stone-700 shadow"
            >
              Poing Direct
            </button>
            <button
              onClick={() => handleAction('PUNCH_HIGH')}
              className="h-11 bg-amber-950/60 active:bg-amber-600 rounded-lg text-xs font-bold text-amber-300 border border-amber-700/60 shadow"
            >
              Poing Haut ★
            </button>
            <button
              onClick={() => handleAction('KICK_MID')}
              className="h-11 bg-stone-800 active:bg-amber-600 rounded-lg text-xs font-bold text-stone-200 border border-stone-700 shadow"
            >
              Pied Frontal
            </button>
            <button
              onClick={() => handleAction('KICK_ROUNDHOUSE')}
              className="h-11 bg-purple-950/60 active:bg-purple-600 rounded-lg text-xs font-bold text-purple-300 border border-purple-700/60 shadow"
            >
              Circulaire ★
            </button>
            <button
              onClick={() => handleAction('KICK_LOW_SWEEP')}
              className="h-11 bg-stone-800 active:bg-amber-600 rounded-lg text-xs font-bold text-stone-200 border border-stone-700 shadow"
            >
              Balayette Basse
            </button>
            <button
              onClick={() => handleAction('KICK_FLYING')}
              className="h-11 bg-red-950/60 active:bg-red-600 rounded-lg text-xs font-bold text-red-300 border border-red-700/60 shadow"
            >
              Pied Volant ★
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
