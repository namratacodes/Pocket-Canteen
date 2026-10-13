"""Foundation self-check. Identical in every phase; if this fails your copy of the foundation is damaged."""
import numpy as np
from app.eta.features import FEATURES
from app.frames import check_frames
from app.ports import container
from tests.testkit import FrameSource, make_eta_artifacts


def test_world_is_a_valid_canonical_dataset(world):
    check_frames(world.orders, world.lines, world.catalog)
    assert len(world.orders) > 2000 and world.orders.actual_prep_seconds.min() > 0


def test_framesource_filters_by_time(world):
    src = FrameSource(world); cut = world.orders.placed_at.median()
    assert len(src.orders(cut)) < len(src.orders()) and set(src.lines(cut).order_id) <= set(src.orders(cut).order_id)


def test_container_requires_registration():
    import pytest
    with pytest.raises(LookupError): container.get("source")


def test_toy_artifacts_have_the_contract_layout(tmp_path):
    import json
    make_eta_artifacts(str(tmp_path), ["c1"])
    meta = json.loads((tmp_path / "eta" / "testkit-1" / "meta.json").read_text())
    assert meta["features"] == FEATURES and (tmp_path / "eta" / "testkit-1" / "model.json").exists()
    assert json.loads((tmp_path / "eta" / "current.json").read_text())["version"] == "testkit-1"
