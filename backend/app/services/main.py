from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .chat import router
from .documents import router as documents_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["content-type"],
)

app.include_router(router, prefix="/api")
app.include_router(documents_router, prefix="/api")