"""The `trainer` port implementation."""
from datetime import timedelta
from app.eta.features import FEATURES
from .dataset import build_dataset
from .train import TARGET, load_current, metrics, promote, register, time_split, train


class Trainer:
    def __init__(self, settings): self.s = settings

    def train_and_register(self, source, *, promote_now: bool = True, **kw) -> str:
        promote_flag = kw.get("promote", promote_now)
        d, ids = build_dataset(source.orders(), source.lines(), source.catalog(), self.s.campus_tz)
        model, report = train(d)
        version = register(model, report, ids, self.s.artifact_dir)
        if promote_flag: promote(self.s.artifact_dir, version)
        return version

    def retrain_if_better(self, source, *, window_days: int, min_improvement: float = 0.02) -> dict:
        """Challenger trained on the last `window_days` (relative to the newest order), holding out the final 3 days. The CURRENT model is
        scored on the same untouched holdout. Promote only if the challenger is at least `min_improvement` (fraction) better."""
        o_all = source.orders()
        if o_all.empty: return {"action": "skipped", "reason": "no orders"}
        since = o_all.placed_at.max() - timedelta(days=window_days)
        o, l, c = source.orders(since), source.lines(since), source.catalog()
        try: current, meta = load_current(self.s.artifact_dir)
        except (FileNotFoundError, KeyError): current, meta = None, None
        ids = list(meta["canteenIds"]) if meta else None
        if ids is not None: ids += [x for x in sorted(o.canteen_id.unique()) if x not in ids]      # keep the current model's index mapping valid
        d, ids = build_dataset(o, l, c, self.s.campus_tz, ids)
        if d.day.nunique() < 8: return {"action": "skipped", "reason": f"only {d.day.nunique()} days of data in the window"}
        challenger, report = train(d, test_days=3, val_days=2)
        version = register(challenger, report, ids, self.s.artifact_dir)
        if current is None:
            promote(self.s.artifact_dir, version); return {"action": "promoted", "version": version, "reason": "no current model"}
        _, _, te = time_split(d, 3, 2)
        old = metrics(current.predict(te[FEATURES]), te[TARGET].to_numpy())["mae_s"]
        new = report["xgboost"]["mae_s"]
        out = {"holdout_mae_old_s": old, "holdout_mae_new_s": new, "version": version}
        if new < old * (1 - min_improvement):
            promote(self.s.artifact_dir, version); return {"action": "promoted", **out}
        return {"action": "kept_current", **out}
