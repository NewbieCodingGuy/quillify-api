# 🖊️ Quillify — AI-Powered Writing Assistant API

A production-grade AI SaaS backend built with NestJS, TypeScript, and MySQL. Quillify provides AI-powered writing tools including text generation, improvement, summarization, and conversational chat — with subscription billing, real-time notifications, and a microservices architecture.

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Environment Variables](#environment-variables)
  - [Running the Server](#running-the-server)
- [Authentication Flow](#authentication-flow)
- [Subscription Plans](#subscription-plans)
- [How Email Jobs Work](#how-email-jobs-work)
- [How Real-Time Notifications Work](#how-real-time-notifications-work)
- [API Reference](#api-reference)
  - [Health](#health)
  - [Auth](#auth)
  - [AI Features](#ai-features)
  - [Usage](#usage)
  - [Subscription](#subscription)
- [GraphQL API](#graphql-api)
- [Error Handling](#error-handling)
- [Key Design Decisions](#key-design-decisions)
- [Git Workflow](#git-workflow)

---

## ✨ Features

### AI Writing Tools

- **Generate** — Create content from a prompt with tone control
- **Improve** — Enhance existing text with custom instructions
- **Summarize** — Condense long content into key points
- **Chat** — Conversational AI with persistent session history

### SaaS Infrastructure

- JWT-based stateless authentication
- Stripe subscription billing with webhook handling
- Plan-based usage limits (Free: 10/day, Pro: 100/day)
- Per-minute rate limiting by plan (Free: 3/min, Pro: 10/min)
- Daily usage tracking with automatic reset
- Real-time notifications via WebSocket

### Production Architecture

- Microservices with Redis transport (AI service isolated)
- Redis caching with TTL and cache invalidation
- BullMQ job queues with priority, deduplication, and retry
- GraphQL API alongside REST
- API Gateway pattern with request tracing
- Consistent response envelope on every endpoint
- Multi-layer rate limiting
- Structured request logging with timing

---

## 🏗 Architecture

```
                    ┌─────────────────────┐
                    │    API Gateway       │
                    │  Rate Limiting       │
                    │  Auth + Logging      │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼──────┐  ┌─────────▼──────┐  ┌─────────▼──────┐
│  Auth Module   │  │   AI Module    │  │  Sub Module    │
│  Usage Module  │  │  (Microservice)│  │  Notification  │
└────────────────┘  └────────────────┘  └────────────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         ┌────▼───┐     ┌──────▼──┐     ┌───────▼──┐
         │ MySQL  │     │  Redis  │     │  BullMQ  │
         └────────┘     └─────────┘     └──────────┘
```

### Microservices Communication

```
Main App (port 3000)
  → receives HTTP requests
  → handles auth, usage, billing
  → sends 'ai.generate' via Redis → AI Microservice
  → receives response via Redis  ← AI Microservice

AI Microservice (Redis subscriber)
  → listens for AI job messages
  → calls OpenAI API
  → returns results to main app
```

---

## 🛠 Tech Stack

| Layer         | Technology              |
| ------------- | ----------------------- |
| Framework     | NestJS                  |
| Language      | TypeScript              |
| Database      | MySQL                   |
| ORM           | TypeORM                 |
| Cache         | Redis (ioredis)         |
| Job Queue     | BullMQ                  |
| AI            | OpenAI (gpt-4o-mini)    |
| Payments      | Stripe                  |
| Real-time     | Socket.IO               |
| API           | REST + GraphQL (Apollo) |
| Auth          | JWT (jsonwebtoken)      |
| Password      | bcryptjs                |
| Validation    | class-validator         |
| Email         | Nodemailer + Mailtrap   |
| Rate Limiting | @nestjs/throttler       |
| Config        | @nestjs/config          |
| Dev Server    | nodemon                 |

---

## 📁 Project Structure

```
quillify-api/
├── src/
│   ├── apps/
│   │   └── ai-service/              # AI microservice entry point
│   │       ├── main.ts
│   │       ├── ai-microservice.module.ts
│   │       └── ai-message.controller.ts
│   ├── common/
│   │   ├── constants/
│   │   │   └── queues.ts            # Queue and job name constants
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt.guard.ts
│   │   │   ├── gql-auth.guard.ts
│   │   │   └── plan-throttler.guard.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   └── middleware/
│   │       └── request-id.middleware.ts
│   ├── config/
│   │   └── validate-env.ts          # Startup env validation
│   ├── modules/
│   │   ├── auth/                    # Registration, login, JWT
│   │   ├── ai/                      # AI features + microservice client
│   │   ├── analytics/               # Usage analytics queue
│   │   ├── email/                   # Email queue + processor
│   │   ├── health/                  # Health check endpoints
│   │   ├── notification/            # WebSocket gateway
│   │   ├── subscription/            # Stripe billing
│   │   └── usage/                   # Daily usage tracking
│   ├── app.module.ts
│   └── main.ts
├── test/                            # E2E tests
├── .github/
│   └── workflows/
│       └── ci.yml                   # CI/CD pipeline
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MySQL](https://www.mysql.com/) v8 or higher
- [Redis](https://redis.io/) v7 or higher
- [Stripe account](https://stripe.com/) (test mode)
- [OpenAI account](https://platform.openai.com/)
- [Mailtrap account](https://mailtrap.io/) (email testing)

---

### Installation

```bash
git clone https://github.com/your-username/quillify-api.git
cd quillify-api
npm install
```

---

### Database Setup

```sql
CREATE DATABASE quillify;
CREATE DATABASE quillify_test;
```

TypeORM auto-creates tables on first run in development via `synchronize: true`.

---

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
# App
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=quillify

# JWT
JWT_SECRET=your_super_secret_key_minimum_32_characters
JWT_EXPIRES_IN=1d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_PRO_PRICE_ID=price_your-price-id
APP_URL=http://localhost:3000

# Email (Mailtrap for development)
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your_mailtrap_user
MAIL_PASS=your_mailtrap_pass
MAIL_FROM=noreply@quillify.io
```

> ⚠️ Never commit `.env`. It is already in `.gitignore`.

---

### Running the Server

Make sure MySQL and Redis are running first:

```bash
redis-cli ping   # Should respond: PONG
```

**Development — single process (monolith):**

```bash
npm run start:dev
```

**Development — with AI microservice:**

```bash
npm run start:all
```

**Production build:**

```bash
npm run build
npm start
```

**Docker Compose (recommended for local dev):**

```bash
docker-compose up --build
```

You should see:

```
📬 Email worker is running...
🔔 Notification Gateway initialized
AI Microservice running
Application running on port 3000
Environment: development
GraphQL playground: http://localhost:3000/graphql
```

---

## 🔐 Authentication Flow

```
Step 1 → Register
POST /api/v1/auth/register
→ Account created, welcome email queued

Step 2 → Login
POST /api/v1/auth/login
→ Receive JWT token

Step 3 → Use protected endpoints
Authorization: Bearer <your_token_here>

Step 4 → Token expiry
Tokens expire after 1 day. Login again to receive a new token.
```

---

## 💳 Subscription Plans

| Feature                | Free | Pro         |
| ---------------------- | ---- | ----------- |
| AI requests per day    | 10   | 100         |
| AI requests per minute | 3    | 10          |
| Chat sessions          | ✅   | ✅          |
| Text generation        | ✅   | ✅          |
| Text improvement       | ✅   | ✅          |
| Summarization          | ✅   | ✅          |
| Price                  | Free | $9.99/month |

### Upgrading to Pro

```
POST /api/v1/subscription/checkout
→ Returns Stripe checkout URL
→ User completes payment on Stripe-hosted page
→ Webhook fires → plan upgraded automatically
→ Real-time notification sent to user
→ Confirmation email sent
```

---

## 📬 How Email Jobs Work

Emails are sent asynchronously via BullMQ — the API responds instantly without waiting for email delivery.

```
Action occurs (register, limit reached, payment)
      ↓
Email job pushed to Redis queue (priority-based)
      ↓
API returns response to user immediately
      ↓
Background worker picks up job
      ↓
Nodemailer sends email via Mailtrap
      ↓
Job marked complete — removed from queue
```

**Job deduplication:** Usage warning and limit-reached emails use a `jobId` scoped to the user and date. Even if the limit is hit multiple times in a day, the user receives only one email per event per day.

**Priority levels:**

```
Priority 1 (highest) → Welcome email, payment confirmed
Priority 3           → Limit reached
Priority 5           → Usage warning
Priority 10 (lowest) → Analytics events
```

**Retry strategy:** Failed jobs retry up to 3 times with exponential backoff (2s, 4s, 8s).

---

## 🔔 How Real-Time Notifications Work

WebSocket notifications are delivered instantly to connected clients via Socket.IO.

```
User connects to ws://localhost:3000/notifications
with JWT token in auth handshake
      ↓
Server verifies token → user joins personal room "user:{id}"
      ↓
Event occurs (usage warning, plan change, etc.)
      ↓
Server emits to "user:{id}" room
      ↓
Client receives notification instantly
```

**Notification events:**

| Event                 | Trigger                   |
| --------------------- | ------------------------- |
| `usage_warning`       | 80% of daily limit used   |
| `usage_limit_reached` | Daily limit hit           |
| `plan_upgraded`       | Stripe payment successful |
| `plan_downgraded`     | Subscription cancelled    |
| `payment_failed`      | Stripe payment failed     |

**Connecting from a client:**

```javascript
const socket = io('http://localhost:3000/notifications', {
  auth: { token: 'your_jwt_token' },
});

socket.on('notification', (data) => {
  console.log(data.type, data.message);
});
```

---

## 📡 API Reference

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-05-02T10:00:00.000Z",
  "requestId": "abc-123-def-456"
}
```

All errors follow:

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": ["Invalid or expired token"],
  "statusCode": 401,
  "timestamp": "2026-05-02T10:00:00.000Z",
  "requestId": "abc-123-def-456",
  "path": "/api/v1/auth/me"
}
```

---

### Health

#### Health Check

```
GET /api/v1/health
```

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-05-02T10:00:00.000Z",
    "services": {
      "database": "ok"
    }
  }
}
```

#### Readiness Probe

```
GET /api/v1/health/ready
```

#### Liveness Probe

```
GET /api/v1/health/live
```

---

### Auth

#### Register

```
POST /api/v1/auth/register
```

**Request:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Secret123"
}
```

Password requirements: min 8 chars, must contain uppercase, lowercase, and number.

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "plan": "free",
    "createdAt": "2026-05-02T..."
  }
}
```

---

#### Login

```
POST /api/v1/auth/login
```

**Request:**

```json
{
  "email": "john@example.com",
  "password": "Secret123"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "plan": "free"
    }
  }
}
```

> Rate limited: 5 attempts per 15 minutes per IP.

---

#### Get Current User

```
GET /api/v1/auth/me
Authorization: Bearer <token>
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "plan": "free",
    "createdAt": "2026-05-02T..."
  }
}
```

---

### AI Features

> All AI endpoints require `Authorization: Bearer <token>`.
> All AI endpoints consume 1 daily request and are rate limited per plan.

#### Generate Text

```
POST /api/v1/ai/generate
```

**Request:**

```json
{
  "prompt": "Write a professional introduction about backend development",
  "tone": "professional",
  "context": "For a technical blog"
}
```

`tone` options: `professional`, `casual`, `formal`, `creative`

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "content": "Backend development is the foundation...",
    "usage": {
      "promptTokens": 45,
      "completionTokens": 312,
      "totalTokens": 357
    }
  }
}
```

---

#### Improve Text

```
POST /api/v1/ai/improve
```

**Request:**

```json
{
  "text": "backend is good many companies use it makes apis",
  "instructions": "Make it professional and add more detail"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "original": "backend is good...",
    "improved": "Backend development plays a critical role...",
    "usage": { "totalTokens": 289 }
  }
}
```

---

#### Summarize Text

```
POST /api/v1/ai/summarize
```

**Request:**

```json
{
  "text": "Long article text here... (minimum 100 characters)",
  "focusOn": "Key technical concepts"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "summary": "The article covers...",
    "originalLength": 4523,
    "summaryLength": 312,
    "usage": { "totalTokens": 198 }
  }
}
```

---

#### Chat

```
POST /api/v1/ai/chat
```

**Request — New session:**

```json
{
  "message": "Help me write a cover letter for a backend developer role"
}
```

**Request — Continue session:**

```json
{
  "message": "Make it more concise",
  "sessionId": 1
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "sessionId": 1,
    "message": "Here is a concise cover letter...",
    "usage": { "totalTokens": 412 }
  }
}
```

---

#### Get Chat Sessions

```
GET /api/v1/ai/chat/sessions
Authorization: Bearer <token>
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Help me write a cover letter",
      "createdAt": "2026-05-02T...",
      "updatedAt": "2026-05-02T..."
    }
  ]
}
```

---

#### Get Chat History

```
GET /api/v1/ai/chat/:sessionId
Authorization: Bearer <token>
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Help me write a cover letter",
    "messages": [
      {
        "role": "user",
        "content": "Help me write a cover letter",
        "timestamp": "2026-05-02T..."
      },
      {
        "role": "assistant",
        "content": "Here is a cover letter...",
        "timestamp": "2026-05-02T..."
      }
    ]
  }
}
```

---

### Usage

#### Get Current Usage

```
GET /api/v1/usage
Authorization: Bearer <token>
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "used": 3,
    "limit": 10,
    "remaining": 7,
    "resetAt": "2026-05-02T23:59:59.000Z",
    "plan": "free"
  }
}
```

> Cached for 30 seconds. Invalidated after every AI request.

---

#### Get Usage History

```
GET /api/v1/usage/history
Authorization: Bearer <token>
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": [
    { "date": "2026-05-02", "requestCount": 7 },
    { "date": "2026-05-01", "requestCount": 10 }
  ]
}
```

---

### Subscription

#### Create Checkout Session

```
POST /api/v1/subscription/checkout
Authorization: Bearer <token>
```

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_..."
  }
}
```

#### Get Subscription Status

```
GET /api/v1/subscription/status
Authorization: Bearer <token>
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "plan": "pro",
    "status": "active",
    "currentPeriodEnd": "2026-06-02T..."
  }
}
```

#### Stripe Webhook

```
POST /api/v1/subscription/webhook
stripe-signature: <stripe-signature-header>
```

Handles: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.payment_failed`

> This endpoint is exempt from all rate limiting.

---

## 🔷 GraphQL API

GraphQL playground available at: `http://localhost:3000/graphql`

Add token in HTTP headers:

```json
{ "Authorization": "Bearer your_token_here" }
```

#### Register

```graphql
mutation {
  register(
    input: {
      name: "John Doe"
      email: "john@example.com"
      password: "Secret123"
    }
  ) {
    id
    name
    email
    plan
  }
}
```

#### Login

```graphql
mutation {
  login(input: { email: "john@example.com", password: "Secret123" }) {
    token
    user {
      id
      name
      plan
    }
  }
}
```

#### Get Profile + Usage (single request)

```graphql
query {
  me {
    id
    name
    email
    plan
  }
  myUsage {
    used
    limit
    remaining
    plan
  }
}
```

---

## ⚠️ Error Handling

| Status Code | Meaning                                    |
| ----------- | ------------------------------------------ |
| 200         | Success                                    |
| 201         | Resource created                           |
| 400         | Bad request — validation failed            |
| 401         | Unauthorized — missing or invalid token    |
| 403         | Forbidden — daily AI limit reached         |
| 404         | Not found                                  |
| 409         | Conflict — resource already exists         |
| 422         | Unprocessable — input semantically invalid |
| 429         | Too many requests — rate limit exceeded    |
| 500         | Internal server error                      |

---

## 🏗 Key Design Decisions

**NestJS Module System**
Each feature is an isolated module with its own controller, service, and entity. Adding new features means adding new modules without touching existing code.

**Microservices with Redis Transport**
The AI service runs as a separate process communicating via Redis pub/sub. This means AI workloads (which are slow and resource-intensive) can be scaled independently from the main API. If the AI service crashes, auth and billing still work.

**BullMQ Job Deduplication**
Usage warning and limit-reached emails use `jobId` scoped to `userId:date`. BullMQ rejects duplicate job IDs, preventing email spam even if the limit is triggered multiple times in a day.

**Four-Layer Rate Limiting**
Global (100/min) → Auth brute force (5/15min) → Plan-based AI (3/min free, 10/min pro) → Daily AI quota. Each layer serves a different protection purpose.

**Cache Aside Pattern**
Usage stats, user profiles, and subscription status are cached in Redis with short TTLs. Cache is invalidated immediately on any write. The database is never hit for repeated reads of the same data.

**GraphQL + REST**
REST handles webhooks, file uploads, and simple operations. GraphQL handles complex data fetching where the client needs to combine multiple resources in one request. Both are supported simultaneously.

**API Gateway Pattern**
Every request gets a unique `requestId` (UUID) that appears in logs and in the response. This enables distributed tracing — you can find every log line for a specific request across all services using its ID.

**Response Envelope**
Every successful response: `{ success: true, data, timestamp, requestId }`
Every error: `{ success: false, error, message, statusCode, timestamp, requestId, path }`
Frontends never have to guess the response shape.

**JWT Plan Caching**
The user's plan is stored in the JWT payload to avoid a DB lookup on every AI request. Trade-off: after a plan upgrade, the user must re-login to get a token reflecting the new plan.

**Stripe Webhook Security**
All Stripe webhooks are verified using `stripe.webhooks.constructEvent()` with the webhook secret. Requests with invalid signatures are rejected with 400 before any business logic runs.

**TypeORM `synchronize` in Dev Only**
`synchronize: true` is enabled only when `NODE_ENV !== 'production'`. In production, schema changes must be made via explicit migrations to prevent accidental data loss.

---

## 🌿 Git Workflow

This project follows a professional Git workflow:

```
main      → production only, protected branch
develop   → integration branch, all features merge here
feature/* → individual feature branches
fix/*     → bug fixes
```

**Branch naming:**

```
feature/auth-module
feature/ai-module
feature/stripe-subscription
fix/usage-cache-invalidation
```

**Commit message format (Conventional Commits):**

```
feat:     new feature
fix:      bug fix
chore:    config, tooling, dependencies
test:     adding or updating tests
docs:     documentation only
refactor: code change without feature or fix
perf:     performance improvement
```

**Examples:**

```
feat: add OpenAI text generation endpoint
fix: handle expired JWT in auth guard
chore: add Docker Compose configuration
test: add subscription service unit tests
```

**PR flow:**

```
1. Create feature branch from develop
2. Build feature with descriptive commits
3. Push and open PR to develop
4. CI runs tests automatically
5. Merge to develop on green CI
6. When ready for release: PR develop → main
7. Merge to main triggers deployment
```
