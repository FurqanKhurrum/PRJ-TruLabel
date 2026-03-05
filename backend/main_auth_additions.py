"""
=============================================================================
INSTRUCTIONS — How to update main.py
=============================================================================

1.  Add these imports near the top of main.py (after existing imports):

        from pydantic import BaseModel, EmailStr
        from user_model import User, UserFavorite
        from auth_service import (
            hash_password,
            verify_password,
            create_access_token,
            get_current_user,
            get_optional_user,
        )

2.  Add the Pydantic request/response schemas (paste after the imports block):

        class RegisterRequest(BaseModel):
            email:        str
            display_name: str
            password:     str

        class LoginRequest(BaseModel):
            email:    str
            password: str

3.  Add the route handlers below (paste anywhere after app is created,
    e.g. after the existing /api/cache/stats endpoint).

=============================================================================
ROUTE HANDLERS — paste into main.py
=============================================================================
"""

# ── Auth ──────────────────────────────────────────────────────────────────────

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from user_model import User, UserFavorite
from auth_service import (
    hash_password, verify_password,
    create_access_token, get_current_user, get_optional_user,
)


class RegisterRequest(BaseModel):
    email:        str
    display_name: str
    password:     str


class LoginRequest(BaseModel):
    email:    str
    password: str


@app.post("/api/auth/register", status_code=201)
async def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user account and return a JWT token."""

    # Normalise email
    email = body.email.strip().lower()

    # Check for duplicate
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists.",
        )

    if len(body.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters.",
        )

    user = User(
        email=email,
        display_name=body.display_name.strip(),
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    logger.info(f"New user registered: {email}")

    return {"token": token, "user": user.to_dict()}


@app.post("/api/auth/login")
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password and return a JWT token."""

    email = body.email.strip().lower()
    user  = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = create_access_token(user.id, user.email)
    logger.info(f"User logged in: {email}")

    return {"token": token, "user": user.to_dict()}


@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return {"user": current_user.to_dict()}


# ── User scan history (server-side, per user) ─────────────────────────────────

@app.get("/api/user/history")
async def get_user_history(
    current_user: User = Depends(get_current_user),
    db: Session         = Depends(get_db),
    limit: int          = 50,
):
    """Return the logged-in user's personal scan history (newest first)."""
    from product_model import ScanHistory, Product

    rows = (
        db.query(ScanHistory)
        .filter(ScanHistory.user_id == current_user.id)
        .order_by(ScanHistory.scanned_at.desc())
        .limit(limit)
        .all()
    )

    # Enrich with product name + brand where cached
    barcodes  = [r.barcode for r in rows]
    products  = db.query(Product).filter(Product.barcode.in_(barcodes)).all()
    prod_map  = {p.barcode: p for p in products}

    history = []
    for row in rows:
        entry = row.to_dict()
        prod  = prod_map.get(row.barcode)
        if prod:
            entry["product_name"] = prod.product_name
            entry["brand_name"]   = prod.brand_name
            entry["image_url"]    = prod.image_url or prod.image_front_url or ""
            entry["ethical_score"] = prod.ethical_score
        history.append(entry)

    return {"history": history, "total": len(history)}


# ── Favourites ────────────────────────────────────────────────────────────────

@app.get("/api/user/favorites")
async def get_favorites(
    current_user: User = Depends(get_current_user),
    db: Session         = Depends(get_db),
):
    """Return all products saved/favourited by the logged-in user."""
    from product_model import Product

    favs     = db.query(UserFavorite).filter(UserFavorite.user_id == current_user.id).all()
    barcodes = [f.barcode for f in favs]
    products = db.query(Product).filter(Product.barcode.in_(barcodes)).all()
    prod_map = {p.barcode: p for p in products}

    result = []
    for fav in favs:
        entry = fav.to_dict()
        prod  = prod_map.get(fav.barcode)
        if prod:
            entry["product_name"]  = prod.product_name
            entry["brand_name"]    = prod.brand_name
            entry["image_url"]     = prod.image_url or prod.image_front_url or ""
            entry["ethical_score"] = prod.ethical_score
            entry["product_type"]  = prod.product_type
        result.append(entry)

    return {"favorites": result, "total": len(result)}


@app.post("/api/user/favorites/{barcode}", status_code=201)
async def add_favorite(
    barcode:      str,
    current_user: User    = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    """Save / favourite a product by barcode."""
    existing = (
        db.query(UserFavorite)
        .filter(UserFavorite.user_id == current_user.id, UserFavorite.barcode == barcode)
        .first()
    )
    if existing:
        return {"message": "Already in favourites.", "favorite": existing.to_dict()}

    fav = UserFavorite(user_id=current_user.id, barcode=barcode)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return {"message": "Added to favourites.", "favorite": fav.to_dict()}


@app.delete("/api/user/favorites/{barcode}")
async def remove_favorite(
    barcode:      str,
    current_user: User    = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    """Remove a product from favourites."""
    fav = (
        db.query(UserFavorite)
        .filter(UserFavorite.user_id == current_user.id, UserFavorite.barcode == barcode)
        .first()
    )
    if not fav:
        raise HTTPException(status_code=404, detail="Favourite not found.")

    db.delete(fav)
    db.commit()
    return {"message": "Removed from favourites."}


# ── Scan endpoint — attach user_id when logged in ─────────────────────────────
#
# In the existing /api/scan handler, find the line where scan_history is saved:
#
#     scan_history = ScanHistory(
#         barcode=barcode,
#         product_type=...,
#         data_source=...,
#         cache_hit=...,
#     )
#
# Change the function signature to accept an optional user:
#
#     async def scan_product(
#         file: UploadFile = File(...),
#         db: Session = Depends(get_db),
#         current_user: Optional[User] = Depends(get_optional_user),   # ← ADD
#     ):
#
# Then update the ScanHistory creation to:
#
#     scan_history = ScanHistory(
#         barcode=barcode,
#         product_type=product_info.get("product_type"),
#         data_source=product_info.get("source"),
#         cache_hit=False,
#         user_id=current_user.id if current_user else None,           # ← ADD
#     )