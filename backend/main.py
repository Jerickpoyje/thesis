"""
FastAPI backend — Amadeo Coffee Production Prediction
=====================================================
Ensemble approach: Model 1 (30%) + Model 2 (70%)

Two predict endpoints:
  POST /predict        → saves to Supabase (admin use)
  POST /predict-public → does NOT save (user/public use)
"""

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
import joblib
import pandas as pd
import numpy as np
import os
import re
import mimetypes
import uuid
import requests
from dotenv import load_dotenv
import hashlib
import hmac
import binascii
import jwt
from datetime import datetime, timedelta, timezone

load_dotenv()

app = FastAPI(title="Amadeo Coffee Prediction API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "https://your-vercel-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase config ───────────────────────────────────────────
SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_MEDIA_BUCKET = os.getenv("SUPABASE_MEDIA_BUCKET", "cms-media")
ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET")
ADMIN_JWT_ALGORITHM = os.getenv("ADMIN_JWT_ALGORITHM", "HS256")
ADMIN_JWT_EXP_MINUTES = int(os.getenv("ADMIN_JWT_EXP_MINUTES", "480"))


def build_supabase_public_url(bucket: str, object_path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{object_path}"


def get_supabase_auth_headers(content_type: str | None = None) -> dict:
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def is_bucket_not_found_response(response: requests.Response) -> bool:
    if response.status_code == 404:
        return True

    try:
        payload = response.json()
    except Exception:
        payload = {}

    message = str(payload.get("message", "")).lower()
    error = str(payload.get("error", "")).lower()
    code = str(payload.get("statusCode", "")).strip()
    return (
        response.status_code == 400
        and ("bucket not found" in message or "bucket not found" in error or code == "404")
    )


def ensure_supabase_bucket_exists(bucket: str):
    bucket_url = f"{SUPABASE_URL}/storage/v1/bucket/{bucket}"
    check_response = requests.get(bucket_url, headers=get_supabase_auth_headers(), timeout=10)
    if check_response.status_code == 200:
        return

    if not is_bucket_not_found_response(check_response):
        raise HTTPException(
            status_code=502,
            detail=f"Failed to check storage bucket '{bucket}': {check_response.status_code} {check_response.text}",
        )

    create_url = f"{SUPABASE_URL}/storage/v1/bucket"
    create_response = requests.post(
        create_url,
        headers=get_supabase_auth_headers("application/json"),
        json={
            "id": bucket,
            "name": bucket,
            "public": True,
        },
        timeout=10,
    )
    if create_response.status_code not in [200, 201, 409]:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to create storage bucket '{bucket}': {create_response.status_code} {create_response.text}",
        )


def upload_supabase_media(file: UploadFile, page: str, section: str):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Supabase storage is not configured")

    content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"
    if not content_type.startswith(("image/", "video/")):
        raise HTTPException(status_code=400, detail="Only image and video uploads are supported")

    original_name = os.path.splitext(file.filename or "upload")[0]
    safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "-", original_name).strip("-_.") or "upload"
    extension = os.path.splitext(file.filename or "")[1]
    if not extension:
        guessed_extension = mimetypes.guess_extension(content_type)
        extension = guessed_extension or ""

    object_path = f"cms/{page}/{section}/{uuid.uuid4().hex}-{safe_name}{extension}"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_MEDIA_BUCKET}/{object_path}"

    try:
        ensure_supabase_bucket_exists(SUPABASE_MEDIA_BUCKET)
        file_bytes = file.file.read()
        headers = get_supabase_auth_headers(content_type)
        headers["x-upsert"] = "true"
        response = requests.post(upload_url, data=file_bytes, headers=headers, timeout=20)
        if response.status_code not in [200, 201]:
            upstream_error = response.text or "Unknown storage error"
            if response.status_code in [400, 401, 403, 404, 409, 413, 415]:
                raise HTTPException(status_code=response.status_code, detail=f"Storage upload failed: {upstream_error}")
            raise HTTPException(status_code=502, detail=f"Storage upload failed: {response.status_code} {upstream_error}")

        return {
            "publicUrl": build_supabase_public_url(SUPABASE_MEDIA_BUCKET, object_path),
            "objectPath": object_path,
            "contentType": content_type,
        }
    finally:
        file.file.close()


@app.post("/cms/media/upload")
async def upload_cms_media(
    page: str = Form(...),
    section: str = Form(...),
    file: UploadFile = File(...),
):
    uploaded = upload_supabase_media(file, page, section)
    return {
        "status": "success",
        **uploaded,
    }

def supabase_insert(table: str, data: dict, return_representation: bool = False):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        headers = {
            "apikey":        SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type":  "application/json",
            "Prefer":        "return=representation" if return_representation else "return=minimal",
        }
        res = requests.post(url, json=data, headers=headers, timeout=10)
        if res.status_code in [200, 201]:
            print(f"✓ Saved to Supabase — {table}")
            if return_representation:
                try:
                    return res.json()
                except Exception:
                    return None
            return True
        print(f"⚠ Supabase insert failed: {res.status_code} {res.text}")
        return None
    except Exception as e:
        print(f"⚠ Supabase error: {e}")
        return None

