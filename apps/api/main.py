from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.config import settings
from apps.api.models.database import Base, engine, apply_sqlite_additive_migrations
from apps.api.routes.command import router as command_router
from apps.api.routes.assets import router as assets_router
from apps.api.routes.events import router as events_router
from apps.api.routes.incidents import router as incidents_router
from apps.api.routes.scans import router as scans_router
from apps.api.routes.replay import router as replay_router
from apps.api.routes.aether import router as aether_router

app = FastAPI(title="ForgeSentinel API")

cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(command_router)
app.include_router(assets_router)
app.include_router(events_router)
app.include_router(incidents_router)
app.include_router(scans_router)
app.include_router(replay_router)
app.include_router(aether_router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    apply_sqlite_additive_migrations()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ForgeSentinel API"}
