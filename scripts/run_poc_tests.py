#!/usr/bin/env python3
"""
POC Test Runner — runs 8 test questions against the local AI service.
Saves results to eval/POC_TEST_RESULTS_AFTER_FIX.json and prints a table.

Usage (from warranty-platform/):
    python scripts/run_poc_tests.py
"""

import json
import time
import urllib.request
import urllib.error
from datetime import datetime

AI_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:3001"

QUESTIONS = [
    {
        "id": "Q1",
        "question": "Is the frame and crossmembers covered under warranty for unit 1168 (VIN 4V4NC9EH5LN218365)?",
        "expected_pass": lambda r: r.get("evidenceCount", 0) > 0 and r.get("coverageDecision") != "insufficient_evidence"
    },
    {
        "id": "Q2",
        "question": "My truck with VIN 4V4NC9EH5LN218365 has 200,000 miles on it. Is the engine still covered under the standard engine warranty?",
        "expected_pass": lambda r: r.get("evidenceCount", 0) > 0
    },
    {
        "id": "Q3",
        "question": "Compare the transmission warranty coverage between unit 1168 (chassis 218365) and unit 1118 (chassis 180032). Which one has longer coverage?",
        "expected_pass": lambda r: r.get("evidenceCount", 0) > 0
    },
    {
        "id": "Q4",
        "question": "Is the turbocharger covered on the Volvo truck with VIN 4V4NC9EH7LN218366?",
        "expected_pass": lambda r: r.get("evidenceCount", 0) > 0
    },
    {
        "id": "Q5",
        "question": "What emission-related warranties exist for unit 1117 (VIN 4V4NC9EH6GN928218) and are any of them still active?",
        "expected_pass": lambda r: r.get("evidenceCount", 0) > 0
    },
    {
        "id": "Q6",
        "question": "If my Volvo truck with chassis 218366 has a transmission breakdown at 200,000 miles, am I covered for towing?",
        "expected_pass": lambda r: r.get("evidenceCount", 0) > 0
    },
    {
        "id": "Q7",
        "question": "What is the recommended oil change interval for a Volvo VNL?",
        "expected_pass": lambda r: r.get("intent") == "out_of_scope"
    },
    {
        "id": "Q8",
        "question": "Is the alternator covered on a 2023 Freightliner Cascadia?",
        # No Freightliner in corpus: correct answer is no evidence / insufficient
        "expected_pass": lambda r: (
            r.get("evidenceCount", 0) == 0
            and r.get("coverageDecision") in ("insufficient_evidence", "not_covered")
        )
    },
]


def http_post(url, payload, timeout=120):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {body[:300]}")


def check_health():
    try:
        with urllib.request.urlopen(f"{AI_URL}/health", timeout=5) as r:
            return r.status == 200
    except Exception:
        return False


def run_tests():
    print("=" * 80)
    print("POC TEST RUNNER — Warranty Intelligence Platform")
    print(f"AI Service: {AI_URL}")
    print(f"Started:    {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    if not check_health():
        print("\n❌  AI service not reachable at http://localhost:8000/health")
        print("    Run:  docker compose up -d")
        return

    print("\n✅  AI service is healthy — running 8 questions...\n")

    results = []
    passed = 0
    failed = 0

    for q in QUESTIONS:
        print(f"[{q['id']}] {q['question'][:75]}...")
        t0 = time.time()

        try:
            resp = http_post(f"{AI_URL}/query/answer", {
                "question": q["question"],
                "conversationHistory": []
            })

            elapsed = round(time.time() - t0, 2)
            evidence_count = len(resp.get("evidence", []))
            answer = resp.get("answer", "")
            confidence = resp.get("confidence", 0)
            decision = resp.get("coverageDecision", "insufficient_evidence")
            intent = resp.get("intent", "unknown")
            filters = resp.get("filters", {})

            row = {
                "id": q["id"],
                "question": q["question"],
                "answer": answer,
                "confidence": confidence,
                "evidenceCount": evidence_count,
                "coverageDecision": decision,
                "intent": intent,
                "filtersApplied": filters,
                "elapsed": elapsed,
                "error": None
            }

            ok = q["expected_pass"](row)
            row["passed"] = ok

            if ok:
                passed += 1
                status = "✅ PASS"
            else:
                failed += 1
                status = "❌ FAIL"

            print(f"  {status} | evidence={evidence_count} | decision={decision} | intent={intent} | {elapsed}s")
            print(f"  Filters: {filters}")
            print(f"  Answer: {answer[:120]}...")
            print()

        except Exception as ex:
            elapsed = round(time.time() - t0, 2)
            row = {
                "id": q["id"],
                "question": q["question"],
                "answer": "",
                "confidence": 0,
                "evidenceCount": 0,
                "coverageDecision": "error",
                "intent": "error",
                "filtersApplied": {},
                "elapsed": elapsed,
                "error": str(ex),
                "passed": False
            }
            failed += 1
            print(f"  ❌ ERROR: {ex}")
            print()

        results.append(row)

    # Summary table
    print("=" * 80)
    print("RESULTS SUMMARY")
    print("=" * 80)
    print(f"{'ID':<4} {'Pass':<6} {'Evidence':<10} {'Decision':<25} {'Intent':<25} {'Time':>6}")
    print("-" * 80)
    for r in results:
        p = "✅" if r.get("passed") else "❌"
        print(f"{r['id']:<4} {p:<6} {r['evidenceCount']:<10} {r['coverageDecision']:<25} {r['intent']:<25} {r['elapsed']:>5}s")

    print("-" * 80)
    print(f"\nTotal: {passed}/8 passed | {failed}/8 failed")
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Save results
    out_path = "eval/POC_TEST_RESULTS_AFTER_FIX.json"
    with open(out_path, "w") as f:
        json.dump({
            "run_at": datetime.now().isoformat(),
            "passed": passed,
            "failed": failed,
            "results": results
        }, f, indent=2)
    print(f"\n📄  Results saved to {out_path}")
    print("=" * 80)


if __name__ == "__main__":
    run_tests()
