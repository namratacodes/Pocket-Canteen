"""python -m training.train_eta : train on everything the `source` port provides, print the evaluation, register + promote."""
import json
from app.bootstrap import load_and_register
from app.config import get_settings
from app.modules.etatrain.train import load_current
from app.ports import container

if __name__ == "__main__":
    load_and_register()
    s = get_settings()
    version = container.get("trainer").train_and_register(container.get("source"))
    _, meta = load_current(s.artifact_dir)
    print("registered + promoted", version); print(json.dumps(meta["metrics"], indent=2))
