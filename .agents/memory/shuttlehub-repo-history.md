---
name: ShuttleHub repo history
description: Why the Swans ShuttleHub GitHub repo must be rebased onto, never force-pushed over, when reconnecting a Replit workspace to it.
---

The Swans ShuttleHub app (Swans Travel shuttle passenger-loading tracker) was originally built directly in a standalone Replit project and pushed to `barryconley85-crypto/Swans-ShuttleHub` on GitHub, with its own full commit history (including a prior pass at Render/Vercel/Neon free-hosting deploy configs and a filled-in `replit.md`).

**Why:** When porting the app into a fresh multi-artifact pnpm-workspace Replit project, the new workspace's local git history is unrelated to the GitHub repo's history (different initial commit). A naive `gitPush` fails with `BRANCH_ALREADY_EXISTS`, and force-pushing would destroy the repo's real history and its already-decent deploy configs.

**How to apply:** Fetch `origin/main`, diff it against the local port to see what's actually different (usually just a handful of real bug fixes plus workspace-specific plumbing), then `git checkout -B main origin/main` to reset onto the remote history and re-apply just the local fixes as new commits — don't regenerate deploy configs or docs the remote already has good versions of.
