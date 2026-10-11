# Learnloop — course catalog with Redis caching

A full-stack demo built with React, Vite, FastAPI, PostgreSQL, and Redis. PostgreSQL stores course data permanently; Redis caches search results for 60 seconds.

## Start the app

You need Docker and Docker Compose:

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- API and docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

On first launch, the API creates the database schema and seeds the demo course catalog. Search for the same term twice to see `MISS` followed by `HIT`. Use **Clear cache** to remove cached search results.

## Project structure

- `frontend/` — React, Vite, and responsive CSS
- `backend/` — FastAPI, SQLAlchemy, PostgreSQL, and Redis
- `docker-compose.yml` — starts all services

Redis is used for read caching; PostgreSQL remains the source of truth.
