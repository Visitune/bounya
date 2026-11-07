import { soundEngine } from '../audio/SoundEngine';
import { BeltRank, Fighter, FloatingText, GameMode, MatchPhase, MoveType, Particle } from '../types/game';
import { BELT_RANKS, CANVAS_WIDTH, GROUND_Y, MOVES_DATA } from './constants';
import { IN_ATTACK, IN_DOWN, IN_LEFT, IN_REMATCH, IN_RIGHT, IN_UP } from './Input';

export const ROUND_SECONDS = 60;
export const TICK_RATE = 60;

export type MatchWinner = 'p1' | 'p2' | 'draw' | null;

export interface RefereeState {
  action: 'idle' | 'hajime' | 'yame' | 'award_p1' | 'award_p2' | 'bow';
  flagP1High: boolean;
  flagP2High: boolean;
  callText: string;
}

/** Everything that influences gameplay. Particles / floating texts are cosmetic only. */
interface SimState {
  p1: Fighter;
  p2: Fighter;
  phase: MatchPhase;
  phaseTimer: number;
  fightFrames: number;
  hitCooldown: number;
  refereeState: RefereeState;
  winner: MatchWinner;
  aiActionTimer: number;
  aiFlyingKickTimer: number;
}

/**
 * Deterministic karate simulation.
 * `step(in1, in2)` advances exactly one 1/60 s tick. Given identical inputs,
 * two machines produce identical states (required by the online lockstep).
 * Gameplay never uses Math.random except for the solo AI (never online).
 */
export class GameEngine {
  public p1: Fighter;
  public p2: Fighter;
  public phase: MatchPhase = 'INTRO';
  public mode: GameMode = 'TOURNAMENT';
  public currentBeltIndex: number = 0;
  public winner: MatchWinner = null;

  public refereeState: RefereeState = {
    action: 'bow',
    flagP1High: false,
    flagP2High: false,
    callText: ''
  };

  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  /** Online: which fighter this machine controls (cosmetic / HUD only). */
  public myOnlineRole: 'p1' | 'p2' = 'p1';
  /** When true, sounds and particles are suppressed (used while replaying frames). */
  public silent = false;

  private phaseTimer = 0;
  private fightFrames = 0;
  private hitCooldown = 0;
  private aiActionTimer = 0;
  private aiFlyingKickTimer = 0;

  constructor() {
    this.p1 = this.createFighter('p1', 'Joueur 1', 300, 1, '#f8fafc', '#18181b', '#ef4444', false, BELT_RANKS[0]);
    this.p2 = this.createFighter('p2', BELT_RANKS[0].name, CANVAS_WIDTH - 300, -1, '#b91c1c', '#18181b', '#f8fafc', true, BELT_RANKS[0]);
    this.startMatchIntro();
  }

  /** Remaining seconds displayed on the HUD. */
  public get roundTime(): number {
    return Math.max(0, ROUND_SECONDS - Math.floor(this.fightFrames / TICK_RATE));
  }

  private createFighter(
    id: 'p1' | 'p2',
    name: string,
    x: number,
    facing: 1 | -1,
    giColor: string,
    beltColor: string,
    headbandColor: string,
    isAi: boolean,
    belt: BeltRank
  ): Fighter {
    return {
      id,
      name,
      x,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      facing,
      state: 'BOW',
      animFrame: 0,
      stateTimer: 0,
      isGrounded: true,
      giColor,
      beltColor,
      headbandColor,
      points: 0,
      halfPoints: 0,
      fullPoints: 0,
      belt,
      isAi,
      isBlocking: false,
      lastMoveName: 'Position de Garde'
    };
  }

  // ==========================================
  // Modes
  // ==========================================

