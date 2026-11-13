# V_Nue Mail - Custom Mail Server System

A complete email infrastructure built from scratch to understand how email systems actually work.

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│  External SMTP  │──SMTP──▶│  Rust SMTP   │         │  Node.js/Express│
│   Mail Clients  │         │    Server    │──Write─▶│      API        │
└─────────────────┘         │  (Port 2525) │         │   (Port 4000)   │
                            └──────┬───────┘         └────────┬────────┘
                                   │                          │
                                   │        PostgreSQL        │
                                   └──────────┬───────────────┘
                                              │
                                    ┌─────────▼─────────┐
                                    │  messages table   │
                                    │  users table      │
                                    └───────────────────┘
                                              ▲
                                              │
                                    ┌─────────┴─────────┐
                                    │  React Frontend   │
                                    │  Webmail Client   │
                                    └───────────────────┘
```

### Components:
1. **Rust SMTP Server** - Async mail ingestion (tokio + PostgreSQL)
2. **PostgreSQL Database** - Shared data layer
3. **Node.js/Express API** - REST endpoints with JWT auth
4. **React Frontend** - Webmail interface (to be implemented)

---

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [Rust SMTP Server](#rust-smtp-server)
- [Node.js API](#nodejs-api)
- [React Frontend](#react-frontend)
- [Testing](#testing)
- [Project Status](#project-status)

---

## 🚀 Quick Start

```bash
# 1. Setup database
psql -U postgres < setup_db.sql

# 2. Start Rust SMTP server (Terminal 1)
export DATABASE_URL="host=localhost user=postgres password=postgres dbname=v_nue_mail"
cargo run

# 3. Start Node.js API (Terminal 2)
cd api
npm install
npm start

# 4. Send test email via telnet
telnet localhost 2525
# Then type SMTP commands (see Testing section)
```

---

## 📦 Prerequisites

### Required:
- **Rust** (latest stable) - [Install](https://rustup.rs/)
- **PostgreSQL** 14+ - `brew install postgresql` (macOS)
- **Node.js** 18+ - [Install](https://nodejs.org/)

### Check installations:
```bash
rustc --version    # Should be 1.70+
psql --version     # Should be 14+
node --version     # Should be 18+
```

---

## 🗄️ Database Setup

### Start PostgreSQL
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Create Database & Tables
```bash
psql -U postgres < setup_db.sql
```

This creates:
- Database: `v_nue_mail`
- Table: `users` (id, email, password_hash, display_name, created_at)
- Table: `messages` (id, sender, recipient, subject, body, raw_headers, status, created_at)
- Test user: `test@vnuemail.local` / `test123`

### Verify Database
```bash
psql -U postgres -d v_nue_mail -c "\dt"
# Should show: users, messages
```

---

## 🦀 Rust SMTP Server

### Features:
✅ **Async/Concurrent** - Handles multiple connections with tokio  
✅ **SMTP Protocol** - EHLO, MAIL FROM, RCPT TO, DATA, QUIT  
✅ **Multi-recipient** - One email to multiple recipients  
✅ **Message Parsing** - Extracts Subject from headers  
✅ **PostgreSQL Integration** - Saves messages directly to database  
✅ **Proper SMTP Replies** - 220, 250, 354, 503 response codes  

### Setup:
```bash
# Set database connection
export DATABASE_URL="host=localhost user=postgres password=postgres dbname=v_nue_mail"

# Build
cargo build --release

# Run
cargo run
```

Server starts on `127.0.0.1:2525`

### Code Structure:
- **SessionStates enum** - SMTP state machine
- **EmailData struct** - Per-connection message data
- **handle_client()** - Async connection handler
- **parse_message()** - Extracts headers/body/subject
- **save_message()** - Writes to PostgreSQL

### Environment Variables:
```bash
DATABASE_URL="host=localhost user=postgres password=postgres dbname=v_nue_mail"
```

---

## 🌐 Node.js API

### Features:
✅ **JWT Authentication** - Secure user sessions  
✅ **User Management** - Signup/Login with bcrypt  
✅ **Message CRUD** - List, Read, Update status  
✅ **Folder Stats** - Inbox/Read/Unread/Trash counts  
✅ **CORS Enabled** - Frontend can connect  

### Setup:
```bash
cd api
npm install
```

### Environment Variables:
Create `api/.env`:
```
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/v_nue_mail
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
```

### Run:
```bash
npm start        # Production
npm run dev      # Development with auto-reload
```

API runs on `http://localhost:4000`

### Endpoints:

#### **Authentication**
```bash
# Signup
POST /auth/signup
Body: { "email": "user@example.com", "password": "pass123", "displayName": "John" }

# Login
POST /auth/login
Body: { "email": "user@example.com", "password": "pass123" }
Response: { "token": "jwt-token", "user": {...} }
```