def supabase_select(table: str, order: str = "created_at", desc: bool = True, limit: int = 100):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return []
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        headers = {
            "apikey":        SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        }
        params = {
            "order": f"{order}.{'desc' if desc else 'asc'}",
            "limit": limit,
        }
        res = requests.get(url, headers=headers, params=params, timeout=5)
        if res.status_code == 200:
            return res.json()
        return []
    except Exception as e:
        print(f"⚠ Supabase fetch error: {e}")
        return []

def supabase_update(table: str, id: str, data: dict):
    """Update a record in Supabase by ID (supports UUID and integer IDs)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False, "Supabase not configured"
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{id}"
        headers = {
            "apikey":        SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type":  "application/json",
            "Prefer":        "return=minimal",
        }
        res = requests.patch(url, json=data, headers=headers, timeout=10)
        
        if res.status_code in [200, 204]:
            print(f"✓ Updated {table} (id={id})")
            return True, "Success"
        else:
            error_msg = f"Status {res.status_code}: {res.text}"
            print(f"⚠ Supabase update failed: {error_msg}")
            return False, error_msg
    except Exception as e:
        error_msg = f"Exception: {str(e)}"
        print(f"⚠ Supabase update error: {error_msg}")
        return False, error_msg


def supabase_delete(table: str, id: str):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False, "Supabase not configured"
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{id}"
        headers = {
            "apikey":        SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        }
        res = requests.delete(url, headers=headers, timeout=10)
        if res.status_code in [200, 204]:
            print(f"✓ Deleted {table} (id={id})")
            return True, "Success"
        error_msg = f"Status {res.status_code}: {res.text}"
        print(f"⚠ Supabase delete failed: {error_msg}")
        return False, error_msg
    except Exception as e:
        error_msg = f"Exception: {str(e)}"
        print(f"⚠ Supabase delete error: {error_msg}")
        return False, error_msg


# ── Admin auth helpers ─────────────────────────────────────────
def supabase_get_by_email(table: str, email: str):
    """Fetch a single record from Supabase by email. Returns None or the record."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}?email=eq.{email}"
        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        }
        res = requests.get(url, headers=headers, timeout=8)
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, list) and len(data) > 0:
                return data[0]
        return None
    except Exception as e:
        print(f"⚠ Supabase get_by_email error: {e}")
        return None


def _hash_password(password: str, iterations: int = 100000) -> str:
    """Return a PBKDF2-SHA256 hash string: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>"""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
    return f"pbkdf2_sha256${iterations}${binascii.hexlify(salt).decode()}${binascii.hexlify(dk).decode()}"


def _verify_password(stored: str, password: str) -> bool:
    try:
        parts = stored.split('$')
        if len(parts) != 4 or not parts[0].startswith('pbkdf2_sha256'):
            return False
        iterations = int(parts[1])
        salt = binascii.unhexlify(parts[2])
        expected = binascii.unhexlify(parts[3])
        derived = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
        return hmac.compare_digest(derived, expected)
    except Exception:
        return False


def _require_admin_jwt_secret():
    if not ADMIN_JWT_SECRET:
        raise HTTPException(status_code=503, detail="Admin JWT secret is not configured")


def _create_admin_token(email: str) -> str:
    _require_admin_jwt_secret()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email,
        "role": "admin",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ADMIN_JWT_EXP_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm=ADMIN_JWT_ALGORITHM)


def _decode_admin_token(token: str) -> dict:
    _require_admin_jwt_secret()
    return jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ADMIN_JWT_ALGORITHM])


