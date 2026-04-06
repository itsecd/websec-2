from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.api.routes import api, router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await api.aclose()


app = FastAPI(
    title="SSAU Schedule Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router, prefix="/api")
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")