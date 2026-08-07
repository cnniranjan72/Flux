# Deployment Guide

How the Mini ERP + CRM portal is deployed, plus alternatives. The app is currently **live on AWS EC2** at [http://52.90.161.120](http://52.90.161.120) with **PostgreSQL on Neon**.

---

## Current Production Stack

```mermaid
flowchart LR
    U[Browser] --> NG["nginx :80"]
    NG --> SPA["/  static React build<br/>(frontend/dist)"]
    NG --> API["/api  proxy -> 127.0.0.1:5000<br/>(Node/Express)"]
    API --> NEO["Neon PostgreSQL (managed)"]
    GITHUB[GitHub repo] -.git pull.-> EC2
```

| Component | Choice | Notes |
|-----------|--------|-------|
| Compute    | AWS EC2 `t3.micro`, Ubuntu 24.04, `us-east-1` | Free-tier eligible (750 hrs/mo) |
| Web server | nginx | Serves SPA + reverse proxy `/api/*` |
| Process    | systemd unit `flux-api` | Auto-restart on crash |
| Database   | Neon PostgreSQL (pooled URL) | Migrations + seed already applied |
| CI         | GitHub Actions | Typecheck + build on push |

---

## 1. Local Development

See the README [Getting Started](../README.md#getting-started-local). Two terminals:

```bash
cd backend && npm run dev     # :5000
cd frontend && npm run dev    # :5173
```

Local Docker Postgres runs on port **5433** (via `backend/docker-compose.yml`).

---

## 2. Production Database — Neon (PostgreSQL, free)

Neon is fully managed PostgreSQL, satisfying the PostgreSQL requirement with no server to run.

1. Create a project at [neon.tech](https://neon.tech) and copy the **pooled connection string** (starts with `postgresql://...?sslmode=require`).
2. Apply migrations and seed **once** from your machine:

   ```bash
   cd backend
   export DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
   npx prisma migrate deploy
   npx prisma db seed
   ```

> Migrations and seed have already been run against the Neon database used by this project.

---

## 3. AWS EC2 (current live deployment)

### 3.1 Prerequisites

- AWS account with a user that has `AmazonEC2FullAccess`.
- AWS CLI installed: `winget install --id Amazon.AWSCLIV2` (Windows) or `pip install awscli`.
- Configure credentials: `aws configure` (Access Key ID, Secret Access Key, region `us-east-1`).

### 3.2 One-time provisioning

The instance is bootstrapped with a **user-data script** that does everything:

1. Installs Node 20, nginx, git, PM2.
2. Clones the public repo to `/opt/erp-crm`.
3. Writes `backend/.env` (Neon `DATABASE_URL`, generated `JWT_SECRET`, `CORS_ORIGIN`).
4. Builds backend + frontend, applies migrations.
5. Configures nginx and a systemd unit `flux-api`.

Equivalent CLI steps (AMI `ami-052355af2a014bd2c` = Ubuntu 24.04 gp3, us-east-1):

```bash
# create key pair + security group
aws ec2 create-key-pair --key-name flux-erp-key --key-type ed25519 --query KeyMaterial --output text > flux-erp-key.pem
aws ec2 create-security-group --group-name flux-erp-sg --description "ERP web + ssh"
aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 22 --cidr 0.0.0.0/0

# launch
aws ec2 run-instances \
  --image-id ami-052355af2a014bd2c \
  --instance-type t3.micro \
  --key-name flux-erp-key \
  --security-group-ids <sg-id> \
  --user-data file://user-data.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=flux-erp}]"
```

### 3.3 Redeploy (after pushing new code)

```bash
ssh -i flux-erp-key.pem ubuntu@52.90.161.120 \
  "cd /opt/erp-crm && git pull --ff-only && cd backend && npm run build && cd ../frontend && npm run build && sudo systemctl restart flux-api"
```

> If files are root-owned from an earlier root bootstrap: `sudo chown -R ubuntu:ubuntu /opt/erp-crm` once.

### 3.4 nginx config (for reference)

```nginx
server {
  listen 80 default_server;
  server_name _;
  root /opt/erp-crm/frontend/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:5000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / { try_files $uri $uri/ /index.html; }
}
```

### 3.5 AWS cost notes

- **$0/month** while the account is within its first 12 months (free tier): t3.micro = 750 hrs/mo, 10GB gp3 EBS ≤ 30GB free, outbound transfer ≤ 100GB/mo free.
- Charges only if: account is >12 months old, a non-free-tier instance/region is chosen, or extra resources (2nd instance, RDS, Elastic IP, Load Balancer) are created. Usage is not metered per-request.

---

## 4. Render + Vercel (free, no AWS)

Alternative zero-cost route that needs no AWS account. `render.yaml` and `frontend/vercel.json` are committed.

### Backend → Render (blueprint)

1. [render.com](https://render.com) → **New → Blueprint** → select the repo.
2. Render reads `render.yaml`, provisions the `erp-crm-backend` web service (free plan).
3. In service → **Environment**, set:
   - `DATABASE_URL` → Neon pooled connection string
   - `JWT_SECRET` → long random string (`openssl rand -hex 32`)
   - `CORS_ORIGIN` → `https://<your-frontend>.vercel.app`
4. **Apply**. Render runs `npx prisma migrate deploy && npm start`.

> Free-tier Render instances sleep after inactivity; first request may take ~30s to wake.

### Frontend → Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. Auto-detects Vite (`vercel.json` committed).
3. Env var: `VITE_API_URL=https://erp-crm-backend.onrender.com/api`.
4. Deploy → `https://flux-<name>.vercel.app`.

---

## 5. CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)

Runs on every push to `main` and on PRs:
- `backend`: `npm ci` → `prisma generate` → `tsc --noEmit`
- `frontend`: `npm ci` → `npm run build`

### Push-to-deploy (optional, not yet enabled)

To auto-deploy on push to the EC2 instance, add a CD job that SSHes in and runs the redeploy command from [3.3](#33-redeploy-after-pushing-new-code). Store `EC2_HOST`, `EC2_USER`, and the PEM key as GitHub **secrets** (never commit keys).

```yaml
- name: Deploy
  env:
    EC2_HOST: ${{ secrets.EC2_HOST }}
    EC2_KEY: ${{ secrets.EC2_SSH_KEY }}
  run: |
    echo "$EC2_KEY" > /tmp/deploy_key && chmod 600 /tmp/deploy_key
    ssh -i /tmp/deploy_key ubuntu@$EC2_HOST \
      "cd /opt/erp-crm && git pull && cd backend && npm run build && cd ../frontend && npm run build && sudo systemctl restart flux-api"
```

---

## 6. Docker

`backend/Dockerfile` builds the API image. For a full local stack:

```bash
cd backend && docker compose up -d        # Postgres only (used for local dev)
# or build the API image:
docker build -t erp-backend .
docker run -p 5000:5000 --env-file .env erp-backend
```

---

## 7. Security checklist

- Rotate any AWS access key / console password that was shared in chat.
- Never commit `backend/.env` or `frontend/.env` (both gitignored); only `.env.example` is committed.
- Keep `JWT_SECRET` long and unique per environment.
- For production HTTPS: put a CloudFront distribution (with ACM certificate) in front of the EC2 instance, or add a domain in Render/Vercel.
