---
layout: home

hero:
  name: "Flux ERP / CRM"
  text: "Mini ERP + CRM Operations Portal"
  tagline: Role-based auth · Customer CRM · Inventory ledger · Sales challans with PDF invoices
  image:
    src: /Flux/logo.svg
    alt: Flux
  actions:
    - theme: brand
      text: Live App
      link: http://52.90.161.120
    - theme: alt
      text: API Reference
      link: /api-docs
    - theme: alt
      text: Deployment Guide
      link: /deployment

features:
  - title: JWT Authentication
    details: Role-based access (ADMIN / SALES / WAREHOUSE / ACCOUNTS) with bcrypt hashing and admin-only user provisioning.
  - title: Customer CRM
    details: Full CRUD, search, status filters, follow-up history and challan history per customer.
  - title: Inventory Ledger
    details: Append-only stock movements (IN/OUT) with negative-stock rejection and low-stock alerts.
  - title: Sales Challans
    details: Auto-numbered challans with product snapshots, transactional stock deduction and PDF invoices.
---

## Architecture

```mermaid
flowchart LR
    B[Browser - React SPA]
    NG[nginx :80]
    API[Node/Express API :5000]
    DB[(PostgreSQL - Neon)]
    B --> NG
    NG -->|"/  static build"| B
    NG -->|"/api  reverse proxy"| API
    API --> DB
```

## Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Backend    | Node.js + Express + TypeScript              |
| Database   | PostgreSQL + Prisma ORM                     |
| Auth       | JWT + bcrypt                                |
| Frontend   | React 18 + Vite + Tailwind CSS v4           |
| PDF        | pdfkit (invoice export)                     |
| Deployment | AWS EC2 + nginx + Neon, Render/Vercel ready |

## Quick Links

- [API Reference](/api-docs) — every endpoint with request/response examples
- [Deployment Guide](/deployment) — local, Neon, AWS EC2, Render/Vercel, CI/CD
- [GitHub Repository](https://github.com/cnniranjan72/Flux) — source code
- [Postman Collection](https://github.com/cnniranjan72/Flux/blob/main/docs/erp-crm.postman_collection.json)

## Test Credentials

All accounts use password **`password123`**:

| Role       | Email               |
|------------|---------------------|
| Admin      | admin@test.com      |
| Sales      | sales@test.com      |
| Warehouse  | warehouse@test.com  |
| Accounts   | accounts@test.com   |
