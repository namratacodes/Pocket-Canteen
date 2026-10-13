from fastapi import APIRouter, Depends, HTTPException, Query, Request
from app.auth import AuthUser, current_user, staff_of
from .basket import recommend

router = APIRouter()


@router.get("/menu-intelligence/{canteen_id}")
def menu_intelligence(canteen_id: str, request: Request, _: AuthUser = Depends(staff_of)):
    d = request.app.state.store.data
    if canteen_id not in d["matrix"]: raise HTTPException(404, "No analysis yet for this canteen")
    names = d["names"]
    return {"generatedAt": d["generatedAt"], "canteenId": canteen_id, **d["matrix"][canteen_id],
            "combos": [{**r, "ifName": names.get(r["ifItemId"]), "thenName": names.get(r["thenItemId"])} for r in d["rules"].get(canteen_id, [])]}


@router.get("/menu-intelligence/{canteen_id}/combos")
def combos(canteen_id: str, request: Request, itemIds: str = Query(..., description="comma separated menu item ids in the cart"),
           _: AuthUser = Depends(current_user)):
    d = request.app.state.store.data
    recs = recommend(d["rules"].get(canteen_id, []), [i for i in itemIds.split(",") if i])
    return {"data": [{"menuItemId": r["thenItemId"], "name": d["names"].get(r["thenItemId"]), "confidence": r["confidence"],
                      "lift": r["lift"], "because": d["names"].get(r["ifItemId"])} for r in recs]}
