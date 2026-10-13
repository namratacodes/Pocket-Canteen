import numpy as np
import pytest
from tests.p3.conftest import body


def test_contract_shape_and_extra_fields_ignored(client, ids):
    r = client.post("/predict-eta", json=body(ids[0]))
    assert r.status_code == 200 and set(r.json()) == {"etaSeconds", "modelVersion"}
    assert isinstance(r.json()["etaSeconds"], int) and 60 <= r.json()["etaSeconds"] <= 7200 and r.json()["modelVersion"] == "testkit-1"


def test_more_queue_never_means_faster(client, ids):
    a = client.post("/predict-eta", json=body(ids[0], queueDepth=0, strainSeconds=0)).json()["etaSeconds"]
    b = client.post("/predict-eta", json=body(ids[0], queueDepth=12, strainSeconds=6000)).json()["etaSeconds"]
    assert b > a


def test_bigger_cart_never_means_faster(client, ids):
    small = body(ids[0]); big = body(ids[0]); big["items"][0]["basePrepSeconds"] = 600
    assert client.post("/predict-eta", json=big).json()["etaSeconds"] >= client.post("/predict-eta", json=small).json()["etaSeconds"]


def test_unknown_canteen_and_station_still_answer(client):
    b = body("00000000-0000-0000-0000-000000000000"); b["items"][0]["station"] = "teppanyaki"
    assert client.post("/predict-eta", json=b).status_code == 200


@pytest.mark.parametrize("patch", [{"items": []}, {"queueDepth": -1}, {"now": "not-a-date"}, {"strainSeconds": -5},
                                   {"items": [{"menuItemId": "x", "qty": 0, "basePrepSeconds": 60, "weight": 1}]}])
def test_invalid_requests_are_422(client, ids, patch):
    assert client.post("/predict-eta", json=body(ids[0], **patch)).status_code == 422


def test_clamped_to_the_range_the_backend_expects(client, ids):
    r = client.post("/predict-eta", json=body(ids[0], queueDepth=1000, strainSeconds=1e9))
    assert 60 <= r.json()["etaSeconds"] <= 7200


def test_p95_latency_budget(client, ids):
    import time
    lat = []
    for _ in range(200):
        t = time.perf_counter(); client.post("/predict-eta", json=body(ids[0])); lat.append((time.perf_counter() - t) * 1000)
    assert np.percentile(lat, 95) < 20


def test_vector_is_exactly_the_shared_online_vector(client, ids):
    from datetime import datetime
    from zoneinfo import ZoneInfo
    from app.eta.features import online_vector
    from app.schemas import EtaRequest
    p = client.app.state.predictor; req = EtaRequest(**body(ids[0]))
    p.velocity[ids[0]] = 5.0
    mine = p.vector(ids[0], req.items, req.queueDepth, req.strainSeconds, req.now)
    ref = online_vector([{"qty": 1, "basePrepSeconds": 120, "weight": 1.2, "station": "beverage"}], 3, 900.0, 5.0, 0.0, req.now.astimezone(ZoneInfo("Asia/Kolkata")))
    np.testing.assert_array_equal(mine, ref)
