# V_Nue Mail - Custom Mail Server System

A personal mail server system built from scratch to understand email infrastructure.

## Architecture

- **Rust SMTP Server**: Async mail ingestion using tokio
- **PostgreSQL**: Shared data layer
- **Node.js/Express API**: REST endpoints for mail operations
- **React Frontend**: Webmail client

## Rust SMTP Server Setup

### Prerequisites
- Rust (latest stable)
- PostgreSQL 14+

### Database Setup
```bash
# Start PostgreSQL
# macOS: brew services start postgresql

# Create database
psql -U postgres < setup_db.sql
```

### Environment Variables
```bash
export DATABASE_URL="host=localhost user=postgres password=postgres dbname=v_nue_mail"
```

### Run the Server
```bash
cargo build --release
cargo run
```

The SMTP server listens on `127.0.0.1:2525`

### Testing with Telnet
```bash
telnet localhost 2525
EHLO test.local
MAIL FROM:<sender@example.com>
RCPT TO:<recipient@vnuemail.local>
DATA
Subject: Test Email

This is a test message
.
QUIT
```

## Current Status

✅ Phase 1-2: Basic SMTP protocol implementation  
✅ Phase 3: Async/concurrent with tokio  
✅ Phase 4: Basic message parsing (headers/body)  
✅ Phase 5: PostgreSQL schema  
✅ Phase 6: Rust → Postgres integration  
⏳ Phase 7: Node/Express API (next)  
⏳ Phase 8: React frontend (next)  
⏳ Phase 9: Security hardening

## Project Structure
```
V_Nue_Mail/
├── src/
│   └── main.rs          # Async SMTP server with Postgres
├── api/                 # Node.js/Express API (to be created)
├── frontend/            # React app (to be created)
├── setup_db.sql         # Database schema
└── Cargo.toml          # Rust dependencies
```
