import React from 'react';
import { Fighter, MatchPhase } from '../types/game';
import { Volume2, VolumeX, Music, Monitor, HelpCircle, RotateCcw } from 'lucide-react';

interface GameHudProps {
  p1: Fighter;
  p2: Fighter;
  roundTime: number;
  phase: MatchPhase;
  isMuted: boolean;
  isMusicPlaying: boolean;
  isCrtEnabled: boolean;
  isRetro: boolean;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onToggleCrt: () => void;
  onToggleRetro: () => void;
  onOpenHelp: () => void;
  onReset: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  p1,
  p2,
  roundTime,
  phase,
  isMuted,
  isMusicPlaying,
  isCrtEnabled,
  isRetro,
  onToggleMute,
  onToggleMusic,
  onToggleCrt,
  onToggleRetro,
  onOpenHelp,
  onReset
}) => {
  // Render Yin-Yang token (2 full circles needed to win)
  // Each half point = half circle; each full point = full circle; 4 points max
  const renderYinYangTokens = (points: number, isP1: boolean) => {
    // Disc 1 (points >= 1 half, >= 2 full)
    // Disc 2 (points >= 3 half, >= 4 full)
    const tokens = [
      { half: points >= 1, full: points >= 2 },
      { half: points >= 3, full: points >= 4 }
    ];

    return (
      <div className={`flex items-center gap-2 ${isP1 ? 'flex-row' : 'flex-row-reverse'}`}>
        {tokens.map((t, idx) => (
          <div
            key={idx}
            className="relative w-8 h-8 rounded-full border-2 border-amber-400 bg-stone-900 overflow-hidden shadow-[0_0_8px_rgba(251,191,36,0.3)]"
            title={t.full ? 'Ippon (Point complet)' : (t.half ? 'Waza-ari (Demi-point)' : '0 Point')}
          >
            {/* If full point: full bright gold Yin-Yang */}
            {t.full ? (
              <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center">
                <span className="text-black font-extrabold text-[10px]">☯</span>
              </div>
            ) : t.half ? (
              /* Half point: half filled */
              <div className="w-full h-full relative">
                <div className="absolute left-0 top-0 w-1/2 h-full bg-gradient-to-b from-amber-500 to-yellow-300" />
                <div className="absolute right-0 top-0 w-1/2 h-full bg-stone-900" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-amber-300 font-bold text-[9px]">½</span>
                </div>
              </div>
            ) : (
              /* Empty slot */
              <div className="w-full h-full bg-stone-900/80 flex items-center justify-center">
                <span className="text-stone-600 text-[10px]">☯</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[960px] mx-auto select-none">
      {/* Top Bar with Players, Timer and Controls */}
      <div className="bg-stone-950/90 border border-stone-800 rounded-t-xl px-4 py-2.5 flex items-center justify-between shadow-lg">
        {/* P1 Section */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-8 rounded-sm" style={{ backgroundColor: p1.giColor }} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm tracking-wide">{p1.name}</span>
              <span
                className="text-[11px] font-semibold px-1.5 py-0.5 rounded text-stone-900"
                style={{ backgroundColor: p1.belt.color }}
              >
                {p1.belt.name}
              </span>
            </div>
            <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-1.5">
              <span>Points :</span>
              {renderYinYangTokens(p1.points, true)}
            </div>
          </div>
        </div>

        {/* Center: Timer & Round Announcement */}
        <div className="flex flex-col items-center">
          <div className="text-2xl font-black font-pixel text-amber-400 tracking-wider">
            {roundTime.toString().padStart(2, '0')}
          </div>
          <div className="text-[11px] font-bold text-stone-400 tracking-wider uppercase">
            {phase === 'FIGHTING' ? 'Combat' : (phase === 'INTRO' ? 'Salut' : 'Arbitrage')}
          </div>
        </div>

        {/* P2 Section */}
        <div className="flex items-center gap-3 flex-row-reverse text-right">
          <div className="w-3 h-8 rounded-sm" style={{ backgroundColor: p2.giColor }} />
          <div>
            <div className="flex items-center gap-2 justify-end">
              <span
                className="text-[11px] font-semibold px-1.5 py-0.5 rounded text-stone-900"
                style={{ backgroundColor: p2.belt.color }}
              >
                {p2.belt.name}
              </span>
              <span className="font-extrabold text-white text-sm tracking-wide">{p2.name}</span>
            </div>
            <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-1.5 justify-end">
              {renderYinYangTokens(p2.points, false)}
              <span>: Points</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Utility Toolbar */}
      <div className="bg-stone-900/95 border-x border-b border-stone-800 px-4 py-1.5 flex items-center justify-between text-xs text-stone-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-stone-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-stone-200">Action :</span>
            <span className="text-amber-300 font-medium">{p1.lastMoveName}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMusic}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isMusicPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title="Activer/Couper la musique chiptune"
          >
            <Music className="w-3.5 h-3.5" />
            <span>Musique</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-1.5 rounded bg-stone-800 text-stone-300 hover:text-white transition-colors"
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onToggleCrt}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              isCrtEnabled
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title="Activer/Désactiver le filtre CRT Scanlines"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>CRT</span>
          </button>

          <button
            onClick={onToggleRetro}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              isRetro
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/50'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title="Mode 8-bit : 320×180 pixels et palette 16 couleurs"
          >
            <span className="font-pixel text-[9px]">8-BIT</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="px-2 py-1 rounded bg-stone-800 text-stone-300 hover:text-white flex items-center gap-1 transition-colors"
            title="Guide des touches et coups"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Touches</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded bg-stone-800 text-stone-300 hover:text-white transition-colors"
            title="Recommencer le combat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
