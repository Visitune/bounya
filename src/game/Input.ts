/**
 * Unified input layer.
 * Every source (keyboard, gamepads, touch) is reduced to a per-frame bitmask
 * so the engine, the AI and the online lockstep all consume the same data.
 */

export const IN_UP = 1;
export const IN_DOWN = 2;
export const IN_LEFT = 4;
export const IN_RIGHT = 8;
export const IN_ATTACK = 16;
export const IN_REMATCH = 32;

export type TouchAction =
  | 'PUNCH_HIGH'
  | 'PUNCH_MID'
  | 'KICK_MID'
  | 'KICK_ROUNDHOUSE'
  | 'KICK_LOW_SWEEP'
  | 'KICK_FLYING'
  | 'JUMP'
  | 'CROUCH'
  | 'LEFT'
  | 'RIGHT';

export type TouchDir = 'arrowleft' | 'arrowright' | 'arrowup' | 'arrowdown';

// Physical key codes (KeyboardEvent.code) => works identically on AZERTY and QWERTY.
const P1_KEYS: Record<string, number> = {
  ArrowUp: IN_UP,
  ArrowDown: IN_DOWN,
  ArrowLeft: IN_LEFT,
  ArrowRight: IN_RIGHT,
  Space: IN_ATTACK,
  ControlRight: IN_ATTACK,
  Numpad0: IN_ATTACK
};

// Z/Q/S/D on AZERTY, W/A/S/D on QWERTY (same physical keys) + F or G to attack
const P2_KEYS: Record<string, number> = {
  KeyW: IN_UP,
  KeyS: IN_DOWN,
  KeyA: IN_LEFT,
  KeyD: IN_RIGHT,
  KeyF: IN_ATTACK,
  KeyG: IN_ATTACK
};

export const GAME_KEY_CODES = new Set([...Object.keys(P1_KEYS), ...Object.keys(P2_KEYS)]);

const DEADZONE = 0.45;

function readGamepad(pad: Gamepad | null): number {
  if (!pad || !pad.connected) return 0;
  let m = 0;
  const ax = pad.axes[0] ?? 0;
  const ay = pad.axes[1] ?? 0;
  const btn = (i: number) => !!pad.buttons[i]?.pressed;
  if (ay < -DEADZONE || btn(12)) m |= IN_UP;
  if (ay > DEADZONE || btn(13)) m |= IN_DOWN;
  if (ax < -DEADZONE || btn(14)) m |= IN_LEFT;
  if (ax > DEADZONE || btn(15)) m |= IN_RIGHT;
  // Any face button / shoulder = fire (single-button joystick feel)
  if (btn(0) || btn(1) || btn(2) || btn(3) || btn(4) || btn(5)) m |= IN_ATTACK;
  return m;
}

export class InputManager {
  private codes = new Set<string>();
  private touchDirs = new Set<TouchDir>();
  private touchAttack = false;
  /** Short pulses (frames remaining) injected by touch buttons */
  private pulseMask = 0;
  private pulseFrames = 0;
  private rematchFrames = 0;

  public keyDown(code: string) {
    this.codes.add(code);
  }

  public keyUp(code: string) {
    this.codes.delete(code);
  }

  public clear() {
    this.codes.clear();
    this.touchDirs.clear();
    this.touchAttack = false;
    this.pulseMask = 0;
    this.pulseFrames = 0;
  }

  public touchDirDown(dir: TouchDir) {
    this.touchDirs.add(dir);
  }

  public touchDirUp(dir: TouchDir) {
    this.touchDirs.delete(dir);
  }

  /** Replace all held touch directions at once (virtual joystick). */
  public setTouchDirs(dirs: TouchDir[]) {
    this.touchDirs = new Set(dirs);
  }

  /** Virtual "space bar": held while the finger stays on the attack button. */
  public setTouchAttack(held: boolean) {
    this.touchAttack = held;
  }

  /** Convert a touch "move" button into a short input pulse relative to facing. */
  public touchAction(action: TouchAction, facing: 1 | -1) {
    const fwd = facing === 1 ? IN_RIGHT : IN_LEFT;
    const back = facing === 1 ? IN_LEFT : IN_RIGHT;
    let mask = 0;
    let frames = 6;
    switch (action) {
      case 'PUNCH_MID': mask = IN_ATTACK; break;
      case 'PUNCH_HIGH': mask = IN_ATTACK | IN_UP; break;
      case 'KICK_MID': mask = IN_ATTACK | fwd; break;
      case 'KICK_ROUNDHOUSE': mask = IN_ATTACK | back; break;
      case 'KICK_LOW_SWEEP': mask = IN_ATTACK | IN_DOWN; break;
      case 'KICK_FLYING':
        // Jump then attack while airborne
        mask = IN_UP; frames = 4;
        this.queuedAttack = 10;
        break;
      case 'JUMP': mask = IN_UP; frames = 4; break;
      case 'CROUCH': mask = IN_DOWN; frames = 10; break;
      case 'LEFT': mask = IN_LEFT; frames = 10; break;
      case 'RIGHT': mask = IN_RIGHT; frames = 10; break;
    }
    this.pulseMask = mask;
    this.pulseFrames = frames;
  }

  private queuedAttack = 0;

  /** Ask for a rematch (online): adds IN_REMATCH for a few frames. */
  public requestRematch() {
    this.rematchFrames = 10;
  }

  private keyboardMask(map: Record<string, number>): number {
    let m = 0;
    for (const code of this.codes) {
      const bit = map[code];
      if (bit) m |= bit;
    }
    return m;
  }

  private touchMask(): number {
    let m = 0;
    if (this.touchDirs.has('arrowup')) m |= IN_UP;
    if (this.touchDirs.has('arrowdown')) m |= IN_DOWN;
    if (this.touchDirs.has('arrowleft')) m |= IN_LEFT;
    if (this.touchDirs.has('arrowright')) m |= IN_RIGHT;
    if (this.touchAttack) m |= IN_ATTACK;
    if (this.pulseFrames > 0) {
      m |= this.pulseMask;
      this.pulseFrames--;
    } else if (this.queuedAttack > 0) {
      this.queuedAttack--;
      if (this.queuedAttack < 6) m |= IN_ATTACK;
    }
    if (this.rematchFrames > 0) {
      m |= IN_REMATCH;
      this.rematchFrames--;
    }
    return m;
  }

  private pads(): (Gamepad | null)[] {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
    return Array.from(navigator.getGamepads()).filter((p): p is Gamepad => !!p && p.connected);
  }

  /**
   * Sample one frame.
   * - splitPlayers=true (local duel): P1 = arrows/space + pad #1 + touch, P2 = ZQSD/F + pad #2
   * - splitPlayers=false (solo / online): everything controls the local player
   */
  public sample(splitPlayers: boolean): { p1: number; p2: number } {
    const pads = this.pads();
    const touch = this.touchMask();
    const k1 = this.keyboardMask(P1_KEYS);
    const k2 = this.keyboardMask(P2_KEYS);

    if (splitPlayers) {
      return {
        p1: k1 | touch | readGamepad(pads[0] ?? null),
        p2: k2 | readGamepad(pads[1] ?? null)
      };
    }

    let all = k1 | k2 | touch;
    for (const p of pads) all |= readGamepad(p);
    return { p1: all, p2: 0 };
  }

  public connectedPadCount(): number {
    return this.pads().length;
  }
}

export const inputManager = new InputManager();
