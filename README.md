# আমার হিসাব — Amar Hisab

A Bengali-first personal finance tracker. The frontend is a zero-build React + JSX app loaded directly in the browser via Babel-standalone. The backend is an optional Node.js + Express + SQLite API with JWT auth — the app works **fully offline** using `localStorage` and seamlessly mirrors data to the API when one is reachable.

## Features

- Dashboard with month-over-month balance, weekly bar chart, category donut
- Transactions: add, edit, delete, filter by category, period and search
- Debts (ধার-পরিচালনা): track borrowed/lent, settle, edit
- Monthly budget with warning + over-budget alerts
- Reports: weekly/monthly/yearly breakdown + CSV export
- Reminders: aging debts + budget alerts
- Settings: profile, theme palette (4 curated), notification prefs, data reset
- Notifications drawer and global search drawer
- Mobile-first responsive: hamburger drawer, bottom nav, bottom-sheet modals
- Toast notifications + confirm dialogs
- ESC closes modals, Enter confirms
- Form validation with inline errors
- Themeable: 4 curated palettes, choice persists across reloads

## Project layout

```
AmarHisab/
├── index.html              ← entry point (loads everything via script tags)
├── README.md
├── src/                    ← FRONTEND
│   ├── App.jsx             ← root component
│   ├── styles/
│   │   ├── tokens.css      ← design tokens (colors, type, shadows, motion)
│   │   └── app.css         ← component styles
│   ├── config/
│   │   └── categories.js   ← expense categories
│   ├── utils/
│   │   └── format.js       ← Bengali numerals, currency, date helpers
│   ├── services/           ← external integrations
│   │   ├── storage.js      ← localStorage layer + migration
│   │   └── api.js          ← REST client + sync helpers
│   ├── components/         ← reusable UI building blocks
│   │   ├── Icon.jsx
│   │   ├── TweaksPanel.jsx ← (legacy prototyping harness, hidden by default)
│   │   ├── notify.jsx      ← ToastHost + ConfirmHost
│   │   ├── charts.jsx      ← DonutChart + WeeklyBarChart
│   │   ├── widgets.jsx     ← StatCard + TxRow + PersonRow
│   │   ├── nav.jsx         ← Sidebar + MobileBottomNav + SidebarDrawer
│   │   └── drawers.jsx     ← NotificationDrawer + SearchDrawer
│   ├── modals/             ← full-screen overlays
│   │   ├── AddTxModal.jsx       (also exposes useModalShell + FieldError)
│   │   ├── AddDebtModal.jsx
│   │   └── BudgetModal.jsx
│   └── pages/              ← top-level screens (one file per route)
│       ├── DashboardScreen.jsx
│       ├── HistoryScreen.jsx
│       ├── DebtScreen.jsx
│       ├── BudgetScreen.jsx
│       ├── ReportsScreen.jsx
│       ├── RemindersScreen.jsx
│       └── SettingsScreen.jsx
└── server/                 ← BACKEND (Node.js + Express + SQLite + JWT)
    ├── package.json
    ├── .env / .env.example / .gitignore
    ├── data/               ← SQLite db files (gitignored)
    └── src/
        ├── index.js        ← Express entrypoint
        ├── config/
        │   └── env.js      ← env loading + validation
        ├── database/
        │   ├── connection.js  ← better-sqlite3 instance
        │   └── schema.sql     ← idempotent schema
        ├── middleware/
        │   ├── auth.js     ← JWT verify + sign
        │   └── validate.js ← shared validation helpers
        └── routes/         ← API endpoints
            ├── auth.routes.js
            ├── transactions.routes.js
            ├── debts.routes.js
            ├── budgets.routes.js
            └── settings.routes.js
```

### Why this shape?

- **Frontend (`src/`) follows the standard React/Vite layout** even though we don't use a bundler. Anyone who's worked in a modern frontend repo knows where to look.
- **Layered by concern, not by feature.** Pages depend on components and services, never the reverse. Adding a feature is "add a page + maybe a widget + maybe an endpoint" — no cross-cutting refactor.
- **No build step.** Files are loaded directly as `<script type="text/babel">` tags. Each file attaches its exports to `window` so later files can read them. Load order in `index.html` mirrors the dependency graph: `config → utils → services → components → modals → pages → App`.
- **Backend mirrors the same shape inside `server/src/`** — config / database / middleware / routes. Each route file is a self-contained module with no inter-route imports.

## Running the frontend only (offline mode)

The app needs no build step but Babel-standalone can't transform files served from `file://`. Use any static server.

