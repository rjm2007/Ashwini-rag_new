"""Match defect hierarchy targets to ingested coverage_components rows."""

from __future__ import annotations

from difflib import SequenceMatcher

_HIER_WEIGHTS = {"system": 0.45, "subsystem": 0.35, "component_group": 0.20}
_NAME_TIEBREAK = 0.15
_MIN_SCORE = 0.30


def _norm(value: str | None) -> str:
    return str(value or "").strip().lower()


def _hier(row: dict) -> dict[str, str]:
    h = row.get("coverage_hierarchy") or {}
    return {k: _norm(h.get(k) or row.get(k)) for k in ("system", "subsystem", "component_group")}


def _score(row: dict, target: dict) -> float:
    rh = _hier(row)
    th = {k: _norm(target.get(k)) for k in ("system", "subsystem", "component_group")}
    score = 0.0
    for level, weight in _HIER_WEIGHTS.items():
        tv, rv = th[level], rh[level]
        if not tv or not rv:
            continue
        if tv == rv:
            score += weight
        elif tv in rv or rv in tv:
            score += weight * 0.6
    score += _NAME_TIEBREAK * SequenceMatcher(
        None, _norm(row.get("coverage_name")), _norm(target.get("component_group"))
    ).ratio()
    return score * float(target.get("confidence", 1.0) or 1.0)


def match_coverage_rows(
    coverage_rows: list[dict],
    candidate_targets: list[dict],
    *,
    top_n: int = 5,
    threshold: float = _MIN_SCORE,
) -> list[dict]:
    if not coverage_rows or not candidate_targets:
        return []
    scored: list[tuple[float, dict]] = []
    for row in coverage_rows:
        if not isinstance(row, dict):
            continue
        best = max((_score(row, t) for t in candidate_targets), default=0.0)
        if best >= threshold:
            scored.append((best, row))
    scored.sort(key=lambda item: item[0], reverse=True)
    seen: set[str] = set()
    out: list[dict] = []
    for score, row in scored:
        cid = str(row.get("coverage_id"))
        if cid in seen:
            continue
        seen.add(cid)
        item = dict(row)
        item["_match_score"] = round(score, 3)
        out.append(item)
        if len(out) >= top_n:
            break
    return out
