import { createWorld, TICK_RATE } from '@re-tanx/sim';
import { WebSocketServer } from 'ws';

// Phase 0 stub: proves the server can host the shared sim. Matches, lobbies and
// snapshots arrive in Phase 4 (docs/11 §11.2); layout in docs/12 §12.4.
const PORT = Number(process.env['PORT'] ?? 8080);
const world = createWorld();

const wss = new WebSocketServer({ port: PORT });
wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'hello', tick: world.tick, tickRate: TICK_RATE }));
});

console.log(`re-tanx server listening on :${PORT}`);
