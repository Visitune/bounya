import React from 'react';
import { MOVES_DATA } from '../game/constants';
import { X, Award, Shield, Zap } from 'lucide-react';

interface MoveGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MoveGuideModal: React.FC<MoveGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const attackMoves = [
    MOVES_DATA.PUNCH_MID,
    MOVES_DATA.PUNCH_HIGH,
    MOVES_DATA.KICK_MID,
    MOVES_DATA.KICK_ROUNDHOUSE,
    MOVES_DATA.KICK_LOW_SWEEP,
    MOVES_DATA.KICK_FLYING,
    MOVES_DATA.BLOCK,
    MOVES_DATA.JUMP,
    MOVES_DATA.CROUCH,
    MOVES_DATA.WALK_FORWARD,
    MOVES_DATA.WALK_BACK
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              🥋
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Commandes & Techniques de Karaté
              </h2>
              <p className="text-xs text-stone-400">
                KIAI 64 — Maniabilité « un bouton » : direction + attaque (clavier, manette ou tactile)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-3 divide-y divide-stone-800/60">
          {/* Quick Summary Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300">Règle d'or de combat :</div>
              <div>
                Déplacez-vous avec les <strong>Flèches</strong> (ou WASD/ZQSD pour J2). Appuyez sur la <strong>Barre d'Espace</strong> (ou F) seule ou combinée à une flèche pour frapper !
                <br />
                Deux points pleins (ou 4 demi-points) remportent le match.
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            {attackMoves.map((m) => {
              const isIppon = m.damage === 2;
              return (
                <div
                  key={m.id}
                  className="p-2.5 rounded-lg bg-stone-950/60 border border-stone-800/80 flex items-center justify-between gap-4 hover:border-stone-700 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-100">{m.nameFr}</span>
                      <span className="text-xs text-stone-500 italic">({m.nameJp})</span>
                      {m.damage && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isIppon
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                          }`}
                        >
                          <Award className="w-3 h-3" />
                          {isIppon ? 'IPPON (Point plein)' : 'WAZA-ARI (½ point)'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-1">{m.description}</p>
                  </div>

                  {/* Keys Badges */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-stone-400 font-mono">J1 :</span>
                      <kbd className="px-2 py-1 rounded bg-stone-800 text-amber-300 font-mono text-xs font-semibold border border-stone-700 shadow-sm">
                        {m.keyP1}
                      </kbd>
                    </div>
                    {m.keyP2 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-stone-400 font-mono">J2 :</span>
                        <kbd className="px-2 py-1 rounded bg-stone-800 text-stone-300 font-mono text-xs font-semibold border border-stone-700 shadow-sm">
                          {m.keyP2}
                        </kbd>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-sky-400" />
            <span>Astuce : Maintenir la direction arrière permet de parer les attaques frontales !</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
