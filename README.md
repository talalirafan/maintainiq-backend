# MaintainIQ Backend

Express + TypeScript API for **MaintainIQ** — AI-powered QR maintenance & asset history platform.

**Live demo:** http://54.144.78.175  
**API:** http://54.144.78.175/api  
**Swagger:** http://54.144.78.175/api/docs  
**Health:** http://54.144.78.175/health

> Frontend lives in a **separate repository**: `maintainiq-frontend`.

---

## Demo credentials

| Role | Email | Password |
|------|--------|----------|
| Administrator | `admin@maintainiq.local` | `Admin123!` |
| Technician | `testtech@gmail.com` | `Test@1234` |

Bootstrap admin is created automatically when the users collection is empty. Technician account is provisioned for demos.

---

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

| Endpoint | URL |
|----------|-----|
| API | http://localhost:5000/api |
| Health | http://localhost:5000/health |
| Swagger | http://localhost:5000/api/docs |
| Postman | [`docs/MaintainIQ.postman_collection.json`](./docs/MaintainIQ.postman_collection.json) |

Import the Postman collection → set `baseUrl` → run **Login (Admin)** or **Login (Technician)**.

---

## Stack

- Node.js 20+ · Express · TypeScript (strict)
- MongoDB · Mongoose
- JWT access + refresh tokens
- Zod validation · Helmet · CORS · rate limiting
- Cloudinary (evidence) · Gemini AI · **Nodemailer** · node-cron · QRCode
- Swagger UI

## Architecture

```
Controller → Service → Repository → MongoDB
```

Controllers never talk to the database directly.

---

## Email (Nodemailer)

Configure `SMTP_*` in `.env`. When set, the API sends:

| Event | Email |
|-------|--------|
| Issue assigned | To technician |
| Issue resolved | To reporter |
| Maintenance due | To assigned technician (daily cron) |

Without SMTP, emails are logged to the server console (safe for local demos).

---

## API reference

Base path: `/api`

### Auth
| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/login` | Returns access + refresh tokens |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke refresh |
| POST | `/auth/logout-all` | Revoke all sessions |
| GET | `/auth/me` | Current user |
| POST | `/auth/forgot-password` | Reset link email |
| POST | `/auth/reset-password` | Apply reset token |
| POST | `/auth/change-password` | Authenticated |

### Users
| Method | Path | Notes |
|--------|------|-------|
| GET | `/users` | List (admin/supervisor) |
| POST | `/users` | Create user |
| PATCH | `/users/:id` | Update |

### Assets
| Method | Path | Notes |
|--------|------|-------|
| GET | `/assets` | Search + filters + pagination |
| POST | `/assets` | Create · auto `AST-######` |
| GET | `/assets/:id` | Details + `publicUrl` |
| PATCH | `/assets/:id` | Update |
| DELETE | `/assets/:id` | Delete |
| POST | `/assets/:id/assign` | Assign technician |
| GET | `/assets/:id/history` | Asset history (legacy) |
| GET | `/assets/:id/qr/preview` | QR image preview |
| GET | `/assets/:id/qr/download` | Download QR / label |
| GET | `/assets/:id/qr/metadata` | QR metadata |
| POST | `/assets/:id/qr/generate` | Generate QR payload |

### Public (no auth)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/public/assets/:id` | Safe public asset view |
| GET | `/public/assets/:id/activity` | Sanitized timeline |
| POST | `/public/assets/:id/issues` | Public issue report |
| POST | `/public/assets/:id/triage` | Public AI triage |
| POST | `/public/assets/:id/evidence` | Public evidence upload |

### Issues
| Method | Path | Notes |
|--------|------|-------|
| GET | `/issues` | List / filter |
| POST | `/issues` | Create (optional AI) |
| GET | `/issues/:id` | Details |
| PATCH | `/issues/:id` | Edit |
| POST | `/issues/:id/assign` | Assign + email |
| POST | `/issues/:id/status` | Controlled workflow |
| POST | `/issues/:id/resolve` | Resolve + email |
| POST | `/issues/:id/reopen` | Reopen |

### Maintenance
| Method | Path | Notes |
|--------|------|-------|
| GET | `/maintenance` | List records |
| POST | `/maintenance/start` | Start / draft (`MNT-######`) |
| GET | `/maintenance/by-issue/:issueId` | By issue |
| GET | `/maintenance/:id` | Details |
| PATCH | `/maintenance/:id` | Update draft |
| POST | `/maintenance/:id/complete` | Complete · parts · next service |

### AI
| Method | Path | Notes |
|--------|------|-------|
| POST | `/ai/triage` | Structured triage — **edit before save** |
| POST | `/ai/maintenance-summary` | Professional service report draft |

### History (append-only)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/history` | Global feed · filters |
| GET | `/history/summary` | Event counts |
| GET | `/history/assets/:assetId` | Per-asset timeline |

### Upload
| Method | Path | Notes |
|--------|------|-------|
| POST | `/upload/evidence` | Authenticated media → Cloudinary (or local) |

---

## Environment

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Auth secrets |
| `CLIENT_URL` | Frontend origin (CORS) |
| `PUBLIC_APP_URL` | Public QR / share links |
| `API_BASE_URL` | Absolute upload URLs |
| `CLOUDINARY_*` | Evidence uploads (optional) |
| `GEMINI_API_KEY` | AI (optional; heuristic fallback) |
| `SMTP_*` | Nodemailer (optional) |
| `BOOTSTRAP_ADMIN_*` | First admin account |

---

## Docker

```bash
docker build -t maintainiq-backend .
docker run --env-file .env -p 5000:5000 maintainiq-backend
```

## Scripts

```bash
npm run dev      # development
npm run build
npm start        # production
npm test
npm run lint
```

## Deployment (AWS EC2)

Deployed on Amazon EC2 (`t3.micro`) with Nginx reverse proxy + PM2.

See live URLs at the top of this README.

## License

Private — hackathon / SMIT MaintainIQ.
