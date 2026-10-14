import subprocess, sys
from fastapi import APIRouter, Depends
from app.auth import AuthUser, admin_only

router = APIRouter()


def spawn_worker(job: str) -> None:
    """Heavy jobs run in a separate OS process so /predict-eta latency is never affected (training in-process measured p99 56 ms)."""
    subprocess.Popen([sys.executable, "-m", "app.worker", "--once", job], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


@router.post("/admin/refresh-intelligence", status_code=202)
def refresh(_: AuthUser = Depends(admin_only)):
    spawn_worker("refresh"); return {"status": "started"}


@router.post("/admin/retrain", status_code=202)
def retrain(_: AuthUser = Depends(admin_only)):
    spawn_worker("retrain"); return {"status": "started"}
