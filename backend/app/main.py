from app.routes.folders import router as folder_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.stars import router as star_router
from app.routes.files import router as file_router
from app.core.database import Base, engine
from app.routes.shares import router as share_router
from app.routes.link_shares import router as link_share_router
from app.models import (
    User,
    Folder,
    File,
    FileVersion,
    Share,
    LinkShare,
    Star,
    Activity
)

from app.routes.auth import router as auth_router

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Cloudora API",
    description="Cloud-based media file storage and sharing platform",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "https://cloudora-gamma.vercel.app",
        ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(folder_router)
app.include_router(file_router)
app.include_router(share_router)
app.include_router(star_router)
app.include_router(link_share_router)
@app.get("/")
def root():
    return {
        "message": "Welcome to Cloudora API"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }