# SmartAttend

Production-oriented monorepo for a proxy-resistant student attendance platform with Moodle integration.

## Architecture

- `frontend/`: React + Vite student/teacher UI.
- `backend/`: Node.js + Express + MongoDB/Mongoose API.
- Server-authoritative time for 15-second QR JWTs.
- Three mandatory attendance checks: immutable device binding, 30 m Haversine geofence, and 15 s JWT validation.
- One-time QR token consumption is stored in MongoDB to reduce replay risk.
- Moodle calls are server-side only; the Moodle admin token is never exposed to the browser.

## Important security note

No browser-only attendance mechanism can honestly be called 100% "proxy-proof". Browser fingerprinting, GPS and camera input can be attacked or spoofed. SmartAttend therefore uses layered controls and server-side verification rather than treating any single signal as authoritative.

## Requirements

- Node.js 20.19+ (or a newer supported Node release)
- MongoDB
- Moodle instance with REST web services enabled

## Setup

1. Copy `backend/.env.example` to `backend/.env` and fill the secrets/configuration.
2. Install dependencies:

```bash
npm install
npm run install:all
```

3. Start both applications:

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

## First student

The registration page is intentionally included as an API endpoint rather than seeded credentials. The frontend can be extended with a dedicated admin/registration screen.

## Production checklist

- Replace every example secret with a high-entropy secret stored in a secret manager.
- Run frontend/backend behind HTTPS.
- Restrict `FRONTEND_ORIGIN` to the exact deployed origin.
- Configure classroom coordinates precisely and verify GPS accuracy policy.
- Create a Moodle service with only the capabilities required by this application.
- Configure the required Moodle functions for the service token.
- Consider Fingerprint Identification/Pro with server-side verification or sealed results if higher assurance is required.
- Add centralized logging, monitoring, backups, and an operational incident/audit process.
