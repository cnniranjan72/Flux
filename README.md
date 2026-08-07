# Mini ERP + CRM Operations Portal

A full-stack ERP/CRM system for a wholesale/distribution company — built with **Node.js, Express, TypeScript, Prisma, PostgreSQL** (backend) and **React, Vite, Tailwind CSS** (frontend). It covers role-based authentication, customer CRM, product/inventory management with a stock-movement ledger, and a sales challan flow with automatic stock deduction.

---

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Backend    | Node.js + Express (TypeScript)                          |
| Database   | PostgreSQL, Prisma ORM                                  |
| Auth       | JWT (jsonwebtoken) + bcrypt                             |
| Validation | zod (input validation on every endpoint)                |
| Frontend   | React 18 + Vite + TypeScript                            |
| Styling    | Tailwind CSS v4                                         |
| Routing    | React Router v6                                         |
| Infra      | Docker Compose (Postgres), deployable on Render + Vercel |

---

## Features

### 1. Authentication & Roles (JWT)
- Login, admin-only user registration, `GET /auth/me` session check.
- Roles: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`.
- Middleware `authMiddleware` + `roleGuard` protect every route; the UI hides/redirects based on role.

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
- Draft challans can be confirmed (Sales/Warehouse/Admin) or cancelled (Sales/Admin).
- List with status filter + pagination; detail view with snapshot + itemized amounts.

---

## Architecture

```
frontend (React/Vite/Tailwind, Vercel)
        │  REST JSON + JWT Bearer token
        ▼
backend (Express/TypeScript, Render/Railway)
  routes → controllers(hooks) → services(logic)   ← zod validation middleware
        │
        ▼
  Prisma Client → PostgreSQL (Neon/Supabase/Render)
```

**Backend layout**

```
backend/
├── src/
│   ├── middleware/   auth.ts, error.ts, validate.ts
│   ├── routes/       auth, customers, products, challans, users, dashboard
│   ├── lib/          prisma.ts, schemas.ts (zod)
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
│   ├── pages/        Login, Dashboard, Customers, CustomerDetail,
│   │                 Products, ProductDetail, Challans, ChallanCreate, ChallanDetail
│   ├── components/   Modal, Badge, Spinner, Pagination, Layout
│   ├── hooks/        useAuth (auth context)
│   ├── lib/          api.ts (fetch wrapper)
│   ├── App.tsx       protected + role-guarded routes
│   └── main.tsx
└── .env.example
```

---

## Getting Started (Local)

Prerequisites: Node.js 18+, Docker (for Postgres), or an existing PostgreSQL instance.

### 1. Clone & install

```bash
git clone <your-repo-url>
cd erp-crm

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
- Only **Admin** can register new users.

---

## API Endpoints

Base URL: `http://localhost:5000/api`. All routes except `POST /auth/login` require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint          | Access        | Description                  |
|--------|-------------------|---------------|------------------------------|
| POST   | `/auth/login`     | Public        | Login → JWT + user           |
| POST   | `/auth/register`  | Admin         | Create user                  |
| GET    | `/auth/me`        | Any authed    | Current session user         |

### Customers
| Method | Endpoint                          | Description                                  |
|--------|-----------------------------------|----------------------------------------------|
| GET    | `/customers`                      | List + `?search=` `?status=` `?skip=` `?take=` |
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

### Misc
| Method | Endpoint            | Access     | Description                 |
|--------|---------------------|------------|-----------------------------|
| GET    | `/dashboard/summary`| Any authed | KPIs, recent challans, due follow-ups |
| GET    | `/users`            | Admin      | List users                  |
| GET    | `/health`           | Public     | Health check                |

---

## Deployment

> You can deploy without Docker on free tiers: **Render** (backend + Postgres) and **Vercel** (frontend).

### Backend → Render (or Railway/Fly.io)
1. Push the repo to GitHub.
2. In Render: **New → Web Service**, connect the repo, root directory `backend`.
3. Build command: `npm install && npx prisma migrate deploy && npm run build`
4. Start command: `npm start`
5. Env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (your frontend URL).
6. Optionally create a **Render Postgres** and run `npx prisma migrate deploy && npx prisma db seed` locally against that URL.

### Database → Neon / Supabase / Render Postgres
- Create a free database, copy the connection string into `DATABASE_URL`.
- Run migrations against it: `cd backend && npx prisma migrate deploy` (and seed once).

### Frontend → Vercel
1. **Import** the repo in Vercel; set Root Directory to `frontend`.
2. Build command: `npm run build`; output: `dist`.
3. Env var: `VITE_API_URL=https://<your-backend>.onrender.com/api`.

### Docker (full stack)
A `Dockerfile` is included in `backend/`. For a one-command local stack:

```bash
cd backend && docker compose up -d   # Postgres only (used above)
# or build the API image: docker build -t erp-backend .
```

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

## Data Model

```
User ─┬─< StockMovement
      ├─< Challan  (createdBy)
      └─< FollowUp  (createdBy)

Customer ─┬─< Challan
          └─< FollowUp

Product ─┬─< StockMovement
         └─< ChallanItem

Challan ─< ChallanItem        Challan.productSnapshot = JSON
                                (name, sku, category, price, stock at time)
```

Key design decisions:
- **`productSnapshot` JSON** on `Challan` preserves the product details (especially price) as they were when the challan was created — later edits to the product do not rewrite history.
- **Stock movements are append-only**; stock is never edited directly except through movement transactions. Confirming a challan deducts stock and writes an `OUT` movement in the **same DB transaction**.
- Enum constraints (role, status, movement type) enforced at the database layer.

---

## Assumptions & Known Limitations

- **Single-currency** (`₹`) pricing; amounts stored as float for simplicity.
- Challan snapshot records price & stock but not per-line taxes; invoices/PDF export are out of scope.
- No image upload for products (SKU-based tracking only).
- Email notifications / password reset are out of scope.
- Confirmed challans cannot be un-confirmed (no reversal flow) — cancelling is limited to drafts.
- Pagination is offset-based (`skip`/`take`), capped at 100 per page.

---

## Project Status

- Backend: **all endpoints implemented, validated (zod), role-guarded, and smoke-tested** (login, CRUD, search, stock IN/OUT, negative-stock rejection, draft→confirm→stock deduction, cancel).
- Frontend: **all pages implemented, typechecks, and builds** (`npm run build`).
- Verified end-to-end locally: backend `:5000` + frontend `:5173` with CORS enabled.
