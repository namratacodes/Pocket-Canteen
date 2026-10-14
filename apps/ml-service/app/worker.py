"""Heavy work lives here, in its own process, so training never steals CPU from /predict-eta.
   python -m app.worker                  scheduler: nightly refresh, drift check
   python -m app.worker --once refresh   one-off job (also what the admin endpoints start)
   python -m app.worker --once retrain | drift"""
import argparse, json, logging, os
from .bootstrap import load_and_register
from .config import get_settings
from .intelligence.store import IntelStore
from .modules.ops import jobs
from .ports import container

log = logging.getLogger("ml.worker")


def run_once(name: str, bootstrap: bool = True) -> dict:
    """bootstrap=True (production) loads every module and lets it register its ports. Tests that register their own fakes pass False."""
    s = get_settings()
    if bootstrap: load_and_register()
    if name == "refresh": return jobs.refresh_intelligence(s, IntelStore(s.artifact_dir))
    if name == "retrain": return {"version": container.get("trainer").train_and_register(container.get("source"))}
    if name == "drift": return jobs.drift_check_and_retrain(s)
    raise SystemExit(f"unknown job {name}")


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    try: os.nice(10)                                       # be polite to the API process on a shared machine
    except (AttributeError, OSError): pass
    ap = argparse.ArgumentParser(); ap.add_argument("--once", choices=["refresh", "retrain", "drift"]); a = ap.parse_args()
    if a.once:
        print(json.dumps(run_once(a.once), default=str)); return
    from apscheduler.schedulers.blocking import BlockingScheduler
    s = get_settings(); sched = BlockingScheduler(timezone=s.campus_tz)
    if not IntelStore(s.artifact_dir).data["generatedAt"]: sched.add_job(lambda: _safe("refresh"), id="first-boot")
    sched.add_job(lambda: _safe("refresh"), "cron", hour=s.nightly_hour, minute=s.nightly_minute, id="nightly-refresh")
    sched.add_job(lambda: _safe("drift"), "cron", hour=s.nightly_hour, minute=(s.nightly_minute + 15) % 60, id="nightly-drift")
    log.info("worker started"); sched.start()


def _safe(name: str) -> None:
    try: log.info("%s -> %s", name, run_once(name))
    except Exception: log.exception("job %s failed", name)


if __name__ == "__main__":
    main()
