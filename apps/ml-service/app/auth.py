"""Verifies the access tokens issued by the Node backend (HS256, same JWT_ACCESS_SECRET). /predict-eta does NOT use this."""
from dataclasses import dataclass
import jwt
from fastapi import Depends, Header, HTTPException
from .config import get_settings


@dataclass
class AuthUser:
    id: str
    role: str                      # student | staff | admin
    canteen_id: str | None


def current_user(authorization: str | None = Header(default=None)) -> AuthUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    try:
        p = jwt.decode(authorization[7:], get_settings().jwt_access_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    return AuthUser(id=p["sub"], role=p["role"], canteen_id=p.get("canteenId"))


def staff_of(canteen_id: str, user: AuthUser = Depends(current_user)) -> AuthUser:
    """Admin: any canteen. Staff: only their own (other canteens look like 404, same as the backend). Students: never."""
    if user.role == "admin" or (user.role == "staff" and user.canteen_id == canteen_id): return user
    raise HTTPException(404 if user.role == "staff" else 403, "Not found" if user.role == "staff" else "Forbidden")


def admin_only(user: AuthUser = Depends(current_user)) -> AuthUser:
    if user.role != "admin": raise HTTPException(403, "Forbidden")
    return user
