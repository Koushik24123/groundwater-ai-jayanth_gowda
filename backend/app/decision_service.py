"""Decision-support interpretations built on saved model outputs and recharge artifacts.

This module does not retrain models or change the notebook methodology. It translates
existing numeric results into condition labels, reasons, and recommended actions.
"""
from typing import Any, Dict, List, Optional

from backend.app.explainability_service import get_permutation_importance_results
from backend.app.recharge_service import get_recharge_stations, get_recharge_summary, get_station_recharge
from backend.app.station_service import get_station_catalog, get_station_record

NORMAL_THRESHOLD = -15.0
MODERATE_THRESHOLD = -30.0

FEATURE_GROUPS = {
    "Historical groundwater trend": ["Lag_1", "Lag_4", "Lag_28", "RollingMean_4", "RollingStd_4"],
    "Seasonal variation": ["Month", "Month_sin", "Month_cos", "Quarter", "WeekOfYear", "Year"],
    "Elevation": ["RL_MSL"],
    "Station location": ["Latitude", "Longitude", "Station_ID"],
}


def classify_condition(level: float) -> Dict[str, Any]:
    """Map a groundwater level (metres, more negative = deeper) to a user-facing status."""
    if level >= NORMAL_THRESHOLD:
        return {
            "label": "Normal",
            "level": "normal",
            "interpretation": (
                "The groundwater level is relatively shallow compared with Bengaluru stations "
                "in this project dataset. Conditions appear manageable, but routine monitoring "
                "should continue."
            ),
        }
    if level >= MODERATE_THRESHOLD:
        return {
            "label": "Moderate",
            "level": "moderate",
            "interpretation": (
                "The groundwater level is at an intermediate depth. Conservation, leakage control, "
                "and continued monitoring are advisable, and recharge options should be reviewed."
            ),
        }
    return {
        "label": "Critical",
        "level": "critical",
        "interpretation": (
            "The groundwater level is deep relative to the project dataset. Depletion pressure is "
            "high. Demand management and a site-specific recharge review should be treated as priorities."
        ),
    }


def condition_color(label: str) -> str:
    mapping = {"Normal": "green", "Moderate": "yellow", "Critical": "red"}
    return mapping.get(label, "yellow")


def assess_confidence(features: Dict[str, float], is_extrapolated: bool) -> Dict[str, str]:
    rolling_std = float(features.get("RollingStd_4") or 0.0)
    if is_extrapolated:
        return {
            "label": "Medium",
            "note": (
                "This estimate uses the latest station history with a later date, so it is an "
                "extrapolation. Linear regression does not produce a calibrated probability interval."
            ),
        }
    if rolling_std < 1.0:
        return {
            "label": "High",
            "note": (
                "Recent readings at this station are relatively steady, which supports a more stable "
                "estimate. This is not a statistical confidence interval."
            ),
        }
    if rolling_std < 5.0:
        return {
            "label": "Medium",
            "note": (
                "Recent readings show moderate short-term variation. Treat the predicted level as an "
                "indicative estimate rather than a precise measurement."
            ),
        }
    return {
        "label": "Low",
        "note": (
            "Recent readings fluctuate strongly, so the estimate is more uncertain. Confirm with "
            "the latest observed telemetry before taking operational decisions."
        ),
    }


def _plain_group_details(station: Dict[str, Any], features: Dict[str, float]) -> Dict[str, str]:
    return {
        "Historical groundwater trend": (
            f"The model is driven mainly by recent groundwater readings. The latest lag value is "
            f"{features['Lag_1']:.2f} m and the 4-period rolling mean is {features['RollingMean_4']:.2f} m."
        ),
        "Seasonal variation": (
            "Calendar month, quarter, and seasonal cycles are included because groundwater in this "
            "dataset varies through the year."
        ),
        "Elevation": (
            f"Station elevation (RL_MSL) is {station['rl_msl']:.0f} m above mean sea level and is used "
            "as a terrain-related input, not as a soil or geology survey."
        ),
        "Station location": (
            f"{station['station']} is located at {station['latitude']:.4f}° N, {station['longitude']:.4f}° E. "
            "Location helps the model distinguish station-specific behaviour."
        ),
    }


def build_prediction_reasons(station: Dict[str, Any], features: Dict[str, float]) -> List[Dict[str, str]]:
    importance = {row["feature"]: row["importance_mean"] for row in get_permutation_importance_results()}
    details = _plain_group_details(station, features)
    scored = []
    for title, feature_names in FEATURE_GROUPS.items():
        weight = sum(importance.get(name, 0.0) for name in feature_names)
        scored.append((weight, title, details[title]))
    scored.sort(reverse=True)
    return [{"title": title, "detail": detail} for _, title, detail in scored]


