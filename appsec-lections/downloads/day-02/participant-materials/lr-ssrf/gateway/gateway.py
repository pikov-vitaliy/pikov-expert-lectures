"""Local-only gateway for the closed SSRF teaching lab.

The gateway has the host-published port because Docker Desktop does not publish
ports from a service attached only to an `internal: true` network. It never
interprets a user URL: every POST is forwarded to one fixed upstream service on
the private lab network. The intentionally vulnerable fetch remains in app.py.
"""

from __future__ import annotations

import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "0.0.0.0"
PORT = 8080
UPSTREAM = "http://app:8080"
MAX_REQUEST_BYTES = 4096
REQUEST_TIMEOUT_SECONDS = 3


class Handler(BaseHTTPRequestHandler):
    server_version = "ClosedSsrfLabGateway/1.0"

    def log_message(self, format: str, *args: object) -> None:
        print("gateway %s - %s" % (self.address_string(), format % args), flush=True)

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - http.server handler API
        if self.path != "/":
            self._send(HTTPStatus.NOT_FOUND, b'{"error":"not found"}', "application/json; charset=utf-8")
            return
        body = """<!doctype html><html lang=\"ru\"><meta charset=\"utf-8\"><title>Closed SSRF Lab</title>
        <h1>Closed SSRF Lab</h1><p>Локальный gateway доступен только на 127.0.0.1.</p>
        <p>Для разрешённой демонстрации используйте POST /fetch с JSON-полем url и адресом
        <code>http://internal:9000/meta</code>.</p></html>""".encode("utf-8")
        self._send(HTTPStatus.OK, body, "text/html; charset=utf-8")

    def do_POST(self) -> None:  # noqa: N802 - http.server handler API
        if self.path != "/fetch":
            self._send(HTTPStatus.NOT_FOUND, b'{"error":"not found"}', "application/json; charset=utf-8")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send(HTTPStatus.BAD_REQUEST, b'{"error":"invalid content length"}', "application/json; charset=utf-8")
            return
        if not 0 < length <= MAX_REQUEST_BYTES:
            self._send(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, b'{"error":"request is too large"}', "application/json; charset=utf-8")
            return

        # No payload parsing and no user-controlled destination in this gateway.
        data = self.rfile.read(length)
        request = urllib.request.Request(
            f"{UPSTREAM}/fetch",
            data=data,
            headers={"Content-Type": "application/json", "Content-Length": str(len(data))},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:  # noqa: S310
                body = response.read()
                self._send(response.status, body, response.headers.get_content_type() + "; charset=utf-8")
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
            self._send(HTTPStatus.BAD_GATEWAY, b'{"error":"private lab upstream failed"}', "application/json; charset=utf-8")


if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
