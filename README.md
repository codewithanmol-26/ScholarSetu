# ScholarSetu: project guide

## Folders
- `frontend/`  the app screens (index.html is the working demo with mock data, api.js is the only file that calls the backend)
- `backend/`   NestJS API: auth (OTP, password, DigiLocker), adapters, SMS, database
- `docker-compose.yml`  local PostgreSQL + Redis

## Run it locally (5 steps)
1. Install Node 20 and Docker.
2. `docker compose up -d`  (starts PostgreSQL and Redis, creates the tables from backend/db/schema.sql)
3. `cd backend && cp .env.example .env`, then fill JWT_SECRET and OTP_PEPPER with `openssl rand -hex 32`
   and set the password in DATABASE_URL to match docker-compose (default CHANGE_ME, change both).
4. `npm install && npm run start:dev`   (API on http://localhost:3000)
5. In `frontend/`: `npx serve -l 8080 .`  then open http://localhost:8080

Test without the frontend:
    curl -X POST localhost:3000/auth/otp/send -H 'Content-Type: application/json' -d '{"mobile":"9876543210"}'
    (the OTP is printed in the backend console while SMS_API_URL is empty)
    curl -X POST localhost:3000/auth/otp/verify -H 'Content-Type: application/json' -d '{"mobile":"9876543210","otp":"123456"}'

## How the pieces connect
    Browser (frontend/api.js) -> AuthController -> OtpService -> Redis (OTP hash, 5 min)
                                               -> SmsService -> SMS gateway
                                               -> AuthService -> PostgreSQL (users) -> JWT back to the browser
    DigiLocker button -> /auth/digilocker/start -> DigiLocker -> /auth/digilocker/callback -> AuthService
Wiring happens in `backend/src/app.module.ts`: it connects PostgreSQL (TypeOrmModule) and Redis (the 'REDIS' provider), then lists every service so NestJS can inject them into each other.

## Connect the frontend to the backend
In index.html, replace the mock calls: `sendOtp()` -> `api.sendOtp(mobile)`, the OTP check -> `api.verifyOtp(mobile, otp)`, `pwLogin()` -> `api.passwordLogin(...)`, the DigiLocker button -> `api.digiLocker()`. Add `<script src="api.js"></script>` first. Keep the mock data until each API is ready.

## Add another database or data source
1. Create `backend/src/adapters/udise.adapter.ts` implementing `SourceAdapter`.
2. Add it to `providers` in app.module.ts.
3. Call it from a verification service. If it is a second SQL database, add a second `TypeOrmModule.forRootAsync({ name: 'legacy', ... })` with its own env variable.
NSP, SFMP and NOS databases are not directly accessible: use their official APIs or API Setu once you have permission.

## Keep secrets out of GitHub
- Secrets live only in `backend/.env` (already in .gitignore). Commit `.env.example` with empty values.
- Anything in `frontend/` is public. Never put keys, tokens or passwords there. Only API_URL.
- Before the first commit: `git status` and check `.env` is not listed. Add a scanner: `gitleaks protect --staged` as a pre-commit hook.
- GitHub: turn on Secret scanning and Push protection (Settings > Code security). Put deploy keys in Settings > Secrets and variables > Actions.
- If a secret was ever pushed: rotate it first (new key, revoke old), then clean history with `git filter-repo`. Deleting the file in a new commit does not remove it.
- Never commit real student data, Aadhaar numbers or database dumps. Use fake seed data. Store only masked Aadhaar or a reference ID.
- Production: use Kubernetes Secrets or a vault, not .env files on the server.

## Jago Lite (live assistant, no Docker needed)
`cd jago-lite && cp .env.example .env && node server.js` then open http://localhost:3000 (phone on same Wi-Fi: http://YOUR-LAPTOP-IP:3000).
Set AI_PROVIDER=ollama|gemini|openai in `.env` (keys stay server-side). Eligibility is computed by rules in `jago-lite/data/schemes.json`; the AI only explains it. Add official guideline text as `.txt` in `jago-lite/data/knowledge/` for cited answers.
