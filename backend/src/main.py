from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.auth.router import router as auth_router

app = FastAPI(title="cxr-labeller backend")

# Vite dev server (Tauri's webview also loads this URL directly during `tauri dev`)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "http://127.0.0.1:1420"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/")
def root():
    return {"message": "cxr-labeller backend"}


@app.get("/health")
def health():
    return {"status": "ok"}
