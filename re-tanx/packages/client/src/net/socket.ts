import type { ClientMsg, ServerMsg } from "@re-tanx/sim";

export interface Socket { send(m: ClientMsg): void; close(): void; onMessage: (m: ServerMsg) => void; onClose: () => void }

/** Same-origin /ws (Caddy in production, Vite proxy in dev). `?server=` overrides for testing. */
export function serverUrl(): string {
  const override = new URLSearchParams(location.search).get("server");
  if (override) return override;
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
}

export function connect(url: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const sock: Socket = {
      send: (m) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m)),
      close: () => ws.close(),
      onMessage: () => {},
      onClose: () => {},
    };
    ws.onmessage = (e) => sock.onMessage(JSON.parse(String(e.data)) as ServerMsg);
    ws.onopen = () => resolve(sock);
    ws.onerror = () => reject(new Error("Can't reach the game server"));
    ws.onclose = () => sock.onClose();
  });
}
