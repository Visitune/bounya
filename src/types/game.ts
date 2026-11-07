/**
 * Types and definitions for KIAI 64
 */

export type MoveType =
  | 'IDLE'
  | 'WALK_FORWARD'
  | 'WALK_BACK'
  | 'JUMP'
  | 'CROUCH'
  | 'PUNCH_HIGH'
  | 'PUNCH_MID'
  | 'KICK_MID'
  | 'KICK_ROUNDHOUSE'
  | 'KICK_LOW_SWEEP'
  | 'KICK_FLYING'
  | 'BLOCK'
  | 'HIT_LIGHT'
  | 'HIT_HEAVY'
  | 'FALL'
  | 'GET_UP'
  | 'BOW';

export type GameMode = 'TOURNAMENT' | 'TWO_PLAYER' | 'TRAINING' | 'ONLINE';

export type MatchPhase =
  | 'INTRO'       // Bowing ceremony
  | 'COUNTDOWN'   // Referee says "Hajime!"
  | 'FIGHTING'    // Active fight
  | 'POINT_SCORED'// Referee says "Yame!" and awards point
  | 'ROUND_RESET' // Fighters walk back to starting positions
  | 'MATCH_OVER'; // Winner declared

export interface BeltRank {
  id: string;
  name: string;
  level: number;
  color: string;
  dan?: number;
  aiAggression: number;   // 0.1 to 0.95
  aiReactionTime: number; // ms delay
  aiCounterChance: number;// 0.0 to 0.8
}

export interface Fighter {
  id: 'p1' | 'p2';
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1; // 1 = facing right, -1 = facing left
  state: MoveType;
  animFrame: number;
  stateTimer: number;
  isGrounded: boolean;
  giColor: string;
  beltColor: string;
  headbandColor: string;
  points: number; // 0, 1 (half point), 2 (one full or two half), 3, 4 (2 full points = WIN)
  halfPoints: number; // Waza-ari count
  fullPoints: number; // Ippon count
  belt: BeltRank;
  isAi: boolean;
  isBlocking: boolean;
  lastMoveName: string;
}

export interface MoveData {
  id: MoveType;
  nameFr: string;
  nameJp: string;
  keyP1: string;
  keyP2: string;
  damage: 1 | 2; // 1 = Waza-ari (half point), 2 = Ippon (full point)
  reach: number;
  height: 'high' | 'mid' | 'low';
  duration: number; // in frames at 60fps
  hitFrameStart: number;
  hitFrameEnd: number;
  description: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation?: number;
  vRot?: number;
  shape?: 'circle' | 'spark' | 'petal';
}

export interface FloatingText {
  id: string;
  text: string;
  subText?: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
  life: number;
}
