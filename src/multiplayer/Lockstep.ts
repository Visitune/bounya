import { GameEngine } from '../game/GameEngine';
import { MultiplayerMessage } from './MultiplayerClient';

/**
 * Delay-based lockstep netcode.
 *
 * - Each machine schedules its local input for frame `frame + delay` and sends it.
 * - The simulation only advances frame N once both inputs for N are known,
 *   so both machines run the exact same deterministic simulation (fair for both players).
 * - Every HASH_INTERVAL frames both sides exchange a state hash. On mismatch the
 *   guest asks the host for a snapshot and replays its recent inputs on top of it.
 */

export const DEFAULT_INPUT_DELAY = 4; // 4 frames ≈ 67 ms of input latency
const HASH_INTERVAL = 120;
const HISTORY = 600;

type Send = (msg: MultiplayerMessage) => void;

export class LockstepSession {
  public frame = 0;
  public desyncCount = 0;
  private local = new Map<number, number>();
  private remote = new Map<number, number>();
  private history = new Map<number, [number, number]>();
  private myHashes = new Map<number, number>();
  private peerHashes = new Map<number, number>();
  private pendingSnapshot: { frame: number; state: ReturnType<GameEngine['getState']> } | null = null;
  private stalledSince = 0;
  private maxRemoteFrame = -1;

  constructor(
    private engine: GameEngine,
    private role: 'p1' | 'p2',
    private send: Send,
    public readonly delay: number = DEFAULT_INPUT_DELAY
  ) {
    for (let f = 0; f < delay; f++) {
      this.local.set(f, 0);
      this.remote.set(f, 0);
    }
    this.maxRemoteFrame = delay - 1;
  }

  /** True when we have been waiting for the opponent for a noticeable time. */
  public get isWaiting(): boolean {
    return this.stalledSince > 0 && performance.now() - this.stalledSince > 300;
  }

  /** How many frames of opponent input we already hold beyond the current frame. */
  public get remoteLead(): number {
    return this.maxRemoteFrame - this.frame;
  }

  public receive(msg: MultiplayerMessage) {
    switch (msg.type) {
      case 'INPUT': {
        const f = msg.f as number;
        if (f >= this.frame) {
          this.remote.set(f, (msg.m as number) | 0);
          if (f > this.maxRemoteFrame) this.maxRemoteFrame = f;
        }
        break;
      }
      case 'HASH':
        this.peerHashes.set(msg.f as number, msg.h as number);
        this.compareHash(msg.f as number);
        break;
      case 'SYNC_REQUEST':
        if (this.role === 'p1') {
          // State at the *start* of our current frame
          this.send({ type: 'SNAPSHOT', f: this.frame, state: this.engine.getState() });
        }
        break;
      case 'SNAPSHOT':
        if (this.role === 'p2') {
          this.applySnapshot(msg.f as number, msg.state as ReturnType<GameEngine['getState']>);
        }
        break;
    }
  }

  /** Try to advance one frame. Returns false if stalled waiting for the opponent. */
  public tick(sampleLocal: () => number): boolean {
    const target = this.frame + this.delay;
    if (!this.local.has(target)) {
      const m = sampleLocal();
      this.local.set(target, m);
      this.send({ type: 'INPUT', f: target, m });
    }

    const remoteInput = this.remote.get(this.frame);
    if (remoteInput === undefined) {
      if (this.stalledSince === 0) this.stalledSince = performance.now();
      return false;
    }
    this.stalledSince = 0;

    if (this.pendingSnapshot && this.pendingSnapshot.frame === this.frame) {
      this.engine.setState(this.pendingSnapshot.state);
      this.pendingSnapshot = null;
    }

    const localInput = this.local.get(this.frame) ?? 0;
    const inputs: [number, number] = this.role === 'p1' ? [localInput, remoteInput] : [remoteInput, localInput];
    this.history.set(this.frame, inputs);
    this.history.delete(this.frame - HISTORY);

    this.engine.step(inputs[0], inputs[1]);

    this.local.delete(this.frame);
    this.remote.delete(this.frame);
    this.frame++;

    if (this.frame % HASH_INTERVAL === 0) {
      const h = this.engine.hashState();
      this.myHashes.set(this.frame, h);
      this.send({ type: 'HASH', f: this.frame, h });
      this.compareHash(this.frame);
    }
    return true;
  }

  private compareHash(f: number) {
    const mine = this.myHashes.get(f);
    const theirs = this.peerHashes.get(f);
    if (mine === undefined || theirs === undefined) return;
    this.myHashes.delete(f);
    this.peerHashes.delete(f);
    if (mine !== theirs) {
      this.desyncCount++;
      console.warn(`[lockstep] désynchronisation détectée à la frame ${f}`);
      if (this.role === 'p2') this.send({ type: 'SYNC_REQUEST', f });
    }
    // Drop stale entries
    for (const k of this.myHashes.keys()) if (k < f - HASH_INTERVAL * 4) this.myHashes.delete(k);
    for (const k of this.peerHashes.keys()) if (k < f - HASH_INTERVAL * 4) this.peerHashes.delete(k);
  }

  private applySnapshot(f: number, state: ReturnType<GameEngine['getState']>) {
    if (f > this.frame) {
      this.pendingSnapshot = { frame: f, state };
      return;
    }
    // Load host state at frame f, then silently replay our own history up to now
    this.engine.setState(state);
    this.engine.silent = true;
    for (let i = f; i < this.frame; i++) {
      const inputs = this.history.get(i);
      if (!inputs) break;
      this.engine.step(inputs[0], inputs[1]);
    }
    this.engine.silent = false;
  }
}