```bash
# from the project root:
npx serve .
# or
python -m http.server 5500
```

Then open the URL printed on screen. Data persists to `localStorage` keyed under `ah:*`. No login required.

## Running with the backend

The backend adds multi-user auth and durable SQLite storage. With it running, the frontend silently mirrors writes to the API whenever an auth token is present.

```bash
cd server
cp .env.example .env       # then edit JWT_SECRET to a long random value
npm install
npm start                  # or: npm run dev   (auto-reload via --watch)
```

By default the server listens on port `4000` and **also serves the static frontend** from the project root, so you can hit everything at `http://localhost:4000`. To run the frontend separately, set `SERVE_STATIC=0` in `.env`.

### Pointing the frontend at a different API URL

Override before the app loads (e.g. with a `<script>` tag in `index.html`):

```html
<script>window.__AH_API_BASE = 'https://api.example.com/api';</script>
```

Default is `http://localhost:4000/api`.

### Creating an account

The frontend doesn't have a login UI yet (the original spec said keep the existing copy unchanged). Until that's added, drive auth from the browser console:

```js
const r = await fetch('http://localhost:4000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'me@example.com', password: 'secret123', name: 'রাহুল' }),
}).then(r => r.json());
localStorage.setItem('ah:token', r.token);
localStorage.setItem('ah:user', JSON.stringify(r.user));
// reload — subsequent writes mirror to the API
```

## API surface

All endpoints other than `/auth/*` and `/health` require `Authorization: Bearer <token>`.

| Method | Path                     | Purpose                       |
|--------|--------------------------|-------------------------------|
| GET    | `/api/health`            | Health probe                  |
| POST   | `/api/auth/register`     | Create account                |
| POST   | `/api/auth/login`        | Exchange creds → JWT          |
| GET    | `/api/auth/me`           | Current user                  |
| GET    | `/api/transactions`      | List all transactions         |
| POST   | `/api/transactions`      | Create (or upsert) a tx       |
| PUT    | `/api/transactions/:id`  | Update a tx                   |
| DELETE | `/api/transactions/:id`  | Delete a tx                   |
| GET    | `/api/debts`             | List active debts             |
| POST   | `/api/debts`             | Create a debt                 |
| PUT    | `/api/debts/:id`         | Update a debt                 |
| DELETE | `/api/debts/:id`         | Settle (soft-delete) a debt   |
| GET    | `/api/budgets`           | Get monthly + per-cat budgets |
| POST   | `/api/budgets`           | Set monthly budget            |
| PUT    | `/api/budgets/:scope`    | Set per-scope budget          |
| GET    | `/api/settings`          | Current user settings         |
| PUT    | `/api/settings`          | Update user settings          |

## Database schema

SQLite, WAL mode, foreign keys ON. Tables: `users`, `transactions`, `debts`, `budgets`, `user_settings`. See [`server/src/database/schema.sql`](server/src/database/schema.sql) for full definitions and indexes.

Data is **scoped per user** — every query is parameterized by `user_id` from the JWT.

## Security notes

- Passwords stored with bcrypt (cost 10 by default — bump `BCRYPT_ROUNDS` in `.env` for prod).
- JWTs signed with `JWT_SECRET` — **must be replaced** with a long random string in production.
- Rate limit: 120 req/min globally, 20 req per 15 min on `/auth/*`.
- CORS is strict allow-list driven by `CORS_ORIGIN`.
- Body size capped at 256 KB.
- All write endpoints validate types, ranges, and ownership.

## Beginner walkthrough — "where do I go for X?"

| If you want to...                       | Open                                                  |
|-----------------------------------------|-------------------------------------------------------|
| Add a new screen                        | `src/pages/MyNewScreen.jsx` + register a route in `App.jsx` + `<script>` line in `index.html` |
| Add a reusable widget                   | `src/components/widgets.jsx` (small things) or its own file |
| Change a formatter                      | `src/utils/format.js`                                 |
| Add an expense category                 | `src/config/categories.js`                            |
| Tweak persistence                       | `src/services/storage.js`                             |
| Change an API endpoint's logic          | `server/src/routes/*.routes.js`                       |
| Add a new table                         | `server/src/database/schema.sql` (and a route file)   |
| Change validation                       | `server/src/middleware/validate.js`                   |
| Adjust auth token lifetime              | `server/.env` → `JWT_EXPIRES`                         |
| Restyle a component                     | `src/styles/app.css` (look for the matching `.ah-…` class) |
| Change brand colors / spacing tokens    | `src/styles/tokens.css`                               |