def _get_admin_email_from_request(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing admin token")

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing admin token")

    try:
        payload = _decode_admin_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid admin token")

    email = str(payload.get("sub") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return email


# ── Admin endpoints ─────────────────────────────────────────────
@app.post('/admin/login')
def admin_login(payload: dict):
    """Authenticate admin using credentials stored in Supabase `admin_accounts` table."""
    email = (payload.get('email') or '').strip().lower()
    password = (payload.get('password') or '')
    if not email or not password:
        raise HTTPException(status_code=400, detail='Missing email or password')

    record = supabase_get_by_email('admin_accounts', email)
    if not record:
        raise HTTPException(status_code=401, detail='Invalid credentials')

    stored_hash = record.get('password_hash') or ''
    if not stored_hash or not _verify_password(stored_hash, password):
        raise HTTPException(status_code=401, detail='Invalid credentials')

    token = _create_admin_token(email)
    return {
        "status": "ok",
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ADMIN_JWT_EXP_MINUTES * 60,
        "admin": {
            "email": email,
        },
    }


@app.post('/admin/account/change-password')
def admin_change_password(request: Request, payload: dict):
    """Change an admin account password.

    Requires a valid admin JWT in Authorization: Bearer <token>.
    Expected payload: {"currentPassword": "...", "newPassword": "..."}
    """
    email = _get_admin_email_from_request(request)
    current = (payload.get('currentPassword') or '')
    new = (payload.get('newPassword') or '')
    if not current or not new:
        raise HTTPException(status_code=400, detail='Missing required fields')

    if current == new:
        raise HTTPException(status_code=400, detail='New password must be different from the current password')

    record = supabase_get_by_email('admin_accounts', email)
    if not record:
        raise HTTPException(status_code=404, detail='Admin account not found')

    stored_hash = record.get('password_hash') or ''
    if not _verify_password(stored_hash, current):
        raise HTTPException(status_code=401, detail='Current password is incorrect')

    new_hash = _hash_password(new)
    rec_id = record.get('id')
    if not rec_id:
        raise HTTPException(status_code=500, detail='Admin record missing id')

    success, msg = supabase_update('admin_accounts', str(rec_id), {'password_hash': new_hash})
    if not success:
        raise HTTPException(status_code=502, detail=f'Failed to update password: {msg}')

    return {"status": "ok"}

@app.get('/admin/account/profile')
def admin_get_profile(request: Request):
    """Get the current admin profile from the database."""
    email = _get_admin_email_from_request(request)
    record = supabase_get_by_email('admin_accounts', email)
    if not record:
        raise HTTPException(status_code=404, detail='Admin account not found')

    return {
        "status": "ok",
        "profile": {
            "email": record.get('email') or email,
            "full_name": record.get('full_name') or '',
            "role": record.get('role') or 'System Administrator',
        },
    }

@app.patch('/admin/account/profile')
def admin_update_profile(request: Request, payload: dict):
    """Update the current admin profile in the database."""
    email = _get_admin_email_from_request(request)
    full_name = (payload.get('full_name') or '').strip()
    if not full_name:
        raise HTTPException(status_code=400, detail='Full name is required')

    record = supabase_get_by_email('admin_accounts', email)
    if not record:
        raise HTTPException(status_code=404, detail='Admin account not found')

    rec_id = record.get('id')
    if not rec_id:
        raise HTTPException(status_code=500, detail='Admin record missing id')

    success, msg = supabase_update('admin_accounts', str(rec_id), {'full_name': full_name})
    if not success:
        raise HTTPException(status_code=502, detail=f'Failed to update profile: {msg}')

    return {
        "status": "ok",
        "profile": {
            "email": record.get('email') or email,
            "full_name": full_name,
            "role": record.get('role') or 'System Administrator',
        },
    }

# ── Paths ─────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")

def load(filename):
    path = os.path.join(MODELS_DIR, filename)
    if os.path.exists(path):
        return joblib.load(path)
    print(f"WARNING: {filename} not found — will use fallback")
    return None

# ── Model 1 ───────────────────────────────────────────────────
m1_scaler   = load("weather_scaler.pkl")
m1_robusta  = load("model_yield_robusta.pkl")
m1_liberica = load("model_yield_liberica.pkl")
m1_excelsa  = load("model_yield_excelsa.pkl")

M1_FEATURES = [
    "rainfall_Q1", "rainfall_Q2", "rainfall_Q3", "rainfall_Q4",
    "temp_Q1",     "temp_Q2",     "temp_Q3",     "temp_Q4",
]

# ── Model 2 ───────────────────────────────────────────────────
m2_scaler   = load("scaler_v2.pkl")
m2_robusta  = load("model_v2_robusta.pkl")
m2_liberica = load("model_v2_liberica.pkl")
m2_excelsa  = load("model_v2_excelsa.pkl")

BARANGAYS = [
    "Banaybanay", "Bucal", "Dagatan", "Halang", "Loma", "Maitim I",
    "Maymangga", "Minantok K", "Pangil", "Barangay I", "Barangay II",
    "Barangay III", "Barangay IV", "Barangay V", "Barangay VI", "Barangay VII",
    "Barangay VIII", "Barangay IX", "Barangay X", "Barangay XI", "Barangay XII",
    "Salaban", "Talon", "Tamacan", "Buho", "Minantok S",
]
COFFEE_TYPES = ["Robusta", "Liberica", "Excelsa"]

W1 = 0.30
W2 = 0.70


# ── Schemas ───────────────────────────────────────────────────
class PredictionInput(BaseModel):
    temperature: float = Field(..., ge=15,  le=35)
    humidity:    float = Field(..., ge=30,  le=100)
    rainfall:    float = Field(..., ge=50,  le=2000)
    area_ha:     float = Field(1.0, ge=0.1, le=500)
    barangay:    str   = Field("Pangil")
    year:        int   = Field(2025)

class CoffeeBreakdown(BaseModel):
    robusta:  float
    liberica: float
    excelsa:  float
    total:    float

class PredictionResponse(BaseModel):
    breakdown:   CoffeeBreakdown
    metrics:     dict
    suitability: str
    confidence:  str
    barangay:    str
    year:        int

class MeetingRequest(BaseModel):
    fullName: str
    contactNumber: str
    email: str
    preferredDate: str
    preferredTime: str
    topic: str
    topicOther: str = ""
    details: str

class MeetingStatusUpdate(BaseModel):
    status: str  # "pending", "approved", "rejected", "completed"
    notes: str = ""


# ── Helpers ───────────────────────────────────────────────────
def _fallback(rainfall, temp):
    t    = 1.0 if 18 <= temp <= 24 else (0.6 if temp < 18 else 0.3)
    r    = 1.0 if 150 <= rainfall <= 300 else (0.6 if rainfall < 150 else 0.4)
    base = (t * 0.5 + r * 0.5) * 5.0
    return {"robusta": base*0.60, "liberica": base*0.25, "excelsa": base*0.15}

def suitability_label(score):
    if score >= 0.75: return "Highly Suitable",     "High"
    if score >= 0.50: return "Moderately Suitable", "Medium"
    if score >= 0.30: return "Marginal",            "Low"
    return "Not Suitable", "Low"

def compute_suitability(temp, hum, rain):
    t = 1.0 if 18 <= temp <= 24 else (0.6 if temp >= 15 else 0.3)
    h = 1.0 if 65 <= hum  <= 85 else (0.7 if hum  >= 55 else 0.4)
    r = 1.0 if 150 <= rain <= 300 else (0.6 if rain >= 100 else 0.3)
    return t * 0.4 + h * 0.3 + r * 0.3

def predict_m1(rainfall, temp):
    inputs   = [rainfall] * 4 + [temp] * 4
    input_df = pd.DataFrame([inputs], columns=M1_FEATURES)
    scaled   = m1_scaler.transform(input_df) if m1_scaler else input_df.values
    out = {}
    for key, model in [("robusta", m1_robusta), ("liberica", m1_liberica), ("excelsa", m1_excelsa)]:
        out[key] = max(0.0, float(model.predict(scaled)[0])) if model else _fallback(rainfall, temp)[key]
    return out

def predict_m2(year, rainfall, temp, humidity, area_ha, barangay):
    out = {}
    for coffee, model in [("Robusta", m2_robusta), ("Liberica", m2_liberica), ("Excelsa", m2_excelsa)]:
        row = {
            "year": year, "annual_rainfall_mm": rainfall,
            "avg_temp_c": temp, "avg_humidity_pct": humidity, "area_ha": area_ha,
        }
        for b in BARANGAYS:
            row[f"barangay_{b}"] = 1 if b == barangay else 0
        for c in COFFEE_TYPES:
            row[f"coffee_type_{c}"] = 1 if c == coffee else 0

        row_df = pd.DataFrame([row])
        if m2_scaler:
            try:
                row_df = row_df[m2_scaler.feature_names_in_]
            except Exception:
                pass
            scaled = m2_scaler.transform(row_df)
        else:
            scaled = row_df.values

        key = coffee.lower()
        out[key] = max(0.0, float(model.predict(scaled)[0])) if model else _fallback(rainfall, temp)[key]
    return out

def run_ensemble(data: PredictionInput):
    """Run both models and return combined result."""
    m1 = predict_m1(data.rainfall, data.temperature)
    m2 = predict_m2(data.year, data.rainfall, data.temperature,
                    data.humidity, data.area_ha, data.barangay)
    combined = {
        key: round(W1 * m1[key] + W2 * m2[key], 4)
        for key in ["robusta", "liberica", "excelsa"]
    }
    total      = round(sum(combined.values()), 4)
    score      = compute_suitability(data.temperature, data.humidity, data.rainfall)
    suit, conf = suitability_label(score)
    return combined, total, score, suit, conf





METRICS = {
    "robusta":  {"mae": round(0.3428*W1+3.1127*W2,4), "rmse": round(0.3429*W1+5.4507*W2,4), "r2": round(0.7477*W1+0.9837*W2,4), "smape": round(65.33*W1+12.15*W2,2)},
    "liberica": {"mae": round(0.0128*W1+2.1398*W2,4), "rmse": round(0.0130*W1+3.6131*W2,4), "r2": round(0.9288*W1+0.9756*W2,4), "smape": round(165.66*W1+12.15*W2,2)},
    "excelsa":  {"mae": round(0.0085*W1+2.4768*W2,4), "rmse": round(0.0085*W1+4.3820*W2,4), "r2": round(0.8965*W1+0.9725*W2,4), "smape": round(39.78*W1+14.64*W2,2)},
}


# ── Endpoints ─────────────────────────────────────────────────
@app.get("/")
def health():
    return {
        "status": "ok",
        "model_1_loaded":    all([m1_scaler, m1_robusta, m1_liberica, m1_excelsa]),
        "model_2_loaded":    all([m2_scaler, m2_robusta, m2_liberica, m2_excelsa]),
        "supabase_connected": supabase_ok,
        "ensemble_weights":  {"model_1": W1, "model_2": W2},
    }


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    try:
        body = await request.body()
        print("\n=== Request Validation Error ===")
        print(f"Path: {request.url.path}")
        print(f"Body: {body.decode('utf-8', errors='replace')}")
        print(f"Errors: {exc.errors()}")
    except Exception as e:
        print(f"⚠ Failed to log request body for validation error: {e}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

@app.get("/barangays")
def get_barangays():
    return {"barangays": BARANGAYS}

@app.get("/dashboard")
def get_dashboard():
    logs = supabase_select("prediction_logs", limit=100)
    total_prod = round(sum(r.get("m2_total_mt", 0) or 0 for r in logs), 3)
    high_conf  = sum(1 for r in logs if r.get("confidence") == "High")
    return {
        "total_runs":       len(logs),
        "total_production": total_prod,
        "high_confidence":  high_conf,
        "recent_logs":      logs,
    }


@app.get("/predictions/over-time")
def get_predictions_over_time():
    """Predictions Over Time — count of predictions per day, grouped into time series."""
    logs = supabase_select("prediction_logs", order="created_at", desc=False, limit=500)
    
    # Group by date (YYYY-MM-DD)
    from collections import defaultdict
    from datetime import datetime
    
    predictions_by_date = defaultdict(int)
    for log in logs:
        if log.get("created_at"):
            try:
                # Parse ISO format date and extract YYYY-MM-DD
                date_str = log["created_at"][:10]
                predictions_by_date[date_str] += 1
            except Exception:
                continue
    
    # Sort by date
    sorted_dates = sorted(predictions_by_date.keys())
    data_points = [
        {"date": date, "count": predictions_by_date[date]}
        for date in sorted_dates
    ]
    
    return {
        "title": "Predictions Over Time",
        "data": data_points,
        "total": len(logs),
    }


@app.get("/predictions/by-category")
def get_predictions_by_category():
    """Prediction Distribution — count of predictions per coffee category (Robusta, Liberica, Excelsa)."""
    logs = supabase_select("prediction_logs", limit=500)
    
    # Initialize all 3 coffee categories with 0 count to ensure they're always included
    category_counts = {
        "Robusta": 0,
        "Excelsa": 0,
        "Liberica": 0,
    }
    
    for log in logs:
        robusta = float(log.get("m2_robusta_mt") or 0)
        liberica = float(log.get("m2_liberica_mt") or 0)
        excelsa = float(log.get("m2_excelsa_mt") or 0)
        
        # Determine dominant category
        max_val = max(robusta, liberica, excelsa)
        if max_val <= 0:
            continue
        
        if robusta == max_val:
            category_counts["Robusta"] += 1
        elif liberica == max_val:
            category_counts["Liberica"] += 1
        else:
            category_counts["Excelsa"] += 1
    
    # Return categories in a consistent order: Robusta, Excelsa, Liberica
    data = [
        {"category": "Robusta", "count": category_counts["Robusta"]},
        {"category": "Excelsa", "count": category_counts["Excelsa"]},
        {"category": "Liberica", "count": category_counts["Liberica"]},
    ]
    
    return {
        "title": "Prediction Distribution by Category",
        "data": data,
        "total": len(logs),
    }


@app.get("/predictions/by-location")
def get_predictions_by_location():
    """Barangay/Location-Based Predictions — count of predictions grouped by barangay."""
    logs = supabase_select("prediction_logs", limit=500)
    
    from collections import defaultdict
    
    location_counts = defaultdict(int)
    for log in logs:
        barangay = log.get("barangay_name") or "Unknown"
        location_counts[barangay] += 1
    
    # Sort by count (descending) and then by name
    data = [
        {"location": loc, "count": count}
        for loc, count in sorted(location_counts.items(), key=lambda x: (-x[1], x[0]))
    ]
    
    return {
        "title": "Predictions by Barangay",
        "data": data,
        "total": len(logs),
    }


@app.get("/consolidated-data")
def get_consolidated_data():
    rows = supabase_select("consolidated_data", order="created_at", desc=False, limit=1000)
    return {"data": rows}


@app.post("/consolidated-data/sync")
def sync_consolidated_data(payload: dict):
    rows = payload.get("rows", [])
    saved_rows = []
    errors = []

    for row in rows:
        row_payload = {
            "commodity":      row.get("commodity", ""),
            "barangay":       row.get("barangay", ""),
            "area_planted":   float(row.get("area_planted", 0) or 0),
            "area_harvested": float(row.get("area_harvested", 0) or 0),
            "production":     float(row.get("production", 0) or 0),
            "notes":          str(row.get("notes", "")),
        }
        db_id = row.get("dbId") or row.get("id")

        if db_id:
            success, error_msg = supabase_update("consolidated_data", str(db_id), row_payload)
            if success:
                saved_rows.append({"id": db_id, **row_payload})
            else:
                errors.append({"row": row, "error": error_msg})
        else:
            inserted = supabase_insert("consolidated_data", row_payload, return_representation=True)
            if inserted:
                if isinstance(inserted, list) and inserted:
                    saved_rows.append(inserted[0])
                elif isinstance(inserted, dict):
                    saved_rows.append(inserted)
                else:
                    errors.append({"row": row, "error": "Insert returned unexpected response"})
            else:
                errors.append({"row": row, "error": "Insert failed"})

    result = {"data": saved_rows}
    if errors:
        result["errors"] = errors
    return result


@app.delete("/consolidated-data/{row_id}")
def delete_consolidated_data_row(row_id: str):
    success, error_msg = supabase_delete("consolidated_data", row_id)
    if not success:
        raise HTTPException(status_code=502, detail=f"Failed to delete consolidated_data row: {error_msg}")
    return {"status": "success", "deleted_id": row_id}


@app.post("/predict", response_model=PredictionResponse)
def predict(data: PredictionInput):
    """Admin endpoint — runs prediction AND saves to Supabase."""
    combined, total, score, suit, conf = run_ensemble(data)

    # ✅ Save to database
    supabase_insert("prediction_logs", {
        "barangay_name":      data.barangay,
        "temperature_c":      data.temperature,
        "humidity_pct":       data.humidity,
        "annual_rainfall_mm": data.rainfall,
        "area_ha":            data.area_ha,
        "year":               data.year,
        "m2_robusta_mt":      combined["robusta"],
        "m2_liberica_mt":     combined["liberica"],
        "m2_excelsa_mt":      combined["excelsa"],
        "m2_total_mt":        total,
        "suitability_score":  round(score, 3),
        "suitability_label":  suit,
        "confidence":         conf,
    })

    return PredictionResponse(
        breakdown=CoffeeBreakdown(
            robusta=combined["robusta"],
            liberica=combined["liberica"],
            excelsa=combined["excelsa"],
            total=total,
        ),
        metrics=METRICS,
        suitability=suit,
        confidence=conf,
        barangay=data.barangay,
        year=data.year,
    )

@app.post("/predict-public", response_model=PredictionResponse)
def predict_public(data: PredictionInput):
    """Public endpoint — runs prediction but does NOT save to database."""
    combined, total, score, suit, conf = run_ensemble(data)

    # ❌ No database save — public/user use only

    return PredictionResponse(
        breakdown=CoffeeBreakdown(
            robusta=combined["robusta"],
            liberica=combined["liberica"],
            excelsa=combined["excelsa"],
            total=total,
        ),
        metrics=METRICS,
        suitability=suit,
        confidence=conf,
        barangay=data.barangay,
        year=data.year,
    )


# ── Email helper ──────────────────────────────────────────────
def send_email_notification(meeting: MeetingRequest):
    """Send email notification to admin and confirmation to user."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("SENDER_PASSWORD")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@amadeocoffee.ph")
    
    if not all([sender_email, sender_password]):
        print("⚠ Email credentials not configured — skipping email")
        return
    
    try:
        # Admin notification email
        admin_subject = f"New Meeting Request from {meeting.fullName}"
        admin_body = f"""
New meeting request received:

Name: {meeting.fullName}
Contact: {meeting.contactNumber}
Email: {meeting.email}
Preferred Date: {meeting.preferredDate}
Preferred Time: {meeting.preferredTime}
Topic: {meeting.topic}
{f"Other Topic: {meeting.topicOther}" if meeting.topicOther else ""}
Details: {meeting.details}

Please log in to the admin dashboard to manage this request.
"""
        
        # User confirmation email
        user_subject = "Meeting Request Confirmed - Amadeo Coffee"
        user_body = f"""
Hi {meeting.fullName},

Thank you for submitting your meeting request. We have received your request with the following details:

Preferred Date: {meeting.preferredDate}
Preferred Time: {meeting.preferredTime}
Topic: {meeting.topic}

Our team will review your request and get back to you shortly at {meeting.email}.

Best regards,
Amadeo Coffee Team
"""
        
        # Send both emails
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        
        # Admin email
        admin_msg = MIMEMultipart()
        admin_msg["From"] = sender_email
        admin_msg["To"] = admin_email
        admin_msg["Subject"] = admin_subject
        admin_msg.attach(MIMEText(admin_body, "plain"))
        server.send_message(admin_msg)
        print(f"✓ Admin notification sent to {admin_email}")
        
        # User confirmation
        user_msg = MIMEMultipart()
        user_msg["From"] = sender_email
        user_msg["To"] = meeting.email
        user_msg["Subject"] = user_subject
        user_msg.attach(MIMEText(user_body, "plain"))
        server.send_message(user_msg)
        print(f"✓ Confirmation sent to {meeting.email}")
        
        server.quit()
    except Exception as e:
        print(f"⚠ Email send failed: {e}")


def send_status_update_email(user_email: str, user_name: str, new_status: str, notes: str = ""):
    """Send email to user when meeting request status changes."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("SENDER_PASSWORD")
    
    if not all([sender_email, sender_password]):
        print("⚠ Email credentials not configured — skipping email")
        return
    
    # Map status to message
    status_messages = {
        "approved": {
            "subject": "Meeting Request Approved - Amadeo Coffee",
            "greeting": "Great news!",
            "message": "Your meeting request has been approved. Our team will contact you shortly to confirm the meeting details."
        },
        "rejected": {
            "subject": "Meeting Request Update - Amadeo Coffee",
            "greeting": "Thank you for your interest.",
            "message": "Unfortunately, we are unable to accommodate your meeting request at this time. Please feel free to submit another request in the future."
        },
        "completed": {
            "subject": "Meeting Completed - Amadeo Coffee",
            "greeting": "Thank you for meeting with us!",
            "message": "We hope you had a productive meeting. If you have any follow-up questions, please don't hesitate to reach out."
        }
    }
    
    if new_status not in status_messages:
        return
    
    msg_template = status_messages[new_status]
    
    try:
        subject = msg_template["subject"]
        body = f"""
Hi {user_name},

{msg_template["greeting"]}

{msg_template["message"]}

{f"Admin Notes: {notes}" if notes else ""}

Best regards,
Amadeo Coffee Team
"""
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        
        msg = MIMEMultipart()
        msg["From"] = sender_email
        msg["To"] = user_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        server.send_message(msg)
        print(f"✓ Status update email sent to {user_email}")
        
        server.quit()
    except Exception as e:
        print(f"⚠ Email send failed: {e}")



# ── Meeting Request Endpoints ─────────────────────────────────
@app.post("/meeting-request")
def create_meeting_request(meeting: MeetingRequest):
    """Submit a meeting request and save to Supabase."""
    # Save to Supabase with default pending status
    supabase_insert("meeting_requests", {
        "full_name": meeting.fullName,
        "contact_number": meeting.contactNumber,
        "email": meeting.email,
        "preferred_date": meeting.preferredDate,
        "preferred_time": meeting.preferredTime,
        "topic": meeting.topic,
        "topic_other": meeting.topicOther,
        "details": meeting.details,
        "status": "pending",
        "notes": "",
    })
    
    # Send email notifications
    send_email_notification(meeting)
    
    return {
        "status": "success",
        "message": "Meeting request submitted successfully",
        "data": meeting.dict()
    }


@app.get("/meeting-requests")
def get_meeting_requests():
    """Fetch all meeting requests (admin only)."""
    requests = supabase_select("meeting_requests", order="created_at", desc=True, limit=100)
    return {
        "total": len(requests),
        "requests": requests
    }


@app.put("/meeting-request/{request_id}")
def update_meeting_request_status(request_id: str, update: MeetingStatusUpdate):
    """Update meeting request status and send email to user."""
    print(f"🔍 DEBUG: Received PUT request for ID: {request_id}, Status: {update.status}")
    
    # Fetch the request first to get user details
    requests_list = supabase_select("meeting_requests", order="created_at", desc=False, limit=1000)
    meeting_data = None
    
    for req in requests_list:
        if req.get("id") == request_id:
            meeting_data = req
            break
    
    if not meeting_data:
        print(f"⚠ DEBUG: Meeting request not found for ID: {request_id}")
        return {
            "status": "error",
            "message": f"Meeting request with ID {request_id} not found"
        }
    
    print(f"✓ DEBUG: Found meeting data, updating...")
    # Update status in database
    success, error_msg = supabase_update("meeting_requests", request_id, {
        "status": update.status,
        "notes": update.notes,
    })
    print(f"🔍 DEBUG: Update result - Success: {success}, Error: {error_msg}")
    
    if not success:
        return {
            "status": "error",
            "message": f"Failed to update meeting request: {error_msg}"
        }
    
    # Send status update email to user
    send_status_update_email(
        user_email=meeting_data.get("email"),
        user_name=meeting_data.get("full_name"),
        new_status=update.status,
        notes=update.notes
    )
    
    return {
        "status": "success",
        "message": f"Meeting request status updated to {update.status}",
        "data": {
            "id": request_id,
            "new_status": update.status
        }
    }


# ── CMS Content Management ────────────────────────────────────
class CMSContent(BaseModel):
    page: str
    section: str
    key: str
    value: str

# ── In-memory CMS storage (fallback if Supabase not configured) ────
cms_storage = {}

class CMSUpdate(BaseModel):
    hero: dict = Field(default_factory=dict)
    about: dict = Field(default_factory=dict)
    varieties: dict = Field(default_factory=dict)
    meeting: dict = Field(default_factory=dict)
    main: dict = Field(default_factory=dict)
    mission: dict = Field(default_factory=dict)
    vision: dict = Field(default_factory=dict)

@app.get("/cms/page/{page}")
def get_cms_page_content(page: str):
    """Get CMS content for a specific page. Falls back to memory if Supabase unavailable."""
    try:
        print(f"\n=== CMS FETCH REQUEST ===")
        print(f"Page: {page}")
        
        # Try Supabase first
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                url = f"{SUPABASE_URL}/rest/v1/cms_content?page=eq.{page}"
                headers = {
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                }
                res = requests.get(url, headers=headers, timeout=5)
                print(f"Query URL: {url}")
                print(f"Response status: {res.status_code}")
                
                if res.status_code == 200:
                    content_list = res.json()
                    print(f"Records found: {len(content_list)}")
                    print(f"Raw data: {content_list}")
                    
                    # Convert to nested structure: {section: {key: value}}
                    content = {}
                    for item in content_list:
                        section = item.get("section", "general")
                        title = item.get("title", "")
                        body = item.get("body", "")
                        if section not in content:
                            content[section] = {}
                        content[section][title] = body
                    
                    print(f"Nested structure: {content}")
                    print(f"✓ CMS fetch complete from Supabase\n")
                    return {"content": content}
            except Exception as e:
                print(f"⚠ Supabase fetch failed: {e}, falling back to memory")
        
        # Fallback to in-memory storage
        if page in cms_storage:
            print(f"✓ CMS fetch complete from memory\n")
            return {"content": cms_storage[page]}
        
        print(f"✓ No CMS content found, returning empty\n")
        return {"content": {}}
        
    except Exception as e:
        print(f"⚠ CMS fetch error: {e}")
        import traceback
        traceback.print_exc()
        return {"content": {}}

@app.post("/cms/page/{page}")
def update_cms_page_content(page: str, updates: dict):
    """Update CMS content. Saves to Supabase if configured, otherwise to memory."""
    try:
        print(f"\n=== CMS UPDATE REQUEST ===")
        print(f"Page: {page}")
        print(f"Updates received: {updates}")
        
        saved_location = "memory"
        
        # Try Supabase if configured
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                print("Attempting to save to Supabase...")
                saved_count = 0
                for section, items in updates.items():
                    print(f"\nProcessing section: {section}")
                    print(f"Items: {items}")
                    
                    if not isinstance(items, dict):
                        print(f"  ⚠ Skipping - not a dict")
                        continue
                        
                    for key, value in items.items():
                        print(f"  Key: {key}, Value: {value}")
                        
                        # Check if record exists
                        check_url = f"{SUPABASE_URL}/rest/v1/cms_content?page=eq.{page}&section=eq.{section}&title=eq.{key}"
                        check_headers = {
                            "apikey": SUPABASE_SERVICE_KEY,
                            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                        }
                        check_res = requests.get(check_url, headers=check_headers, timeout=5)
                        print(f"    Check status: {check_res.status_code}")
                        
                        if check_res.status_code == 200 and len(check_res.json()) > 0:
                            # Update existing
                            existing = check_res.json()[0]
                            record_id = existing.get("id")
                            print(f"    → Updating existing record (id: {record_id})")
                            update_url = f"{SUPABASE_URL}/rest/v1/cms_content?id=eq.{record_id}"
                            update_headers = {
                                "apikey": SUPABASE_SERVICE_KEY,
                                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                                "Content-Type": "application/json",
                                "Prefer": "return=minimal",
                            }
                            update_res = requests.patch(update_url, json={"body": str(value)}, headers=update_headers, timeout=5)
                            print(f"    Update status: {update_res.status_code}")
                            saved_count += 1
                        else:
                            # Insert new
                            print(f"    → Creating new record")
                            insert_url = f"{SUPABASE_URL}/rest/v1/cms_content"
                            insert_headers = {
                                "apikey": SUPABASE_SERVICE_KEY,
                                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                                "Content-Type": "application/json",
                                "Prefer": "return=minimal",
                            }
                            insert_res = requests.post(insert_url, json={
                                "page": page,
                                "section": section,
                                "title": str(key),
                                "body": str(value)
                            }, headers=insert_headers, timeout=5)
                            print(f"    Insert status: {insert_res.status_code}")
                            if insert_res.status_code not in [200, 201]:
                                print(f"    Error response: {insert_res.text}")
                            saved_count += 1
                
                print(f"\n✓ Supabase save complete - {saved_count} records saved\n")
                saved_location = "Supabase"
            except Exception as e:
                print(f"⚠ Supabase save failed: {e}, falling back to memory\n")
        
        # Always save to memory as backup
        cms_storage[page] = updates
        print(f"✓ Also saved to memory storage")
        
        return {
            "status": "success",
            "message": f"CMS content updated (saved to {saved_location})"
        }
        
    except Exception as e:
        print(f"⚠ CMS update error: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

