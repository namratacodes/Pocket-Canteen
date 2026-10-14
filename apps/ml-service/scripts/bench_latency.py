"""Measure /predict-eta latency FROM THE MACHINE THAT RUNS THE BACKEND (network time counts against the backend's 50 ms budget).
   python scripts/bench_latency.py http://ml-service:8000 [n=300]"""
import statistics, sys, time
import httpx

url, n = sys.argv[1].rstrip("/"), int(sys.argv[2]) if len(sys.argv) > 2 else 300
body = {"canteenId": "bench", "items": [{"menuItemId": "x", "qty": 2, "basePrepSeconds": 240, "weight": 1.3, "station": "griddle"}],
        "queueDepth": 5, "strainSeconds": 1500, "now": "2026-10-12T13:20:00+05:30"}
lat = []
with httpx.Client(timeout=2.0) as c:
    for _ in range(n):
        t = time.perf_counter(); r = c.post(f"{url}/predict-eta", json=body); lat.append((time.perf_counter() - t) * 1000)
        assert r.status_code == 200, r.text
lat.sort(); q = lambda p: lat[min(len(lat) - 1, int(p / 100 * len(lat)))]
print(f"n={n} p50={q(50):.1f}ms p95={q(95):.1f}ms p99={q(99):.1f}ms max={lat[-1]:.1f}ms  (backend budget: 50 ms, includes network)")
