import { BeltRank, MoveData, MoveType } from '../types/game';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
export const GROUND_Y = 430;

export const BELT_RANKS: BeltRank[] = [
  { id: 'white', name: 'Ceinture Blanche', level: 1, color: '#f4f4f5', aiAggression: 0.25, aiReactionTime: 850, aiCounterChance: 0.1 },
  { id: 'yellow', name: 'Ceinture Jaune', level: 2, color: '#eab308', aiAggression: 0.35, aiReactionTime: 700, aiCounterChance: 0.2 },
  { id: 'orange', name: 'Ceinture Orange', level: 3, color: '#f97316', aiAggression: 0.45, aiReactionTime: 580, aiCounterChance: 0.3 },
  { id: 'green', name: 'Ceinture Verte', level: 4, color: '#22c55e', aiAggression: 0.55, aiReactionTime: 480, aiCounterChance: 0.4 },
  { id: 'blue', name: 'Ceinture Bleue', level: 5, color: '#3b82f6', aiAggression: 0.65, aiReactionTime: 400, aiCounterChance: 0.5 },
  { id: 'brown', name: 'Ceinture Marron', level: 6, color: '#854d0e', aiAggression: 0.75, aiReactionTime: 330, aiCounterChance: 0.6 },
  { id: 'black1', name: 'Ceinture Noire 1er Dan', level: 7, dan: 1, color: '#18181b', aiAggression: 0.82, aiReactionTime: 280, aiCounterChance: 0.7 },
  { id: 'black3', name: 'Ceinture Noire 3e Dan', level: 8, dan: 3, color: '#18181b', aiAggression: 0.88, aiReactionTime: 230, aiCounterChance: 0.78 },
  { id: 'black5', name: 'Ceinture Noire 5e Dan', level: 9, dan: 5, color: '#18181b', aiAggression: 0.94, aiReactionTime: 180, aiCounterChance: 0.85 },
  { id: 'grandmaster', name: 'Grand Maître 10e Dan', level: 10, dan: 10, color: '#dc2626', aiAggression: 0.98, aiReactionTime: 130, aiCounterChance: 0.92 }
];

