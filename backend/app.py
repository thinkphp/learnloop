import json
import os
import time
from contextlib import asynccontextmanager

import redis
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Boolean, Float, Integer, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://courses:courses@localhost:5432/courses")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_TTL = int(os.getenv("CACHE_TTL", "60"))
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(engine)
cache = redis.Redis.from_url(REDIS_URL, decode_responses=True)


class Base(DeclarativeBase):
    pass


class Course(Base):
    __tablename__ = "courses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    instructor: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    level: Mapped[str] = mapped_column(String(30), nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    students: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
    popular: Mapped[bool] = mapped_column(Boolean, default=False)


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    category: str
    instructor: str
    description: str
    level: str
    duration: int
    rating: float
    students: int
    price: int
    color: str
    popular: bool


SEED = [
    ("UI/UX Design Fundamentals", "Design", "Mara Ionescu", "Learn to create intuitive interfaces, from first sketches to interactive prototypes.", "Beginner", 8, 4.9, 1240, 149, "#f2a786", True),
    ("Modern React: From Zero to Apps", "Development", "Andrei Popescu", "Build fast applications with React, hooks, reusable components, and modern best practices.", "Intermediate", 12, 4.8, 986, 199, "#88a9f5", True),
    ("Python for Data Science", "Data & AI", "Elena Dumitrescu", "Explore data with Python, Pandas, and clear visualizations. Includes hands-on projects.", "Beginner", 10, 4.9, 2100, 179, "#a6c8a0", True),
    ("Storytelling Through Brand Design", "Design", "Ioana Pavel", "Build a cohesive brand identity and turn strategy into memorable visual systems.", "Intermediate", 6, 4.7, 632, 129, "#d3a5e8", False),
    ("Backend with FastAPI and PostgreSQL", "Development", "Radu Marin", "Create performant APIs with relational databases and authentication in a practical project.", "Advanced", 14, 4.8, 845, 229, "#f2ce7c", False),
    ("Machine Learning Made Approachable", "Data & AI", "Vlad Georgescu", "Get started with machine learning through practical models, evaluation, and repeatable workflows.", "Intermediate", 11, 4.9, 1580, 249, "#8ccbc9", False),
]


def initialize():
    for attempt in range(30):
        try:
            Base.metadata.create_all(engine)
            with Session() as db:
                if db.scalar(select(Course.id).limit(1)) is None:
                    db.add_all([Course(title=t, category=c, instructor=i, description=d, level=l, duration=du, rating=r, students=s, price=p, color=co, popular=po) for t, c, i, d, l, du, r, s, p, co, po in SEED])
                    db.commit()
                else:
                    # Keep the built-in demo catalog in sync for existing Docker volumes.
                    rows = db.scalars(select(Course).order_by(Course.id).limit(len(SEED))).all()
                    fields = ("title", "category", "instructor", "description", "level", "duration", "rating", "students", "price", "color", "popular")
                    for row, values in zip(rows, SEED):
                        for field, value in zip(fields, values):
                            setattr(row, field, value)
                    db.commit()
            cache.ping()
            return
        except Exception:
            if attempt == 29:
                raise
            time.sleep(2)


@asynccontextmanager
async def lifespan(_app):
    initialize()
    yield


app = FastAPI(title="Learnloop API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", "database": "postgresql", "cache": "redis" if cache.ping() else "down"}


@app.get("/api/courses")
def list_courses(q: str = Query(default="", max_length=100), category: str = Query(default="All")):
    normalized = q.strip().lower()
    key = f"courses:{normalized}:{category.lower()}"
    started = time.perf_counter()
    try:
        cached = cache.get(key)
    except redis.RedisError:
        cached = None
    if cached:
        items = json.loads(cached)
        return {"items": items, "cache": "HIT", "latency_ms": round((time.perf_counter() - started) * 1000, 2), "ttl": cache.ttl(key)}
    with Session() as db:
        statement = select(Course)
        if normalized:
            pattern = f"%{normalized}%"
            statement = statement.where(Course.title.ilike(pattern) | Course.instructor.ilike(pattern) | Course.category.ilike(pattern) | Course.description.ilike(pattern))
        if category != "All":
            statement = statement.where(Course.category == category)
        items = [CourseOut.model_validate(row).model_dump() for row in db.scalars(statement.order_by(Course.popular.desc(), Course.id)).all()]
    try:
        cache.setex(key, CACHE_TTL, json.dumps(items, ensure_ascii=False))
    except redis.RedisError:
        pass
    return {"items": items, "cache": "MISS", "latency_ms": round((time.perf_counter() - started) * 1000, 2), "ttl": CACHE_TTL}


@app.post("/api/cache/clear")
def clear_cache():
    try:
        keys = list(cache.scan_iter("courses:*"))
        if keys:
            cache.delete(*keys)
        return {"cleared": len(keys)}
    except redis.RedisError as exc:
        raise HTTPException(status_code=503, detail="Redis is unavailable") from exc