def _recharge_reasons(record: Dict[str, Any]) -> List[str]:
    avg_depth = record.get("Avg_Depth")
    slope = record.get("Depth_Trend_Slope") or 0.0
    fluctuation = record.get("Fluctuation_Combined") or 0.0
    rl_score = record.get("RL_MSL_Score") or 0.0
    reasons = []

    if avg_depth is not None:
        if avg_depth <= MODERATE_THRESHOLD:
            reasons.append(
                f"Average observed groundwater is {avg_depth:.1f} m, which is deep relative to other "
                "project stations and increases the need to manage extraction and consider recharge."
            )
        elif avg_depth <= NORMAL_THRESHOLD:
            reasons.append(
                f"Average observed groundwater is {avg_depth:.1f} m. Depth is intermediate, so recharge "
                "can still help but should be paired with conservation."
            )
        else:
            reasons.append(
                f"Average observed groundwater is {avg_depth:.1f} m, which is comparatively shallow in "
                "this dataset. Recharge may still be useful where soils and land use allow infiltration."
            )

    if fluctuation >= 40:
        reasons.append(
            "Water levels at this station vary more than many others, which the project method treats "
            "as a sign that the local system responds to inflows and may accept recharge."
        )
    else:
        reasons.append(
            "Level fluctuation is relatively modest, so infiltration structures should be sized and "
            "sited only after local investigation."
        )

    if slope > 0:
        reasons.append(
            "The long-term fitted trend in the recharge notebook is positive, which that method treats "
            "as depletion-oriented pressure and a higher recharge priority."
        )
    elif slope < 0:
        reasons.append(
            "The long-term fitted trend is negative. Recent station history should still be checked, "
            "because short-term decline can occur even when the fitted slope is small."
        )

    if rl_score >= 60:
        reasons.append(
            "Elevation is used only as a weak terrain proxy (10% of the score) because soil, land use, "
            "and aquifer tests are not in the dataset."
        )

    reasons.append(
        "The category is assigned from tertiles of the project score (depth 40%, fluctuation 30%, "
        "trend 20%, elevation proxy 10%). It is relative potential, not measured recharge volume."
    )
    return reasons


def _recommendations(category: str, condition_label: str, trend_label: str) -> List[Dict[str, str]]:
    items: List[Dict[str, str]] = []
    high = category.startswith("High")
    medium = category.startswith("Medium")

    if high:
        items.extend(
            [
                {
                    "title": "Rainwater harvesting",
                    "detail": "Prioritise rooftop and campus rainwater harvesting so monsoon runoff is captured close to where it falls.",
                },
                {
                    "title": "Recharge pits and trenches",
                    "detail": "Consider recharge pits or contour trenches in unpaved, landscaped, or park areas after a basic infiltration check.",
                },
                {
                    "title": "Recharge wells",
                    "detail": "Recharge wells may be appropriate where depth to water and local soils allow; they should follow a site investigation.",
                },
            ]
        )
    elif medium:
        items.extend(
            [
                {
                    "title": "Rainwater harvesting",
                    "detail": "Install rooftop rainwater harvesting as a first, low-regret measure.",
                },
                {
                    "title": "Pilot recharge pits",
                    "detail": "Pilot a small recharge pit at a public or institutional site before scaling up.",
                },
                {
                    "title": "Conservation",
                    "detail": "Reduce non-essential groundwater pumping and repair leaks so recharge is not offset by extra extraction.",
                },
            ]
        )
    else:
        items.extend(
            [
                {
                    "title": "Demand management first",
                    "detail": "Low recharge potential in this method means infiltration may be constrained. Cut demand and audit extraction before large recharge works.",
                },
                {
                    "title": "Site investigation",
                    "detail": "Do not assume pits or wells will perform well here without soil, drainage, and water-quality checks.",
                },
                {
                    "title": "Limited structural recharge",
                    "detail": "If structures are still proposed, keep them small, monitored, and designed with hydrogeological advice.",
                },
            ]
        )

    if condition_label == "Critical" or trend_label == "Declining":
        items.insert(
            0,
            {
                "title": "Immediate conservation",
                "detail": "Groundwater is stressed or declining. Restrict non-essential use and increase monitoring frequency until the trend stabilises.",
            },
        )

    items.append(
        {
            "title": "Regular groundwater monitoring",
            "detail": "Keep using the 6-hourly telemetry record. Revisit recharge decisions if the level or trend changes.",
        }
    )
    return items


