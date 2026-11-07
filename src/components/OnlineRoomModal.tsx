import React, { useState } from 'react';
import { X, Globe, Copy, Check, Users, Shield, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { MatchStartInfo, multiplayerClient } from '../multiplayer/MultiplayerClient';

interface OnlineRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartOnlineMatch: (info: MatchStartInfo) => void;
}

const GI_COLORS = [
  { name: 'Blanc Pur (Traditionnel)', hex: '#f8fafc' },
  { name: 'Rouge Carmin (Rival)', hex: '#b91c1c' },
  { name: 'Noir Ombre (Ninja)', hex: '#18181b' },
  { name: 'Bleu Kobudo', hex: '#2563eb' },
  { name: 'Or Impérial', hex: '#ca8a04' }
];

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  isOpen,
  onClose,
  onStartOnlineMatch
}) => {
  const urlRoom = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('room') : null;
  const [tab, setTab] = useState<'create' | 'join'>(urlRoom ? 'join' : 'create');
  const [name, setName] = useState<string>(() => localStorage.getItem('karate_player_name') || 'Karatéka');
  const [giColor, setGiColor] = useState<string>(GI_COLORS[0].hex);
  const [roomCodeInput, setRoomCodeInput] = useState<string>(urlRoom ? urlRoom.toUpperCase() : '');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    localStorage.setItem('karate_player_name', val);
  };

  const handleCreateRoom = async () => {
    setErrorMsg(null);
    setIsWaiting(true);
    multiplayerClient.disconnect();

    try {
      multiplayerClient.onRoomCreated = (code) => {
        setCreatedCode(code);
      };

      multiplayerClient.onMatchStart = (info) => {
        setIsWaiting(false);
        setCreatedCode(null);
        onStartOnlineMatch(info);
        onClose();
      };

      multiplayerClient.onError = (msg) => {
        setErrorMsg(msg);
        setIsWaiting(false);
      };

      await multiplayerClient.createRoom(name.trim() || 'Hôte Karatéka', giColor);
    } catch {
      setErrorMsg('Impossible de se connecter au serveur de combat (serveur en veille ? réessayez dans 1 min).');
      setIsWaiting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCodeInput.trim()) {
      setErrorMsg('Veuillez entrer le code du salon (ex: 4E7X).');
      return;
    }

    setErrorMsg(null);
    setIsWaiting(true);
    multiplayerClient.disconnect();

    try {
      multiplayerClient.onRoomJoined = () => {};

      multiplayerClient.onMatchStart = (info) => {
        setIsWaiting(false);
        onStartOnlineMatch(info);
        onClose();
      };

      multiplayerClient.onError = (msg) => {
        setErrorMsg(msg);
        setIsWaiting(false);
      };

      await multiplayerClient.joinRoom(roomCodeInput.trim().toUpperCase(), name.trim() || 'Challenger', giColor);
    } catch {
      setErrorMsg('Erreur de connexion au salon.');
      setIsWaiting(false);
    }
  };

  const copyRoomCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (createdCode) {
      const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${createdCode}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Combat en Ligne à Distance
              </h2>
              <p className="text-[11px] text-stone-400">
                Jouez à 2 sur 2 ordinateurs avec vos propres touches
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (createdCode) {
                multiplayerClient.disconnect();
                setCreatedCode(null);
                setIsWaiting(false);
              }
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fighter Customization Profile */}
        <div className="p-4 bg-stone-900 border-b border-stone-800 space-y-3">
          <div>
            <label className="block text-xs font-bold text-stone-300 mb-1">
              Votre Nom de Combattant :
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              maxLength={18}
              placeholder="Ex: Mounir, Ryu, Sensei..."
              className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-300 mb-1.5">
              Couleur de votre Gi (Tenue de karaté) :
            </label>
            <div className="flex items-center gap-2">
              {GI_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => setGiColor(c.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    giColor === c.hex ? 'scale-110 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'border-stone-700'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mode Tabs: Create vs Join */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="flex rounded-lg bg-stone-950 p-1 border border-stone-800 mb-4">
            <button
              onClick={() => { setTab('create'); setErrorMsg(null); }}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${
                tab === 'create' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-400 hover:text-white'
              }`}
            >
              Créer un Salon
            </button>
            <button
              onClick={() => { setTab('join'); setErrorMsg(null); }}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${
                tab === 'join' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-400 hover:text-white'
              }`}
            >
              Rejoindre un Salon
            </button>
          </div>

          {errorMsg && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs">
              {errorMsg}
            </div>
          )}

          {tab === 'create' ? (
            <div className="space-y-4 text-center">
              {!createdCode ? (
                <div>
                  <p className="text-xs text-stone-300 mb-4">
                    Générez un code de salon et envoyez-le à votre ami pour commencer le duel en direct !
                  </p>
                  <button
                    onClick={handleCreateRoom}
                    disabled={isWaiting}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
                  >
                    {isWaiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Créer le Salon de Combat</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">
                    Code de votre Salon :
                  </span>
                  <div className="bg-stone-950 border border-amber-500/50 rounded-xl p-3 flex items-center justify-center gap-3">
                    <span className="font-pixel text-2xl text-amber-400 tracking-widest">
                      {createdCode}
                    </span>
                    <button
                      onClick={copyRoomCode}
                      className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                      title="Copier le code"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="space-y-1 text-left">
                    <span className="text-[11px] font-bold text-stone-300">Lien direct d'invitation :</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}${window.location.pathname}?room=${createdCode}`}
                        className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-amber-300 font-mono select-all focus:outline-none"
                      />
                      <button
                        onClick={copyInviteLink}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shrink-0 flex items-center gap-1 transition-colors"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-stone-950/70 border border-stone-800 rounded-lg p-2 text-[11px] text-stone-400 text-left">
                    💡 <strong>Astuce :</strong> Vous pouvez aussi tester immédiatement en ouvrant une 2e fenêtre de votre navigateur avec ce lien !
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-stone-400 pt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>En attente que le Joueur 2 rejoigne le salon...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Code du Salon reçu de votre ami :
                </label>
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="Ex: 4E7X"
                  className="w-full px-3 py-2.5 bg-stone-950 border border-stone-700 rounded-lg text-center font-pixel text-lg text-amber-300 tracking-widest focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={isWaiting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-95 text-stone-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                {isWaiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Rejoindre le Combat</span>
              </button>
            </div>
          )}

          {/* Quick Info */}
          <div className="mt-4 pt-3 border-t border-stone-800/80 text-[11px] text-stone-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Chacun joue sur son appareil : clavier (Flèches + Espace), manette ou tactile.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
