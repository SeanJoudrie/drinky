# 🚔 RAP SHEET

*The party game that keeps a record. Your friends commit crimes — the game never forgets.*

Pass-the-phone party card game. One phone, the room plays. Open → playing in 3 taps.

## v1 (this build)
- **Three Strikes** — cards accuse, dare, and call out the table. Three priors = **locked up**.
- Deadpan-cop voice, ~70 hand-written charges, **drink-neutral** (drinking is an optional toggle — plays stone sober).
- One-tap wildness presets (Chill / Classic / Unhinged), optional vibe keyword, 2–13 players.
- **Wanted-poster recap** you can share — the night's Most Wanted, built to post.
- 100% on-device. No accounts, no servers, no backend. Just static files.

## Run it locally
It's plain HTML/CSS/JS — no build. Just open `index.html`, or:
```
npx serve .
```

## Deploy
Static site. Netlify serves the repo root (see `netlify.toml`). Push to `main` → auto-deploys.

## Not in v1 (earn it later)
- AI "Snitch" custom-deck generator (needs an API proxy)
- Online room codes / The Verdict (needs a realtime backend)
- The persistent **Record** across sessions

---
🤖 Built with Claude Code
