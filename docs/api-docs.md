# Flux ERP/CRM — API Documentation

REST API for the Mini ERP + CRM Operations Portal.

- **Base URL (local):** `http://localhost:5000/api`
- **Base URL (production):** `http://52.90.161.120/api`
- **Format:** JSON, UTF-8
- **Auth:** JWT Bearer token — include `Authorization: Bearer <token>` on every request except `POST /auth/login` and `GET /health`.

---

## Authentication

| Method | Endpoint        | Access  | Description            |
|--------|-----------------|---------|------------------------|
| POST   | `/auth/login`   | Public  | Log in, get JWT        |
| POST   | `/auth/register`| Admin   | Create a new user      |
| GET    | `/auth/me`      | Authed  | Current session user   |

### `POST /auth/login`

Request:

```json
{ "email": "admin@test.com", "password": "password123" }
```

Response `200 OK`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "cmsj...", "name": "Admin User", "role": "ADMIN", "email": "admin@test.com" }
}
```

Errors: `400` (validation), `401` `{"error": "Invalid credentials"}`.

### `POST /auth/register`

> Requires `ADMIN` role.

Request:

```json
{ "email": "sales2@test.com", "password": "password123", "name": "New Sales Rep", "role": "SALES" }
```

Response `201 Created`:

```json
{
  "message": "User created",
  "user": { "id": "cmsj...", "email": "sales2@test.com", "name": "New Sales Rep", "role": "SALES", "createdAt": "2026-08-07T10:00:00.000Z" }
}
```

Errors: `400` (validation — password min 6, email format, role must be one of `ADMIN|SALES|WAREHOUSE|ACCOUNTS`), `403` (non-admin), `409` `{"error": "User with this email already exists"}`.

### `GET /auth/me`

Response `200 OK`:

```json
{ "user": { "id": "cmsj...", "name": "Admin User", "role": "ADMIN", "email": "admin@test.com" } }
```

---

## Customers

| Method | Endpoint                   | Description |
|--------|----------------------------|-------------|
| GET    | `/customers`               | List with search/filter/pagination |
| GET    | `/customers/:id`           | Detail incl. follow-ups + challans |
| POST   | `/customers`               | Create |
| PUT    | `/customers/:id`           | Update |
| POST   | `/customers/:id/follow-ups`| Add follow-up note |

### `GET /customers`

Query params:

| Param    | Type   | Description |
|----------|--------|-------------|
| `search` | string | Case-insensitive match on name / email / mobile / businessName |
| `status` | string | `LEAD`, `ACTIVE`, `INACTIVE` |
| `type`   | string | `Retail`, `Wholesale`, `Distributor` |
| `skip`   | number | Offset (default 0) |
| `take`   | number | Limit, max 100 (default 20) |

Response `200 OK`:

```json
{
  "data": [
    {
      "id": "cmsj...",
      "name": "Meera Enterprises",
      "mobile": "9876543210",
      "email": "meera@example.com",
      "businessName": "",
      "type": "Retail",
      "status": "ACTIVE",
      "followUpDate": "2026-08-08T15:39:05.778Z",
      "createdAt": "2026-08-06T15:39:05.778Z",
      "_count": { "followUps": 2, "challans": 1 }
    }
  ],
  "total": 5,
  "skip": 0,
  "take": 20,
  "page": 1
}
```

### `GET /customers/:id`

Response `200 OK` includes the customer plus `followUps[]` (with `creator`) and `challans[]` (with `items`). `404` if not found.

### `POST /customers`

Request body (`CustomerStatus` default `LEAD`, `type` default `Retail`):

```json
{
  "name": "Meera Enterprises",
  "mobile": "9876543210",
  "email": "meera@example.com",
  "businessName": "",
  "gstNumber": "27ABCDE1234F1Z5",
  "type": "Wholesale",
  "address": "12 MG Road, Pune",
  "status": "ACTIVE",
  "followUpDate": "2026-08-20T00:00:00.000Z",
  "notes": "Prefers WhatsApp"
}
```

Response `201 Created` — the created customer object. `400` on validation failure (mobile min 7 chars, email format, status/type enum).

### `PUT /customers/:id`

Same shape as create, all fields optional (partial update). Response `200 OK` with the updated customer; `404` if not found.

### `POST /customers/:id/follow-ups`

Request:

```json
{ "note": "Called, interested in bulk pricing", "nextFollowDate": "2026-08-22T10:00:00.000Z" }
```

Response `201 Created`:

```json
{
  "id": "cmsj...",
  "customerId": "cmsj...",
  "note": "Called, interested in bulk pricing",
  "nextFollowDate": "2026-08-22T10:00:00.000Z",
  "createdBy": "cmsj...",
  "createdAt": "2026-08-07T12:00:00.000Z",
  "creator": { "name": "Rahul Sharma", "role": "SALES" }
}
```

If `nextFollowDate` is supplied, the customer's `followUpDate` is also updated. `400` if `note` is empty.

---

## Products & Stock

| Method | Endpoint                     | Description |
|--------|------------------------------|-------------|
| GET    | `/products`                  | List with search/filter/pagination |
| GET    | `/products/:id`              | Detail incl. recent movements |
| POST   | `/products`                  | Create (logs initial-stock IN) |
| PUT    | `/products/:id`              | Update |
| POST   | `/products/stock-movements`  | Manual IN/OUT (rejects negative stock) |
| GET    | `/products/:id/movements`    | Paginated movement ledger |

### `GET /products`

Query params:

| Param      | Type    | Description |
|------------|---------|-------------|
| `search`   | string  | Case-insensitive match on name / sku |
| `category` | string  | Exact category |
| `lowStock` | boolean | `true` → `currentStock <= minStockAlert` |
| `skip`     | number  | Offset (default 0) |
| `take`     | number  | Limit, max 100 (default 20) |

Response `200 OK`:

```json
{
  "data": [
    {
      "id": "cmsj...",
      "name": "LED Bulb 9W",
      "sku": "LED-9W-001",
      "category": "Lighting",
      "unitPrice": 85,
      "currentStock": 477,
      "minStockAlert": 20,
      "location": "Shelf A-3",
      "createdAt": "2026-08-06T10:00:00.000Z",
      "updatedAt": "2026-08-07T10:00:00.000Z"
    }
  ],
  "total": 6,
  "skip": 0,
  "take": 20,
  "page": 1
}
```

### `GET /products/:id`

Response includes the product plus `stockMovements[]` (latest 50, each with `user.name`). `404` if not found.

### `POST /products`

Request:

```json
{
  "name": "Copper Wire 2.5mm",
  "sku": "CBL-2.5MM-001",
  "category": "Cables",
  "unitPrice": 2400,
  "currentStock": 150,
  "minStockAlert": 30,
  "location": "Rack B-2"
}
```

Response `201 Created` with the product. If `currentStock > 0`, an `IN` stock movement is created automatically (`reason: "Initial stock on product creation"`). `400` on validation failure (SKU required, non-negative numbers).

### `PUT /products/:id`

Partial update with the same fields as create. `404` if not found.

### `POST /products/stock-movements`

Request:

```json
{
  "productId": "cmsj...",
  "quantityChanged": 25,
  "movementType": "IN",
  "reason": "Purchase order received"
}
```

Response `201 Created`:

```json
{
  "movement": {
    "id": "cmsj...",
    "productId": "cmsj...",
    "quantityChanged": 25,
    "movementType": "IN",
    "reason": "Purchase order received",
    "createdBy": "cmsj...",
    "createdAt": "2026-08-07T13:00:00.000Z",
    "user": { "name": "Vikram Singh" }
  },
  "currentStock": 502
}
```

Errors: `400` if `quantityChanged` not positive or stock would go negative: `{"error": "Insufficient stock. Current stock is X"}`; `404` if product missing.

### `GET /products/:id/movements`

Query params `skip`, `take` (default 50, max 100). Response:

```json
{ "data": [ { "id": "cmsj...", "productId": "cmsj...", "quantityChanged": 25, "movementType": "IN", "reason": "Purchase order received", "createdAt": "...", "user": { "name": "Vikram Singh", "role": "WAREHOUSE" } } ], "total": 4 }
```

---

## Challans

| Method | Endpoint                | Access                 | Description |
|--------|-------------------------|------------------------|-------------|
| POST   | `/challans`             | Admin, Sales           | Create draft/confirmed |
| GET    | `/challans`             | Any authed             | List + filters + pagination |
| GET    | `/challans/:id`         | Any authed             | Detail |
| PUT    | `/challans/:id/confirm` | Admin, Sales, Warehouse| Deduct stock, create OUT movements |
| PUT    | `/challans/:id/cancel`  | Admin, Sales           | Cancel draft |
| GET    | `/challans/:id/invoice` | Any authed             | Download PDF |

### `POST /challans`

Request:

```json
{
  "customerId": "cmsj...",
  "status": "DRAFT",
  "items": [
    { "productId": "cmsj...", "quantity": 10 },
    { "productId": "cmsj...", "quantity": 5 }
  ]
}
```

`status` may be `DRAFT` (default) or `CONFIRMED`. Response `201 Created` includes the challan with `challanNumber` (auto-generated), `productSnapshot`, `totalQuantity`, `items[]`, `customer`. If `status = CONFIRMED`, stock is deducted immediately in the same transaction.

Errors: `400` (one or more products not found / insufficient stock / empty items), `403` (role), `404` (customer not found).

### `GET /challans`

Query params: `status` (`DRAFT|CONFIRMED|CANCELLED`), `customerId`, `skip`, `take`.

Response `200 OK`:

```json
{
  "data": [
    {
      "id": "cmsj...",
      "challanNumber": "CH-1002",
      "status": "CONFIRMED",
      "totalQuantity": 3,
      "createdAt": "2026-08-07T10:17:00.000Z",
      "customer": { "id": "cmsj...", "name": "Sunil Traders", "businessName": "" },
      "creator": { "id": "cmsj...", "name": "Rahul Sharma", "role": "SALES" },
      "items": [ { "id": "cmsj...", "productId": "cmsj...", "quantity": 3, "price": 85 } ]
    }
  ],
  "total": 2,
  "skip": 0,
  "take": 20,
  "page": 1
}
```

### `GET /challans/:id`

Detail with full `customer`, `creator`, and `items[]` (each including `product`). `404` if not found.

### `PUT /challans/:id/confirm`

No body. Response `200 OK` with the updated challan. Stock is deducted per item and `OUT` movements are written for each, atomically.

Errors: `400` `{"error": "Only draft challans can be confirmed (current: X)"}`, `400` `{"error": "Insufficient stock for <name>. Available: X, required: Y"}`, `404`.

### `PUT /challans/:id/cancel`

No body. Response `200 OK` with the cancelled challan.

Errors: `400` `{"error": "Only draft challans can be cancelled"}`, `404`.

### `GET /challans/:id/invoice`

No body. Returns `Content-Type: application/pdf` with `Content-Disposition: attachment; filename="CH-XXXX.pdf"`.

- `CONFIRMED` → **SALES INVOICE**
- `DRAFT` → **PROFORMA INVOICE**

Includes company header, bill-to details, itemized table, and totals.

---

## Dashboard

### `GET /dashboard/summary`

Any authenticated role. Response `200 OK`:

```json
{
  "customers": {
    "total": 5,
    "active": 3,
    "dueFollowUps": [ { "id": "...", "name": "Meera Enterprises", "mobile": "9876543210", "status": "ACTIVE", "followUpDate": "..." } ]
  },
  "products": {
    "total": 6,
    "lowStock": 0,
    "lowStockProducts": []
  },
  "challans": {
    "total": 2,
    "confirmed": 2,
    "draft": 0,
    "recent": [ { "id": "...", "challanNumber": "CH-1002", "status": "CONFIRMED", "totalQuantity": 3, "customer": { "name": "Sunil Traders" }, "creator": { "name": "Rahul Sharma" } } ],
    "trend": [ { "date": "2026-08-01", "label": "Mon", "count": 0 } ]
  }
}
```

---

## Users (Admin only)

| Method | Endpoint            | Description |
|--------|---------------------|-------------|
| GET    | `/users`            | List all users |
| PUT    | `/users/:id/active` | Activate / deactivate |

### `GET /users`

Response `200 OK`:

```json
{
  "data": [
    { "id": "cmsj...", "name": "Admin User", "email": "admin@test.com", "role": "ADMIN", "active": true, "createdAt": "..." }
  ]
}
```

`403` for non-admin roles.

### `PUT /users/:id/active`

Request:

```json
{ "active": false }
```

Response `200 OK`:

```json
{ "id": "cmsj...", "name": "Vikram Singh", "active": false }
```

`400` if `active` is not a boolean; `403` if not admin.

---

## Health Check

### `GET /health`

> Note: no `/api` prefix — it is registered directly on the app.

Response `200 OK`:

```json
{ "status": "ok", "timestamp": "2026-08-07T17:50:54.062Z" }
```

---

## Errors & Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Validation / business-rule failure (`{"error": "..."}`) |
| `401` | Missing/invalid token or bad credentials |
| `403` | Authenticated but wrong role |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate email) |

Errors always return JSON: `{ "error": "<human readable message>" }` (or `{ "errors": [...] }` for zod validation details).

---

## Pagination

List endpoints return `{ data, total, skip, take, page }` and accept `?skip=` and `?take=` (capped at 100).

## Rate of Change

> Docs reflect the code at commit `e45428e`+. Keep in sync when routes or schemas change (`backend/src/routes/*`, `backend/src/lib/schemas.ts`).
