# Re-BattleTanx

A browser fan port inspired by BattleTanx (N64). The game lives in [`re-tanx/`](re-tanx/); everything else here is history.

| Path | What it is |
|------|------------|
| [`re-tanx/`](re-tanx/README.md) | The game: npm workspace with `sim`, `client` and `server` packages, data, docs, Docker setup. Start there. |
| [`re-tanx/docs/`](re-tanx/docs/README.md) | Design docs, engineering docs, plans and guides (map authoring, self-hosting). |
| `OLD/` | Earlier drafts: the first design-doc set (`battletanx-docs/`) and scaffold archives. Superseded by `re-tanx/docs/`; kept for reference. |
| `re-tanx.zip` | A snapshot archive of the project. The checked-in `re-tanx/` tree is the source of truth. |

## Quick start
```bash
cd re-tanx
npm install
npm run dev        # client at http://localhost:5173
npm run server     # game server for online play, :8787
npm run check      # rules + IP guard + typecheck + tests
```

Fan project, non-commercial, no ripped assets. See the legal note in [`re-tanx/docs/README.md`](re-tanx/docs/README.md#legal--ip-note-read-first).
