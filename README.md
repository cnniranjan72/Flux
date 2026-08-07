# Mini ERP + CRM Operations Portal

A full-stack ERP/CRM system for a wholesale/distribution company — built with **Node.js, Express, TypeScript, Prisma, PostgreSQL** (backend) and **React, Vite, Tailwind CSS** (frontend). It covers role-based authentication, customer CRM, product/inventory management with a stock-movement ledger, and a sales challan flow with automatic stock deduction and PDF invoice export.

> **Live demo:** [http://52.90.161.120](http://52.90.161.120) (AWS EC2) — see [Deployment](#deployment) and [docs/deployment.md](docs/deployment.md).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture](#architecture)
  - [System Overview](#system-overview)
  - [Database Model (ERD)](#database-model-erd)
  - [Authentication Flow](#authentication-flow)
  - [Challan Lifecycle](#challan-lifecycle)
- [Getting Started (Local)](#getting-started-local)
- [Test Credentials](#test-credentials)
- [API Endpoints](#api-endpoints)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Postman Collection](#postman-collection)
- [Design Decisions](#design-decisions)
- [Assumptions & Known Limitations](#assumptions--known-limitations)
- [Project Status](#project-status)

---

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Backend    | Node.js + Express (TypeScript)                          |
| Database   | PostgreSQL, Prisma ORM                                  |
| Auth       | JWT (jsonwebtoken) + bcrypt                             |
| Validation | zod (input validation on every endpoint)                |
| PDF        | pdfkit (invoice export)                                 |
| Frontend   | React 18 + Vite + TypeScript                            |
| Styling    | Tailwind CSS v4                                         |
| Routing    | React Router v6                                         |
| Infra      | Docker Compose (Postgres), AWS EC2 + nginx, Render + Vercel |

---

## Features

### 1. Authentication & Roles (JWT)
- Login, **admin-only** user registration, `GET /auth/me` session check.
- Roles: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`.
- Middleware `authMiddleware` + `roleGuard` protect every route; the UI hides/redirects based on role.
- **User management screen** (Admin only): create accounts with role picker, activate/deactivate.

### 2. Customer CRM
- Full CRUD: name, mobile, email, business name, GST (optional), type (Retail/Wholesale/Distributor), address, status (Lead/Active/Inactive), follow-up date, notes.
- Search (name/email/mobile/business name), status filter, pagination.
- Customer detail page with **follow-up history** and **challan history**.
- Adding a follow-up note updates the customer's next follow-up date.

### 3. Product & Inventory
- Product CRUD: name, SKU (unique), category, unit price, current stock, min-stock alert, warehouse location.
- **Stock movement ledger**: every IN/OUT records product, quantity changed, type, reason, created-by user and timestamp (immutable audit trail).
- Low-stock detection and filter.
- Manual stock adjustments reject negative stock with a clear error.

### 4. Sales Challan
- Select customer → add multiple products with quantities → save as **Draft** or **Confirmed**.
- Auto-generated challan numbers (`CH-1001`, `CH-1002`, ...).
- **Product snapshot** stored at creation time (name, SKU, category, unit price, stock) — not just IDs.
- Confirmation **deducts stock in a transaction**, creates `OUT` stock movements, and **rejects if stock would go negative** with a per-product error message.
- **PDF invoice export** for any challan (SALES INVOICE when confirmed, PROFORMA INVOICE when draft).
- Draft challans can be confirmed (Sales/Warehouse/Admin) or cancelled (Sales/Admin).
- List with status filter + pagination; detail view with snapshot + itemized amounts.

---

## Architecture

### System Overview

```mermaid
flowchart LR
    subgraph Client
        B[Browser - React SPA]
    end

    subgraph Backend["Backend (Node/Express/TS)"]
        R[Routes]
        M[Middleware: auth / roleGuard / zod]
        L[Lib: invoice, prisma, schemas]
        PDF[PDF Generator - pdfkit]
    end

    subgraph Data["PostgreSQL (Neon / local Docker)"]
        DB[(Database)]
    end

    B -- "REST JSON + JWT Bearer" --> R
    R --> M
    R --> L
    L --> PDF
    M --> DB
    L --> DB
    PDF -.-> B
```

### Database Model (ERD)

```mermaid
erDiagram
    USER ||--o{ CHALLAN : "createdBy"
    USER ||--o{ STOCK_MOVEMENT : "createdBy"
    USER ||--o{ FOLLOW_UP : "createdBy"
    CUSTOMER ||--o{ CHALLAN : ""
    CUSTOMER ||--o{ FOLLOW_UP : ""
    PRODUCT ||--o{ STOCK_MOVEMENT : ""
    PRODUCT ||--o{ CHALLAN_ITEM : ""
    CHALLAN ||--o{ CHALLAN_ITEM : ""
    CHALLAN {
        string id PK
        string challanNumber UK
        string status "DRAFT | CONFIRMED | CANCELLED"
        int totalQuantity
        json productSnapshot
    }
    CHALLAN_ITEM {
        string id PK
        string challanId FK
        string productId FK
        int quantity
        float price
    }
    STOCK_MOVEMENT {
        string id PK
        string productId FK
        int quantityChanged
        string movementType "IN | OUT"
        string reason
    }
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (React)
    participant B as Backend (Express)
    participant D as PostgreSQL

    U->>F: Enter credentials (or click persona)
    F->>B: POST /api/auth/login { email, password }
    B->>D: Find user by email
    alt user not found / bad password
        B-->>F: 401 Invalid credentials
    else valid
        B->>B: bcrypt.compare + sign JWT
        B-->>F: 200 { token, user }
        F->>F: store token (localStorage)
    end
    F->>B: GET /api/auth/me (Bearer token)
    B->>B: verify JWT
    B-->>F: 200 { user } | 401
```

### Challan Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: create (ADMIN/SALES)
    DRAFT --> CONFIRMED: confirm (ADMIN/SALES/WAREHOUSE)
    DRAFT --> CANCELLED: cancel (ADMIN/SALES)
    CONFIRMED --> [*]: stock deducted, OUT movements created
    CANCELLED --> [*]

    note right of CONFIRMED
        Stock deduction happens in a single
        DB transaction; rejected if negative.
    end note
```

**Backend layout**

```
backend/
├── src/
│   ├── middleware/   auth.ts, error.ts, validate.ts
│   ├── routes/       auth, customers, products, challans, users, dashboard
│   ├── lib/          prisma.ts, schemas.ts (zod), invoice.ts (pdfkit), invoice-format.ts
│   ├── app.ts        express app + error handling
│   └── server.ts     entry point
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── docker-compose.yml
└── .env.example
```

**Frontend layout**

```
frontend/
├── src/
│   ├── pages/        Login, Dashboard, Customers, CustomerDetail, Products,
│   │                 ProductDetail, Challans, ChallanCreate, ChallanDetail, Users
│   ├── components/   Layout, Badge, Pagination, icons
│   │   └── ui/       Button, Form, Modal (incl. ConfirmDialog), Toast, Layout helpers
│   ├── hooks/        useAuth (auth context)
│   ├── lib/          api.ts (fetch wrapper, downloadBlob)
│   ├── App.tsx       protected + role-guarded routes
│   └── main.tsx
└── .env.example
```

---

## Getting Started (Local)

Prerequisites: Node.js 18+, Docker (for Postgres), or an existing PostgreSQL instance.

### 1. Clone & install

```bash
git clone https://github.com/cnniranjan72/Flux.git
cd Flux

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start PostgreSQL (Docker)

```bash
cd backend
docker compose up -d        # postgres:16 on localhost:5433
```

> The host port is **5433** to avoid clashes with a local Postgres on 5432.
> If you already run Postgres, set `DATABASE_URL` in `backend/.env` to your instance.

### 3. Configure environment

```bash
cd backend
cp .env.example .env        # edit DATABASE_URL / JWT_SECRET if needed

cd ../frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
```

### 4. Migrate & seed

```bash
cd backend
npx prisma migrate dev
npx prisma db seed          # creates 4 role users + sample customers/products
```

### 5. Run

```bash
# terminal 1 — backend (http://localhost:5000)
cd backend
npm run dev

# terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** and sign in.

---

## Test Credentials

All users use password **`password123`**:

| Role       | Email                    |
|------------|--------------------------|
| Admin      | admin@test.com           |
| Sales      | sales@test.com           |
| Warehouse  | warehouse@test.com       |
| Accounts   | accounts@test.com        |

Role-based access notes:
- **Sales** can create/confirm challans; **Warehouse** can confirm; **Accounts** cannot (API returns 403).
- **Warehouse** cannot access the Customers module in the UI.
- Only **Admin** can register new users (via the Users page or `POST /api/auth/register`).

---

## API Endpoints

Base URL: `http://localhost:5000/api` (or `https://<backend-host>/api`). All routes except `POST /auth/login` require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint          | Access        | Description                  |
|--------|-------------------|---------------|------------------------------|
| POST   | `/auth/login`     | Public        | Login → JWT + user           |
| POST   | `/auth/register`  | Admin         | Create user                  |
| GET    | `/auth/me`        | Any authed    | Current session user         |

### Customers
| Method | Endpoint                          | Description                                  |
|--------|-----------------------------------|----------------------------------------------|
| GET    | `/customers`                      | List + `?search=` `?status=` `?type=` `?skip=` `?take=` |
| GET    | `/customers/:id`                  | Detail incl. follow-ups + challans           |
| POST   | `/customers`                      | Create customer                              |
| PUT    | `/customers/:id`                  | Update customer                              |
| POST   | `/customers/:id/follow-ups`       | Add follow-up note (updates follow-up date)  |

### Products & Stock
| Method | Endpoint                          | Description                                  |
|--------|-----------------------------------|----------------------------------------------|
| GET    | `/products`                       | List + `?search=` `?category=` `?lowStock=true` `?skip=` `?take=` |
| GET    | `/products/:id`                   | Detail incl. recent movements                |
| POST   | `/products`                       | Create product (logs initial-stock IN)       |
| PUT    | `/products/:id`                   | Update product                               |
| POST   | `/products/stock-movements`       | Manual IN/OUT (rejects negative stock)       |
| GET    | `/products/:id/movements`         | Paginated movement ledger                    |

### Challans
| Method | Endpoint                     | Access                       | Description                              |
|--------|------------------------------|------------------------------|------------------------------------------|
| POST   | `/challans`                  | Admin, Sales                 | Create draft/confirmed (snapshot + optional stock deduction) |
| GET    | `/challans`                  | Any authed                   | List + `?status=` `?customerId=` + pagination |
| GET    | `/challans/:id`              | Any authed                   | Detail incl. items + customer            |
| PUT    | `/challans/:id/confirm`      | Admin, Sales, Warehouse      | Deduct stock, create OUT movements       |
| PUT    | `/challans/:id/cancel`       | Admin, Sales                 | Cancel (draft only)                      |
| GET    | `/challans/:id/invoice`      | Any authed                   | Download PDF invoice (binary/pdf)        |

### Misc
| Method | Endpoint            | Access     | Description                 |
|--------|---------------------|------------|-----------------------------|
| GET    | `/dashboard/summary`| Any authed | KPIs, 7-day trend, recent challans, due follow-ups, low-stock |
| GET    | `/users`            | Admin      | List users                  |
| PUT    | `/users/:id/active` | Admin      | Activate/deactivate a user  |
| GET    | `/health`           | Public     | Health check (no `/api` prefix) |

> Full request/response examples for every endpoint: **[docs/api-docs.md](docs/api-docs.md)**

---

## Documentation

| Doc                             | What it covers                                        |
|---------------------------------|-------------------------------------------------------|
| [docs/api-docs.md](docs/api-docs.md)   | Every endpoint: methods, auth, query params, request/response bodies, error codes |
| [docs/deployment.md](docs/deployment.md) | Local, Neon, Render/Vercel, **AWS EC2**, nginx, CI/CD, cost notes |
| [docs/smoke-test.ps1](docs/smoke-test.ps1) | PowerShell end-to-end smoke test                     |
| [docs/erp-crm.postman_collection.json](docs/erp-crm.postman_collection.json) | Postman collection with auto-token                     |

---

## Deployment

> The app is currently **live on AWS EC2** at [http://52.90.161.120](http://52.90.161.120) with PostgreSQL on Neon. Full walkthrough, including the alternative free Render/Vercel route, is in **[docs/deployment.md](docs/deployment.md)**.

**Quick overview:**

```mermaid
flowchart LR
    U[Browser] --> NG["nginx :80"]
    NG --> SPA["/static frontend (React build)"]
    NG --> API["/api -> localhost:5000 (Node/Express)"]
    API --> NEO["Neon PostgreSQL (managed)"]
```

**Current production stack:**
- **Compute:** AWS EC2 `t3.micro` (Ubuntu 24.04) in `us-east-1` — within free tier.
- **Web server:** nginx (serves the built React SPA and reverse-proxies `/api/*`).
- **Process manager:** systemd unit `flux-api`.
- **Database:** Neon PostgreSQL (migrations + seed already applied).
- **CI:** GitHub Actions `.github/workflows/ci.yml` (backend typecheck + frontend build on every push).

### One-line redeploy (current EC2 setup)

```bash
ssh -i <key.pem> ubuntu@52.90.161.120 \
  "cd /opt/erp-crm && git pull && cd backend && npm run build && cd ../frontend && npm run build && sudo systemctl restart flux-api"
```

### Alternatives
- **Render + Vercel + Neon** — zero-cost serverless-friendly route (`render.yaml` + `frontend/vercel.json` committed).
- **Docker** — `backend/Dockerfile` + `docker-compose.yml` for local/containerized deploys.

---

## Environment Variables

| File           | Variable        | Example                                        |
|----------------|-----------------|------------------------------------------------|
| `backend/.env` | `DATABASE_URL`  | `postgresql://erp:erp_password@localhost:5433/erp_crm` |
| `backend/.env` | `JWT_SECRET`    | `change-me-in-production`                      |
| `backend/.env` | `JWT_EXPIRES_IN`| `7d`                                           |
| `backend/.env` | `PORT`          | `5000`                                         |
| `backend/.env` | `CORS_ORIGIN`   | `http://localhost:5173` (comma-separated list) |
| `frontend/.env`| `VITE_API_URL`  | `http://localhost:5000/api`                    |

`.env.example` files are committed for both; **secrets are never committed**.

---

## Postman Collection

Import [`docs/erp-crm.postman_collection.json`](docs/erp-crm.postman_collection.json). It includes a `base_url` and `token` collection variable — run **Login** first (it saves the token automatically via the test script), then every other request works out of the box.

---

## Design Decisions

- **`productSnapshot` JSON** on `Challan` preserves the product details (especially price) as they were when the challan was created — later edits to the product do not rewrite history.
- **Stock movements are append-only**; stock is never edited directly except through movement transactions. Confirming a challan deducts stock and writes an `OUT` movement in the **same DB transaction**.
- **Auto challan numbering** is computed inside a transaction with collision fallback (`CH-1001` + count).
- Enum constraints (role, status, movement type) enforced at the database layer.
- **Public registration is disabled** — accounts are created by admins only, so a self-signed role like `ADMIN` is impossible.

---

## Assumptions & Known Limitations

- **Single-currency** (`₹`) pricing; amounts stored as float for simplicity.
- Challan snapshot records price & stock but not per-line taxes.
- No image upload for products (SKU-based tracking only).
- Email notifications / password reset are out of scope.
- Confirmed challans cannot be un-confirmed (no reversal flow) — cancelling is limited to drafts.
- Pagination is offset-based (`skip`/`take`), capped at 100 per page.
- The live EC2 instance serves over **HTTP**; HTTPS via ACM + CloudFront is a future option.

---

## Project Status

- Backend: **all endpoints implemented, validated (zod), role-guarded, and smoke-tested** (login, CRUD, search, stock IN/OUT, negative-stock rejection, draft→confirm→stock deduction, cancel, PDF invoice).
- Frontend: **all pages implemented, typechecks, and builds** (`npm run build`).
- Deployment: **live on AWS EC2 + Neon** and verified end-to-end (login, dashboard, users, invoice PDF).