#### **Messages** (Requires `Authorization: Bearer <token>`)
```bash
# List messages
GET /messages?status=unread&limit=50&offset=0

# Get single message
GET /messages/:id

# Update message status
PATCH /messages/:id
Body: { "status": "read" }  # or "unread" or "trashed"

# Get folder counts
GET /folders
Response: { "inbox": 10, "read": 5, "unread": 5, "trashed": 2 }
```

---

## ⚛️ React Frontend

### Status: **To Be Implemented**

### Planned Features:
- Login/Signup pages
- Inbox view with folder navigation
- Message detail view
- Mark as read/unread
- Move to trash
- Responsive design

### Tech Stack:
- React 18
- React Router
- Axios for API calls
- Tailwind CSS / Material-UI

### Setup (when ready):
```bash
cd frontend
npm install
npm start
```

---

## 🧪 Testing

### Test SMTP Server with Telnet:
```bash
telnet localhost 2525

# Type these commands:
EHLO test.local
MAIL FROM:<alice@example.com>
RCPT TO:<test@vnuemail.local>
DATA
Subject: Hello from Telnet
From: alice@example.com
To: test@vnuemail.local

This is a test email body.
.
QUIT
```

### Test API with curl:
```bash
# Health check
curl http://localhost:4000/health

# Signup
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@vnuemail.local","password":"test123"}'

# Login
TOKEN=$(curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@vnuemail.local","password":"test123"}' \
  | jq -r '.token')

# Get messages
curl http://localhost:4000/messages \
  -H "Authorization: Bearer $TOKEN"

# Get folders
curl http://localhost:4000/folders \
  -H "Authorization: Bearer $TOKEN"
```

### Verify Database:
```bash
psql -U postgres -d v_nue_mail

# Check messages
SELECT sender, recipient, subject, status FROM messages;

# Check users
SELECT email, display_name FROM users;
```

---

## 📊 Project Status

### ✅ Completed (Phases 1-6):
- [x] Phase 1: Manual SMTP testing with telnet
- [x] Phase 2: Blocking single-connection Rust server
- [x] Phase 3: Async multi-connection with tokio
- [x] Phase 4: Message parsing (headers/body/subject)
- [x] Phase 5: PostgreSQL schema design
- [x] Phase 6: Rust → Postgres integration
- [x] Phase 7: Node/Express API layer

### ⏳ In Progress:
- [ ] Phase 8: React frontend

### 🔜 Future (Phase 9):
- [ ] TLS/SSL encryption
- [ ] SMTP authentication
- [ ] Real SMTP relay (send emails)
- [ ] MIME/attachment parsing
- [ ] Spam filtering
- [ ] Rate limiting
- [ ] Docker deployment

---

## 📁 Project Structure

```
V_Nue_Mail/
├── src/
│   └── main.rs              # Rust async SMTP server
├── api/
│   ├── server.js            # Express API
│   ├── package.json         # Node dependencies
│   ├── .env                 # API config (gitignored)
│   └── README.md            # API docs
├── frontend/                # React app (to be created)
├── Cargo.toml               # Rust dependencies
├── Cargo.lock               # Rust lock file
├── setup_db.sql             # Database schema
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

---

## 🔧 Troubleshooting

### Database connection fails:
```bash
# Check PostgreSQL is running
brew services list | grep postgres

# Check connection
psql -U postgres -d v_nue_mail
```

### Port already in use:
```bash
# Kill process on port 2525 (SMTP)
lsof -ti:2525 | xargs kill -9

# Kill process on port 4000 (API)
lsof -ti:4000 | xargs kill -9
```

### Rust build fails:
```bash
# Update Rust
rustup update

# Clean and rebuild
cargo clean
cargo build
```

---

## 🤝 Contributing

This is a learning project. Feel free to:
- Add features
- Improve error handling
- Add tests
- Build the React frontend
- Enhance security

---

## 📝 Notes

- SMTP server runs on **port 2525** (not 25) to avoid needing sudo
- JWT tokens expire after **24 hours**
- Messages are **never deleted**, only marked as "trashed"
- Raw SMTP headers are preserved in `raw_headers` column
- The Rust server is the **only writer** to the database
- The API only **reads and updates** message status

---

## 📚 Resources

- [SMTP RFC 5321](https://tools.ietf.org/html/rfc5321)
- [Email Format RFC 5322](https://tools.ietf.org/html/rfc5322)
- [Tokio Documentation](https://tokio.rs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

**Built with ❤️ to understand email infrastructure from the ground up.**
