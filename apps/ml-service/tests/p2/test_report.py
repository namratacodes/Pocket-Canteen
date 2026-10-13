from training.eta_report import render
from app.modules.etatrain.train import register, promote
import json


def test_report_renders_from_registry_metadata(trained, built, tmp_path):
    m, r = trained; _, ids = built
    v = register(m, r, ids, str(tmp_path)); meta = json.loads((tmp_path / "eta" / v / "meta.json").read_text())
    text = render(meta)
    assert "XGBoost" in text and "Backend fallback formula" in text and "Error by queue depth" in text and "Feature importance" in text
