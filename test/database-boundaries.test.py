"""Anonymous boundary checks only: no credentials, fixtures, real-account login, or provider calls."""
import json
import sys
import urllib.error
import urllib.request

base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost/sigma-elms").rstrip("/")


def request(path, payload=None, method=None, headers=None):
    body = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(base + "/php/api/" + path, data=body, method=method,
                                 headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()


cases = [(name + ".php", None) for name in ["session", "users", "subjects", "sections", "quiz_library", "school_years", "grade_sync", "presence", "ai_records", "record_lifecycle", "backup"]]
cases += [("auth.php?id=no-account-used", None), ("auth.php?action=ai_vault", None),
          ("auth.php", {"action": "setup_2fa", "id": "no-account-used"}), ("upload.php", {})]
cases += [("auth.php", {"action": "disable_2fa", "id": "no-account-used"})]
cases += [(name + ".php", {}) for name in ["sigma_chat", "quiz_ai", "submission_ai", "analytics_ai"]]
results = []
for path, payload in cases:
    status, headers, raw = request(path, payload, headers={"X-Sigma-Actor": "0000000", "X-Admin-Id": "0000000"})
    try:
        body = json.loads(raw)
    except ValueError:
        body = {}
    results.append({"endpoint": path, "status": status, "passed": status == 401 and body.get("success") is False and "application/json" in headers.get("Content-Type", "")})

for name in ["session", "subjects", "sections", "users", "school_years", "quiz_library", "backup", "presence"]:
    status, headers, _ = request(name + ".php", method="OPTIONS", headers={
        "Origin": "http://127.0.0.1:5519", "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization"})
    results.append({"endpoint": name + " preflight", "status": status, "passed": status in [200, 204] and "authorization" in headers.get("Access-Control-Allow-Headers", "").lower()})

status, _, _ = request("subjects.php", headers={"Origin": "https://not-this-application.example"})
results.append({"endpoint": "foreign origin", "status": status, "passed": status == 403})
print(json.dumps({"checks": results, "passed": all(item["passed"] for item in results), "testAccountsInserted": 0, "aiProviderCalls": 0}, indent=2))
sys.exit(0 if all(item["passed"] for item in results) else 1)
