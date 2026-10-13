from fastapi import APIRouter, Depends, HTTPException, Request, Response
from app.auth import AuthUser, current_user
from app.schemas import EtaRequest, EtaResponse

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/ready")
def ready(request: Request, response: Response):
    p = getattr(request.app.state, "predictor", None)
    if p is None:
        response.status_code = 503
        return {"status": "no_model"}
    return {"status": "ready", "modelVersion": p.version}


@router.post("/predict-eta", response_model=EtaResponse)
def predict_eta(r: EtaRequest, request: Request):
    """Called server-to-server by the Node backend. No auth (keep this service on a private network). No DB access on this path.
    422 = invalid body, 503 = no model: in both cases the backend silently uses its own fallback formula."""
    p = getattr(request.app.state, "predictor", None)
    if p is None: raise HTTPException(503, "Model not loaded")
    return EtaResponse(etaSeconds=p.predict_seconds(r.canteenId, r.items, r.queueDepth, r.strainSeconds, r.now), modelVersion=p.version)


@router.get("/eta/model")
def model_info(request: Request, user: AuthUser = Depends(current_user)):
    if user.role == "student": raise HTTPException(403, "Forbidden")
    p = getattr(request.app.state, "predictor", None)
    if p is None: raise HTTPException(503, "Model not loaded")
    return {"version": p.version, "trainedAt": p.meta["trainedAt"], "metrics": p.meta["metrics"]["xgboost"],
            "baselineFallbackMetrics": p.meta["metrics"]["fallback_formula"]}