def build_recharge_guidance(station: str, condition_label: Optional[str] = None, trend_label: Optional[str] = None) -> Dict[str, Any]:
    record = get_station_recharge(station)
    if record is None:
        return None

    category = str(record.get("Recharge_Category") or "Unknown")
    score = float(record.get("Recharge_Score") or 0.0)
    recommended = category.startswith("High") or category.startswith("Medium")
    station_meta = get_station_record(station)
    condition_label = condition_label or classify_condition(station_meta["avg_level"])["label"]
    trend_label = trend_label or station_meta["trend"]["label"]

    if category.startswith("High"):
        headline = "Artificial recharge is recommended as a priority at this station, subject to local site checks."
    elif category.startswith("Medium"):
        headline = "Artificial recharge is conditionally recommended, together with conservation and monitoring."
    else:
        headline = "Artificial recharge potential is limited here; conservation and investigation should lead."

    return {
        "station": record.get("Station"),
        "category": category,
        "score": score,
        "recommended": recommended,
        "headline": headline,
        "reasons": _recharge_reasons(record),
        "recommendations": _recommendations(category, condition_label, trend_label),
        "components": {
            "depth_score": record.get("Depth_Score"),
            "fluctuation_score": record.get("Fluctuation_Combined"),
            "trend_score": record.get("Trend_Score"),
            "elevation_score": record.get("RL_MSL_Score"),
        },
        "metrics": {
            "avg_depth": record.get("Avg_Depth"),
            "depth_std": record.get("Depth_Std"),
            "depth_trend_slope": record.get("Depth_Trend_Slope"),
            "avg_rl_msl": record.get("Avg_RL_MSL"),
            "latitude": record.get("Latitude"),
            "longitude": record.get("Longitude"),
        },
        "methodology_note": (
            "This is a rule-based artificial recharge potential assessment from the project methodology. "
            "It is a relative decision-support score, not a measured recharge volume."
        ),
    }


def build_spatial_stations() -> List[Dict[str, Any]]:
    recharge_rows = {row["Station"]: row for row in get_recharge_stations()}
    markers = []
    for station in get_station_catalog():
        recharge = recharge_rows.get(station["station"], {})
        condition = classify_condition(station["avg_level"])
        markers.append(
            {
                "station": station["station"],
                "latitude": station["latitude"],
                "longitude": station["longitude"],
                "avg_level": station["avg_level"],
                "latest_level": station["latest_level"],
                "condition": condition["label"],
                "color": condition_color(condition["label"]),
                "trend": station["trend"]["label"],
                "recharge_category": recharge.get("Recharge_Category"),
                "recharge_score": recharge.get("Recharge_Score"),
                "observations": station["observations"],
            }
        )
    return markers


def build_station_intelligence(
    station_meta: Dict[str, Any],
    predicted_level: float,
    features: Dict[str, float],
    provenance: Dict[str, Any],
    history: List[Dict[str, Any]],
) -> Dict[str, Any]:
    condition = classify_condition(predicted_level)
    trend = station_meta["trend"]
    confidence = assess_confidence(features, bool(provenance.get("is_extrapolated")))
    recharge = build_recharge_guidance(station_meta["station"], condition["label"], trend["label"])
    why = build_prediction_reasons(station_meta, features)

    return {
        "station": {
            "name": station_meta["station"],
            "station_id": station_meta["station_id"],
            "latitude": station_meta["latitude"],
            "longitude": station_meta["longitude"],
            "rl_msl": station_meta["rl_msl"],
            "observations": station_meta["observations"],
            "first_observation": station_meta["first_observation"],
            "last_observation": station_meta["last_observation"],
            "avg_level": station_meta["avg_level"],
            "latest_level": station_meta["latest_level"],
        },
        "timestamp": provenance.get("timestamp"),
        "prediction": {
            "value": predicted_level,
            "unit": "meters",
            "observed_level": provenance.get("observed_level"),
            "model_name": "Linear Regression",
            "feature_source": provenance.get("feature_source"),
            "is_extrapolated": provenance.get("is_extrapolated"),
        },
        "condition": condition,
        "trend": trend,
        "confidence": confidence,
        "recharge": recharge,
        "recommendations": recharge["recommendations"] if recharge else [],
        "why": why,
        "history": history,
    }


def build_plain_explainability() -> Dict[str, Any]:
    rows = get_permutation_importance_results()
    importance = {row["feature"]: row["importance_mean"] for row in rows}
    groups = []
    for title, names in FEATURE_GROUPS.items():
        groups.append(
            {
                "title": title,
                "weight": sum(importance.get(name, 0.0) for name in names),
                "features": names,
            }
        )
    groups.sort(key=lambda item: item["weight"], reverse=True)
    return {
        "model_name": "Linear Regression",
        "summary": (
            "For general users, the model mainly follows recent groundwater readings at the same "
            "station, then seasonal timing, location, and elevation. Technical plots remain available "
            "for review, but they describe model influence rather than physical causation."
        ),
        "groups": groups,
    }


def build_dashboard_overview() -> Dict[str, Any]:
    catalog = get_station_catalog()
    spatial = build_spatial_stations()
    condition_counts: Dict[str, int] = {"Normal": 0, "Moderate": 0, "Critical": 0}
    trend_counts: Dict[str, int] = {}
    for item in spatial:
        condition_counts[item["condition"]] = condition_counts.get(item["condition"], 0) + 1
        trend_counts[item["trend"]] = trend_counts.get(item["trend"], 0) + 1

    recharge = get_recharge_summary()
    return {
        "station_count": len(catalog),
        "condition_counts": condition_counts,
        "trend_counts": trend_counts,
        "recharge_categories": recharge["categories"],
        "average_recharge_score": recharge["average_recharge_score"],
        "stations": spatial,
    }
