# AI Task Processing Platform

A production-ready AI Task Processing Platform built with MERN stack, Python worker, Docker, Kubernetes, Redis, and MongoDB.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Worker: Python (RQ)
- Database: MongoDB
- Queue: Redis
- Container: Docker + Kubernetes
- GitOps: Argo CD
- CI/CD: GitHub Actions

## Quick Start (Docker Compose)

```bash
# Clone the repo
git clone <repo-url>
cd ai-task-platform

# Copy env files
cp backend/.env.example backend/.env
cp worker/.env.example worker/.env

# Start all services
docker-compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017
- Redis: localhost:6379

## Kubernetes Deployment

```bash
# Apply namespace and configs first
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Deploy all services
kubectl apply -f k8s/

# Check status
kubectl get pods -n ai-task-platform
```

## Argo CD Setup

```bash
# Install Argo CD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Apply the app
kubectl apply -f infra/argocd-app.yaml
```

## Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | JWT signing secret |
| REDIS_URL | Redis connection URL |
| PORT | Server port (default 5000) |

### Worker
| Variable | Description |
|----------|-------------|
| MONGO_URI | MongoDB connection string |
| REDIS_URL | Redis connection URL |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| POST | /api/tasks | Create task |
| GET | /api/tasks | List tasks |
| GET | /api/tasks/:id | Get task |
| POST | /api/tasks/:id/run | Queue task |

## Project Structure

```
.
├── backend/          # Express API
├── frontend/         # React app
├── worker/           # Python RQ worker
├── k8s/              # Kubernetes manifests
├── infra/            # Argo CD config
├── .github/workflows # CI/CD pipelines
├── docker-compose.yml
└── Architecture.md
```
