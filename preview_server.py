from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import traceback


ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = 4173
LOG_FILE = ROOT / "preview_server.log"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        return


def main():
    os.chdir(ROOT)
    with ThreadingHTTPServer((HOST, PORT), QuietHandler) as server:
        server.serve_forever()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        LOG_FILE.write_text(traceback.format_exc(), encoding="utf-8")
