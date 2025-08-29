from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app, supports_credentials=True)

EMPLOYEE_URL = os.getenv("EMPLOYEE_URL", "http://lms-employee_service:8001")
MANAGER_URL  = os.getenv("MANAGER_URL",  "http://lms-manager_service:8002")

def forward_request(target_url: str):

    excluded = {'host', 'connection', 'upgrade'}
    headers = {k: v for k, v in request.headers if k.lower() not in excluded}
    try:
        resp = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request.get_data(),
            params=request.args,
            cookies=request.cookies,
            timeout=30,
        )
       
        drop = {'connection', 'content-encoding', 'content-length', 'transfer-encoding'}
        forwarded_headers = [(k, v) for k, v in resp.headers.items() if k.lower() not in drop]
        return Response(resp.content, status=resp.status_code, headers=forwarded_headers)
    except requests.exceptions.ConnectionError:
        return jsonify({"error": f"Service unavailable: {target_url}"}), 503
    except requests.exceptions.Timeout:
        return jsonify({"error": "Service timeout"}), 504
    except Exception as e:
        return jsonify({"error": f"Gateway error: {str(e)}"}), 500


@app.route("/health")
def health():
    return jsonify({"status": "gateway-ok", "employee_url": EMPLOYEE_URL, "manager_url": MANAGER_URL})


@app.route("/manager/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
def manager_proxy(path):
    return forward_request(f"{MANAGER_URL}/{path}")


@app.route("/", defaults={"path": ""}, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
def employee_proxy(path):
    return forward_request(f"{EMPLOYEE_URL}/{path}")

if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=3000, debug=True)
