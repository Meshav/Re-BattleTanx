# Self-hosting guide

How to run a Re-Tanx server for friends or a homelab. Everything here is built and verified (S19–S20, S27–S28). Architecture background: doc 09 §9.5–9.6.

## 1. Quickest: Docker Compose
```bash
git clone … && cd re-tanx
docker compose up --build        # Caddy on :8080 (client + proxy) + game server + MariaDB
```
Open `http://<host>:8080`. Three services start:

| Service | Image | Role |
|---------|-------|------|
| `web` | Caddy (`Dockerfile` target `web`) | Serves the built client and audio, proxies `/ws`, `/auth/*`, `/leaderboard`, `/history`, `/health` to the game server |
| `game` | Node 22 (`Dockerfile` target `server`) | Lobbies, quick match, authoritative 30 Hz matches, auth, persistence. Port 8787 inside the network |
| `db` | `mariadb:11` | Profiles, identities, match history. Tables are created on first boot from `sql/schema.sql` |

The server image's build stage runs `npm run check` (rules, IP guard, typecheck, all tests), so a broken tree won't build. Base images are build args for mirrors or pinned digests: `--build-arg NODE_IMAGE=… --build-arg CADDY_IMAGE=…`.

## 2. Environment variables
Set these in a `.env` next to `docker-compose.yml` (Compose reads it) or in your process manager.

| Variable | Required | What it does |
|----------|----------|--------------|
| `SERVER_SECRET` | **Yes** for anything persistent | Signs guest player tokens. Without it the server makes a random one per boot and every guest gets a new profile after a restart. `openssl rand -hex 32` |
| `DB_PASSWORD` | Compose only | MariaDB password shared by `db` and `game` |
| `DATABASE_URL` | No | `mysql://user:pass@host:3306/db`. Set → MariaDB store. Unset → one JSON file per player under `DATA_DIR` (plus `identities.json`, `matches.jsonl`) |
| `DATA_DIR` | No | File-store directory (default `./data-store`; `/data` in the image, mount a volume) |
| `PORT` | No | Game server port (default 8787) |
| `SITE_ADDRESS` | No | Caddy site address. `:8080` (default) for plain HTTP behind another proxy; `game.example.com` for automatic HTTPS with Let's Encrypt |
| `PUBLIC_URL` | For sign-in | The address players use (`https://game.example.com`). Needed for OAuth redirects |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Optional | Enables "Sign in with Discord" |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Enables "Sign in with Google" |

## 3. Storage
- **MariaDB** (recommended beyond a handful of players): schema applied on boot; later columns are added with idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, so older databases upgrade themselves. Profiles are a JSON column updated under a row lock, so two matches ending together can't lose XP.
- **Files** (no `DATABASE_URL`): atomic temp-file + rename writes. Fine for a homelab; leaderboard and history scan every file, so move to MariaDB past a few thousand matches.
- Store contract tests run against a scratch database with `TEST_DATABASE_URL=mysql://… npm test`.
- ⏳ Backups aren't automated. Dump the `db` volume (`mariadb-dump`) on your own schedule.

## 4. Sign-in (optional)
Guests always work: a signed token in the browser identifies the player, and the server keeps their profile. Sign-in makes that profile follow the player to other devices.

1. Create an OAuth app at Discord and/or Google.
2. Register the redirect URI `${PUBLIC_URL}/auth/<provider>/callback` (`discord` or `google`).
3. Set `PUBLIC_URL` and the provider's client id/secret. The online menu then shows "Sign in with …".

The first sign-in links the guest you were playing as, so progress carries over. Later sign-ins resume that same player anywhere. The server warns at boot if providers are configured without `PUBLIC_URL`.

## 5. HTTP endpoints (all served by the game server, proxied by Caddy)
| Endpoint | Auth | Returns |
|----------|------|---------|
| `GET /health` | — | `{ ok, lobbies }` |
| `GET /leaderboard` | — | Top 20 ranked players (conservative Glicko-2 rating) |
| `GET /history` | `Authorization: Bearer <player token>` | The token holder's last 20 matches; 401 otherwise |
| `/auth/<provider>` · `/auth/<provider>/callback` | — | OAuth flow |
| `/ws` | — | WebSocket: lobbies, quick match, matches |

Limits per connection: 90 inputs/s, 20 other messages/s, 4 KB per message; 8 players per match; 500 lobbies per server.

## 6. After deploying
```bash
node scripts/smoke-match.mjs wss://your.host/ws
```
Plays one short match against bots through the real socket, waits for the XP award and checks the match landed in history. `GET /health` is the container healthcheck.

## 7. Without Docker
```bash
npm install
npm run build                    # static client in packages/client/dist
SERVER_SECRET=… npm run server   # tsx, :8787
```
Serve `packages/client/dist` with any static server and proxy the paths in §5 to `:8787`. The repo's `Caddyfile` is a working example. For development, `npm run dev` runs Vite on :5173 and proxies those paths itself.

## 8. Known gaps
- One server process holds all lobbies; quick match and rejoin assume that (doc 11 §11.4 says when to add Redis).
- The server image ships sources and dev dependencies (~660 MB) because it runs TypeScript through tsx.
- First live OAuth sign-in and a real-latency playtest haven't been done yet (doc 13).