export const MOVES_DATA: Record<MoveType, MoveData> = {
  IDLE: {
    id: 'IDLE',
    nameFr: 'Position de Garde',
    nameJp: 'Kamae',
    keyP1: 'Aucune',
    keyP2: 'Aucune',
    damage: 1,
    reach: 0,
    height: 'mid',
    duration: 1,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Posture de combat neutre équilibrée.'
  },
  WALK_FORWARD: {
    id: 'WALK_FORWARD',
    nameFr: 'Avancer',
    nameJp: 'Ayumi Ashi',
    keyP1: '→',
    keyP2: 'D',
    damage: 1,
    reach: 0,
    height: 'mid',
    duration: 12,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Déplacement tactique vers l’adversaire.'
  },
  WALK_BACK: {
    id: 'WALK_BACK',
    nameFr: 'Reculer / Garde',
    nameJp: 'Hiki Ashi',
    keyP1: '←',
    keyP2: 'Q / A',
    damage: 1,
    reach: 0,
    height: 'mid',
    duration: 12,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Retrait défensif qui bloque les coups directs.'
  },
  JUMP: {
    id: 'JUMP',
    nameFr: 'Saut Aérien',
    nameJp: 'Tobi',
    keyP1: '↑',
    keyP2: 'Z / W',
    damage: 1,
    reach: 0,
    height: 'high',
    duration: 28,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Bond aérien pour esquiver les balayettes basses.'
  },
  CROUCH: {
    id: 'CROUCH',
    nameFr: 'Accroupi / Esquive basse',
    nameJp: 'Seiza / Kamae',
    keyP1: '↓',
    keyP2: 'S',
    damage: 1,
    reach: 0,
    height: 'low',
    duration: 18,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Esquive sous les coups de poing et de pied hauts.'
  },
  PUNCH_HIGH: {
    id: 'PUNCH_HIGH',
    nameFr: 'Coup de Poing Haut',
    nameJp: 'Jodan Tsuki',
    keyP1: 'Espace + ↑',
    keyP2: 'F + Z / W',
    damage: 2, // Ippon
    reach: 65,
    height: 'high',
    duration: 22,
    hitFrameStart: 8,
    hitFrameEnd: 15,
    description: 'Frappe fulgurante au visage valant Ippon (point complet) !'
  },
  PUNCH_MID: {
    id: 'PUNCH_MID',
    nameFr: 'Coup de Poing Direct',
    nameJp: 'Chudan Tsuki',
    keyP1: 'Espace ou Espace + →',
    keyP2: 'F ou F + D',
    damage: 1, // Waza-ari
    reach: 58,
    height: 'mid',
    duration: 18,
    hitFrameStart: 6,
    hitFrameEnd: 12,
    description: 'Coup de poing rapide au plexus valant Waza-ari (demi-point).'
  },
  KICK_MID: {
    id: 'KICK_MID',
    nameFr: 'Coup de Pied Frontal',
    nameJp: 'Mae Geri',
    keyP1: 'Espace + → (élan)',
    keyP2: 'F + D',
    damage: 1, // Waza-ari
    reach: 72,
    height: 'mid',
    duration: 24,
    hitFrameStart: 9,
    hitFrameEnd: 16,
    description: 'Pied droit puissant avec allonge pour maintenir la distance.'
  },
  KICK_ROUNDHOUSE: {
    id: 'KICK_ROUNDHOUSE',
    nameFr: 'Coup de Pied Circulaire',
    nameJp: 'Mawashi Geri',
    keyP1: 'Espace + ←',
    keyP2: 'F + Q / A',
    damage: 2, // Ippon
    reach: 78,
    height: 'high',
    duration: 28,
    hitFrameStart: 11,
    hitFrameEnd: 20,
    description: 'Frappe circulaire dévastatrice à la tempe valant Ippon.'
  },
  KICK_LOW_SWEEP: {
    id: 'KICK_LOW_SWEEP',
    nameFr: 'Balayette au Sol',
    nameJp: 'Ashi Barai',
    keyP1: 'Espace + ↓',
    keyP2: 'F + S',
    damage: 1, // Waza-ari
    reach: 70,
    height: 'low',
    duration: 24,
    hitFrameStart: 8,
    hitFrameEnd: 16,
    description: 'Balaye les appuis de l’adversaire en passant sous sa garde.'
  },
  KICK_FLYING: {
    id: 'KICK_FLYING',
    nameFr: 'Coup de Pied Sauté Volant',
    nameJp: 'Tobi Yoko Geri',
    keyP1: 'Espace en l’air',
    keyP2: 'F en l’air',
    damage: 2, // Ippon
    reach: 82,
    height: 'high',
    duration: 30,
    hitFrameStart: 8,
    hitFrameEnd: 22,
    description: 'Coup de pied sauté spectaculaire, déclenché en l’air.'
  },
  BLOCK: {
    id: 'BLOCK',
    nameFr: 'Blocage / Garde Croisée',
    nameJp: 'Uke',
    keyP1: '← (face à l’attaque)',
    keyP2: 'Q / A',
    damage: 1,
    reach: 0,
    height: 'mid',
    duration: 16,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Déviation des coups de poing et de pied directs.'
  },
  HIT_LIGHT: {
    id: 'HIT_LIGHT',
    nameFr: 'Touche Waza-ari',
    nameJp: 'Waza-ari Uke',
    keyP1: '',
    keyP2: '',
    damage: 1,
    reach: 0,
    height: 'mid',
    duration: 32,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Le combattant chancelle sous l’impact du demi-point.'
  },
  HIT_HEAVY: {
    id: 'HIT_HEAVY',
    nameFr: 'Impact Ippon',
    nameJp: 'Ippon Uke',
    keyP1: '',
    keyP2: '',
    damage: 2,
    reach: 0,
    height: 'high',
    duration: 44,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Impact puissant projetant le karatéka au sol.'
  },
  FALL: {
    id: 'FALL',
    nameFr: 'Chute au Sol',
    nameJp: 'Ukemi',
    keyP1: '',
    keyP2: '',
    damage: 2,
    reach: 0,
    height: 'low',
    duration: 50,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Chute au tapis suite à une balayette ou coup sauté.'
  },
  GET_UP: {
    id: 'GET_UP',
    nameFr: 'Se Relever',
    nameJp: 'Tachiagari',
    keyP1: '',
    keyP2: '',
    damage: 1,
    reach: 0,
    height: 'low',
    duration: 25,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Le combattant se redresse pour reprendre la garde.'
  },
  BOW: {
    id: 'BOW',
    nameFr: 'Salut Cérémonial',
    nameJp: 'Rei',
    keyP1: '',
    keyP2: '',
    damage: 1,
    reach: 0,
    height: 'mid',
    duration: 40,
    hitFrameStart: 0,
    hitFrameEnd: 0,
    description: 'Salut traditionnel d’avant et après combat.'
  }
};
