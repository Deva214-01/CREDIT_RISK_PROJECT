from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.responses import FileResponse


# =========================================================
# PROJECT PATH
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

MODEL_PATH = BASE_DIR / "credit_risk_model.pkl"
THRESHOLD_PATH = BASE_DIR / "best_threshold.pkl"


# =========================================================
# ML MODEL STORAGE
# =========================================================

ml_model = {}


# =========================================================
# LOAD MODEL
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Loading ML model...")

    ml_model["model"] = joblib.load(MODEL_PATH)
    ml_model["threshold"] = joblib.load(THRESHOLD_PATH)

    print("Model loaded successfully.")
    print("Threshold:", ml_model["threshold"])
    print("Static directory:", STATIC_DIR)
    print("Static exists:", STATIC_DIR.exists())

    yield

    ml_model.clear()


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="CreditShield AI",
    description="AI-powered Credit Risk Prediction API",
    version="1.0.0",
    lifespan=lifespan
)


# =========================================================
# INPUT MODEL
# =========================================================

class LoanApplication(BaseModel):

    person_age: int
    person_income: float
    person_home_ownership: str
    person_emp_length: float
    loan_intent: str
    loan_grade: str
    loan_amnt: float
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str
    cb_person_cred_hist_length: int


# =========================================================
# PREDICTION API
# =========================================================

@app.post("/predict")
def predict(data: LoanApplication):

    input_df = pd.DataFrame([data.model_dump()])

    probability = float(
        ml_model["model"].predict_proba(input_df)[0][1]
    )

    threshold = float(
        ml_model["threshold"]
    )

    prediction = int(probability >= threshold)

    return {
        "default_probability": probability,
        "default_prediction": prediction,
        "threshold": threshold,
        "Result": (
            "High Risk"
            if prediction == 1
            else "Low Risk"
        )
    }


# Serve frontend
@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")


# Serve CSS, JS and other static assets
app.mount(
    "/static",
    StaticFiles(directory=str(STATIC_DIR)),
    name="static"
)