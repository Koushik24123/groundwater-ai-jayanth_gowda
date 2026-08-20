from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
EXPLAINABILITY_DIR = PROJECT_ROOT / "outputs" / "explainability"
FEATURE_IMPORTANCE_PATH = EXPLAINABILITY_DIR / "feature_importance.csv"
PERMUTATION_IMPORTANCE_PATH = EXPLAINABILITY_DIR / "permutation_importance.csv"
SHAP_IMAGE_FILES = [
    "shap_bar.png",
    "shap_summary.png",
    "shap_waterfall.png",
]


@lru_cache(maxsize=1)
def load_feature_importance() -> pd.DataFrame:
    """Load the saved coefficient-based feature importance CSV generated in Notebook 11."""
    if not FEATURE_IMPORTANCE_PATH.exists():
        raise FileNotFoundError(
            f"Feature importance artifact not found: {FEATURE_IMPORTANCE_PATH}"
        )

    df = pd.read_csv(FEATURE_IMPORTANCE_PATH)
    required = ["Feature", "Coefficient", "Abs_Coefficient"]
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(
            "Feature importance file is missing required columns: " + ", ".join(missing)
        )
    return df.copy()


@lru_cache(maxsize=1)
def load_permutation_importance() -> pd.DataFrame:
    """Load the saved permutation importance CSV generated in Notebook 11."""
    if not PERMUTATION_IMPORTANCE_PATH.exists():
        raise FileNotFoundError(
            f"Permutation importance artifact not found: {PERMUTATION_IMPORTANCE_PATH}"
        )

    df = pd.read_csv(PERMUTATION_IMPORTANCE_PATH)
    required = ["Feature", "Importance_Mean", "Importance_STD"]
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(
            "Permutation importance file is missing required columns: " + ", ".join(missing)
        )
    return df.copy()


def get_explainability_summary() -> Dict[str, Any]:
    """Return a concise summary of the explainability artifacts available in the project."""
    methods = ["coefficient_importance", "permutation_importance"]
    shap_available = all((EXPLAINABILITY_DIR / name).exists() for name in SHAP_IMAGE_FILES)
    if shap_available:
        methods.append("shap_visuals")

    feature_df = load_feature_importance()
    permutation_df = load_permutation_importance()

    top_by_coef = feature_df.sort_values("Abs_Coefficient", ascending=False).head(5)
    top_by_perm = permutation_df.sort_values("Importance_Mean", ascending=False).head(5)

    return {
        "model_name": "Linear Regression",
        "available_methods": methods,
        "feature_count": int(len(feature_df)),
        "coefficient_result_count": int(len(feature_df)),
        "permutation_result_count": int(len(permutation_df)),
        "top_features_by_abs_coefficient": [
            {
                "feature": row["Feature"],
                "coefficient": float(row["Coefficient"]),
                "abs_coefficient": float(row["Abs_Coefficient"]),
            }
            for _, row in top_by_coef.iterrows()
        ],
        "top_features_by_permutation_importance": [
            {
                "feature": row["Feature"],
                "importance_mean": float(row["Importance_Mean"]),
                "importance_std": float(row["Importance_STD"]),
            }
            for _, row in top_by_perm.iterrows()
        ],
        "shap_images_available": SHAP_IMAGE_FILES if shap_available else [],
        "interpretation_note": "Feature importance reflects model influence within the trained Linear Regression model; it is not proof of physical causation.",
    }


def get_feature_importance_results() -> List[Dict[str, Any]]:
    """Return the actual coefficient-based feature importance results as structured data."""
    df = load_feature_importance()
    return [
        {
            "feature": row["Feature"],
            "coefficient": float(row["Coefficient"]),
            "abs_coefficient": float(row["Abs_Coefficient"]),
        }
        for _, row in df.sort_values("Abs_Coefficient", ascending=False).iterrows()
    ]


def get_permutation_importance_results() -> List[Dict[str, Any]]:
    """Return the actual permutation importance results as structured data."""
    df = load_permutation_importance()
    return [
        {
            "feature": row["Feature"],
            "importance_mean": float(row["Importance_Mean"]),
            "importance_std": float(row["Importance_STD"]),
        }
        for _, row in df.sort_values("Importance_Mean", ascending=False).iterrows()
    ]
