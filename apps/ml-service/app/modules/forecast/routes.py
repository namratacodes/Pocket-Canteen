from fastapi import APIRouter, Depends, HTTPException, Request
from app.auth import AuthUser, staff_of

router = APIRouter()
DAYPARTS = ["breakfast", "lunch", "tea", "evening"]


@router.get("/forecast/{canteen_id}/prep-sheet")
def prep_sheet(canteen_id: str, request: Request, _: AuthUser = Depends(staff_of)):
    d = request.app.state.store.data
    sheet = d["sheet"].get(canteen_id)
    if not sheet: raise HTTPException(404, "No forecast available (needs at least about 45 days of history)")
    rows = [{"menuItemId": r["menu_item_id"], "name": d["names"].get(r["menu_item_id"]), "daypart": DAYPARTS[r["dp"]],
             "prepMin": r["p10"], "expected": r["p50"], "prepMax": r["p90"]} for r in sheet["rows"]]
    return {"date": sheet["date"], "generatedAt": d["generatedAt"], "rows": rows}
