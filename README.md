# V_Nue Mail — Custom Mail Server

A personal mail server system built from scratch to understand email infrastructure.

## Architecture

| Layer | Technology | Role |
|-------|------------|------|
| SMTP Server | Rust + Tokio | Receives and stores incoming mail |
| Database | PostgreSQL | Shared data layer |
| REST API | Node.js / Express | Auth and mail operations *(Phase 7)* |
| Webmail | React | Browser client *(Phase 8)* |

## Roadmap

- ✅ **Phase 0** — Sockets 101 (blocking, synchronous, no async yet)
- ✅ **Phase 1** — Speak SMTP by hand (`telnet` / `nc`, no code)
- ✅ **Phase 2** — Blocking single-connection Rust SMTP server
- ✅ **Phase 3** — Add `tokio` — async, handle many connections
- ✅ **Phase 4** — Parse the actual message (headers, body, RFC 5322)
- ✅ **Phase 5** — PostgreSQL schema design
- ✅ **Phase 6** — Wire Rust to Postgres (`tokio-postgres`)
- ⏳ **Phase 7** — Node/Express API layer
- ⏳ **Phase 8** — React frontend
- ⏳ **Phase 9** — Hardening (auth, error codes, edge cases, security)

## Project Structure

```
V_Nue_Mail/
├── src/
│   └── main.rs          # Async SMTP server (Tokio + tokio-postgres)
├── api/                 # Node.js/Express API (Phase 7 — coming soon)
├── frontend/            # React webmail (Phase 8 — coming soon)
├── setup_db.sql         # PostgreSQL schema
├── Cargo.toml           # Rust dependencies
└── Cargo.lock
```

## Setup

### Prerequisites
- Rust (stable) — install via [rustup.rs](https://rustup.rs) or `brew install rust`
- PostgreSQL 14+

### Database

```bash
# macOS with Postgres.app — start the server, then:
psql -U postgres -h localhost -c "CREATE DATABASE v_nue_mail;"
psql -U postgres -h localhost -d v_nue_mail < setup_db.sql
```

### Environment Variables

```bash
export DATABASE_URL="host=localhost user=postgres password=postgres dbname=v_nue_mail"
```

### Run the SMTP Server

```bash
cargo build
cargo run
# Server listens on 127.0.0.1:2525
```

### Test with Telnet / nc

```bash
# macOS
nc localhost 2525

# Then type these commands manually:
EHLO mycomputer.local
MAIL FROM:<alice@example.com>
RCPT TO:<you@vnuemail.local>
DATA
Subject: Hello

Body text here.
.
QUIT
```

## Architecture Rules (v1)

1. Rust inserts all incoming messages — Express never writes to `messages`.
2. Express handles authentication and status updates only.
3. React communicates exclusively with Express — never with the DB or SMTP server.
4. Never expose database credentials in frontend code.
5. Never store plaintext passwords.
6. Users cannot access another user's mailbox.
7. Outgoing email sending is out of scope for v1.
