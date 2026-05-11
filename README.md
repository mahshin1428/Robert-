# Robert

Robert is an LLM-powered chatbot with login-based authentication and persistent per-user chat history. Users register an account, log in, and chat with an AI assistant. Every message is saved to a database so the full conversation is available on every subsequent login.

---

## Project Structure

```
Robert-/
├── backend/
│   ├── requirements.txt
│   └── src/
│       ├── main.py               # FastAPI app entry point
│       ├── api/
│       │   └── routes.py         # All REST API endpoints
│       ├── core/
│       │   ├── config.py         # Environment-based settings
│       │   ├── security.py       # JWT auth + password hashing
│       │   ├── exceptions.py     # Custom exception handlers
│       │   └── logger.py         # Logging configuration
│       └── db/
│           ├── base.py           # SQLAlchemy declarative base
│           ├── models.py         # User and Message ORM models
│           └── session.py        # DB session factory
├── frontend/
│   ├── angular.json
│   ├── package.json
│   └── src/
│       └── app/
│           ├── app.routes.ts         # Client-side routing
│           ├── auth-view.component.ts # Login / register screen
│           ├── chat-view.component.ts # Chat interface
│           ├── auth.service.ts       # HTTP calls to backend
│           └── api.types.ts          # TypeScript response types
├── chat.db                       # SQLite database (auto-created)
└── .env                          # Environment variables (not committed)
```

---

## Features

- **User registration and login** — accounts stored with bcrypt-hashed passwords.
- **JWT authentication** — every protected request carries a Bearer token; tokens expire after 24 hours.
- **Persistent chat history** — all messages are stored in SQLite under the authenticated user's account and reloaded on every login.
- **LLM integration** — the backend forwards each user message to a configurable external model server and saves the reply.
- **Angular SPA frontend** — two-screen app: an auth screen and a chat screen.

---

## API Reference

All endpoints are prefixed with `/api`.

### `POST /api/auth/register`

Create a new user account.

**Request body**
```json
{ "username": "alice", "password": "secret" }
```

**Responses**
| Status | Body | Meaning |
|--------|------|---------|
| 200 | `{"msg": "registered"}` | Account created |
| 400 | `{"detail": "Username already exists"}` | Duplicate username |

---

### `POST /api/auth/login`

Authenticate and receive a JWT access token.

**Request body**
```json
{ "username": "alice", "password": "secret" }
```

**Responses**
| Status | Body | Meaning |
|--------|------|---------|
| 200 | `{"access_token": "<jwt>", "token_type": "bearer"}` | Login successful |
| 401 | `{"detail": "Invalid credentials"}` | Wrong username or password |

The returned `access_token` must be sent as `Authorization: Bearer <token>` on all subsequent requests.

---

### `POST /api/chat`

Send a message to the chatbot. Requires authentication.

**Headers**
```
Authorization: Bearer <access_token>
```

**Request body**
```json
{ "message": "What is the capital of France?" }
```

**Behaviour**
1. Saves the user's message to the database (`role: "user"`).
2. Forwards the message to the external model server (`MODEL_SERVER_URL`).
3. Saves the model's reply to the database (`role: "assistant"`).
4. Returns the reply.

**Responses**
| Status | Body | Meaning |
|--------|------|---------|
| 200 | `{"reply": "Paris."}` | Success |
| 401 | `{"detail": "..."}` | Missing or invalid token |
| 500 | `{"detail": "MODEL_SERVER_URL not configured"}` | Env var missing |
| 502 | `{"detail": "Model server error: ..."}` | Upstream model failure |

---

### `GET /api/history`

Retrieve the full conversation history for the authenticated user, ordered chronologically.

**Headers**
```
Authorization: Bearer <access_token>
```

**Response**
```json
[
  { "role": "user",      "content": "Hello!", "created_at": "2025-05-10T14:00:00" },
  { "role": "assistant", "content": "Hi there! How can I help?", "created_at": "2025-05-10T14:00:01" }
]
```

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| username | TEXT | Unique, indexed |
| hashed_password | TEXT | bcrypt hash |

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key → users.id |
| role | TEXT | `"user"` or `"assistant"` |
| content | TEXT | Message body |
| created_at | DATETIME | UTC timestamp |

---

## Setup

### Environment variables

Create a `.env` file at the repository root:

```env
SECRET_KEY=change-this-to-a-random-secret
DATABASE_URL=sqlite:///./chat.db
MODEL_SERVER_URL=http://127.0.0.1:8001/generate
CORS_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | Yes | — | Secret used to sign JWT tokens |
| `DATABASE_URL` | No | `sqlite:///./chat.db` | SQLAlchemy database URL |
| `MODEL_SERVER_URL` | Yes | — | URL of the external LLM inference server |
| `CORS_ORIGINS` | No | `http://localhost:4200` | Comma-separated list of allowed CORS origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | JWT lifetime in minutes (default 24 h) |

### Backend

```bash
# From the repository root
pip install -r backend/requirements.txt
uvicorn backend.src.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.  
Interactive docs (Swagger UI): `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm start        # Angular dev server on http://localhost:4200
```

For a production build served by the FastAPI backend:

```bash
npm run build    # outputs to frontend/dist/frontend/browser
```

The backend automatically serves the built frontend at `/` when the `dist` folder exists.

---

## How It Works

```
Browser (Angular)
     │
     │  POST /api/auth/register   or   POST /api/auth/login
     ▼
FastAPI Backend  ──→  SQLite DB (users table)
     │  returns JWT
     │
     │  POST /api/chat  (Bearer token)
     ▼
FastAPI Backend  ──→  SQLite DB (save user message)
     │
     │  POST MODEL_SERVER_URL  {"message": "..."}
     ▼
External LLM Server  (e.g. Ollama, llama.cpp HTTP server)
     │  returns {"reply": "..."}
     ▼
FastAPI Backend  ──→  SQLite DB (save assistant reply)
     │  returns {"reply": "..."}
     ▼
Browser  ──→  GET /api/history  →  renders full conversation
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI 0.95 |
| ASGI server | Uvicorn |
| ORM | SQLAlchemy 1.4 |
| Database | SQLite (default) / PostgreSQL (optional) |
| Auth | JWT via python-jose, passwords via passlib + bcrypt |
| HTTP client | httpx |
| Frontend | Angular 17 (standalone components) |
| Language | Python 3.10+, TypeScript 5.4 |
