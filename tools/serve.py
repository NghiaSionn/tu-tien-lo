"""Server tĩnh cho phát triển: như `python -m http.server` nhưng tắt cache để trình duyệt luôn tải code mới.

    python tools/serve.py            # cổng 8123
    python tools/serve.py 9000
"""
import http.server
import sys
from functools import partial
from pathlib import Path


class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".json": "application/json"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    root = Path(__file__).resolve().parent.parent
    handler = partial(NoCache, directory=str(root))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as srv:
        print(f"Tu Tien Lo: http://localhost:{port}  (Ctrl+C to stop)", flush=True)
        srv.serve_forever()
