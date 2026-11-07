import React from 'react';
import { Fighter, GameMode } from '../types/game';
import { BELT_RANKS } from '../game/constants';
import { Trophy, RotateCcw, ChevronRight, Swords, Sparkles } from 'lucide-react';

interface MatchEndModalProps {
  isOpen: boolean;
  winner: Fighter | null;
  isDraw: boolean;
  mode: GameMode;
  myRole: 'p1' | 'p2';
  currentBeltIndex: number;
  onNextOpponent: () => void;
  onRematch: () => void;
  onChangeMode: (mode: GameMode) => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  isOpen,
  winner,
  isDraw,
  mode,
  myRole,
  currentBeltIndex,
  onNextOpponent,
  onRematch,
  onChangeMode
}) => {
  if (!isOpen || (!winner && !isDraw)) return null;

  const isP1Winner = !isDraw && winner?.id === myRole;
  const isOnline = mode === 'ONLINE';
  const hasNextBelt = currentBeltIndex < BELT_RANKS.length - 1;
  const nextBelt = hasNextBelt ? BELT_RANKS[currentBeltIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-center flex flex-col items-center">
        {/* Victory Icon / Belt Trophy */}
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
          <Trophy className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold text-amber-400 tracking-widest uppercase">
          {mode === 'TOURNAMENT' ? 'Tournoi d’Arts Martiaux' : isOnline ? 'Duel en Ligne' : 'Duel Karaté'}
        </span>

        <h2 className="text-2xl font-black text-white mt-1 mb-2">
          {isDraw ? 'ÉGALITÉ — HIKIWAKE' : isP1Winner ? 'VICTOIRE ÉCLATANTE !' : `${winner!.name.toUpperCase()} L’EMPORTE !`}
        </h2>

        <p className="text-sm text-stone-300 max-w-sm mb-5">
          {isDraw
            ? 'Temps écoulé sans vainqueur. Une revanche s’impose !'
            : isP1Winner
            ? 'Une technique parfaite récompensée par l’arbitre du dojo.'
            : 'Entraînez-vous à bloquer et à utiliser les balayettes pour riposter.'}
        </p>

        {/* Tournament Belt Progression Promotion Card */}
        {mode === 'TOURNAMENT' && isP1Winner && nextBelt && (
          <div className="w-full bg-stone-950 border border-amber-500/40 rounded-xl p-4 mb-5 flex items-center justify-between">
            <div className="text-left">
              <div className="text-[11px] text-amber-400 font-bold uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Promotion de Rang Karaté</span>
              </div>
              <div className="text-base font-bold text-white mt-0.5">{nextBelt.name}</div>
              <div className="text-xs text-stone-400">Prochain rival plus rapide et offensif</div>
            </div>

            <div
              className="w-12 h-6 rounded-md border border-stone-700 shadow"
              style={{ backgroundColor: nextBelt.color }}
              title={nextBelt.name}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          {mode === 'TOURNAMENT' && isP1Winner && hasNextBelt ? (
            <button
              onClick={onNextOpponent}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
            >
              <span>Combattre le Prochain Maître</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onRematch}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isOnline ? 'Revanche (relance pour les deux)' : 'Revanche Immédiate'}</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onChangeMode('TOURNAMENT')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                mode === 'TOURNAMENT'
                  ? 'bg-stone-800 text-white border-amber-500/40'
                  : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
              }`}
            >
              Mode Tournoi (Solo)
            </button>
            <button
              onClick={() => onChangeMode('TWO_PLAYER')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'TWO_PLAYER'
                  ? 'bg-stone-800 text-white border-amber-500/40'
                  : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Mode 2 Joueurs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
