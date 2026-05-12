# Deploying Amar Hisab to Render

Step-by-step guide to take the local app from your machine to a public URL on [Render](https://render.com).

The plan: deploy a **single Web Service**. The Node backend will serve both the REST API _and_ the static frontend on the same port, so you only need one Render service — no separate static site, no CORS plumbing.

---

## Pre-deployment checklist

Before you push to GitHub, run through this checklist locally:

- [ ] **Backend runs locally:** `cd server && npm start` → app responds on `http://localhost:3000`
- [ ] **Frontend builds:** `npm run build` in root directory completes without errors
- [ ] **All env vars set:** `server/.env` has `JWT_SECRET`, `DB_PATH`, etc. (copy from `server/.env.example`)
- [ ] **Database schema ready:** `server/data/amar-hisab.db` exists and tables are initialized
- [ ] **API health check works:** `curl http://localhost:3000/api/health` returns `{"ok":true,"ts":<timestamp>}`
- [ ] **Static files served:** Open `http://localhost:3000` in a browser and confirm the app loads
- [ ] **Auth flow tested:** Register a test user and log in to confirm JWT tokens work
- [ ] **Git initialized:** `git status` shows your files ready to commit
- [ ] **Sensitive files excluded:** Confirm `.env`, `node_modules/`, and `*.db` files are in `.gitignore`

If any of these fail, fix them locally before proceeding.

---

## Step 1 — Confirm files before pushing to GitHub

These files should already exist at the repo root (they ship with the project):

| File                  | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `.gitignore`          | Keeps `node_modules/`, `.env`, SQLite DB files, and OS junk out of git |
| `package.json`        | Root scripts so Render can `npm run build && npm start`                |
| `render.yaml`         | Optional blueprint that pre-fills all Render settings                  |
| `server/.env.example` | Template showing every env var the server needs (commit this)          |
| `server/.env`         | Your local secrets — **NOT committed** (gitignored)                    |

Verify nothing sensitive will be uploaded by running this from the project root in PowerShell:

```powershell
git init                       # if you haven't initialized git yet
git add -A
git status                     # check the list before committing
```

Confirm `server/.env`, `node_modules/`, and `server/data/*.db*` are **not** in the staged list. They shouldn't be — that's what `.gitignore` is for.

---

## Step 2 — Push to GitHub

```powershell
git commit -m "Initial commit: Amar Hisab"

# Create a new empty repo on GitHub.com first (no README, no license — empty)
# Then connect it:
git branch -M main
git remote add origin https://github.com/<your-username>/amar-hisab.git
git push -u origin main
```

Your code is now on GitHub. The `.env` file stays on your laptop only.

---

## Environment variables explained

Before Step 4, understand what each variable does. Render will ask for these:

| Variable        | Purpose                                                                                     | Example                           |
| --------------- | ------------------------------------------------------------------------------------------- | --------------------------------- |
| `NODE_ENV`      | Tells the app to use production optimizations (minified static files, error logging, etc.)  | `production`                      |
| `JWT_SECRET`    | Secret key for signing user tokens. **Must be random and strong.** Render can generate it.  | _(auto-generated)_                |
| `JWT_EXPIRES`   | How long a login session lasts. `30d` = 30 days before re-login needed.                     | `30d`                             |
| `CORS_ORIGIN`   | Which domains can call your API. Start with `*`, then tighten to your URL after deployment. | `https://amar-hisab.onrender.com` |
| `BCRYPT_ROUNDS` | Security rounds for password hashing. Higher = slower but safer (10 is standard).           | `10`                              |
| `SERVE_STATIC`  | `1` = yes, serve frontend files from the same server. Leave as `1`.                         | `1`                               |
| `DB_PATH`       | Path to SQLite file relative to the server root. **Must match your actual file location.**  | `./data/amar-hisab.db`            |

**Security note:** Never share `JWT_SECRET`. If you accidentally commit it or leak it, rotate it immediately by generating a new one in Render → Service → Environment.

---

## Step 3.5 — Test the build locally (recommended)

Before pushing to Render, make sure your build command works:

```powershell
cd d:\AmarHisab
npm run build
```

This should:

1. Install dependencies in `server/` (if not already done)
2. Compile the frontend (`src/` → `dist/` or similar)
3. Complete with **no errors** (warnings are okay)

If the build fails locally, it will fail on Render too. Fix it now.

---

## Step 3 — Create a Render account

1. Go to <https://render.com> and sign up (free tier is enough to start).
2. When prompted, **connect your GitHub account** so Render can read your repos.

---

## Step 4 — Create the Web Service

You have two options. Option A is the click-through; Option B is the one-shot Blueprint.

### Option A — Manual setup (one screen of clicks)

1. In the Render dashboard, click **"New +"** → **"Web Service"**.
2. Pick your `amar-hisab` repo and click **"Connect"**.
3. Fill in the form:

   | Field              | Value                                                      |
   | ------------------ | ---------------------------------------------------------- |
   | **Name**           | `amar-hisab` (or whatever you like — this becomes the URL) |
   | **Region**         | Singapore (or whichever is closest to you)                 |
   | **Branch**         | `main`                                                     |
   | **Root Directory** | _(leave blank)_                                            |
   | **Runtime**        | `Node`                                                     |
   | **Build Command**  | `npm run build`                                            |
   | **Start Command**  | `npm start`                                                |
   | **Instance Type**  | Free                                                       |

4. Scroll to **Environment Variables** and add each one:

   | Key             | Value                                                    |
   | --------------- | -------------------------------------------------------- |
   | `NODE_ENV`      | `production`                                             |
   | `JWT_SECRET`    | click **Generate** to let Render produce a random value  |
   | `JWT_EXPIRES`   | `30d`                                                    |
   | `CORS_ORIGIN`   | `*` for now — you'll tighten this after you know the URL |
   | `BCRYPT_ROUNDS` | `10`                                                     |
   | `SERVE_STATIC`  | `1`                                                      |
   | `DB_PATH`       | `./data/amar-hisab.db`                                   |

   You do **not** need to set `PORT` — Render injects it automatically.

5. Optional but recommended: scroll to **Health Check Path** and set it to `/api/health`.

6. Click **"Create Web Service"**. Render starts the first build — watch the logs in the right pane.

### Option B — Blueprint (one click)

1. The repo includes a `render.yaml` at the root.
2. In the Render dashboard, click **"New +"** → **"Blueprint"**.
3. Pick the `amar-hisab` repo. Render reads `render.yaml` and offers to create the service exactly as configured above.
4. Confirm. Render does the rest.

Either way, the first build takes 2–5 minutes (mostly compiling `better-sqlite3`).

### What happens during the build

When Render runs `npm run build`:

1. **Install dependencies:**  
   `npm install` in root and `server/` (if needed)
2. **Compile frontend:**  
   Bundles all JavaScript and CSS from `src/` into optimized static files
3. **Run server setup:**  
   Any database migrations or init scripts (if configured in `package.json`)

The build artifact (compiled frontend + backend code) is ready to run with `npm start`.

If the build takes longer than 5 minutes or fails, check **Logs** in the Render dashboard.

---

## Step 5 — Understanding Render logs and build output

When you create the service, watch the **Logs** panel on the right side of the Render dashboard:

**Build phase (2–5 minutes):**

- npm installs dependencies
- Frontend is compiled into optimized bundles
- Backend code is prepared
- Look for **green checkmarks** and `Build succeeded`
- Red text with `ERROR` = build failed; scroll up to see the cause

**Common build errors:**

- `npm ERR!` → Dependency conflict or typo in package.json
- `Cannot find module 'better-sqlite3'` → Node version mismatch; verify Runtime is set to `Node`
- `ENOENT: no such file` → Missing file referenced in build script

**Startup phase (after build):**

- You'll see `Started service with PID` or similar
- The service initializes and connects to the database
- If SQLite path is wrong, you'll see `Error: ENOENT: database not found`

Once you see a green checkmark and the service is marked **Live**, the app is running.

---

## Step 6 — Verify the live deployment

When the build finishes, Render shows a public URL like `https://amar-hisab.onrender.com`. Test it:

```powershell
# Health check
curl https://amar-hisab.onrender.com/api/health

# Should print:  {"ok":true,"ts":...}
```

Open the same URL in a browser. The app should load exactly like your local copy.

> **Note:** Free-tier services on Render **sleep after 15 minutes of inactivity** and take ~30 seconds to spin back up on the next request. The first hit after sleep feels slow; subsequent hits are instant.

---

## Step 7 — Lock down CORS

You started with `CORS_ORIGIN=*` because you didn't know the URL yet. Now you do.

1. In the Render dashboard, open your service.
2. Go to **Environment** → edit `CORS_ORIGIN`.
3. Set it to your actual URL, e.g. `https://amar-hisab.onrender.com`.
4. Save — Render redeploys automatically.

If you'll embed the app in another site or run multiple frontends, comma-separate them:

```
https://amar-hisab.onrender.com,https://www.yourdomain.com
```

---

## Step 8 — Data persistence (important!)

By default the SQLite file lives at `server/data/amar-hisab.db` **inside the Render container's filesystem, which is ephemeral**. Every time Render restarts your service (deploy, weekly maintenance, sleep recovery) the database resets.

That's fine for a demo. For real use, pick one of:

### Option A — Add a Render persistent disk ($1/month on top of Starter $7/mo)

1. Upgrade your service from Free → **Starter** plan.
2. In **Settings** → **Disks** → **Add Disk**:
   - **Name:** `data`
   - **Mount Path:** `/opt/render/project/src/server/data`
   - **Size:** 1 GB (smallest, plenty for SQLite)
3. The mount path matches `DB_PATH=./data/amar-hisab.db` from the server root.
4. Save and redeploy. Data now survives restarts.

### Option B — Migrate to PostgreSQL (cleaner for multi-instance scaling)

1. In Render: **New +** → **PostgreSQL** (free for 90 days, then $7/mo).
2. Copy the **Internal Database URL** Render gives you.
3. Set it as `DATABASE_URL` in your service's env vars.
4. Replace `server/src/database/connection.js` with a `pg` connection and rewrite the schema as standard SQL. The route logic stays mostly the same; only the SQL parameters change (`?` → `$1`).

Option A is the smaller change and is recommended if you're new to deployment.

---

## Step 9 — Custom domain (optional)

1. Render service → **Settings** → **Custom Domains** → **Add Custom Domain**.
2. Type your domain (e.g. `hisab.example.com`).
3. Add the DNS record Render shows you at your DNS provider.
4. Wait a few minutes for verification. SSL is auto-provisioned.
5. Update `CORS_ORIGIN` to include the new domain.

---

## Step 10 — Continuous deployment

You're already set up. Every push to `main` on GitHub triggers a fresh deploy automatically. To pause this:

- Service → **Settings** → **Auto-Deploy** → **No**

To trigger a manual deploy: click **"Manual Deploy"** → **"Deploy latest commit"**.

---

## Step 11 — Post-deployment verification checklist

Once your app is live, verify everything works:

- [ ] **App loads:** Visit your URL in a browser, confirm the UI looks correct
- [ ] **API responds:** `curl https://your-url/api/health` returns `{"ok":true,"ts":<timestamp>}`
- [ ] **Auth works:** Register a new user, log in, and check the browser DevTools Network tab for JWT tokens
- [ ] **Data persists:** Create a transaction or budget, refresh the page, confirm it's still there
- [ ] **No 404s:** Open browser DevTools → Console, confirm no red errors about failed API calls
- [ ] **Responsive:** Test on mobile (use responsive mode in Chrome DevTools) — layout should adapt
- [ ] **CORS working:** If the frontend and backend are on different domains, confirm API calls succeed (no CORS errors in console)

If any fail, check the **Logs** in Render and compare with the Troubleshooting section below.

---

## Step 12 — Maintenance and ongoing updates

### Updating the app

Every time you push to `main`, Render automatically rebuilds and deploys. To update:

```powershell
# Make your changes locally
git add .
git commit -m "Fix: update budget display"
git push origin main

# Watch the deploy on Render → Logs
# Your app updates within 2-5 minutes (build time)
```

### Monitoring the live app

Periodically check:

1. **Logs:** Render service → **Logs** tab. Watch for errors or warnings.
2. **CPU & Memory:** Render service → **Metrics** tab. Free tier shows usage; upgrade if consistently near limits.
3. **Uptime:** Set up external monitoring (e.g., [UptimeRobot](https://uptimerobot.com)) to get alerts if the app goes down.

### Rotating secrets

If you suspect `JWT_SECRET` was exposed:

1. Render service → **Environment** → edit `JWT_SECRET` → click **Generate**
2. Save — Render redeploys with the new secret
3. All existing user sessions expire; users must log in again

---

## Troubleshooting

| Symptom                                             | Cause / Fix                                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Build fails on `better-sqlite3`                     | Render's free Node runtime supports this out of the box. If you forked to a different runtime, switch back to `node`. |
| `Cannot find module 'better-sqlite3'`               | Your build command isn't installing the server deps. Make sure it's `npm run build`, not just `npm install`.          |
| Frontend loads but API calls 404 in browser console | `CORS_ORIGIN` doesn't include your actual URL. Update it.                                                             |
| Data disappears after a few hours                   | Expected on free tier. See Step 7 to add persistent storage.                                                          |
| First request after a long pause takes 30 seconds   | Free tier sleeps after 15 min idle. Upgrade to Starter, or accept the cold-start delay.                               |
| App loads but Bengali text shows as boxes/squares   | Local font fallback issue, not deploy-related. The Google Fonts request from `app.css` should work in any browser.    |
| 502 / 504 errors right after deploy                 | Service is still starting. Wait 30s and refresh. Check **Logs** in Render for actual errors.                          |
| `JWT_SECRET is missing` warning in logs             | Open Environment, click Generate on `JWT_SECRET`, save.                                                               |

---

## What to do _not_ commit

Reminder — the `.gitignore` already protects you from these, but be careful when adding new files:

- `server/.env` — contains your local `JWT_SECRET`. Never commit it.
- `server/data/*.db*` — your local SQLite database.
- `node_modules/` — huge folder, rebuilt by `npm install` on Render.

If you accidentally committed `.env` before adding the gitignore, **rotate the secrets immediately** and follow GitHub's guide on removing files from history.

---

## Reverting / shutting down

- **Pause deploys:** Service → Settings → Auto-Deploy off.
- **Stop the service:** Service → Suspend (keeps the URL reserved, stops billing on paid plans).
- **Delete entirely:** Service → Settings → bottom of page → Delete Service. This is irreversible.

---

## Performance tips and optimization

### Frontend optimization

- **Lazy load images:** Use the `loading="lazy"` HTML attribute or libraries like `react-lazyload`
- **Minimize bundle size:** Check `npm list` for duplicate dependencies; consider code splitting large routes
- **Caching:** Browser caches static assets; Render serves them with proper cache headers by default

### Backend optimization

- **Database indexes:** Add indexes to frequently queried columns (e.g., user ID, transaction date) in `schema.sql`:
  ```sql
  CREATE INDEX idx_transactions_user_id ON transactions(user_id);
  ```
- **Connection pooling:** For larger deployments, consider upgrading from SQLite to PostgreSQL (Step 8) for concurrent connection handling
- **Query optimization:** Avoid N+1 queries; fetch related data with a single JOIN instead of looping

### Render-specific tips

- **Upgrade to Starter ($7/mo):** Avoid cold starts (sleep after 15 min inactivity)
- **Enable health checks:** Render pings `/api/health` periodically; this keeps the service warm
- **Monitor memory:** Free tier has 512 MB; if you exceed it, the app restarts. Check **Metrics** in Render
- **Add persistent disk early:** Don't wait until your data grows. Migrate to Step 8 now if you plan to use this in production

---

## Security best practices

1. **CORS_ORIGIN:** Tighten from `*` to your specific domain ASAP (Step 7)
2. **JWT_SECRET:** Use a strong, random secret. Render's **Generate** button creates a good one
3. **HTTPS only:** Render auto-provisions SSL; never use `http://` in production
4. **Secrets rotation:** If leaked, change `JWT_SECRET` immediately (users re-login; existing tokens invalidate)
5. **Rate limiting:** Consider adding rate limiting on sensitive endpoints (e.g., auth, budgets) if deployed
6. **BCRYPT_ROUNDS:** `10` is standard; higher values (12+) are more secure but slower. Don't change unless you understand the tradeoff

---

## Disaster recovery

### If your database file is lost

If you're on the free tier without persistent disk:

- Render restarts your service → SQLite file is recreated empty
- Users lose all their transactions (this is why Step 8 recommends persistent storage)

**Prevention:** Add a disk or migrate to PostgreSQL NOW if you care about data.

### If you can't roll back a bad deploy

Git to the rescue:

```powershell
# Find the previous good commit
git log --oneline | head

# Revert to a working state
git revert <bad-commit-hash>
git push origin main

# Render auto-deploys the revert
```

### If the app is completely broken

1. Go to Render service → **Settings** → **Auto-Deploy** → **No** (stop auto-deploys)
2. Fix the code locally and test thoroughly with `npm run build && npm start`
3. Commit and push; manually trigger a new deploy in Render once you're confident

---

## Going beyond free tier

When to upgrade:

| Need                        | Free tier → Upgrade to         | Cost/month (approx) |
| --------------------------- | ------------------------------ | ------------------- |
| Always-on (no 15-min sleep) | Starter plan                   | $7                  |
| Persistent data             | Add 1 GB disk                  | $1 (free + $1)      |
| Handle concurrent users     | Starter + PostgreSQL           | $7 + $7 = $14       |
| HTTPS custom domain         | (auto-included in Starter)     | $0 (included)       |
| Email support               | Boost (free tier is community) | $9                  |

---

## TL;DR

```
1. Verify app runs locally (npm start in root)
2. git init && git push to GitHub
3. Render → New → Web Service → connect repo
4. Build:  npm run build
   Start:  npm start
5. Set env vars (JWT_SECRET, CORS_ORIGIN, SERVE_STATIC=1, DB_PATH=./data/amar-hisab.db)
6. Click Create. Wait 2-5 minutes for the build.
7. Test the live URL in a browser.
8. Tighten CORS_ORIGIN to your actual URL.
9. For production: add persistent disk or PostgreSQL (Step 8).
```

---

## Useful links

- [Render Dashboard](https://dashboard.render.com)
- [Render Docs](https://render.com/docs)
- [GitHub Help: Connecting to GitHub](https://docs.github.com/en/get-started/getting-started-with-git)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)
- [SQLite Performance Tips](https://www.sqlite.org/bestpractice.html)

---

**Questions?** Re-read the Troubleshooting section above—most issues are covered. If you find a bug in this guide, open an issue on GitHub.
