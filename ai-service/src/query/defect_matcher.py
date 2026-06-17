"""Match defect hierarchy targets to ingested coverage_components rows."""

from __future__ import annotations

import re


def _norm(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _score_row(row: dict, targets: list[dict]) -> float:
    hierarchy = row.get("coverage_hierarchy") or {}
    name = _norm(row.get("coverage_name"))
    best = 0.0
    for target in targets:
        score = 0.0
        for level, weight in (
            ("system", 0.25),
            ("subsystem", 0.3),
            ("component_group", 0.35),
            ("component", 0.1),
        ):
            tval = _norm(target.get(level))
            hval = _norm(hierarchy.get(level))
            if tval and hval and (tval in hval or hval in tval):
                score += weight * float(target.get("confidence") or 0.7)
            elif tval and tval in name:
                score += weight * 0.5 * float(target.get("confidence") or 0.7)
        best = max(best, score)
    return round(best, 3)


def match_coverage_rows(
    coverage_rows: list[dict],
    candidate_targets: list[dict],
    *,
    top_n: int = 3,
    threshold: float = 0.25,
) -> list[dict]:
    scored: list[tuple[float, dict]] = []
    for row in coverage_rows:
        if not isinstance(row, dict):
            continue
        score = _score_row(row, candidate_targets)
        if score >= threshold:
            scored.append((score, row))
    scored.sort(key=lambda item: item[0], reverse=True)
    out: list[dict] = []
    for score, row in scored[:top_n]:
        item = dict(row)
        item["match_score"] = score
        out.append(item)
    return out
