"""Tiny stand-in for the DeepL /v2/translate endpoint, for offline testing.

    python tests/mock_deepl.py 8765
    DEEPL_API_KEY=test:fx DEEPL_API_URL=http://127.0.0.1:8765/v2/translate python build.py --offline
"""
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        out = {"translations": [{"detected_source_language": "EN", "text": "[ZH] " + t} for t in body["text"]]}
        data = json.dumps(out, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8765), Handler).serve_forever()
