"""Synthetic internal-only service for the closed SSRF lab."""

from __future__ import annotations

from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "0.0.0.0"
PORT = 9000


class Handler(BaseHTTPRequestHandler):
    server_version = "SyntheticInternal/1.0"

    def log_message(self, format: str, *args: object) -> None:
        print("internal %s - %s" % (self.address_string(), format % args), flush=True)

    def do_GET(self) -> None:  # noqa: N802 - http.server handler API
        if self.path != "/meta":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        body = b"INTERNAL_METADATA=synthetic-lab-value\nSERVICE=internal\n"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
