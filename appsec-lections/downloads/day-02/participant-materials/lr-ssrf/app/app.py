"""Intentionally vulnerable server-side fetch for a closed SSRF teaching lab.

The compose network is marked internal, so this program has no route to the
Internet. It is deliberately vulnerable only to the companion `internal`
container. Do not reuse this code in an application.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "0.0.0.0"
PORT = 8080
REQUEST_TIMEOUT_SECONDS = 3
MAX_REQUEST_BYTES = 4096
MAX_RESPONSE_BYTES = 4096


class Handler(BaseHTTPRequestHandler):
    server_version = "ClosedSsrfLab/1.0"

    def log_message(self, format: str, *args: object) -> None:
        # Keep logs useful but avoid echoing the full user-provided URL.
        print("%s - %s" % (self.address_string(), format % args), flush=True)

    def _json(self, status: HTTPStatus, payload: dict[str, object]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self) -> None:  # noqa: N802 - http.server handler API
        if self.path != "/":
            self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return
        body = """<!doctype html><html lang=\"ru\"><meta charset=\"utf-8\"><title>Closed SSRF Lab</title>
        <h1>Closed SSRF Lab</h1><p>Учебный сервис доступен только локально.</p>
        <p>Для разрешённой демонстрации используйте POST /fetch с JSON-полем url и адресом
        <code>http://internal:9000/meta</code>. Внешние адреса не являются частью задания.</p></html>""".encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802 - http.server handler API
        if self.path != "/fetch":
            self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid content length"})
            return
        if not 0 < content_length <= MAX_REQUEST_BYTES:
            self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "request is too large"})
            return

        try:
            payload = json.loads(self.rfile.read(content_length))
            url = payload["url"]
        except (KeyError, TypeError, UnicodeDecodeError, json.JSONDecodeError):
            self._json(HTTPStatus.BAD_REQUEST, {"error": "expected JSON object with string field url"})
            return
        if not isinstance(url, str):
            self._json(HTTPStatus.BAD_REQUEST, {"error": "url must be a string"})
            return

        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != "http" or not parsed.netloc:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "only an http URL is accepted in this lab"})
            return

        # INTENTIONALLY VULNERABLE: the server follows a user-controlled URL.
        # The Docker network prevents this from being usable outside the lab.
        request = urllib.request.Request(url, headers={"User-Agent": "closed-ssrf-lab/1.0"})
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:  # noqa: S310
                data = response.read(MAX_RESPONSE_BYTES + 1)
                if len(data) > MAX_RESPONSE_BYTES:
                    self._json(HTTPStatus.BAD_GATEWAY, {"error": "upstream response exceeds lab limit"})
                    return
                self._json(
                    HTTPStatus.OK,
                    {
                        "upstream_status": response.status,
                        "content_type": response.headers.get_content_type(),
                        "body": data.decode("utf-8", errors="replace"),
                    },
                )
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as error:
            self._json(HTTPStatus.BAD_GATEWAY, {"error": "upstream request failed", "detail": type(error).__name__})


if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
