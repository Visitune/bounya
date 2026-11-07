/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine, MatchWinner, TICK_RATE } from './game/GameEngine';
import { GameRenderer } from './game/GameRenderer';
import { CANVAS_HEIGHT, CANVAS_WIDTH, BELT_RANKS } from './game/constants';
import { GAME_KEY_CODES, inputManager, TouchDir } from './game/Input';
import { GameHud } from './components/GameHud';
import { MoveGuideModal } from './components/MoveGuideModal';
import { TouchControls } from './components/TouchControls';
import { MatchEndModal } from './components/MatchEndModal';
import { OnlineRoomModal } from './components/OnlineRoomModal';
import { soundEngine } from './audio/SoundEngine';
import { MatchStartInfo, multiplayerClient } from './multiplayer/MultiplayerClient';
import { LockstepSession } from './multiplayer/Lockstep';
import { GameMode, Fighter } from './types/game';
import { Swords, Trophy, BookOpen, Volume2, Sparkles, Maximize2, Minimize2, Smartphone, Globe, WifiOff, Loader2, Play, X, RotateCcw } from 'lucide-react';

const STEP_MS = 1000 / TICK_RATE;
const MAX_STEPS_PER_FRAME = 15;

type NetStatus = 'off' | 'playing' | 'lost';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) engineRef.current = new GameEngine();
  const engine = engineRef.current;

  const rendererRef = useRef<GameRenderer | null>(null);
  const sessionRef = useRef<LockstepSession | null>(null);
  const retroRef = useRef(false);

  // React state for HUD & UI
  const [phase, setPhase] = useState<GameEngine['phase']>('INTRO');
  const [roundTime, setRoundTime] = useState<number>(60);
  const [p1State, setP1State] = useState<Fighter>(() => ({ ...engine.p1 }));
  const [p2State, setP2State] = useState<Fighter>(() => ({ ...engine.p2 }));
  const [mode, setMode] = useState<GameMode>('TOURNAMENT');
  const [currentBeltIndex, setCurrentBeltIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isCrtEnabled, setIsCrtEnabled] = useState<boolean>(false);
  const [isRetro, setIsRetro] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [matchWinner, setMatchWinner] = useState<MatchWinner>(null);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(false);
  const [isPlayMode, setIsPlayMode] = useState<boolean>(false);
  const playFsRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState<boolean>(false);
  const [onlineRoomCode, setOnlineRoomCode] = useState<string | null>(null);
  const [netStatus, setNetStatus] = useState<NetStatus>('off');
  const [netWaiting, setNetWaiting] = useState<boolean>(false);
  const [ping, setPing] = useState<number>(0);

  const isMatchOver = phase === 'MATCH_OVER';

  const ensureMusic = useCallback(() => {
    if (!soundEngine.isMusicPlaying() && !soundEngine.getMuted()) {
      soundEngine.startBgm();
      setIsMusicPlaying(true);
    }
  }, []);

  // Mobile detection, invite links, fullscreen
  useEffect(() => {
    const checkMobile = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobileDevice(isTouch);
      setIsPortrait(window.innerHeight > window.innerWidth && isTouch);
    };
    checkMobile();
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) setShowTouchControls(true);
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    if (new URLSearchParams(window.location.search).get('room')) {
      setIsOnlineModalOpen(true);
    }

    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      // Android "back" / Esc leaves fullscreen => leave play mode too
      if (!fs && playFsRef.current) {
        playFsRef.current = false;
        setIsPlayMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard + gamepad listeners (registered once)
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (GAME_KEY_CODES.has(e.code)) e.preventDefault();
      ensureMusic();
      inputManager.keyDown(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => inputManager.keyUp(e.code);
    const handleBlur = () => inputManager.clear();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [ensureMusic]);

  // Network callbacks (registered once)
  useEffect(() => {
    multiplayerClient.onPeerMessage = (msg) => sessionRef.current?.receive(msg);
    const onLost = (message: string) => {
      if (!sessionRef.current) return;
      sessionRef.current = null;
      setNetStatus('lost');
      setNetWaiting(false);
      engine.refereeState.callText = message;
    };
    multiplayerClient.onOpponentDisconnect = (m) => onLost(m);
    multiplayerClient.onConnectionLost = () => onLost('CONNEXION PERDUE');
    return () => {
      multiplayerClient.disconnect();
    };
  }, [engine]);

  // Fixed-timestep game loop (60 simulation ticks/s whatever the screen refresh rate)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) rendererRef.current = new GameRenderer(ctx);

    let rafId = 0;
    let last = performance.now();
    let acc = 0;
    let lastHudSync = 0;

    const sampleLocal = () => inputManager.sample(false).p1;

    const loop = (now: number) => {
      acc += Math.min(now - last, 250);
      last = now;

      const session = sessionRef.current;
      let steps = 0;
      while (acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        if (session) {
          if (!session.tick(sampleLocal)) {
            acc = Math.min(acc, STEP_MS);
            break;
          }
        } else if (engine.mode !== 'ONLINE') {
          const s = inputManager.sample(engine.mode === 'TWO_PLAYER');
          engine.step(s.p1, s.p2);
        }
        acc -= STEP_MS;
        steps++;
      }
      // Gentle catch-up if the opponent is running ahead of us
      if (session && session.remoteLead > session.delay + 2) session.tick(sampleLocal);
      if (steps >= MAX_STEPS_PER_FRAME) acc = 0;

      const renderer = rendererRef.current;
      if (renderer) {
        renderer.render(engine.p1, engine.p2, engine.refereeState, engine.particles, engine.floatingTexts, engine.phase, false);
        if (retroRef.current) renderer.applyRetroFilter();
      }

      if (now - lastHudSync > 100) {
        lastHudSync = now;
        setPhase(engine.phase);
        setRoundTime(engine.roundTime);
        setP1State({ ...engine.p1 });
        setP2State({ ...engine.p2 });
        setCurrentBeltIndex(engine.currentBeltIndex);
        setMatchWinner(engine.winner);
        if (session) {
          setNetWaiting(session.isWaiting);
          setPing(multiplayerClient.rtt);
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      soundEngine.stopBgm();
    };
  }, [engine]);

  // ==========================================
  // Handlers
  // ==========================================

  const leaveOnline = () => {
    if (sessionRef.current || multiplayerClient.isConnected) {
      sessionRef.current = null;
      multiplayerClient.disconnect();
    }
    setNetStatus('off');
    setNetWaiting(false);
    setOnlineRoomCode(null);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  const handleToggleMusic = () => setIsMusicPlaying(soundEngine.toggleBgm());
  const handleToggleCrt = () => setIsCrtEnabled(v => !v);
  const handleToggleRetro = () => {
    retroRef.current = !retroRef.current;
    setIsRetro(retroRef.current);
  };

  const handleResetMatch = () => {
    if (engine.mode === 'ONLINE') {
      // Both machines reset on the same frame through the lockstep input stream
      if (sessionRef.current) inputManager.requestRematch();
      return;
    }
    engine.resetMatch();
    setPhase(engine.phase);
  };

  const handleChangeMode = (newMode: GameMode) => {
    leaveOnline();
    setMode(newMode);
    engine.setMode(newMode);
    setPhase(engine.phase);
    setMatchWinner(null);
  };

  const handleNextOpponent = () => {
    engine.advanceBeltTournament();
    setPhase(engine.phase);
  };

  const handleStartOnlineMatch = (info: MatchStartInfo) => {
    engine.setOnlineMatch(info.role, info.p1Name, info.p2Name, info.p1Gi, info.p2Gi);
    sessionRef.current = new LockstepSession(engine, info.role, (msg) => multiplayerClient.send(msg));
    inputManager.clear();
    setMode('ONLINE');
    setOnlineRoomCode(multiplayerClient.roomCode);
    setNetStatus('playing');
    setPhase(engine.phase);
    setMatchWinner(null);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const handleTouchDirs = (dirs: TouchDir[]) => {
    ensureMusic();
    inputManager.setTouchDirs(dirs);
  };
  const handleTouchAttack = (held: boolean) => {
    ensureMusic();
    inputManager.setTouchAttack(held);
  };

  /** Mobile / tablet: full-screen landscape game with translucent controls on top. */
  const enterPlayMode = async () => {
    ensureMusic();
    setIsPlayMode(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        playFsRef.current = true;
      }
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await orientation.lock?.('landscape');
    } catch {
      /* iPhone Safari: no element fullscreen / orientation lock => CSS full-screen only */
    }
  };

  const exitPlayMode = () => {
    inputManager.clear();
    setIsPlayMode(false);
    try {
      screen.orientation?.unlock?.();
    } catch {
      /* ignore */
    }
    if (document.fullscreenElement) {
      playFsRef.current = false;
      document.exitFullscreen().catch(() => {});
    }
  };

  const winnerFighter = matchWinner === 'p1' ? p1State : matchWinner === 'p2' ? p2State : null;

  const tabClass = (active: boolean, online = false) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
      active
        ? online ? 'bg-emerald-500 text-stone-950 shadow-md' : 'bg-amber-500 text-stone-950 shadow-md'
        : 'text-stone-300 hover:text-white hover:bg-stone-800'
    }`;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center">
      <header className="w-full border-b border-stone-800 bg-stone-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <span className="text-xl">🥋</span>
            <span className="text-lg font-black tracking-tight text-white font-pixel">KIAI 64</span>
          </div>

          <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto">
            <button onClick={() => handleChangeMode('TOURNAMENT')} className={tabClass(mode === 'TOURNAMENT')}>
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tournoi</span>
            </button>
            <button onClick={() => handleChangeMode('TWO_PLAYER')} className={tabClass(mode === 'TWO_PLAYER')}>
              <Swords className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Duel Local</span>
            </button>
            <button onClick={() => setIsOnlineModalOpen(true)} className={tabClass(mode === 'ONLINE', true)}>
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">En Ligne</span>
            </button>
            <button onClick={() => handleChangeMode('TRAINING')} className={tabClass(mode === 'TRAINING')}>
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dojo</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors"
              title={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="hidden md:flex px-3.5 py-1.5 rounded-lg text-xs font-bold bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guide des Coups</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl px-3 py-4 flex flex-col items-center">
        {mode === 'ONLINE' && (
          <div
            className={`w-full max-w-[960px] mb-2 px-3 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs shadow-lg ${
              netStatus === 'lost'
                ? 'bg-red-950/60 border-red-500/50 text-red-200'
                : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {netStatus === 'lost' ? (
                <WifiOff className="w-4 h-4 text-red-400" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
              <span>
                {netStatus === 'lost' ? 'Combat interrompu' : 'Combat à distance'} · Salon{' '}
                <strong className="font-pixel text-amber-300 text-sm ml-1">{onlineRoomCode}</strong>
              </span>
              {netStatus === 'playing' && (
                <span className="text-stone-300">· ping {ping} ms</span>
              )}
              {netStatus === 'playing' && netWaiting && (
                <span className="flex items-center gap-1 text-amber-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> attente de l'adversaire…
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-300 font-semibold">
                Vous : <span className="text-amber-300 font-bold">{engine.myOnlineRole === 'p1' ? 'Joueur 1 (gauche)' : 'Joueur 2 (droite)'}</span>
              </span>
              <button
                onClick={() => handleChangeMode('TOURNAMENT')}
                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-bold"
              >
                Quitter
              </button>
            </div>
          </div>
        )}

        {isPortrait && (
          <div className="w-full max-w-[960px] mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-400 rotate-90 shrink-0" />
              <span>Tournez en <strong>mode paysage</strong> pour mieux jouer !</span>
            </div>
            <button onClick={handleToggleFullscreen} className="px-2.5 py-1 rounded bg-amber-500 text-stone-950 font-bold text-[11px] shrink-0 ml-2">
              Plein écran
            </button>
          </div>
        )}

        <GameHud
          p1={p1State}
          p2={p2State}
          roundTime={roundTime}
          phase={phase}
          isMuted={isMuted}
          isMusicPlaying={isMusicPlaying}
          isCrtEnabled={isCrtEnabled}
          isRetro={isRetro}
          onToggleMute={handleToggleMute}
          onToggleMusic={handleToggleMusic}
          onToggleCrt={handleToggleCrt}
          onToggleRetro={handleToggleRetro}
          onOpenHelp={() => setIsHelpOpen(true)}
          onReset={handleResetMatch}
        />

        {isMobileDevice && !isPlayMode && (
          <button
            onClick={enterPlayMode}
            className="w-full max-w-[960px] mb-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
          >
            <Play className="w-5 h-5" />
            <span>JOUER EN PLEIN ÉCRAN</span>
          </button>
        )}

        <div
          className={
            isPlayMode
              ? 'fixed inset-0 z-[45] bg-black flex items-center justify-center overflow-hidden touch-none'
              : 'relative w-full max-w-[960px]'
          }
        >
          <div
            className={`relative aspect-[16/9] bg-black overflow-hidden ${
              isPlayMode
                ? 'w-[min(100vw,calc(100dvh*16/9))]'
                : 'w-full rounded-b-xl border-x border-b border-stone-800 shadow-2xl'
            }`}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-full block object-contain"
              style={isRetro ? { imageRendering: 'pixelated' } : undefined}
            />
            {isCrtEnabled && <div className="absolute inset-0 crt-overlay crt-vignette pointer-events-none" />}
            {!isMusicPlaying && !isMuted && !isPlayMode && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-stone-900/90 border border-amber-500/40 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs text-amber-200 pointer-events-none animate-bounce">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Appuyez sur une touche pour lancer la musique</span>
              </div>
            )}
          </div>

          {isPlayMode && (
            <>
              {/* Compact HUD */}
              <div className="absolute top-0 inset-x-0 flex items-start justify-between gap-2 px-[max(env(safe-area-inset-left),10px)] pt-[max(env(safe-area-inset-top),6px)] pointer-events-none">
                <div className="bg-black/55 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white flex items-center gap-2">
                  <span className="truncate max-w-[22vw]">{p1State.name}</span>
                  <span className="font-pixel text-amber-300 text-[10px]">{p1State.points / 2}</span>
                </div>
                <div className="bg-black/55 rounded-lg px-3 py-1 font-pixel text-amber-300 text-xs">
                  {roundTime}
                  {mode === 'ONLINE' && netStatus === 'playing' && (
                    <span className="ml-2 font-sans text-[10px] text-stone-300">{ping} ms{netWaiting ? ' ⏳' : ''}</span>
                  )}
                </div>
                <div className="flex items-start gap-1.5">
                  <div className="bg-black/55 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white flex items-center gap-2">
                    <span className="font-pixel text-amber-300 text-[10px]">{p2State.points / 2}</span>
                    <span className="truncate max-w-[22vw]">{p2State.name}</span>
                  </div>
                  <button
                    onClick={handleResetMatch}
                    className="pointer-events-auto w-9 h-9 rounded-lg bg-black/55 text-white flex items-center justify-center"
                    title="Recommencer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={exitPlayMode}
                    className="pointer-events-auto w-9 h-9 rounded-lg bg-black/55 text-white flex items-center justify-center"
                    title="Quitter le plein écran"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isMobileDevice && <TouchControls variant="overlay" onDirs={handleTouchDirs} onAttack={handleTouchAttack} />}

              {isPortrait && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 text-amber-200 text-sm text-center px-6">
                  <Smartphone className="w-10 h-10 rotate-90 text-amber-400" />
                  <span>
                    Tournez votre téléphone en <strong>mode paysage</strong>
                  </span>
                  <button onClick={exitPlayMode} className="mt-2 px-3 py-1.5 rounded bg-stone-800 text-stone-200 text-xs">
                    Quitter
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {!isPlayMode && (
          <div className="w-full max-w-[960px] mt-3 bg-stone-900/60 border border-stone-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs text-stone-300 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-400">{mode === 'TWO_PLAYER' ? 'J1 :' : 'Commandes :'}</span>
              <span className="bg-stone-800 px-2 py-0.5 rounded font-mono text-[11px] text-stone-200">Flèches = bouger · Espace = frapper</span>
              {mode === 'TWO_PLAYER' && (
                <>
                  <span className="font-bold text-red-400 ml-1">J2 :</span>
                  <span className="bg-stone-800 px-2 py-0.5 rounded font-mono text-[11px] text-stone-200">ZQSD + F</span>
                </>
              )}
              <span className="text-[11px] text-stone-400">Astuce : tenez une flèche en frappant pour changer de coup · reculer = parer</span>
            </div>
            <button
              onClick={() => setShowTouchControls(!showTouchControls)}
              className="text-[11px] text-stone-400 hover:text-amber-400 underline underline-offset-2"
            >
              {showTouchControls ? 'Masquer la manette tactile' : 'Afficher la manette tactile'}
            </button>
          </div>
        )}

        {showTouchControls && !isPlayMode && (
          <TouchControls variant="panel" onDirs={handleTouchDirs} onAttack={handleTouchAttack} />
        )}

        {mode === 'TOURNAMENT' && (
          <div className="w-full max-w-[960px] mt-4 bg-stone-950/70 border border-stone-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5 uppercase tracking-wide">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Progression du Tournoi par Ceintures</span>
              </span>
              <span className="text-xs text-amber-400 font-semibold">Rang Actuel : {BELT_RANKS[currentBeltIndex]?.name}</span>
            </div>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5">
              {BELT_RANKS.map((b, idx) => {
                const isCurrent = idx === currentBeltIndex;
                const isPassed = idx < currentBeltIndex;
                return (
                  <div
                    key={b.id}
                    className={`p-2 rounded-lg text-center flex flex-col items-center justify-center border transition-all ${
                      isCurrent
                        ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                        : isPassed
                        ? 'border-emerald-600/40 bg-emerald-950/20 opacity-70'
                        : 'border-stone-800 bg-stone-900/40 opacity-40'
                    }`}
                  >
                    <div className="w-full h-2.5 rounded-sm mb-1 shadow-sm" style={{ backgroundColor: b.color }} />
                    <span className="text-[10px] font-bold text-stone-200 truncate w-full">
                      {b.dan ? `${b.dan}e Dan` : b.name.replace('Ceinture ', '')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <MoveGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <MatchEndModal
        isOpen={isMatchOver && netStatus !== 'lost'}
        winner={winnerFighter}
        isDraw={matchWinner === 'draw'}
        mode={mode}
        myRole={mode === 'ONLINE' ? engine.myOnlineRole : 'p1'}
        currentBeltIndex={currentBeltIndex}
        onNextOpponent={handleNextOpponent}
        onRematch={handleResetMatch}
        onChangeMode={handleChangeMode}
      />

      <OnlineRoomModal
        isOpen={isOnlineModalOpen}
        onClose={() => setIsOnlineModalOpen(false)}
        onStartOnlineMatch={handleStartOnlineMatch}
      />
    </div>
  );
}
