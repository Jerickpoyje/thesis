"""
FastAPI backend — Amadeo Coffee Production Prediction
=====================================================
Ensemble approach: Model 1 (30%) + Model 2 (70%)

Two predict endpoints:
  POST /predict        → saves to Supabase (admin use)
  POST /predict-public → does NOT save (user/public use)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import numpy as np
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Amadeo Coffee Prediction API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase config ───────────────────────────────────────────
SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def supabase_insert(table: str, data: dict):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        headers = {
            "apikey":        SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type":  "application/json",
            "Prefer":        "return=minimal",
        }
        res = requests.post(url, json=data, headers=headers, timeout=5)
        if res.status_code in [200, 201]:
            print(f"✓ Saved to Supabase — {table}")
        else:
            print(f"⚠ Supabase insert failed: {res.status_code} {res.text}")
    except Exception as e:
        print(f"⚠ Supabase error: {e}")

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
        res = requests.patch(url, json=data, headers=headers, timeout=5)
        
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

supabase_ok = bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)
print(f"{'✓ Supabase configured' if supabase_ok else '⚠ Supabase not configured'}")

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

