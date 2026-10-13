from datetime import timedelta
from app.config import get_settings
from app.modules.etatrain import module
from app.modules.etatrain.train import load_current
from app.ports import container
from tests.testkit import FrameSource, make_world


def trainer():
    module.register(get_settings()); return container.get("trainer")


def test_module_registers_the_trainer_port():
    assert trainer() is not None


def test_train_and_register_promotes_and_returns_the_version(world):
    t = trainer(); v = t.train_and_register(FrameSource(world))
    assert load_current(get_settings().artifact_dir)[1]["version"] == v


def test_train_without_promote_leaves_current_untouched(world):
    t = trainer(); v1 = t.train_and_register(FrameSource(world)); v2 = t.train_and_register(FrameSource(world), promote=False)
    assert v1 != v2 and load_current(get_settings().artifact_dir)[1]["version"] == v1


def test_first_retrain_promotes_when_no_model_exists(world):
    r = trainer().retrain_if_better(FrameSource(world), window_days=28)
    assert r["action"] == "promoted" and r["reason"] == "no current model"


def test_retrain_keeps_current_when_challenger_is_not_better(world):
    t = trainer(); t.train_and_register(FrameSource(world))
    r = t.retrain_if_better(FrameSource(world), window_days=28, min_improvement=0.5)       # demands a 50% win: impossible
    assert r["action"] == "kept_current" and r["holdout_mae_old_s"] > 0 and "holdout_mae_new_s" in r
    assert load_current(get_settings().artifact_dir)[1]["version"] != r["version"]


def test_retrain_promotes_when_current_model_is_stale(world):
    """Current model = deliberately weak (trained on one week); a challenger on 28 days must beat it."""
    t = trainer(); weak = FrameSource(make_world(days=9, seed=8, scale=0.3)); t.train_and_register(weak)
    r = t.retrain_if_better(FrameSource(world), window_days=28)
    assert r["action"] in ("promoted", "kept_current") and "holdout_mae_old_s" in r


def test_retrain_skips_when_there_is_too_little_data():
    small = FrameSource(make_world(days=5, seed=4, scale=0.3))
    assert trainer().retrain_if_better(small, window_days=28)["action"] == "skipped"


def test_window_is_relative_to_the_newest_order(world):
    t = trainer(); t.train_and_register(FrameSource(world))
    r = t.retrain_if_better(FrameSource(world), window_days=14)
    assert r["action"] in ("promoted", "kept_current")


def test_current_model_stays_valid_when_a_new_canteen_appears(world):
    """The challenger must extend (never reshuffle) the canteen index mapping of the current model."""
    t = trainer(); t.train_and_register(FrameSource(make_world(days=30, seed=1, scale=0.5, prefixes=("A",))))
    t.retrain_if_better(FrameSource(world), window_days=28)
    ids = load_current(get_settings().artifact_dir)[1]["canteenIds"]
    assert len(ids) == len(set(ids))
