"""Run python3 _services/visitor_map.py for the local preview.

For GitHub Pages, proxy /api/visitors on an HTTPS backend to this service,
keep its database on persistent storage, and set #visitors data-endpoint
in index.html to that public API URL.
"""
import argparse
import json
from contextlib import closing
from datetime import datetime, timedelta, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sqlite3
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
ZONES = json.loads((ROOT / "assets/data/visitor-zones.json").read_text())


def beijing_today():
    return datetime.now(timezone(timedelta(hours=8))).date()


class VisitorHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        if urlsplit(self.path).path == "/api/visitors":
            self.send_header("Vary", "Origin")
            if self.headers.get("Origin") == "https://albert-ma.github.io":
                self.send_header("Access-Control-Allow-Origin", "https://albert-ma.github.io")
        super().end_headers()

    def respond_json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def visits(self, visit=None):
        try:
            with closing(sqlite3.connect(self.server.database, timeout=5)) as db, db:
                today = beijing_today()
                if visit:
                    db.execute("INSERT OR IGNORE INTO visits (id, zone, day) VALUES (?, ?, ?)", (*visit, today.isoformat()))
                counts = dict(db.execute("SELECT zone, COUNT(*) FROM visits GROUP BY zone"))
                first_day = db.execute("SELECT start_day FROM trend_start").fetchone()[0]
                days = [today - timedelta(days=offset) for offset in range(29, -1, -1)]
                daily = dict(db.execute(
                    "SELECT day, COUNT(*) FROM visits WHERE day BETWEEN ? AND ? GROUP BY day",
                    (days[0].isoformat(), today.isoformat()),
                ))
                trend = [{"day": d.isoformat(), "visits": daily.get(d.isoformat(), 0)
                          if d.isoformat() >= first_day else None} for d in days]
            self.respond_json(200, {"counts": counts, "daily": trend})
        except sqlite3.Error:
            self.respond_json(503, {"error": "Visit counts temporarily unavailable"})

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/visitors":
            self.visits()
        elif path in {"/about", "/about/", "/about.html"}:
            self.send_response(302)
            self.send_header("Location", "/")
            self.end_headers()
        else:
            super().do_GET()

    def do_OPTIONS(self):
        if urlsplit(self.path).path != "/api/visitors":
            return self.send_error(404)
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if urlsplit(self.path).path != "/api/visitors":
            return self.respond_json(404, {"error": "Unknown endpoint"})
        if self.headers.get_content_type() != "application/json":
            return self.respond_json(415, {"error": "Expected JSON"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 512:
                raise ValueError
            data = json.loads(self.rfile.read(size))
            visit_id = UUID(data["id"])
            if visit_id.version != 4:
                raise ValueError
            zone = data["zone"]
            if zone not in ZONES:
                zone = "Unknown"
            elif isinstance(ZONES[zone], str):
                zone = ZONES[zone]
        except (ValueError, TypeError, KeyError, AttributeError):
            return self.respond_json(400, {"error": "Invalid visit"})
        self.visits((str(visit_id), zone))

    def list_directory(self, path):
        self.send_error(404)

    def log_message(self, format, *args):
        # Only aggregate visit counts are displayed. Do not log visitor addresses.
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4174)
    parser.add_argument("--database", type=Path, default=Path.home() / ".local/share/xinyu-homepage/visits.sqlite3")
    args = parser.parse_args()
    args.database.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(args.database)) as db, db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("CREATE TABLE IF NOT EXISTS visits (id TEXT PRIMARY KEY, zone TEXT NOT NULL, day TEXT)")
        if "day" not in {row[1] for row in db.execute("PRAGMA table_info(visits)")}:
            db.execute("ALTER TABLE visits ADD COLUMN day TEXT")
        db.execute("CREATE INDEX IF NOT EXISTS visits_by_day ON visits(day)")
        db.execute("CREATE TABLE IF NOT EXISTS trend_start (id INTEGER PRIMARY KEY, start_day TEXT NOT NULL)")
        db.execute("INSERT OR IGNORE INTO trend_start VALUES (1, ?)", (beijing_today().isoformat(),))
    with TemporaryDirectory() as public:
        for name in ("index.html", "assets", "files", "images", "publications", "news", "research", "experience", "awards"):
            (Path(public) / name).symlink_to(ROOT / name)
        handler = partial(VisitorHandler, directory=public)
        with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
            server.database = args.database
            print(f"Local preview: http://127.0.0.1:{args.port}/", flush=True)
            server.serve_forever()


if __name__ == "__main__":
    main()
