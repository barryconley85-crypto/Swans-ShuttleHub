# Swans ShuttleHub — Free Deployment Guide

**Stack:** Vercel (frontend) + Render (API) + Neon (database)  
**Total cost:** £0 / month

---

## Step 1 — Neon (database)

1. Go to [neon.tech](https://neon.tech) and sign up for free (no card needed)
2. Create a new project — name it `swans-shuttlehub`
3. Choose region **EU West (Frankfurt)**
4. On the project dashboard, click **Connection string** and copy the URL  
   It looks like: `postgresql://user:password@ep-xxx.eu-west-1.aws.neon.tech/neondb?sslmode=require`
5. Keep this URL safe — you'll paste it into Render in Step 3

---

## Step 2 — Push schema to Neon

Once you have the connection string, the agent can run:
```
DATABASE_URL=<your-neon-url> pnpm --filter @workspace/db run db:push
```
This creates all the tables and seed data in Neon.  
*(Ask the agent to do this for you — paste your Neon connection string as a secret called `DATABASE_URL_NEON`)*

---

## Step 3 — Render (API server)

1. Go to [render.com](https://render.com) and sign up (free tier needs a card but won't charge)
2. Click **New → Web Service**
3. Connect your GitHub repo (push this code to GitHub first if not already done)
4. Render will auto-detect the `render.yaml` — click **Apply**
5. In the **Environment** tab, add these variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon connection string from Step 1 |
| `SESSION_SECRET` | Any long random string (e.g. 64 random characters) |
| `FRONTEND_URL` | Leave blank for now — fill in after Step 4 |

6. Click **Deploy** — wait ~2 minutes
7. Copy your Render URL: `https://swans-shuttlehub-api.onrender.com`

---

## Step 4 — Vercel (frontend)

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **Add New → Project** and import your GitHub repo
3. Vercel will detect `vercel.json` automatically — no framework to set
4. Add this **Environment Variable** before deploying:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | Your Render URL from Step 3, e.g. `https://swans-shuttlehub-api.onrender.com` |

5. Click **Deploy** — wait ~1 minute
6. Copy your Vercel URL: `https://swans-shuttlehub.vercel.app`

---

## Step 5 — Wire them together

1. Go back to **Render → Environment**
2. Set `FRONTEND_URL` = your Vercel URL from Step 4
3. Click **Save Changes** — Render will redeploy automatically

---

## Done! ✓

- Frontend: `https://swans-shuttlehub.vercel.app`
- API: `https://swans-shuttlehub-api.onrender.com`
- Admin login: `admin` / `admin123`
- Driver login: e.g. `john.smith` / `driver123`

### ⚠️ Render free tier note
The API server sleeps after 15 minutes of no traffic and takes ~30 seconds to wake up.  
For a 9–5 work tool this is fine — it stays warm all day during use.

---

## Custom domain (optional)

Once deployed on Vercel, go to **Vercel → Project → Domains** and add your domain.  
Vercel provides free SSL automatically.
