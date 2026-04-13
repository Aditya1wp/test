from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- MASTER RESET: HELLO WORLD FOUNDATION ---
app = FastAPI(title="NIMCET Foundation Mode", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/api/ping")
def ping():
    return {"status": "alive", "msg": "FOUNDATION IS READY: Highway is open!"}

@app.get("/")
def read_root():
    return {"status": "ok", "mode": "Foundation"}