  public setMode(mode: GameMode) {
    this.mode = mode;
    this.p1.name = 'Joueur 1';
    this.p1.giColor = '#f8fafc';
    this.p1.isAi = false;
    if (mode === 'TWO_PLAYER') {
      this.p2.name = 'Joueur 2';
      this.p2.isAi = false;
      this.p2.giColor = '#b91c1c';
    } else if (mode === 'TRAINING') {
      this.p2.name = 'Mannequin Dojo';
      this.p2.isAi = true;
      this.p2.belt = BELT_RANKS[0];
      this.p2.giColor = '#3b82f6';
    } else if (mode === 'ONLINE') {
      this.p2.isAi = false;
    } else {
      this.p1.belt = BELT_RANKS[this.currentBeltIndex];
      this.p2.belt = BELT_RANKS[this.currentBeltIndex];
      this.p2.name = this.p2.belt.name;
      this.p2.isAi = true;
      this.p2.giColor = '#b91c1c';
    }
    this.resetMatch();
  }

  public setOnlineMatch(myRole: 'p1' | 'p2', p1Name: string, p2Name: string, p1Gi: string, p2Gi: string) {
    this.mode = 'ONLINE';
    this.myOnlineRole = myRole;
    // Both machines must start from a byte-identical state
    this.p1 = this.createFighter('p1', p1Name, 300, 1, p1Gi, '#18181b', '#ef4444', false, BELT_RANKS[0]);
    this.p2 = this.createFighter('p2', p2Name, CANVAS_WIDTH - 300, -1, p2Gi, '#18181b', '#f8fafc', false, BELT_RANKS[0]);
    this.aiActionTimer = 0;
    this.aiFlyingKickTimer = 0;
    this.resetMatch();
  }

  public resetMatch() {
    for (const f of [this.p1, this.p2]) {
      f.points = 0;
      f.halfPoints = 0;
      f.fullPoints = 0;
      f.vx = 0;
      f.vy = 0;
      f.isGrounded = true;
      f.isBlocking = false;
      f.stateTimer = 0;
    }
    this.fightFrames = 0;
    this.hitCooldown = 0;
    this.winner = null;
    this.particles = [];
    this.floatingTexts = [];
    this.startMatchIntro();
  }

  public advanceBeltTournament() {
    if (this.currentBeltIndex < BELT_RANKS.length - 1) {
      this.currentBeltIndex++;
      this.p1.belt = BELT_RANKS[this.currentBeltIndex];
      this.p2.belt = BELT_RANKS[this.currentBeltIndex];
      this.p2.name = this.p2.belt.name;
    }
    this.resetMatch();
  }

  private startMatchIntro() {
    this.phase = 'INTRO';
    this.phaseTimer = 90;
    this.placeFighters();
    this.p1.state = 'BOW';
    this.p2.state = 'BOW';
    this.refereeState = {
      action: 'bow',
      flagP1High: false,
      flagP2High: false,
      callText: 'REI ! (SALUT)'
    };
    this.sfx(() => soundEngine.playGong());
  }

  private placeFighters() {
    this.p1.x = 300;
    this.p1.y = GROUND_Y;
    this.p1.facing = 1;
    this.p1.animFrame = 0;
    this.p2.x = CANVAS_WIDTH - 300;
    this.p2.y = GROUND_Y;
    this.p2.facing = -1;
    this.p2.animFrame = 0;
  }

  // ==========================================
  // Serialization (online desync recovery)
  // ==========================================

  public getState(): SimState {
    return JSON.parse(JSON.stringify({
      p1: this.p1,
      p2: this.p2,
      phase: this.phase,
      phaseTimer: this.phaseTimer,
      fightFrames: this.fightFrames,
      hitCooldown: this.hitCooldown,
      refereeState: this.refereeState,
      winner: this.winner,
      aiActionTimer: this.aiActionTimer,
      aiFlyingKickTimer: this.aiFlyingKickTimer
    }));
  }

  public setState(s: SimState) {
    const c: SimState = JSON.parse(JSON.stringify(s));
    this.p1 = c.p1;
    this.p2 = c.p2;
    this.phase = c.phase;
    this.phaseTimer = c.phaseTimer;
    this.fightFrames = c.fightFrames;
    this.hitCooldown = c.hitCooldown;
    this.refereeState = c.refereeState;
    this.winner = c.winner;
    this.aiActionTimer = c.aiActionTimer;
    this.aiFlyingKickTimer = c.aiFlyingKickTimer;
  }

