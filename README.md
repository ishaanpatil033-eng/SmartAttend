# SmartAttend

Production-oriented monorepo for a proxy-resistant student attendance platform with Moodle integration.

## Architecture

- `frontend/`: React 19 + Vite student, teacher, HOD, and administrator interface.
- `backend/`: Java 21 + Spring Boot 3 + Spring Data JPA + MySQL 8 REST API.
- Server-authoritative time for 5-second dynamic QR tokens with atomic consumption.
- Three mandatory attendance checks: immutable hardware/browser device binding, campus Haversine geofence, and 5-second QR validation.
- One-time QR token consumption is stored and enforced in MySQL to prevent replay attacks.
- Moodle calls are server-side only; the Moodle institutional token is never exposed to the browser.

## Requirements

- Java 21 (Eclipse Temurin or OpenJDK)
- Node.js 20+
- MySQL 8.0+
- Moodle 4.x instance with REST web services enabled (optional)

## Setup

1. Copy `.env.example` to `.env` and configure your database and network settings.
2. Start MySQL and ensure the database `smartattend` is created.
3. Start the backend:
   ```bash
   cd backend
   .\mvnw.cmd spring-boot:run
   ```
4. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

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
