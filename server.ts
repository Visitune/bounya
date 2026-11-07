import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { randomInt } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
const PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });

interface PlayerClient {
  ws: WebSocket;
  name: string;
  role: 'p1' | 'p2';
  giColor: string;
}

interface Room {
  code: string;
  players: PlayerClient[];
  lastActive: number;
}

const rooms = new Map<string, Room>();

// Codes without ambiguous characters (0/O, 1/I)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newRoomCode(): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < 4; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    if (!rooms.has(code)) return code;
  }
}

const sanitizeName = (v: unknown, fallback: string) =>
  (typeof v === 'string' ? v : '').replace(/[^\p{L}\p{N} _.\-']/gu, '').trim().slice(0, 18) || fallback;
const sanitizeColor = (v: unknown, fallback: string) =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;

function sendTo(ws: WebSocket, msg: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

// Drop idle rooms
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.players.length === 0 || now - room.lastActive > 30 * 60 * 1000) {
      room.players.forEach(p => p.ws.close());
      rooms.delete(code);
    }
  }
}, 60 * 1000);

// Heartbeat: terminate dead sockets (mobile sleep, lost Wi-Fi…)
const alive = new WeakMap<WebSocket, boolean>();
setInterval(() => {
  wss.clients.forEach(ws => {
    if (alive.get(ws) === false) {
      ws.terminate();
      return;
    }
    alive.set(ws, false);
    ws.ping();
  });
}, 15000);

const RELAYED = new Set(['INPUT', 'HASH', 'SYNC_REQUEST', 'SNAPSHOT']);

wss.on('connection', (ws: WebSocket) => {
  alive.set(ws, true);
  ws.on('pong', () => alive.set(ws, true));

  let room: Room | null = null;

  ws.on('message', (data) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    const type = msg.type as string;

    if (type === 'PING') {
      sendTo(ws, { type: 'PONG', t: msg.t });
      return;
    }

    if (RELAYED.has(type)) {
      if (!room) return;
      room.lastActive = Date.now();
      const raw = data.toString();
      for (const p of room.players) {
        if (p.ws !== ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(raw);
      }
      return;
    }

    if (type === 'CREATE_ROOM') {
      if (room) return;
      const code = newRoomCode();
      const player: PlayerClient = {
        ws,
        name: sanitizeName(msg.name, 'Hôte'),
        role: 'p1',
        giColor: sanitizeColor(msg.giColor, '#f8fafc')
      };
      room = { code, players: [player], lastActive: Date.now() };
      rooms.set(code, room);
      sendTo(ws, { type: 'ROOM_CREATED', roomCode: code, role: 'p1' });
      return;
    }

    if (type === 'JOIN_ROOM') {
      if (room) return;
      const code = String(msg.roomCode || '').trim().toUpperCase();
      const target = rooms.get(code);
      if (!target || target.players.length === 0) {
        sendTo(ws, { type: 'ERROR', message: 'Salon introuvable. Vérifiez le code.' });
        return;
      }
      if (target.players.length >= 2) {
        sendTo(ws, { type: 'ERROR', message: 'Ce salon est déjà complet (2 joueurs max).' });
        return;
      }

      const host = target.players[0];
      let giColor = sanitizeColor(msg.giColor, '#b91c1c');
      if (giColor.toLowerCase() === host.giColor.toLowerCase()) {
        giColor = host.giColor.toLowerCase() === '#b91c1c' ? '#2563eb' : '#b91c1c';
      }
      const player: PlayerClient = { ws, name: sanitizeName(msg.name, 'Challenger'), role: 'p2', giColor };
      target.players.push(player);
      target.lastActive = Date.now();
      room = target;

      sendTo(ws, { type: 'ROOM_JOINED', roomCode: code, role: 'p2', p1Name: host.name, p2Name: player.name });

      const start = {
        type: 'MATCH_START',
        p1Name: host.name,
        p2Name: player.name,
        p1Gi: host.giColor,
        p2Gi: player.giColor
      };
      target.players.forEach(p => sendTo(p.ws, start));
    }
  });

  ws.on('close', () => {
    if (!room) return;
    const r = room;
    r.players = r.players.filter(p => p.ws !== ws);
    if (r.players.length > 0) {
      r.players.forEach(p => {
        sendTo(p.ws, { type: 'OPPONENT_DISCONNECTED', message: 'Votre adversaire a quitté le combat.' });
        p.ws.close();
      });
    }
    rooms.delete(r.code);
    room = null;
  });
});

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, clients: wss.clients.size });
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(__dirname, 'dist');
    app.use(express.static(dist, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`KIAI 64 server (${isProd ? 'production' : 'dev'}) on http://localhost:${PORT}`);
  });
}

startServer();