  /** 32-bit FNV-1a hash of the gameplay state. */
  public hashState(): number {
    const str = JSON.stringify(this.getState());
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // ==========================================
  // Main tick (exactly 1/60 s)
  // ==========================================

  public step(in1: number, in2: number) {
    if (!this.silent) {
      this.updateParticles();
      this.updateFloatingTexts();
    }

    switch (this.phase) {
      case 'INTRO':
        this.phaseTimer--;
        if (this.phaseTimer <= 0) {
          this.phase = 'COUNTDOWN';
          this.phaseTimer = 50;
          this.p1.state = 'IDLE';
          this.p2.state = 'IDLE';
          this.refereeState.action = 'hajime';
          this.refereeState.callText = 'HAJIME ! (COMBATTEZ)';
          this.sfx(() => soundEngine.playRefereeCall('hajime'));
        }
        break;
      case 'COUNTDOWN':
        this.phaseTimer--;
        if (this.phaseTimer <= 0) {
          this.phase = 'FIGHTING';
          this.refereeState.action = 'idle';
          this.refereeState.callText = '';
        }
        break;
      case 'FIGHTING':
        this.updateFightingPhase(in1, in2);
        break;
      case 'POINT_SCORED':
        this.updatePointScoredPhase();
        break;
      case 'ROUND_RESET':
        this.updateRoundResetPhase();
        break;
      case 'MATCH_OVER':
        if ((in1 | in2) & IN_REMATCH) {
          this.resetMatch();
        }
        break;
    }
  }

  private updateFightingPhase(in1: number, in2: number) {
    this.fightFrames++;
    if (this.fightFrames >= ROUND_SECONDS * TICK_RATE) {
      this.handleTimeOut();
      return;
    }

    if (this.hitCooldown > 0) this.hitCooldown--;

    this.applyInput(this.p1, in1);
    if (this.p2.isAi) {
      this.processAiBehavior();
    } else {
      this.applyInput(this.p2, in2);
    }

    this.updateFighterPhysics(this.p1);
    this.updateFighterPhysics(this.p2);

    if (this.p1.isGrounded && this.p1.state === 'IDLE') {
      this.p1.facing = this.p1.x <= this.p2.x ? 1 : -1;
    }
    if (this.p2.isGrounded && this.p2.state === 'IDLE') {
      this.p2.facing = this.p2.x >= this.p1.x ? -1 : 1;
    }

    if (this.hitCooldown <= 0) {
      // Fixed order on every machine => deterministic
      if (!this.checkHitboxes(this.p1, this.p2)) {
        this.checkHitboxes(this.p2, this.p1);
      }
    }
  }

  private updatePointScoredPhase() {
    this.phaseTimer--;
    if (this.phaseTimer > 0) return;

    if (this.p1.points >= 4 || this.p2.points >= 4) {
      this.endMatch(this.p1.points >= 4 ? 'p1' : 'p2');
    } else {
      this.phase = 'ROUND_RESET';
      this.phaseTimer = 60;
      this.refereeState.callText = '';
      this.refereeState.flagP1High = false;
      this.refereeState.flagP2High = false;
    }
  }

  private updateRoundResetPhase() {
    this.phaseTimer--;
    this.p1.x += (300 - this.p1.x) * 0.1;
    this.p2.x += (CANVAS_WIDTH - 300 - this.p2.x) * 0.1;
    for (const f of [this.p1, this.p2]) {
      f.state = 'IDLE';
      f.vx = 0;
      f.vy = 0;
      f.y = GROUND_Y;
      f.isGrounded = true;
      f.isBlocking = false;
      f.stateTimer = 0;
    }
    this.p1.facing = 1;
    this.p2.facing = -1;

    if (this.phaseTimer <= 0) {
      this.phase = 'COUNTDOWN';
      this.phaseTimer = 45;
      this.refereeState.action = 'hajime';
      this.refereeState.callText = 'HAJIME !';
      this.sfx(() => soundEngine.playRefereeCall('hajime'));
    }
  }

  private endMatch(winner: MatchWinner) {
    this.phase = 'MATCH_OVER';
    this.winner = winner;
    if (winner === 'draw') {
      this.refereeState.callText = 'ÉGALITÉ (HIKIWAKE) !';
    } else {
      const w = winner === 'p1' ? this.p1 : this.p2;
      this.refereeState.callText = `VICTOIRE DE ${w.name.toUpperCase()} !`;
      this.refereeState.flagP1High = winner === 'p1';
      this.refereeState.flagP2High = winner === 'p2';
    }
    this.sfx(() => soundEngine.playGong());
  }

  private handleTimeOut() {
    this.sfx(() => soundEngine.playRefereeCall('yame'));
    if (this.p1.points > this.p2.points) this.endMatch('p1');
    else if (this.p2.points > this.p1.points) this.endMatch('p2');
    else this.endMatch('draw');
    if (this.winner !== 'draw') {
      this.refereeState.callText = `TEMPS ÉCOULÉ : ${this.refereeState.callText}`;
    }
  }

  // ==========================================
  // Input -> fighter actions
  // ==========================================

  private isReeling(f: Fighter) {
    return f.state === 'HIT_LIGHT' || f.state === 'HIT_HEAVY' || f.state === 'FALL' || f.state === 'GET_UP';
  }

  private applyInput(p: Fighter, mask: number) {
    if (this.isReeling(p)) return;

    const up = !!(mask & IN_UP);
    const down = !!(mask & IN_DOWN);
    const left = !!(mask & IN_LEFT);
    const right = !!(mask & IN_RIGHT);
    const attack = !!(mask & IN_ATTACK);

    const forward = p.facing === 1 ? right : left;
    const back = p.facing === 1 ? left : right;

    if (attack) {
      let move: MoveType = 'PUNCH_MID';
      if (!p.isGrounded) move = 'KICK_FLYING';
      else if (up) move = 'PUNCH_HIGH';
      else if (down) move = 'KICK_LOW_SWEEP';
      else if (back) move = 'KICK_ROUNDHOUSE';
      else if (forward) move = 'KICK_MID';
      this.startAttack(p, move);
      return;
    }

    if (p.isGrounded && this.isActionFinished(p)) {
      if (up) {
        this.jumpFighter(p);
      } else if (down) {
        this.crouchFighter(p);
      } else if (forward) {
        this.moveFighter(p, p.facing);
        p.isBlocking = false;
      } else if (back) {
        this.moveFighter(p, -p.facing);
        p.isBlocking = true;
      } else if (p.state !== 'CROUCH' || p.stateTimer <= 0) {
        p.state = 'IDLE';
        p.vx = 0;
        p.isBlocking = false;
      }
    }
  }

  // ==========================================
  // Solo AI (belt scaled) — never used online
  // ==========================================

  private processAiBehavior() {
    const ai = this.p2;
    const player = this.p1;

    if (this.aiFlyingKickTimer > 0) {
      this.aiFlyingKickTimer--;
      if (this.aiFlyingKickTimer === 0 && !ai.isGrounded) this.startAttack(ai, 'KICK_FLYING');
    }

    if (this.isReeling(ai)) return;

    this.aiActionTimer++;
    const belt = ai.belt;
    const dist = Math.abs(ai.x - player.x);
    const reactionFrames = Math.max(8, Math.floor(belt.aiReactionTime / 22));

    if (this.aiActionTimer < reactionFrames || !this.isActionFinished(ai) || !ai.isGrounded) return;
    this.aiActionTimer = 0;

    // Training dummy only guards
    if (this.mode === 'TRAINING') {
      ai.state = 'IDLE';
      ai.vx = 0;
      return;
    }

    const isPlayerAttacking = player.state.startsWith('PUNCH_') || player.state.startsWith('KICK_');
    if (isPlayerAttacking && dist < 110 && Math.random() < belt.aiCounterChance) {
      if (player.state === 'KICK_LOW_SWEEP') {
        this.jumpFighter(ai);
      } else {
        ai.state = 'BLOCK';
        ai.isBlocking = true;
        ai.vx = 0;
        ai.stateTimer = 20;
      }
      return;
    }

    if (dist > 95) {
      if (Math.random() < 0.25 && dist > 140 && belt.level >= 4) {
        this.jumpFighter(ai);
        this.aiFlyingKickTimer = 11;
      } else {
        this.moveFighter(ai, ai.facing);
        ai.isBlocking = false;
      }
    } else if (dist < 45) {
      if (Math.random() < 0.5) {
        this.moveFighter(ai, -ai.facing);
        ai.isBlocking = true;
      } else {
        this.startAttack(ai, 'KICK_LOW_SWEEP');
      }
    } else if (Math.random() < belt.aiAggression) {
      const attacks: MoveType[] = ['PUNCH_MID', 'PUNCH_HIGH', 'KICK_MID', 'KICK_ROUNDHOUSE', 'KICK_LOW_SWEEP'];
      this.startAttack(ai, attacks[Math.floor(Math.random() * attacks.length)]);
    } else {
      ai.state = 'IDLE';
      ai.vx = 0;
      ai.isBlocking = false;
    }
  }

  // ==========================================
  // Actions & physics
  // ==========================================

  private moveFighter(f: Fighter, dir: number) {
    f.vx = dir * 3.6;
    f.state = dir === f.facing ? 'WALK_FORWARD' : 'WALK_BACK';
    f.lastMoveName = MOVES_DATA[f.state].nameFr;
  }

  private jumpFighter(f: Fighter) {
    if (!f.isGrounded) return;
    f.vy = -12.5;
    f.isGrounded = false;
    f.isBlocking = false;
    f.state = 'JUMP';
    f.lastMoveName = 'Saut Aérien';
    this.sfx(() => soundEngine.playWhoosh('jump'));
    this.createDustPuff(f.x, GROUND_Y);
  }

  private crouchFighter(f: Fighter) {
    f.state = 'CROUCH';
    f.vx = 0;
    f.isBlocking = false;
    f.stateTimer = 18;
    f.lastMoveName = 'Accroupi';
  }

  private startAttack(f: Fighter, move: MoveType) {
    if (!this.isActionFinished(f)) return;
    f.state = move;
    f.animFrame = 0;
    f.stateTimer = MOVES_DATA[move].duration;
    f.lastMoveName = MOVES_DATA[move].nameFr;
    f.isBlocking = false;
    if (f.isGrounded) f.vx = 0; // planted strikes
    this.sfx(() => soundEngine.playWhoosh(move.startsWith('KICK_') ? 'kick' : 'punch'));
  }

  private isActionFinished(f: Fighter): boolean {
    const isAttacking = f.state.startsWith('PUNCH_') || f.state.startsWith('KICK_') || f.state === 'BLOCK';
    return !isAttacking && !this.isReeling(f);
  }

  private updateFighterPhysics(f: Fighter) {
    f.x += f.vx;
    f.x = Math.max(120, Math.min(CANVAS_WIDTH - 120, f.x));

    if (!f.isGrounded) {
      f.vy += 0.72;
      f.y += f.vy;
      if (f.y >= GROUND_Y) {
        f.y = GROUND_Y;
        f.vy = 0;
        f.isGrounded = true;
        f.vx = 0;
        this.createDustPuff(f.x, GROUND_Y);
        if (f.state === 'JUMP' || f.state === 'KICK_FLYING') f.state = 'IDLE';
      }
    }

    f.animFrame++;

    if (f.stateTimer > 0) {
      f.stateTimer--;
      if (f.stateTimer <= 0) {
        if (f.state === 'FALL') {
          f.state = 'GET_UP';
          f.stateTimer = 25;
        } else if (
          f.state === 'HIT_LIGHT' || f.state === 'HIT_HEAVY' || f.state === 'GET_UP' ||
          f.state === 'BLOCK' || f.state === 'CROUCH' ||
          (f.isGrounded && (f.state.startsWith('PUNCH_') || f.state.startsWith('KICK_')))
        ) {
          f.state = 'IDLE';
          f.isBlocking = false;
        }
      }
    }
  }

  // ==========================================
  // Hit detection & scoring
  // ==========================================

  private checkHitboxes(attacker: Fighter, defender: Fighter): boolean {
    const move = attacker.state;
    if (!move.startsWith('PUNCH_') && !move.startsWith('KICK_')) return false;

    const moveData = MOVES_DATA[move];
    if (attacker.animFrame < moveData.hitFrameStart || attacker.animFrame > moveData.hitFrameEnd) return false;

    const strikeX = attacker.x + attacker.facing * moveData.reach;
    const strikeY = attacker.y - (moveData.height === 'high' ? 75 : moveData.height === 'mid' ? 45 : 15);

    const defLeft = defender.x - 24;
    const defRight = defender.x + 24;
    const defTop = defender.y - (defender.state === 'CROUCH' ? 45 : 85);
    const defBottom = defender.y;

    if (strikeX >= defLeft && strikeX <= defRight && strikeY >= defTop && strikeY <= defBottom) {
      this.resolveHit(attacker, defender, moveData);
      return true;
    }
    return false;
  }

  private resolveHit(attacker: Fighter, defender: Fighter, moveData: typeof MOVES_DATA[MoveType]) {
    this.hitCooldown = 60;

    const isDefending = defender.isBlocking || defender.state === 'BLOCK';
    const canBlock = isDefending && moveData.height !== 'low';

    if (canBlock) {
      this.sfx(() => soundEngine.playBlock());
      this.createBlockSpark(defender.x - defender.facing * 10, defender.y - 45);
      defender.x -= defender.facing * 18;
      this.addFloatingText('BLOCAGE !', 'Garde Uke', defender.x, defender.y - 80, '#38bdf8');
      return;
    }

    const isIppon = moveData.damage === 2;
    this.sfx(() => soundEngine.playHit(isIppon));

    if (isIppon) {
      attacker.fullPoints += 1;
      attacker.points += 2;
      defender.state = 'HIT_HEAVY';
      defender.stateTimer = 44;
      this.sfx(() => soundEngine.playRefereeCall('ippon'));
      this.addFloatingText('IPPON !', 'Point Complet (一本)', attacker.x, attacker.y - 100, '#eab308');
    } else {
      attacker.halfPoints += 1;
      attacker.points += 1;
      defender.state = 'HIT_LIGHT';
      defender.stateTimer = 32;
      this.sfx(() => soundEngine.playRefereeCall('waza-ari'));
      this.addFloatingText('WAZA-ARI !', 'Demi-Point (技あり)', attacker.x, attacker.y - 100, '#f97316');
    }
    defender.isBlocking = false;
    defender.vx = 0;

    defender.x += attacker.facing * 24;
    this.createHitSparks(defender.x, defender.y - 50, isIppon);

    this.phase = 'POINT_SCORED';
    this.phaseTimer = 140;
    this.refereeState.action = attacker.id === 'p1' ? 'award_p1' : 'award_p2';
    this.refereeState.flagP1High = attacker.id === 'p1';
    this.refereeState.flagP2High = attacker.id === 'p2';
    this.refereeState.callText = `YAME ! ${isIppon ? 'IPPON' : 'WAZA-ARI'} (${attacker.name.toUpperCase()})`;
  }

  // ==========================================
  // Cosmetic FX (not part of the simulated state)
  // ==========================================

  private sfx(fn: () => void) {
    if (!this.silent) fn();
  }

  private createHitSparks(x: number, y: number, isIppon: boolean) {
    if (this.silent) return;
    const count = isIppon ? 18 : 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.4 ? '#fde047' : '#ea580c',
        alpha: 1,
        decay: 0.045,
        shape: 'spark'
      });
    }
  }

  private createBlockSpark(x: number, y: number) {
    if (this.silent) return;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3,
        color: '#38bdf8',
        alpha: 1,
        decay: 0.06,
        shape: 'circle'
      });
    }
  }

  private createDustPuff(x: number, y: number) {
    if (this.silent) return;
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y - 4,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -0.5 - Math.random() * 1.5,
        size: 4 + Math.random() * 5,
        color: '#78716c',
        alpha: 0.6,
        decay: 0.035,
        shape: 'circle'
      });
    }
  }

  private addFloatingText(text: string, subText: string, x: number, y: number, color: string) {
    if (this.silent) return;
    this.floatingTexts.push({
      id: Math.random().toString(36),
      text, subText, x, y, color,
      alpha: 1,
      scale: 1.2,
      life: 70
    });
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  private updateFloatingTexts() {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y -= 0.6;
      t.life--;
      if (t.life < 20) t.alpha = t.life / 20;
      if (t.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }
}
