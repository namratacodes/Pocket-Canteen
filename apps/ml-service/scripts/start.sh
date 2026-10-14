#!/bin/sh
# Single-container deployment: API in the foreground, worker (niced) in the background.
python -m app.worker &
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
