from fastapi import FastAPI

app = FastAPI(title="cxr-labeller backend")


@app.get("/")
def root():
    return {"message": "cxr-labeller backend"}


@app.get("/health")
def health():
    return {"status": "ok"}
