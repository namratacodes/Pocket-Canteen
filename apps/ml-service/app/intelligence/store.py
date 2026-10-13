"""Results of the worker's nightly jobs, persisted as one JSON file. The API process only READS it (reloads when the file changes)."""
import json, threading
from pathlib import Path

EMPTY = {"generatedAt": None, "matrix": {}, "rules": {}, "names": {}, "sheet": {}, "forecastReport": {}}


class IntelStore:
    def __init__(self, artifact_dir: str):
        self.path = Path(artifact_dir) / "intelligence.json"; self.lock = threading.Lock()
        self.data, self._mtime = dict(EMPTY), 0.0
        self.reload_if_changed()

    def reload_if_changed(self) -> bool:
        if not self.path.exists(): return False
        m = self.path.stat().st_mtime
        if m == self._mtime: return False
        with self.lock: self.data, self._mtime = json.loads(self.path.read_text()), m
        return True

    def replace(self, data: dict) -> None:                                   # called by the worker
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp"); tmp.write_text(json.dumps(data)); tmp.replace(self.path)   # atomic swap
