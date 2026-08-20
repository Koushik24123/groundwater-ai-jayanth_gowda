import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "models" / "best_model.pkl"
MODEL_META_PATH = PROJECT_ROOT / "models" / "best_model_meta.json"


@lru_cache(maxsize=1)
def load_model_bundle() -> Dict[str, Any]:
    """Load the saved model and its metadata once and cache the result."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
    if not MODEL_META_PATH.exists():
        raise FileNotFoundError(f"Model metadata file not found: {MODEL_META_PATH}")

    with MODEL_META_PATH.open("r", encoding="utf-8") as fh:
        metadata = json.load(fh)

    model = joblib.load(MODEL_PATH)
    feature_names = metadata.get("features")

    if not isinstance(feature_names, list) or not feature_names:
        raise ValueError("Model metadata does not contain a valid 'features' list.")

    model_feature_names = list(getattr(model, "feature_names_in_", []))
    if model_feature_names and list(model_feature_names) != feature_names:
        raise ValueError(
            "Model metadata feature order does not match the loaded model feature order. "
            f"Metadata: {feature_names}. Model: {model_feature_names}."
        )

    model_name = metadata.get("model_name") or "Unknown model"
    return {"model": model, "model_name": model_name, "features": feature_names}


@lru_cache(maxsize=1)
def get_model_features() -> List[str]:
    """Return the exact input feature order required by the trained model."""
    return load_model_bundle()["features"]


@lru_cache(maxsize=1)
def get_model_name() -> str:
    """Return the saved model name from metadata."""
    return load_model_bundle()["model_name"]


def predict_groundwater_level(raw_features: Dict[str, Any]) -> float:
    """Validate feature keys, order values, and run a prediction using the saved model."""
    bundle = load_model_bundle()
    model = bundle["model"]
    feature_names = bundle["features"]

    missing = [name for name in feature_names if name not in raw_features]
    if missing:
        raise KeyError(f"Missing required prediction features: {missing}")

    ordered_values = []
    for name in feature_names:
        value = raw_features.get(name)
        if value is None or value == "":
            raise ValueError(f"Feature '{name}' cannot be empty.")
        try:
            ordered_values.append(float(value))
        except (TypeError, ValueError):
            raise ValueError(f"Feature '{name}' must be numeric.")

    model_input = np.asarray([ordered_values], dtype=float)
    prediction = model.predict(model_input)
    if prediction.size == 0:
        raise RuntimeError("Model produced an empty prediction output.")

    return float(prediction[0])
