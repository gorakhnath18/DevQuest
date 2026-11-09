# DEVQUEST — 120-Day SDE Preparation Tracker

A full-stack MERN starter project for tracking a 120-day SDE preparation journey with friends.

## Included in this starter

- React + Vite frontend
- Express + Node.js REST API
- MongoDB + Mongoose data models
- JWT registration and login
- User dashboard with XP and completion progress
- Shared 120-day roadmap with per-user task progress
- User-created roadmaps with custom duration, subjects, day tasks and DSA assignments
- Shared DSA problem library and personal problem status
- Public profile search by username
- Basic responsive UI
- Seed script for 120 roadmap days and starter DSA problems

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB Atlas account (recommended) or local MongoDB

Check versions:

```bash
node -v
npm -v
```

## 1. Open the project

Extract the ZIP, open the `DEVQUEST` folder in VS Code, then open a terminal in that folder.

## 2. Configure MongoDB

1. Create a free MongoDB Atlas cluster at https://www.mongodb.com/atlas.
2. Create a database user and password.
3. In Network Access, allow your current IP address (for development).
4. Copy the Node.js connection string.
5. Open `server/.env.example`, copy it to `server/.env`.
6. Put your connection string in `MONGO_URI`. Replace `<password>` and URL-encode special characters in the password.

Example `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER/devquest?retryWrites=true&w=majority
JWT_SECRET=replace-this-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
```

Never share your `.env` file or commit it to GitHub.

## 3. Install dependencies

From the project root:

```bash
npm install
npm run install:all
```

## 4. Seed the roadmap and DSA starter library

Make sure MongoDB is configured, then run:

```bash
npm run seed --prefix server
```

This seeds the curated 120-day starter roadmap with concise lesson notes and five linked practice problems per day, 24 starter LeetCode links, and enough rated Codeforces problem records from the public Codeforces API to bring the DSA library to at least 1,000 entries. The additional Codeforces problems are selected by topic and rating from official public metadata; this is a broad practice set, not a ranked claim that these are the “top” 1,000 problems. The seed also imports technology employers with company and careers links from the community-maintained [Remote In Tech directory](https://github.com/remoteintech/remote-jobs) (ISC-licensed). The company source currently contains more than 600 entries with both links. The seed requires internet access to retrieve these records and official contest metadata; it fails explicitly if the sources cannot provide the requested records.

Compensation is shown as **Not verified** where a reliable, dated salary source is unavailable. The directory does not guarantee current hiring or salary.

### Company application tracking

Use the status selector in the Company Directory or open **Applications** to track Interested, Applied, Assessment, Interview, Selected, Offer, Accepted, Rejected, and Withdrawn statuses. Application data and notes are private to the account that created them.

The 120-day starter plan is the roadmap page's default and is shared as a curriculum; each account keeps its own task and problem completion. On first visit, choose to start today or tomorrow. Missed earlier days remain available and are shown on Overview as catch-up reminders; you may also complete future days early. Each day includes concise lesson guidance and five linked practice problems. Solving an assigned problem synchronizes its completion with the DSA library and awards 1 XP for Easy, 2 XP for Medium, or 3 XP for Hard. On server startup, existing problem XP awards are reconciled to those difficulty values.

Find Friends can send a direct roadmap invitation and create a recipient-bound invitation link. An accepted contributor can view the roadmap owner's progress overview; this does not merge or edit either person's progress. Job applications and private notes remain visible only to their owner.

Custom roadmap endpoints are authenticated:

- `GET/POST /api/roadmaps`
- `PATCH/DELETE /api/roadmaps/:roadmapId`
- `POST /api/roadmaps/:roadmapId/days`
- `PATCH/DELETE /api/roadmaps/:roadmapId/days/:dayId`
- `POST /api/roadmaps/:roadmapId/days/:dayId/tasks`
- `PATCH/DELETE /api/roadmaps/:roadmapId/days/:dayId/tasks/:taskId`
- `PATCH /api/roadmaps/:roadmapId/days/:dayId/tasks/:taskId/progress`

## 5. Start the app

From the project root:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend health check: http://localhost:5000/api/health

## Deploy to Vercel

The client and Express API can both run on Vercel as **two Vercel projects connected to the same GitHub repository**:

1. Create a GitHub repository and push this project. The root `.gitignore` excludes environment files, dependencies, build output, and Vercel project metadata. Never commit `server/.env`.
2. In Vercel, import the repository twice:
   - **Frontend project:** set Root Directory to `client`, Framework Preset to Vite, and add `VITE_API_URL` with the deployed API base URL, ending in `/api` (for example, `https://your-api.vercel.app/api`). The client has a rewrite for React Router deep links.
   - **API project:** set Root Directory to `server`, Framework Preset to Express, and add `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL`. Set `CLIENT_URL` to the frontend's exact production origin (for example, `https://your-app.vercel.app`).
3. Deploy the API, set the frontend's `VITE_API_URL`, then deploy the frontend. Confirm the API at `/api/health`, then register a separate account to smoke-test before sharing the site.
4. Add the same required environment variables to Vercel Preview deployments only if you intend preview branches to access the database. Keep production credentials server-side; never set `MONGO_URI` or `JWT_SECRET` as `VITE_` variables.

Vercel Git integration redeploys when you push later commits. Ordinary code deploys do **not** delete MongoDB data: the app connects to the configured database and keeps existing records. Data can be lost if the database URI/database is changed, a seed or migration explicitly overwrites/deletes records, or collections are manually cleared. Back up MongoDB before schema/data migrations and avoid destructive seed options in production. This project’s seed script is for initializing/updating shared curriculum and directory data, not for deployment.

## First use

1. Open the frontend URL.
2. Register with a name, username, email and password.
3. Log in and select whether Day 1 starts today or tomorrow.
4. Mark roadmap tasks and DSA problems as completed.
5. Search for another registered user by username from the People page and send a roadmap invitation.

## Important notes

- Each account has its own progress. Roadmap days and DSA problem metadata are shared.
- XP is awarded by the backend when progress changes; clients cannot directly submit an XP amount.
- Public profile responses intentionally omit email and private notes.
- The starter uses a bearer JWT stored in localStorage for ease of local development. Before production, consider moving authentication to secure, httpOnly cookies and adding email verification, password reset, stronger rate limits, tests and deployment configuration.
- Shared DSA edits are restricted to signed-in users. The API records who created/updated a problem. Add moderation and revision rollback before opening the library to a large public community.
- The seed DSA entries are examples with links and metadata, not copied question statements.

## Project structure

```text
DEVQUEST/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                 # Express API
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seeders/
│   ├── app.js
│   └── server.js
└── README.md
```

## Troubleshooting

- `MONGO_URI is not defined`: check that `server/.env` exists and has `MONGO_URI=...`.
- MongoDB authentication error: check database username/password and URL-encode special characters.
- Connection timeout: check Atlas Network Access and allow your current IP.
- Port in use: change `PORT` in `server/.env` or stop the process using port 5000.
- Frontend cannot reach API: confirm backend is running and `client/.env` uses `VITE_API_URL=http://localhost:5000/api`.

This is a functional foundation, not a production-audited service. Build and test each feature before deploying it for real users.
