/**
 * WebSocket client for remote 2-player matches.
 * The server is a thin relay: rooms, player names and input packets.
 */

export interface MultiplayerMessage {
  type: string;
  [key: string]: unknown;
}

export interface MatchStartInfo {
  role: 'p1' | 'p2';
  p1Name: string;
  p2Name: string;
  p1Gi: string;
  p2Gi: string;
}

function resolveWsUrl(): string {
  // Optional override when the front-end is hosted separately from the server
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_WS_URL;
  if (envUrl) return envUrl;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private pingTimer: number | null = null;
  public roomCode: string | null = null;
  public role: 'p1' | 'p2' | null = null;
  public playerName = 'Karatéka';
  public opponentName = 'Adversaire';
  public isConnected = false;
  /** Round-trip time to the server in ms (peer latency ≈ both players' RTT / 2 summed). */
  public rtt = 0;

  public onRoomCreated?: (roomCode: string) => void;
  public onRoomJoined?: (roomCode: string, p1Name: string, p2Name: string) => void;
  public onMatchStart?: (info: MatchStartInfo) => void;
  /** Gameplay packets from the opponent (INPUT / HASH / SYNC_REQUEST / SNAPSHOT). */
  public onPeerMessage?: (msg: MultiplayerMessage) => void;
  public onOpponentDisconnect?: (message: string) => void;
  public onConnectionLost?: () => void;
  public onError?: (message: string) => void;

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        const ws = new WebSocket(resolveWsUrl());
        this.ws = ws;
        let opened = false;

        ws.onopen = () => {
          opened = true;
          this.isConnected = true;
          this.startPing();
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            this.handleMessage(JSON.parse(event.data));
          } catch {
            /* ignore malformed packets */
          }
        };

        ws.onclose = () => {
          const wasInRoom = !!this.roomCode;
          this.isConnected = false;
          this.stopPing();
          if (this.ws === ws) this.ws = null;
          if (!opened) reject(new Error('connection failed'));
          else if (wasInRoom) this.onConnectionLost?.();
        };

        ws.onerror = () => {
          this.isConnected = false;
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = window.setInterval(() => {
      this.send({ type: 'PING', t: performance.now() });
    }, 2000);
    this.send({ type: 'PING', t: performance.now() });
  }

  private stopPing() {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  public async createRoom(name: string, giColor: string) {
    await this.connect();
    this.playerName = name;
    this.role = 'p1';
    this.send({ type: 'CREATE_ROOM', name, giColor });
  }

  public async joinRoom(roomCode: string, name: string, giColor: string) {
    await this.connect();
    this.playerName = name;
    this.role = 'p2';
    this.send({ type: 'JOIN_ROOM', roomCode, name, giColor });
  }

  public send(msg: MultiplayerMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public disconnect() {
    this.stopPing();
    this.roomCode = null;
    this.role = null;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.close();
    }
    this.isConnected = false;
  }

  private handleMessage(msg: MultiplayerMessage) {
    switch (msg.type) {
      case 'PONG':
        this.rtt = Math.round(performance.now() - (msg.t as number));
        break;

      case 'ROOM_CREATED':
        this.roomCode = msg.roomCode as string;
        this.role = 'p1';
        this.onRoomCreated?.(this.roomCode);
        break;

      case 'ROOM_JOINED':
        this.roomCode = msg.roomCode as string;
        this.role = 'p2';
        this.opponentName = msg.p1Name as string;
        this.onRoomJoined?.(this.roomCode, msg.p1Name as string, msg.p2Name as string);
        break;

      case 'MATCH_START': {
        const role = this.role || 'p1';
        this.opponentName = (role === 'p1' ? msg.p2Name : msg.p1Name) as string;
        this.onMatchStart?.({
          role,
          p1Name: msg.p1Name as string,
          p2Name: msg.p2Name as string,
          p1Gi: msg.p1Gi as string,
          p2Gi: msg.p2Gi as string
        });
        break;
      }

      case 'INPUT':
      case 'HASH':
      case 'SYNC_REQUEST':
      case 'SNAPSHOT':
        this.onPeerMessage?.(msg);
        break;

      case 'OPPONENT_DISCONNECTED':
        this.onOpponentDisconnect?.((msg.message as string) || 'Adversaire déconnecté');
        break;

      case 'ERROR':
        this.onError?.(msg.message as string);
        break;
    }
  }
}

export const multiplayerClient = new MultiplayerClient();
