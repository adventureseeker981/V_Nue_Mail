# ENCRYPTO — Private Mail. Always Secure.

> **Advanced Programming & Data Engineering Project**  
> **Team T0043** | B.Tech Computer Science & Engineering  
> A functional, beginner-friendly, Gmail-inspired private encrypted email application built with **React.js**, **Express.js**, **PostgreSQL**, and an async **Rust** mail ingestion server.

![Encrypto Logo](frontend/public/assets/encrypto-logo.png)

---

## 📋 Table of Contents
1. [What is Encrypto?](#1-what-is-encrypto)
2. [What Problem Does It Solve?](#2-what-problem-does-it-solve)
3. [Brand Identity & Design System](#3-brand-identity--design-system)
4. [Project Architecture](#4-project-architecture)
5. [Technology Stack & Why Each is Used](#5-technology-stack--why-each-is-used)
   - [Why React?](#why-reactjs)
   - [Why Express.js?](#why-expressjs)
   - [Why Rust?](#why-rust)
   - [Why PostgreSQL?](#why-postgresql)
6. [Communication Flow Between Layers](#6-communication-flow-between-layers)
   - [How React Communicates with Express](#how-react-communicates-with-express)
   - [How Express Communicates with Rust](#how-express-communicates-with-rust)
7. [Security and Encryption in Our System](#7-security-and-encryption-in-our-system)
8. [Database Schema & Data Flow](#8-database-schema--data-flow)
9. [Project Folder Structure & Key Files](#9-project-folder-structure--key-files)
10. [REST API Documentation](#10-rest-api-documentation)
11. [Step-by-Step Installation & Setup](#11-step-by-step-installation--setup)
12. [How to Run the Application](#12-how-to-run-the-application)
13. [Testing & Verification](#13-testing--verification)
14. [Viva Voce / College Evaluation Questions & Answers](#14-viva-voce--college-evaluation-qa)

---

## 1. What is Encrypto?

**Encrypto** is a private, encrypted webmail platform and mail ingestion system inspired by Gmail, Linear, and Stripe. Tagline: **Private Mail. Always Secure.**

It delivers a modern SaaS interface for users to register, sign in, inspect their private inbox, view sent emails, read messages in an isolated reading view, and compose new encrypted messages.

Behind the browser, an **Express.js** REST API serves as the secure application bridge, while an async **Rust** server handles low-level mail ingestion and protocol handling. Data is persistently stored in a normalized **PostgreSQL** relational database.

---

## 2. What Problem Does It Solve?

1. **Understanding Mail Infrastructure from Scratch**: Commercial services hide how email protocols (SMTP, RFC 5321, RFC 5322) operate under the hood. Encrypto builds the pipeline from socket-level packet arrival up to the user-facing webmail UI.
2. **Access Control & Privacy**: Ensures that users can **never** view or tamper with emails that do not belong to them. All mailbox database queries enforce strict user email ownership filtering (`LOWER(recipient) = LOWER(req.user.email)`).
3. **Password Security**: Eliminates plain-text credential leaks by applying salted one-way hashing (`bcrypt`) before saving to the database.
4. **Resilient Microservices Separation**: Isolates web presentation (React), API routing and authorization (Node/Express), and high-throughput background socket handling (Rust).

---

## 3. Brand Identity & Design System

Encrypto features a modern dark-mode SaaS design system:

| Element | Specification | Usage |
| :--- | :--- | :--- |
| **Primary Background** | `#080D25` (Midnight Navy) | Global canvas, navbar, and sidebar backgrounds |
| **Elevated Surface** | `#0D153A` (Deep Slate Navy) | Auth cards, email detail container, modals |
| **Electric Blue** | `#19A9F5` | Primary buttons, active tabs, unread indicators |
| **Violet** | `#7045F5` | Gradient accents, highlights, avatar gradients |
| **Brand Gradient** | `linear-gradient(135deg, #19A9F5 0%, #7045F5 100%)` | Primary CTAs, logo highlights, avatar badges |
| **Primary Text** | `#FFFFFF` | Headings, active email subjects, prominent text |
| **Secondary Text** | `#AAB5CC` | Subtitles, preview snippets, metadata, labels |
| **Border Color** | `#1A254D` | Subtle, clean separation borders |

---

## 4. Project Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND (Vite / SPA)                     │
│                    Running at http://localhost:3000                    │
│                                                                        │
│   [LoginPage]        [SignupPage]        [Dashboard / Inbox]           │
│   [ComposeModal]     [EmailView]         [Encrypto Navbar & Sidebar]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Requests (Fetch API with JWT)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS.JS BACKEND (API)                        │
│                    Running at http://localhost:3001                    │
│                                                                        │
│   • Middleware: JWT Auth (`requireAuth`), CORS, Error Handler          │
│   • Controllers: authController.js, emailController.js                 │
│   • Bridge Service: services/rustService.js (HTTP Forwarder & Health)  │
└──────────────────┬────────────────────────────────┬────────────────────┘
                   │                                │
                   │ SQL Queries (pg Pool)          │ Forward / Process via HTTP
                   ▼                                ▼
┌────────────────────────────────────┐  ┌────────────────────────────────┐
│        POSTGRESQL DATABASE         │  │          RUST SERVER           │
│         Port 5432 (v_nue_mail)     │  │  • Async Tokio TCP on :2525    │
│                                    │  │  • Mail processing & parsing   │
│   • users table (id, hash, email)  │  │  • Optional HTTP service       │
│   • messages table (sender, etc.)  │  │    (configured in .env)        │
└────────────────────────────────────┘  └────────────────────────────────┘
```

---

## 5. Technology Stack & Why Each is Used

### Why React.js?
- **Component-Based Architecture**: Breaks the UI into clean, reusable blocks (`Navbar`, `Sidebar`, `EmailItem`, `ComposeModal`).
- **Reactive State Management**: Uses React hooks (`useState`, `useEffect`) to update the unread badge and email list instantly when messages change without reloading the whole browser.
- **Fast Client-Side Routing**: `react-router-dom` delivers a Single Page Application (SPA) experience like Gmail.

### Why Express.js?
- **Lightweight & Beginner-Friendly**: Minimal boilerplate, readable route definitions, and predictable middleware pipelines (`req, res, next`).
- **Decoupled Security Bridge**: Protects database credentials from ever being exposed to the browser. Validates and sanitizes incoming user input.
- **Standardized REST API**: Employs clean HTTP verbs (`GET`, `POST`, `PATCH`, `DELETE`) with accurate status codes (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Server Error`).

### Why Rust?
- **Memory Safety Without Garbage Collection**: Eliminates null pointer crashes and memory leaks.
- **High Concurrency with Tokio**: Asynchronously handles hundreds of simultaneous socket connections without blocking threads.
- **Low-Level Protocol Parsing**: Parses raw RFC 5321 SMTP stream boundaries (`\r\n\r\n`, `.` line) efficiently.

### Why PostgreSQL?
- **ACID Compliance**: Ensures message creation and user signups are atomic and reliable.
- **Strong Relational Typing & UUIDs**: Prevents sequential ID guessing attacks by using `UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Indexing Support**: Indexed on `recipient`, `status`, and `created_at` for instantaneous mailbox filtering.

---

## 6. Communication Flow Between Layers

### How React Communicates with Express
1. When a user submits a form or opens the dashboard, React's `frontend/src/services/api.js` fires a standard JavaScript `fetch()` call.
2. For protected routes (`/api/emails/*`), the request includes the user's JSON Web Token in the header:
   ```http
   Authorization: Bearer <jwt_token>
   Content-Type: application/json
   ```
3. Express's `requireAuth` middleware verifies the token signature using the secret key (`JWT_SECRET`). If valid, it attaches `req.user = { id, email }` and calls `next()`.

### How Express Communicates with Rust
1. Located in `api/src/services/rustService.js`.
2. When an email is sent via `POST /api/emails/send`, Express validates the payload and forwards it to the Rust processing service via HTTP (`POST http://127.0.0.1:8080/api/process-mail`).
3. **Resilient Fallback Handling**: If the Rust HTTP microservice is offline or still in development, `rustService.js` catches the connection error gracefully without crashing Express, logs a warning, and saves the message to PostgreSQL with a notice.

---

## 7. Security and Encryption in Our System

| Feature | Implementation | Why It Matters for Security |
| :--- | :--- | :--- |
| **Password Hashing** | `bcryptjs` with 10 salt rounds | Passwords are never stored in plain text. |
| **Session Security** | Stateless JWT (`jsonwebtoken`) | Signed cryptographic tokens expire in 7 days. |
| **Multi-Tenant Isolation** | Strict SQL filtering by `req.user.email` | Users can never query or view other users' mail. |
| **Timing Attack Mitigation** | Dummy hash comparison | Constant-time response if an email does not exist. |
| **Safe Error Reporting** | Generic 500 error handlers | Database stack traces are never leaked to clients. |
| **No Private Key Leakage** | Clean log policy | Private keys and tokens are never printed to console logs. |

---

## 8. Database Schema & Data Flow

Database: `v_nue_mail` in PostgreSQL.

### Table: `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Unique user identifier (`gen_random_uuid()`) |
| `email` | TEXT | UNIQUE, NOT NULL | Account email address (lowercase) |
| `password_hash` | TEXT | NOT NULL | Salted bcrypt hash |
| `display_name` | TEXT | NULLABLE | User's full name |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Account registration timestamp |

### Table: `messages`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Unique message identifier |
| `sender` | TEXT | NOT NULL | Sender email address |
| `recipient` | TEXT / TEXT[] | NOT NULL | Recipient email address(es) |
| `subject` | TEXT | DEFAULT '(No Subject)' | Email subject line |
| `body` | TEXT | NULLABLE | Message content |
| `raw_headers` | TEXT | NULLABLE | Preserved email RFC headers |
| `status` | TEXT | DEFAULT 'unread' | Message state (`unread`, `read`, `trashed`) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Message timestamp |

---

## 9. Project Folder Structure & Key Files

```
V_Nue_Mail/
├── frontend/                          # Encrypto React Application (Vite)
│   ├── public/
│   │   ├── assets/
│   │   │   ├── encrypto-logo.png      # High-res horizontal logo with tagline
│   │   │   ├── encrypto-logo-transparent.png # Transparent background logo
│   │   │   ├── encrypto-icon.png      # Square icon (envelope + lock)
│   │   │   └── encrypto-icon-transparent.png # Transparent icon
│   │   ├── favicon.png                # Tab favicon
│   │   └── favicon.ico                # Standard favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx             # Top bar: Encrypto logo, search, avatar, logout
│   │   │   ├── Sidebar.jsx            # Left sidebar: Compose button, Inbox badge, Sent, Trash
│   │   │   ├── EmailItem.jsx          # Single email item with electric blue unread dot
│   │   │   └── ComposeModal.jsx       # Floating compose window (To, Subject, Body)
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx          # User login screen with Encrypto branding
│   │   │   ├── SignupPage.jsx         # Registration screen with password confirmation
│   │   │   ├── DashboardPage.jsx      # Main layout combining Navbar, Sidebar, and list
│   │   │   └── EmailView.jsx          # Detailed email reader with delete and back buttons
│   │   ├── services/
│   │   │   └── api.js                 # Centralized fetch API methods with JWT header
│   │   ├── App.jsx                    # Route definitions and protected route wrapper
│   │   ├── main.jsx                   # React DOM root mounting
│   │   └── style.css                  # Encrypto modern SaaS dark theme
│   ├── index.html                     # HTML root entry with SEO and OpenGraph tags
│   ├── vite.config.js                 # Vite dev server + proxy to Express API
│   └── package.json                   # React dependencies
│
├── api/                               # Express.js REST API Backend
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js      # signup, login, getMe, logout logic
│   │   │   └── emailController.js     # inbox, sent, getById, send, markRead, delete
│   │   ├── middleware/
│   │   │   └── auth.js                # JWT verification middleware (requireAuth)
│   │   ├── routes/
│   │   │   ├── auth.js                # /api/auth routes
│   │   │   ├── emails.js              # /api/emails routes
│   │   │   └── mail.js                # Backward-compatible mail routes
│   │   ├── services/
│   │   │   └── rustService.js         # HTTP bridge connector to the Rust server
│   │   ├── db.js                      # PostgreSQL pool with libpq & URL string parser
│   │   └── index.js                   # Express application entry point & route mounting
│   ├── test/
│   │   ├── api.test.js                # Unit tests for connection string & registration
│   │   └── email.test.js              # Unit tests for Rust bridge fallback & email validation
│   ├── .env                           # Local environment config (gitignored)
│   ├── .env.example                   # Sample configuration template
│   └── package.json                   # Node.js dependencies
│
├── src/                               # Teammate's Async Rust Server
│   └── main.rs                        # Tokio TCP SMTP Server listening on 127.0.0.1:2525
│
├── Cargo.toml                         # Rust package configuration & dependencies
├── setup_db.sql                       # Database initialization script
└── README.md                          # Comprehensive project documentation
```

---

## 10. REST API Documentation

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Auth Required | Request Body | Success Code | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | No | `{ email, password, display_name }` | `201 Created` | Registers a new user and returns JWT token |
| `POST` | `/api/auth/login` | No | `{ email, password }` | `200 OK` | Verifies credentials and returns JWT token |
| `POST` | `/api/auth/logout` | No | None | `200 OK` | Client clears token |
| `GET` | `/api/auth/me` | **Yes** (Bearer Token) | None | `200 OK` | Returns current user profile |

### Email Endpoints (`/api/emails`)

| Method | Endpoint | Auth Required | Request Body | Success Code | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/emails/inbox` | **Yes** | None | `200 OK` | Fetches incoming messages for logged-in user |
| `GET` | `/api/emails/sent` | **Yes** | None | `200 OK` | Fetches messages sent by logged-in user |
| `POST` | `/api/emails/send` | **Yes** | `{ recipient, subject, body }` | `201 Created` | Bridges to Rust & stores sent message |
| `GET` | `/api/emails/:id` | **Yes** | None | `200 OK` | Returns full message (authorized only) |
| `PATCH` | `/api/emails/:id/read` | **Yes** | None | `200 OK` | Marks message as read |
| `PATCH` | `/api/emails/:id/unread`| **Yes** | None | `200 OK` | Marks message as unread |
| `DELETE`| `/api/emails/:id` | **Yes** | None | `200 OK` | Moves email to trash |

---

## 11. Step-by-Step Installation & Setup

### 1. Prerequisites
- **Node.js** (v18+ recommended) — `node -v`
- **PostgreSQL** (v14+) — `psql --version`
- **Rust & Cargo** (v1.70+) — `cargo --version`

### 2. Database Initialization
```bash
brew services start postgresql
psql -U postgres -f setup_db.sql
```

### 3. Backend Setup
```bash
cd api
npm install
cp .env.example .env
```
Ensure your `api/.env` contains:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/v_nue_mail
JWT_SECRET=super-secret-jwt-key-for-encrypto-dev-environment
PORT=3001
RUST_SERVER_URL=http://127.0.0.1:8080
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## 12. How to Run the Application

To run the complete system, open two (or three) terminal windows:

### Terminal 1: Express Backend
```bash
cd api
npm start
```
*Runs on `http://localhost:3001`.*

### Terminal 2: React Frontend
```bash
cd frontend
npm run dev
```
*Open your browser and navigate to **`http://localhost:3000`**.*

### Optional Terminal 3: Rust Server
```bash
export DATABASE_URL="host=localhost user=postgres password=postgres dbname=v_nue_mail"
cargo run
```
*Listens on `127.0.0.1:2525` for incoming SMTP emails.*

---

## 13. Testing & Verification

### Running Automated Backend Unit Tests
```bash
cd api
npm test
```
*(All 20 test suites pass cleanly!)*

### Testing Frontend Build
```bash
cd frontend
npm run build
```

---

## 14. Viva Voce / College Evaluation Q&A

#### Q1: What is ENCRYPTO?
> **Answer**: Encrypto is a secure, private email system built from scratch to demonstrate full-stack web engineering and network data pipelines. It combines a React frontend with modern dark-mode SaaS styling, an Express.js API gateway, a PostgreSQL database, and a high-concurrency Rust server for SMTP mail processing.

#### Q2: How does Encrypto enforce data privacy?
> **Answer**: Privacy is enforced through strict cryptographic JWT token authentication and SQL query isolation. Every mailbox query is scoped to `req.user.email` extracted directly from the verified token. Users cannot access messages where their email is neither the recipient nor the sender.

#### Q3: Why does Encrypto use the three-tier architecture?
> **Answer**: It separates responsibilities cleanly: React manages client-side interactivity and user experience; Express manages business logic, authorization, and database security; and Rust handles low-level async network operations without garbage-collection latency.
